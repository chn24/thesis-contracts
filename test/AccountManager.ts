import { expect } from "chai";
import { loadFixture } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { AbiCoder, toUtf8Bytes } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("AccountManager", async function () {
    async function deployContracts() {
        const [owner, ...otherAccounts] = await ethers.getSigners();

        const AccountManager = await ethers.getContractFactory("AccountManager");
        const accountManager = await AccountManager.deploy();
        await accountManager.initialize();
        const accountManagerAddress = accountManager.address;

        const Voting = await ethers.getContractFactory("Voting");
        const voting = await Voting.deploy();
        const votingAddress = voting.address;

        const VotingManager = await ethers.getContractFactory("VotingManager");
        const votingManager = await VotingManager.deploy();
        const votingManagerAddress = votingManager.address;

        await accountManager.setIsAdmin(votingManagerAddress, true);

        await votingManager.initialize(votingAddress, accountManagerAddress);
        await accountManager.setVotingManager(votingManagerAddress);
        await votingManager.createVoting();
        const firstVotingAddress = await votingManager.votings(1);

        const firstVoting = Voting.attach(firstVotingAddress);

        const abi = new AbiCoder();

        const content1 = abi.encode(["string"], ["abc"]);
        const content2 = abi.encode(["string"], ["def"]);

        const tx = await firstVoting.addProposal([content1, content2], [true, false]);

        return {
            owner,
            otherAccounts,
            firstVoting,
            accountManager,
            accountManagerAddress,
        };
    }

    describe("Verify", async function () {
        it("Complete", async function () {
            const { accountManager } = await loadFixture(deployContracts);

            await accountManager.verifyBalance(10000);

            const curBalance = await accountManager.getCurrentBalance();

            expect(curBalance).to.be.eq(BigNumber.from(10000));
        });

        it("Verified", async function () {
            const { accountManager } = await loadFixture(deployContracts);

            await expect(accountManager.verifyBalance(10000)).to.be.rejectedWith("You have verified");
        });
    });

    describe("Delegate", async function () {
        it("Fail: User haven't verified", async function () {
            const { accountManager, otherAccounts } = await loadFixture(deployContracts);

            const user = otherAccounts[0];
            await expect(accountManager.connect(user).delegate(user.address)).to.be.rejectedWith("You must veridy balance first");
        });

        it("Fail: Delegated user haven't verified", async function () {
            const { accountManager, otherAccounts } = await loadFixture(deployContracts);

            const delegatedUser = otherAccounts[0];
            await expect(accountManager.delegate(delegatedUser.address)).to.be.rejectedWith("User haven't verified balance yet");

            await accountManager.connect(delegatedUser).verifyBalance(1000);
            await accountManager.connect(otherAccounts[1]).verifyBalance(1000);
        });

        it("Complete", async function () {
            const { accountManager, otherAccounts } = await loadFixture(deployContracts);

            const user = otherAccounts[0];
            const delegatedUser = otherAccounts[1];

            const delegatedUserBalanceBefore = await accountManager.connect(delegatedUser).getCurrentBalance();
            await accountManager.connect(user).delegate(delegatedUser.address);

            const delegatedUserBalanceAfter = await accountManager.connect(delegatedUser).getCurrentBalance();

            expect(BigNumber.from(delegatedUserBalanceBefore).add(1000)).to.be.eq(BigNumber.from(delegatedUserBalanceAfter));
        });

        it("Fail: You had delegated", async function () {
            const { accountManager, otherAccounts } = await loadFixture(deployContracts);

            const user = otherAccounts[0];
            const delegatedUser = otherAccounts[1];
            await expect(accountManager.connect(user).delegate(delegatedUser.address)).to.be.rejectedWith("You had delegated");
        });

        it("Fail: User had delegated", async function () {
            const { accountManager, otherAccounts } = await loadFixture(deployContracts);
            const delegatedUser = otherAccounts[0];

            await expect(accountManager.delegate(delegatedUser.address)).to.be.rejectedWith("User had delegated");
        });

        it("Fail: you had voted", async function () {
            const { firstVoting, accountManager, otherAccounts } = await loadFixture(deployContracts);

            const delegatedUser = otherAccounts[1];
            await firstVoting.setStatus(1);
            await firstVoting.vote([
                {
                    index: 1,
                    option: 1,
                },
                {
                    index: 2,
                    option: 0,
                },
            ]);

            await expect(accountManager.delegate(delegatedUser.address)).to.be.rejectedWith("You had voted");
        });

        it("Fail: user had voted", async function () {
            const { firstVoting, accountManager, otherAccounts } = await loadFixture(deployContracts);

            const delegatedUser = otherAccounts[1];
            await firstVoting.connect(delegatedUser).vote([
                {
                    index: 1,
                    option: 1,
                },
                {
                    index: 2,
                    option: 0,
                },
            ]);

            await expect(accountManager.delegate(delegatedUser.address)).to.be.rejectedWith("User had voted");
        });
    });
});
