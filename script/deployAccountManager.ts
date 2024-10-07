import { AbiCoder } from "ethers/lib/utils";
import fs from "fs";
import { ethers } from "hardhat";

async function main() {
    console.log("Deploy Account Manager");
    const AccountManager = await ethers.getContractFactory("AccountManager");
    const accountManager = await AccountManager.deploy();
    const accountManagerAddress = accountManager.address;
    console.log("Account Manager is deployed at: ", accountManagerAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
