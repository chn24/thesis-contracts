import fs from "fs";
import { ethers } from "hardhat";

let data: any;
try {
    const file = fs.readFileSync("data.json");
    data = JSON.parse(file);
} catch (error) {
    console.error(error);
}

async function main() {
    const [owner] = await ethers.getSigners();
    console.log("Deploy TickBitmap library");
    const TickBitmap = await ethers.getContractFactory("TickBitmap");
    const tickBitmap = await TickBitmap.deploy();
    console.log("TickBitmap is deployed at: ", tickBitmap.address);

    console.log("Deploy TickBitMapStorage library");
    const TickBitMapStorage = await ethers.getContractFactory("TickBitMapStorage", {
        libraries: {
            TickBitmap: tickBitmap.address,
        },
    });
    const tickBitMapStorage = await TickBitMapStorage.deploy();
    console.log("TickBitMapStorage is deployed at: ", tickBitMapStorage.address);

    console.log("Deploy ProcessBytes library");
    // const ProcessBytes = await ethers.getContractFactory("ProcessBytes");
    // const processBytes = await ProcessBytes.deploy();
    // const processBytesAddress = processBytes.address;
    const processBytesAddress = data.processBytesAddress;
    console.log("ProcessBytes is deployed at: ", processBytesAddress);

    console.log("Deploy VBTC token");
    const VBTC = await ethers.getContractFactory("VBTC");
    const vbtc = await VBTC.deploy();
    const vbtcAddress = vbtc.address;
    // const vbtcAddress = data.vbtcAddress
    // const vbtc = VBTC.attach(vbtcAddress)
    console.log("VBTC deployed at:...", vbtcAddress);

    console.log("Deploy B14G token");
    const B14G = await ethers.getContractFactory("BEP20Token");
    const b14g = await B14G.deploy();
    const b14gAddress = b14g.address;
    // const b14gAddress = data.b14gAddress
    console.log("b14g deployed at:...", b14gAddress);

    console.log("Deploy Blockhash contract");

    const BlockHash = await ethers.getContractFactory("BlockHash", {
        libraries: {
            ProcessBytes: processBytesAddress,
        },
    });
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");

    const b14gBlockHashImp = await BlockHash.deploy();
    let b14gBlockHash;
    b14gBlockHash = await ProxyAdmin.deploy(b14gBlockHashImp.address, owner.address);
    b14gBlockHash = BlockHash.attach(b14gBlockHash.address);
    await b14gBlockHash.initialize();
    console.log("B14gBlockHash is deployed at: ", b14gBlockHash.address);

    const coreBlockHashImpl = await BlockHash.deploy();
    let coreBlockHash;
    coreBlockHash = await ProxyAdmin.deploy(coreBlockHashImpl.address, owner.address);
    coreBlockHash = BlockHash.attach(coreBlockHash.address);
    await coreBlockHash.initialize();
    console.log("CoreBlockHash is deployed at: ", coreBlockHash.address);

    const B14GVerifier = await ethers.getContractFactory("B14GVerifier", {
        libraries: {
            ProcessBytes: processBytesAddress,
        },
    });
    const b14gVerifier = await B14GVerifier.deploy(b14gBlockHash.address);
    console.log("B14GVerifier is deployed at: ", b14gVerifier.address);

    const CoreVerifier = await ethers.getContractFactory("CoreVerifier", {
        libraries: {
            ProcessBytes: processBytesAddress,
        },
    });
    const coreVerifier = await CoreVerifier.deploy(coreBlockHash.address);
    console.log("CoreVerifier is deployed at: ", coreVerifier.address);

    const VerifierHub = await ethers.getContractFactory("VerifierHub", {
        libraries: {
            ProcessBytes: processBytesAddress,
        },
    });
    const verifierHub = await VerifierHub.deploy([b14gVerifier.address, coreVerifier.address]);
    console.log("VerifierHub is deployed at: ", verifierHub.address);

    console.log("Deploy PriceFeed contract");
    // const PriceFeed = await ethers.getContractFactory("PriceFeed");
    // const priceFeed = await PriceFeed.deploy();
    // const priceFeedAddress = priceFeed.address;
    const priceFeedAddress = data.priceFeedAddress;
    console.log("PriceFeed is deployed at: ", priceFeedAddress);

    console.log("Deploy OperatorV4");
    const Operator = await ethers.getContractFactory("Operator", {
        libraries: {
            TickBitMapStorage: tickBitMapStorage.address,
        },
    });
    const operator = await Operator.deploy();
    console.log("Operator is deployed at: ", operator.address);

    console.log("Deploy SentryManager");
    const SentryManager = await ethers.getContractFactory("SentryManager");
    const sentryManager = await SentryManager.deploy();
    const sentryManagerAddress = sentryManager.address;
    console.log("SentryManager is deployed at: ", sentryManagerAddress);
    await sentryManager.initialize(
        ethers.utils.parseUnits("10", 4),
        ethers.utils.parseEther("10"),
        b14gBlockHash.address,
        ethers.constants.AddressZero,
        b14gAddress,
        vbtcAddress,
        priceFeedAddress,
        operator.address,
        verifierHub.address,
    );

    const tx2 = await vbtc.transfer(sentryManagerAddress, 1500000000000);
    console.log("Transfer vbtc for txManagement txHash", tx2.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
