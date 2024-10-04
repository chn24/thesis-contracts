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
    const [owner, ...otherAccounts] = await ethers.getSigners();

    console.log("Deploy Account Manager");
    const AccountManager = await ethers.getContractFactory("AccountManager");
    const accountManager = await AccountManager.deploy();
    await accountManager.initialize("verify");
    const accountManagerAddress = accountManager.address;
    console.log("Account Manager is deployed at: ", accountManagerAddress);

    console.log("Deploy Voting Implement");
    // const Voting = await ethers.getContractFactory("Voting");
    // const voting = await Voting.deploy();
    // const votingAddress = voting.address;
    const votingAddress = data.votingImplement;
    console.log("Voting Implement is deployed at: ", votingAddress);

    console.log("Deploy Voting Manager");
    const VotingManager = await ethers.getContractFactory("VotingManager");
    const votingManager = await VotingManager.deploy();
    const votingManagerAddress = votingManager.address;
    console.log("Voting Manager is deployed at: ", votingManagerAddress);

    await accountManager.setIsAdmin(votingManagerAddress, true);
    console.log("done tx1");
    await accountManager.setVotingManager(votingManagerAddress);
    console.log("done tx2");
    await votingManager.initialize(votingAddress, accountManagerAddress);
    console.log("done tx3");
    // await votingManager.createVoting();
    // const firstVotingAddress = await votingManager.votings(1);

    // const firstVoting = Voting.attach(firstVotingAddress);
    // console.log("first Voting is deployed at: ", firstVotingAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
