import { expect } from "chai";
import { loadFixture } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { AbiCoder, formatBytes32String, toUtf8Bytes } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("VotingManager", async function () {
    async function deployContracts() {
        const [owner, ...otherAccounts] = await ethers.getSigners()

        const Voting = await ethers.getContractFactory("Voting")
        const voting = await Voting.deploy()

        const VotingManager = await ethers.getContractFactory("VotingManager")
        const votingManager = await VotingManager.deploy()
        await votingManager.initialize(voting.address)

        return {
            Voting,
            votingManager,
            owner,
            otherAccounts
        }
    }
})
