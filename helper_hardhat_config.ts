export interface networkConfigItem {
  blockConfirmations?: number;
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  localhost: {},
  hardhat: {},
  rinkeby: {
    blockConfirmations: 5,
  },
};

export const developmentChains = ["hardhat", "localhost"];
