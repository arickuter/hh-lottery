import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { BigNumber, Contract, Signer } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper_hardhat_config";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", () => {
      let lottery: Contract,
        vrfCoordinatorV2Mock: Contract,
        entranceFee: BigNumber,
        interval: BigNumber,
        accounts: Array<SignerWithAddress>,
        player: SignerWithAddress;

      beforeEach(async () => {
        accounts = await ethers.getSigners(); // could also do with getNamedAccounts
        //   deployer = accounts[0]
        player = accounts[1];
        await deployments.fixture(["all"]);
        lottery = await ethers.getContract("Lottery", player.address);
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        entranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
      });

      describe("constructor", () => {
        it("initializes lottery correctly", async () => {
          const lotteryState = await lottery.getLotteryState();

          assert.equal(lotteryState.toString(), "0");
          assert.equal(
            interval.toString(),
            networkConfig[network.name]["interval"]
          );
        });
      });

      describe("enterLottery", () => {
        it("reverts when not enough eth entered", async () => {
          await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
            lottery,
            "Lottery__NotEnoughETH"
          );
        });
        it("stores player when lottery entered", async () => {
          await lottery.enterLottery({ value: entranceFee });
          const playerFromContract = await lottery.getPlayer(0);
          assert.equal(playerFromContract, player.address);
        });
        it("emits event on enter", async () => {
          await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
            lottery,
            "LotteryEnter"
          );
        });
        it("entrance closed during calculation", async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          // Act as chainlink keeper
          await lottery.performUpkeep([]);
          await expect(
            lottery.enterLottery({ value: entranceFee })
          ).to.be.revertedWithCustomError(lottery, "Lottery__NotOpen");
        });
      });

      describe("checkUpkeep", () => {
        it("return false if no eth", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.checkUpkeep([]);
          assert.equal(upkeepNeeded, false);
        });
        it("return false if lottery not open", async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await lottery.performUpkeep([]); // changes the state to calculating
          const { upkeepNeeded } = await lottery.checkUpkeep([]);
          assert.equal(upkeepNeeded, false);
        });
        it("return false if not enough time has passed", async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 2,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await lottery.checkUpkeep([]);
          assert.equal(upkeepNeeded, false);
        });
        it("return true if enough time has passed, has players, eth, and is open", async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await lottery.checkUpkeep([]);
          assert.equal(upkeepNeeded, true);
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkupkeep is true", async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const tx = await lottery.performUpkeep([]);
          assert(tx);
        });
        it("revert if checkUpkeep is false", async () => {
          await expect(lottery.performUpkeep([])).to.be.revertedWithCustomError(
            lottery,
            "Lottery__UpkeepNotNeeded"
          );
        });
        it("updates the lottery state and emits a requestId", async () => {
          // Too many asserts in this test!
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const txResponse = await lottery.performUpkeep([]); // emits requestId
          const txReceipt = await txResponse.wait(1); // waits 1 block
          const lotteryState = await lottery.getLotteryState(); // updates state
          const requestId = txReceipt.events[1].args.requestId;
          assert(requestId.toNumber() > 0);
          assert(lotteryState == 1); // 0 = open, 1 = calculating
        });
      });

      describe("fulfillRandomWords", () => {
        beforeEach(async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });

        it("can only be called after performUpkeep is run", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("picks a winner, resets the lottery, sends money", async () => {
          const startingTimestamp = await lottery.getLastTimeStamp();

          const additionalEntrants = 3; // to test
          const startingIndex = 2;
          for (
            let i = startingIndex;
            i < startingIndex + additionalEntrants;
            i++
          ) {
            lottery = lottery.connect(accounts[i]); // Returns a new instance of the Lottery contract connected to player
            await lottery.enterLottery({ value: entranceFee });
          }

          await new Promise<void>(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const recentWinner = await lottery.getRecentWinner();
                const lotteryState = await lottery.getLotteryState();
                const endingTimeStamp = await lottery.getLastTimeStamp();
                const numPlayers = await lottery.getNumPlayers();
                const winnerBal = await accounts[2].getBalance();

                assert.isNotEmpty(recentWinner);
                assert.equal(lotteryState.toString(), "0");
                assert(endingTimeStamp > startingTimestamp);
                assert.equal(numPlayers.toString(), "0");
                assert.equal(
                  winnerBal.toString(),
                  startingBal
                    .add(entranceFee.mul(additionalEntrants).add(entranceFee))
                    .toString()
                );
              } catch (error) {
                reject(error);
              }
              resolve();
            });
            const startingBal = await accounts[2].getBalance();
            const tx = await lottery.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              lottery.address
            );
          });
        });
      });
    });
