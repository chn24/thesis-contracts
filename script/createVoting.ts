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
    const Voting = await ethers.getContractFactory("Voting");

    console.log("Deploy Voting Manager");
    const VotingManager = await ethers.getContractFactory("VotingManager");
    const votingManagerAddress = data.votingManager;
    const votingManager = VotingManager.attach(votingManagerAddress);
    console.log("Voting Manager is deployed at: ", votingManagerAddress);

    await votingManager.createVoting();
    console.log("Create voting complete");

    const firstVotingAddress = await votingManager.votings(1);

    const firstVoting = Voting.attach(firstVotingAddress);
    console.log("first Voting is deployed at: ", firstVotingAddress);

    const abi = new AbiCoder();

    const content1 = abi.encode(["string"], ["câu hỏi 1"]);
    const content2 = abi.encode(["string"], ["câu hỏi 2"]);
    await firstVoting.addProposal([content1, content2], [true, false]);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
