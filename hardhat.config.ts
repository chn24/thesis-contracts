import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
const config: HardhatUserConfig = {
    networks: {
        hardhat: {
            // accounts: {
            //     mnemonic: process.env.ACCOUNT_MNEMONIC,
            // },
        },
        testnet: {
            url: "https://public.stackup.sh/api/v1/node/arbitrum-sepolia",
            chainId: 421614,
            // gasPrice: 20000000000,
            accounts: [],
        },
        xchainTest: {
            url: "https://test-rpc.xgainer.xyz",
            chainId: 7052024,
            accounts: [],
        },
        b14gTest: {
            url: "http://206.189.38.197:32009/",
            chainId: 19981004,
            accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.5.16",
                settings: {
                    // See the solidity docs for advice about optimization and evmVersion
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.19",
                settings: {
                    // See the solidity docs for advice about optimization and evmVersion
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.20",
                settings: {
                    // See the solidity docs for advice about optimization and evmVersion
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.4",
                settings: {
                    // See the solidity docs for advice about optimization and evmVersion
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.2",
                settings: {
                    // See the solidity docs for advice about optimization and evmVersion
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.1",
                settings: {
                    // See the solidity docs for advice about optimization and evmVersion
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.0",
                settings: {
                    // See the solidity docs for advice about optimization and evmVersion
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.6.12",
                settings: {
                    // See the solidity docs for advice about optimization and evmVersion
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.6.20",
                settings: {
                    // See the solidity docs for advice about optimization and evmVersion
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
};

export default config;
