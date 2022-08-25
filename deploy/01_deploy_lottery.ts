import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper_hardhat_config";
import { ethers } from "hardhat";
import verify from "../utils/verify";

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

const deployLottery: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;
  let vrfCoordinatorV2Address, subscriptionId;

  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const txRes = await vrfCoordinatorV2Mock.createSubscription();
    const txRec = await txRes.wait(1);
    subscriptionId = txRec.events[0].args.subId;
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2Address = networkConfig[network.name]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[network.name]["subscriptionId"];
  }
  /* lottery args */
  const entranceFee = ethers.utils.parseEther(
    networkConfig[network.name]["entranceFee"]!
  );
  const keyHash = networkConfig[network.name]["keyHash"];
  const callbackGasLimit = networkConfig[network.name]["callbackGasLimit"];
  const interval = networkConfig[network.name]["interval"];

  const args = [
    entranceFee,
    vrfCoordinatorV2Address,
    keyHash,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];

  log("----------------------------------------------------");
  log("Deploying Lottery and waiting for confirmations...");
  const lottery = await deploy("Lottery", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: waitBlockConfirmations,
  });
  log(`Lottery deployed at ${lottery.address}`);
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(lottery.address, args);
  }
};
export default deployLottery;
deployLottery.tags = ["all", "lottery"];
