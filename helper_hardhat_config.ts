export interface networkConfigItem {
  name?: string;
  subscriptionId?: string;
  keyHash?: string;
  interval?: string;
  entranceFee?: string;
  callbackGasLimit?: string;
  vrfCoordinatorV2?: string;
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  hardhat: {
    subscriptionId: "19871",
    keyHash:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    interval: "30",
    entranceFee: "0.01",
    callbackGasLimit: "500000",
  },
  localhost: {
    subscriptionId: "19871",
    keyHash:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    interval: "30",
    entranceFee: "0.01",
    callbackGasLimit: "500000",
  },
  rinkeby: {
    subscriptionId: "19871",
    keyHash:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    interval: "1",
    entranceFee: "0.01",
    callbackGasLimit: "500000",
    vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
  },
  mainnet: {
    interval: "30",
  },
};
export const VERIFICATION_BLOCK_CONFIRMATIONS = 5;
export const developmentChains = ["hardhat", "localhost"];
