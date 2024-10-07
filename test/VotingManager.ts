import { expect } from "chai";
import { loadFixture } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { AbiCoder, toUtf8Bytes } from "ethers/lib/utils";
import { ethers } from "hardhat";
import Web3 from "web3";

const abi = new AbiCoder();

enum STATUS {
    NOT_YET,
    PAUSED,
    OPEN,
    CLOSED,
}

describe("VotingManager", async function () {
    async function deployContracts() {
        const [owner, ...otherAccounts] = await ethers.getSigners();
        const admin = "0x555BdfdBC34D551884AAca9225f92F7c7F7c3f45";

        const AccountManager = await ethers.getContractFactory("AccountManager");
        const accountManager = await AccountManager.deploy();
        await accountManager.initialize("verify");
        const accountManagerAddress = accountManager.address;
        await accountManager.setIsAdmin(admin, true);

        const Voting = await ethers.getContractFactory("Voting");
        const voting = await Voting.deploy();
        const votingAddress = voting.address;

        const VotingManager = await ethers.getContractFactory("VotingManager");
        const votingManager = await VotingManager.deploy();
        const votingManagerAddress = votingManager.address;

        await accountManager.setIsAdmin(votingManagerAddress, true);

        await votingManager.initialize(votingAddress, accountManagerAddress);
        await accountManager.setVotingManager(votingManagerAddress);

        return {
            owner,
            otherAccounts,

            accountManager,
            accountManagerAddress,
            votingManager,
            votingAddress,
        };
    }

    describe("initilize", async function () {
        it("Fail: initilized", async function () {
            const { votingManager, votingAddress, accountManagerAddress } = await loadFixture(deployContracts);

            await expect(votingManager.initialize(votingAddress, accountManagerAddress)).to.be.rejectedWith("Initialized");
        });
    });

    describe("setImplement", async function () {
        it("Fail: only owner", async function () {
            const { votingManager, owner, otherAccounts } = await loadFixture(deployContracts);

            await expect(votingManager.connect(otherAccounts[0]).setImplement(owner.address)).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Complete", async function () {
            const { votingManager, owner, votingAddress } = await loadFixture(deployContracts);

            await votingManager.setImplement(owner.address);
            let newImplement = await votingManager.implement();
            expect(newImplement).to.be.eq(owner.address);

            await votingManager.setImplement(votingAddress);
            newImplement = await votingManager.implement();
            expect(newImplement).to.be.eq(votingAddress);
        });
    });

    describe("setAccountManager", async function () {
        it("Fail: only owner", async function () {
            const { votingManager, owner, otherAccounts } = await loadFixture(deployContracts);

            await expect(votingManager.connect(otherAccounts[0]).setAccountManager(owner.address)).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Complete", async function () {
            const { votingManager, owner, accountManagerAddress } = await loadFixture(deployContracts);

            await votingManager.setAccountManager(owner.address);
            let newAccountManAddress = await votingManager.accountManager();
            expect(newAccountManAddress).to.be.eq(owner.address);

            await votingManager.setAccountManager(accountManagerAddress);
            newAccountManAddress = await votingManager.accountManager();
            expect(newAccountManAddress).to.be.eq(accountManagerAddress);
        });
    });

    describe("Create voting", async function () {
        it("Fail: not owner", async function () {
            const { votingManager, otherAccounts } = await loadFixture(deployContracts);
            const user = otherAccounts[0];

            const titleEncoded = abi.encode(["string"], ["Đại hội cổ đông thường niên 10/2024"]);
            const time = (new Date().getTime() / (1000 * 86400)).toFixed();
            await expect(votingManager.connect(user).createVoting(titleEncoded, time)).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Complete", async function () {
            const { votingManager, otherAccounts } = await loadFixture(deployContracts);
            const user = otherAccounts[0];

            const titleEncoded = abi.encode(["string"], ["Đại hội cổ đông thường niên 10/2024"]);
            const time = (new Date().getTime() / (1000 * 86400)).toFixed();

            await votingManager.createVoting(titleEncoded, time);

            const votings = await votingManager.getAllVoting();

            expect(abi.decode(["string"], votings[0].title)[0]).to.be.eq("Đại hội cổ đông thường niên 10/2024");
            expect(votings[0].date).to.be.eq(Number(time));
            expect(votings[0].index).to.be.eq(1);
            // expect(votings[0].contractAddress).to.be.eq()
        });
    });
});
