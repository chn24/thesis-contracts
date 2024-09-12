import { expect } from "chai";
import { loadFixture } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { AbiCoder, toUtf8Bytes } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("Voting", async function () {
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

        return {
            owner,
            otherAccounts,
            firstVoting,
            accountManager,
            accountManagerAddress,
        };
    }

    describe("Add Proposal", async function () {
        it("Fail: Only owner can add", async function () {
            const { otherAccounts, firstVoting } = await loadFixture(deployContracts);
            const user = otherAccounts[0];

            await expect(firstVoting.connect(user).addProposal([], [])).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Fail: invalid length 1", async function () {
            const { firstVoting, owner } = await loadFixture(deployContracts);

            const content1 = ethers.utils.keccak256(toUtf8Bytes("abc def"));

            await expect(firstVoting.addProposal([content1], [true, false])).to.be.rejectedWith("Invalid array length");
        });

        it("Fail: invalid length 2", async function () {
            const { firstVoting, owner } = await loadFixture(deployContracts);

            const content = ethers.utils.keccak256(toUtf8Bytes("abc"));

            await expect(firstVoting.addProposal([content, content], [true])).to.be.rejectedWith("Invalid array length");
        });

        it("Complete", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            const abi = new AbiCoder();

            const content1 = abi.encode(["string"], ["abc"]);
            const content2 = abi.encode(["string"], ["def"]);

            const tx = await firstVoting.addProposal([content1, content2], [true, false]);

            const reciept = await tx.wait();

            // @ts-ignore
            const contentsEvent = reciept.events[0].args[0];

            const totalProposal = await firstVoting.totalProposal();

            expect(abi.decode(["string"], contentsEvent[0])[0]).to.be.eq("abc");
            expect(abi.decode(["string"], contentsEvent[1])[0]).to.be.eq("def");
            expect(totalProposal).to.be.eq(2);
        });
    });

    describe("Set Status", async function () {
        it("Fail: only Owner", async function () {
            const { firstVoting, otherAccounts } = await loadFixture(deployContracts);

            const user = otherAccounts[0];

            await expect(firstVoting.connect(user).setStatus(1)).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Complete: Set OPEN", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setStatus(1);

            const status = await firstVoting.status();

            expect(status).to.be.eq(1);
        });

        it("Complete: Set CLOSED", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setStatus(2);

            const status = await firstVoting.status();

            expect(status).to.be.eq(2);
        });

        it("Complete: Set NOT_YET", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setStatus(0);

            const status = await firstVoting.status();

            expect(status).to.be.eq(0);
        });
    });

    describe("Vote", async function () {
        it("Fail: Not YET", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(firstVoting.vote([])).to.be.rejectedWith("Not open");
        });

        it("Fail: Invalid length (less than total)", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setStatus(1);

            await expect(firstVoting.vote([])).to.be.rejectedWith("Invalid length");
        });

        it("Fail: Invalid length (more than total)", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote([
                    {
                        index: 1,
                        option: 1,
                    },
                    {
                        index: 1,
                        option: 1,
                    },
                    {
                        index: 1,
                        option: 1,
                    },
                ]),
            ).to.be.rejectedWith("Invalid length");
        });

        it("Fail: User cannot vote", async function () {
            const { firstVoting, accountManager } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote([
                    {
                        index: 1,
                        option: 1,
                    },
                    {
                        index: 2,
                        option: 1,
                    },
                ]),
            ).to.be.rejectedWith("You can't vote");

            await accountManager.verifyBalance(100000);
        });

        it("Fail: Invalid index", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote([
                    {
                        index: 5,
                        option: 1,
                    },
                    {
                        index: 1,
                        option: 1,
                    },
                ]),
            ).to.be.rejectedWith("Invalid index");
        });

        it("Fail: Cannot vote twice (vote same)", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote([
                    {
                        index: 1,
                        option: 1,
                    },
                    {
                        index: 1,
                        option: 1,
                    },
                ]),
            ).to.be.rejectedWith("Cannot vote twice");
        });

        it("Complete", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            const index1Voted = (await firstVoting.proposals(1))[2];
            const index2Voted = (await firstVoting.proposals(2))[2];

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

            const index1VotedAfterVote = (await firstVoting.proposals(1))[2];
            const index2VotedAfterVote = (await firstVoting.proposals(2))[2];

            const results = await firstVoting.getAllResults();

            expect(BigNumber.from(index1Voted).add(100000)).to.be.eq(BigNumber.from(index1VotedAfterVote));
            expect(BigNumber.from(index2Voted).add(100000)).to.be.eq(BigNumber.from(index2VotedAfterVote));

            expect(results[0].agree).to.be.eq(BigNumber.from(0));
            expect(results[0].ignore).to.be.eq(BigNumber.from(100000));
            expect(results[0].noComment).to.be.eq(BigNumber.from(0));

            expect(results[1].agree).to.be.eq(BigNumber.from(100000));
            expect(results[1].ignore).to.be.eq(BigNumber.from(0));
            expect(results[1].noComment).to.be.eq(BigNumber.from(0));
        });

        it("Fail: Voted", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote([
                    {
                        index: 1,
                        option: 1,
                    },
                    {
                        index: 2,
                        option: 0,
                    },
                ]),
            ).to.be.rejectedWith("Cannot vote twice");
        });

        it("Fail: Delegated", async function () {
            const { otherAccounts, firstVoting, accountManager } = await loadFixture(deployContracts);

            const user = otherAccounts[0];
            const delegatedUser = otherAccounts[1];
            await accountManager.connect(delegatedUser).verifyBalance(1000);
            await accountManager.connect(user).verifyBalance(1000);

            await firstVoting.setStatus(0);
            await accountManager.connect(user).delegate(delegatedUser.address);
            await firstVoting.setStatus(1);

            const instance = firstVoting.connect(user);

            await expect(
                instance.vote([
                    {
                        index: 1,
                        option: 1,
                    },
                    {
                        index: 2,
                        option: 0,
                    },
                ]),
            ).to.be.rejectedWith("You have delegated");
        });

        it("Complete: Delegated user vote", async function () {
            const { otherAccounts, firstVoting } = await loadFixture(deployContracts);
            const delegatedUser = otherAccounts[1];
            const instance = firstVoting.connect(delegatedUser);

            const index1Voted = (await firstVoting.proposals(1))[2];
            const index2Voted = (await firstVoting.proposals(2))[2];

            await instance.vote([
                {
                    index: 1,
                    option: 2,
                },
                {
                    index: 2,
                    option: 0,
                },
            ]);

            const index1VotedAfterVote = (await firstVoting.proposals(1))[2];
            const index2VotedAfterVote = (await firstVoting.proposals(2))[2];

            const results = await firstVoting.getAllResults();

            expect(BigNumber.from(index1Voted).add(2000)).to.be.eq(BigNumber.from(index1VotedAfterVote));
            expect(BigNumber.from(index2Voted).add(2000)).to.be.eq(BigNumber.from(index2VotedAfterVote));

            expect(results[0].agree).to.be.eq(BigNumber.from(0));
            expect(results[0].ignore).to.be.eq(BigNumber.from(100000));
            expect(results[0].noComment).to.be.eq(BigNumber.from(2000));

            expect(results[1].agree).to.be.eq(BigNumber.from(102000));
            expect(results[1].ignore).to.be.eq(BigNumber.from(0));
            expect(results[1].noComment).to.be.eq(BigNumber.from(0));
        });
    });
});
