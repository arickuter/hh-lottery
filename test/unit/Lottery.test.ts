import { assert, expect } from "chai";
import { BigNumber, Contract, Signer } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper_hardhat_config";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", () => {
      let lottery: Contract,
        vrfCoordinatorV2Mock: Contract,
        entranceFee: number,
        deployer: string,
        interval: BigNumber;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        lottery = await ethers.getContract("Lottery", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        entranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
      });

      describe("constructor", async () => {
        it("initializes lottery correctly", async () => {
          const lotteryState = await lottery.getLotteryState();

          assert.equal(lotteryState.toString(), "0");
          assert.equal(
            interval.toString(),
            networkConfig[network.name]["interval"]
          );
        });
      });

      describe("enterLottery", async () => {
        it("reverts when not enough eth entered", async () => {
          await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
            lottery,
            "Lottery__NotEnoughETH"
          );
        });
        it("stores player when lottery entered", async () => {
          await lottery.enterLottery({ value: entranceFee });
          const playerFromContract = await lottery.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });
        it("emits event on enter", async () => {
          await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
            lottery,
            "LotteryEnter"
          );
        });
        it("entrance closed during calculation", async () => {
          await lottery.enterLottery({ value: entranceFee });
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

      describe("checkUpkeep", async () => {
        it("returns false if no eth", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.checkUpkeep([]);
          assert(!upkeepNeeded);
        });
      });
    });
