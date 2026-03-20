export const BASE_MAINNET_CONFIG = {
  chainId: 8453,
  rpcUrl: "https://mainnet.base.org",
  routerAddress: "0xA88B5eaD188De39c015AC51F45E1B41D3d95f2bb",
  usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Official Base USDC
  treasury: "0x598bF63F5449876efafa7b36b77Deb2070621C0E"
};

export const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  rpcUrl: "https://sepolia.base.org",
  routerAddress: "0x1E12700393D3222BC451fb0aEe7351E4eB6779b1", // New Sepolia Deployment
  usdcAddress: "0xeAC1f2C7099CdaFfB91Aa3b8Ffd653Ef16935798", // Our Private MockUSDC (Mintable)
  treasury: "0x598bF63F5449876efafa7b36b77Deb2070621C0E"
};

// Default to Mainnet for Production, Sepolia for Sandbox
export const getNetworkConfig = (isMainnet: boolean) => isMainnet ? BASE_MAINNET_CONFIG : BASE_SEPOLIA_CONFIG;
