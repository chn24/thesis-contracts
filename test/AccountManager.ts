import { expect } from "chai";
import { loadFixture } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { AbiCoder, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { ethers } from "hardhat";
import Web3 from "web3";

const web3 = new Web3();
const abi = new AbiCoder();
const admin = "0x555BdfdBC34D551884AAca9225f92F7c7F7c3f45";
const email = "user1@gmail.com";
const email2 = "user2@gamil.com";
const email3 = "user3@gmail.com";

describe("AccountManager", async function () {
    async function deployContracts() {
        const [owner, ...otherAccounts] = await ethers.getSigners();

        const AccountManager = await ethers.getContractFactory("AccountManager");
        const accountManager = await AccountManager.deploy();
        await accountManager.initialize("verify");
        const accountManagerAddress = accountManager.address;

        const Voting = await ethers.getContractFactory("Voting");
        const voting = await Voting.deploy();
        const votingAddress = voting.address;

        const VotingManager = await ethers.getContractFactory("VotingManager");
        const votingManager = await VotingManager.deploy();
        const votingManagerAddress = votingManager.address;

        await accountManager.setIsAdmin(votingManagerAddress, true);

        const encodedTitle = abi.encode(["string"], ["Đại hội cổ đông 10/2024"]);
        const time = (new Date().getTime() / (1000 * 86400)).toFixed();

        await votingManager.initialize(votingAddress, accountManagerAddress);
        await accountManager.setVotingManager(votingManagerAddress);
        await votingManager.createVoting(encodedTitle, time);
        const firstVotingAddress = (await votingManager.votings(1)).contractAddress;

        const firstVoting = Voting.attach(firstVotingAddress);

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

    describe("initilize", async function () {
        it("Fail: initilized", async function () {
            const { accountManager } = await loadFixture(deployContracts);

            await expect(accountManager.initialize("verify")).to.be.rejectedWith("Initialized");
        });
    });

    describe("setVotingManager", async function () {
        it("Fail: only owner", async function () {
            const { accountManager, owner, otherAccounts } = await loadFixture(deployContracts);

            await expect(accountManager.connect(otherAccounts[0]).setVotingManager(owner.address)).to.be.rejectedWith("Ownable: caller is not the owner");
        });
    });

    describe("setIsValidSender", async function () {
        it("Fail: only owner", async function () {
            const { accountManager, owner, otherAccounts } = await loadFixture(deployContracts);

            await expect(accountManager.connect(otherAccounts[0]).setIsValidSender(owner.address, true)).to.be.rejectedWith("Not admin");
        });
    });

    describe("setIsAdmin", async function () {
        it("Fail: only owner", async function () {
            const { accountManager, owner, otherAccounts } = await loadFixture(deployContracts);

            await expect(accountManager.connect(otherAccounts[0]).setIsAdmin(owner.address, true)).to.be.rejectedWith("Ownable: caller is not the owner");
        });
    });

    describe("Verify", async function () {
        it("Failed: invalid signature", async function () {
            const { accountManager, owner } = await loadFixture(deployContracts);
            const emailEncoded = abi.encode(["string"], [email]);
            const hashEmail = keccak256(emailEncoded);

            const messageHash = await accountManager.getMessageHash(owner.address, 100000, hashEmail);
            const signature = web3.eth.accounts.sign(messageHash, process.env.DEPLOYER_PRIVATE_KEY ?? "");
            await expect(accountManager.verify(100000, signature.signature, hashEmail)).to.be.rejectedWith("Invalid signature");
        });
        it("Complete", async function () {
            const { accountManager, owner } = await loadFixture(deployContracts);

            await accountManager.setIsAdmin(admin, true);
            const emailEncoded = abi.encode(["string"], [email]);
            const hashEmail = keccak256(emailEncoded);

            const messageHash = await accountManager.getMessageHash(owner.address, 100000, hashEmail);
            const signature = web3.eth.accounts.sign(messageHash, process.env.DEPLOYER_PRIVATE_KEY ?? "");
            await accountManager.verify(100000, signature.signature, hashEmail);

            const curBalance = await accountManager.getCurrentBalance();

            expect(curBalance).to.be.eq(BigNumber.from(100000));
        });

        it("Email verified", async function () {
            const { accountManager, owner } = await loadFixture(deployContracts);
            const emailEncoded = abi.encode(["string"], [email]);
            const hashEmail = keccak256(emailEncoded);

            const messageHash = await accountManager.getMessageHash(owner.address, 100000, hashEmail);
            const signature = web3.eth.accounts.sign(messageHash, process.env.DEPLOYER_PRIVATE_KEY ?? "");
            await expect(accountManager.verify(100000, signature.signature, hashEmail)).to.be.rejectedWith("Email verified");
        });

        it("Address verified", async function () {
            const { accountManager, owner } = await loadFixture(deployContracts);
            const emailEncoded = abi.encode(["string"], [email2]);
            const hashEmail = keccak256(emailEncoded);

            const messageHash = await accountManager.getMessageHash(owner.address, 100000, hashEmail);
            const signature = web3.eth.accounts.sign(messageHash, process.env.DEPLOYER_PRIVATE_KEY ?? "");
            await expect(accountManager.verify(100000, signature.signature, hashEmail)).to.be.rejectedWith("Address verified");
        });
    });

    describe("Delegate", async function () {
        it("Fail: Cannot delegate yourself", async function () {
            const { accountManager, owner } = await loadFixture(deployContracts);
            await expect(accountManager.delegate(owner.address)).to.be.rejectedWith("Cannot delegate yourself");
        });

        it("Fail: User haven't verified", async function () {
            const { accountManager, otherAccounts } = await loadFixture(deployContracts);

            const user = otherAccounts[0];
            await expect(accountManager.connect(user).delegate(user.address)).to.be.rejectedWith("You must verify balance first");
        });

        it("Fail: Delegated user haven't verified", async function () {
            const { accountManager, otherAccounts } = await loadFixture(deployContracts);

            const delegatedUser = otherAccounts[0];
            const user = otherAccounts[1];
            await expect(accountManager.delegate(delegatedUser.address)).to.be.rejectedWith("User haven't verified balance yet");
            const emailEncoded1 = abi.encode(["string"], [email2]);
            const hashEmail1 = keccak256(emailEncoded1);
            const emailEncoded2 = abi.encode(["string"], [email3]);
            const hashEmail2 = keccak256(emailEncoded2);

            const messageHash1 = await accountManager.getMessageHash(delegatedUser.address, 1000, hashEmail1);
            const signature1 = web3.eth.accounts.sign(messageHash1, process.env.DEPLOYER_PRIVATE_KEY ?? "");
            await accountManager.connect(delegatedUser).verify(1000, signature1.signature, hashEmail1);

            const messageHash2 = await accountManager.getMessageHash(user.address, 1000, hashEmail2);
            const signature2 = web3.eth.accounts.sign(messageHash2, process.env.DEPLOYER_PRIVATE_KEY ?? "");
            await accountManager.connect(user).verify(1000, signature2.signature, hashEmail2);
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
            await firstVoting.setStatus(2);
            await firstVoting.vote(
                [
                    {
                        index: 1,
                        option: 1,
                    },
                    {
                        index: 2,
                        option: 0,
                    },
                ],
                [],
            );

            await expect(accountManager.delegate(delegatedUser.address)).to.be.rejectedWith("You had voted");
        });

        it("Fail: user had voted", async function () {
            const { firstVoting, accountManager, otherAccounts } = await loadFixture(deployContracts);

            const delegatedUser = otherAccounts[1];
            await firstVoting.connect(delegatedUser).vote(
                [
                    {
                        index: 1,
                        option: 1,
                    },
                    {
                        index: 2,
                        option: 0,
                    },
                ],
                [],
            );

            await expect(accountManager.delegate(delegatedUser.address)).to.be.rejectedWith("User had voted");
        });
    });
});
