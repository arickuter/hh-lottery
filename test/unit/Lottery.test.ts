import { assert } from "chai";
import { Contract } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper_hardhat_config";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", () => {
      let lottery: Contract, vrfCoordinatorV2Mock: Contract;

      beforeEach(async () => {
        const { deployer } = await getNamedAccounts();
        await deployments.fixture(["all"]);
        lottery = await ethers.getContract("Lottery", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
      });

      describe("constructor", async () => {
        it("initializes lottery correctly", async () => {
          const lotteryState = await lottery.getLotteryState();
          const interval = await lottery.getInterval();
          assert.equal(lotteryState.toString(), "0");
          assert.equal(
            interval.toString(),
            networkConfig[network.name]["interval"]
          );
        });
      });
    });
