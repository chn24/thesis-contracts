import { AbiCoder } from "ethers/lib/utils";
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
    console.log("Deploy Voting Implement");
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    const votingAddress = voting.address;
    // const votingAddress = data.votingImplement;
    console.log("Voting Implement is deployed at: ", votingAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
