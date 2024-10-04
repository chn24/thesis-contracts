import { expect } from "chai";
import { loadFixture } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { AbiCoder, toUtf8Bytes } from "ethers/lib/utils";
import { ethers } from "hardhat";
import Web3 from "web3";

const abi = new AbiCoder();
const web3 = new Web3();

enum STATUS {
    NOT_YET,
    PAUSED,
    OPEN,
    CLOSED,
}

describe("Voting", async function () {
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

        const titleEncoded = abi.encode(["string"], ["Đại hội cổ đông thường niên 10/2024"]);
        const time = (new Date().getTime() / (1000 * 86400)).toFixed();

        await votingManager.initialize(votingAddress, accountManagerAddress);
        await accountManager.setVotingManager(votingManagerAddress);
        await votingManager.createVoting(titleEncoded, time);
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

    describe("initilize", async function () {
        it("Fail: initilized", async function () {
            const { firstVoting, owner, accountManagerAddress } = await loadFixture(deployContracts);

            await expect(firstVoting.initialize(owner.address, accountManagerAddress)).to.be.rejectedWith("initialized");
        });
    });

    describe("Add Proposal", async function () {
        it("Fail: Only owner can add", async function () {
            const { otherAccounts, firstVoting } = await loadFixture(deployContracts);
            const user = otherAccounts[0];

            await expect(firstVoting.connect(user).addProposal([], [])).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Fail: invalid length 1", async function () {
            const { firstVoting, owner } = await loadFixture(deployContracts);

            const content1 = ethers.utils.keccak256(toUtf8Bytes("Đề xuất 1"));

            await expect(firstVoting.addProposal([content1], [true, false])).to.be.rejectedWith("Invalid array length");
        });

        it("Fail: invalid length 2", async function () {
            const { firstVoting, owner } = await loadFixture(deployContracts);

            const content = ethers.utils.keccak256(toUtf8Bytes("Đề xuất 1"));

            await expect(firstVoting.addProposal([content, content], [true])).to.be.rejectedWith("Invalid array length");
        });

        it("Faile: Empty", async function () {
            const { firstVoting, owner } = await loadFixture(deployContracts);
            await expect(firstVoting.addProposal([], [])).to.be.rejectedWith("Empty");
        });

        it("Complete", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            const content1 = abi.encode(["string"], ["Đề xuất 1"]);
            const content2 = abi.encode(["string"], ["Đề xuất 2"]);

            const tx = await firstVoting.addProposal([content1, content2], [true, false]);

            const reciept = await tx.wait();

            // @ts-ignore
            const contentsEvent = reciept.events[0].args[0];

            const totalProposal = await firstVoting.totalProposal();

            expect(abi.decode(["string"], contentsEvent[0])[0]).to.be.eq("Đề xuất 1");
            expect(abi.decode(["string"], contentsEvent[1])[0]).to.be.eq("Đề xuất 2");
            expect(totalProposal).to.be.eq(2);
        });
    });

    describe("Add Nomination", async function () {
        it("Fail: Only owner can add", async function () {
            const { otherAccounts, firstVoting } = await loadFixture(deployContracts);
            const user = otherAccounts[0];

            await expect(firstVoting.connect(user).addNomination([])).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Fail: empty", async function () {
            const { firstVoting } = await loadFixture(deployContracts);
            await expect(firstVoting.addNomination([])).to.be.rejectedWith("Empty");
        });

        it("Complete", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            const user1 = abi.encode(["string"], ["Nguyễn Văn A"]);
            const user2 = abi.encode(["string"], ["Bùi Văn B"]);
            const user3 = abi.encode(["string"], ["Hà Văn C"]);

            await firstVoting.addNomination([user1, user2, user3]);
            const nominations = await firstVoting.getAllNominations();
            const nomination1 = nominations[1][0];
            const nomination2 = nominations[1][1];
            const nomination3 = nominations[1][2];
            expect(nominations[0]).to.be.eq(3);
            expect(nomination1.index).to.be.eq(1);
            expect(abi.decode(["string"], nomination1.content)[0]).to.be.eq("Nguyễn Văn A");
            expect(nomination2.index).to.be.eq(2);
            expect(abi.decode(["string"], nomination2.content)[0]).to.be.eq("Bùi Văn B");
            expect(nomination3.index).to.be.eq(3);
            expect(abi.decode(["string"], nomination3.content)[0]).to.be.eq("Hà Văn C");
        });
    });

    describe("setLimitNominationVoted", async function () {
        it("Fail: Only owner can add", async function () {
            const { firstVoting, otherAccounts } = await loadFixture(deployContracts);
            const user = otherAccounts[0];

            await expect(firstVoting.connect(user).setLimitNominationVoted(1)).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Complete", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setLimitNominationVoted(2);

            const limit = await firstVoting.limitNominationVoted();

            expect(limit).to.be.eq(2);
        });
    });

    describe("Set Status", async function () {
        it("Fail: only Owner", async function () {
            const { firstVoting, otherAccounts } = await loadFixture(deployContracts);

            const user = otherAccounts[0];

            await expect(firstVoting.connect(user).setStatus(STATUS.PAUSED)).to.be.rejectedWith("Ownable: caller is not the owner");
        });

        it("Complete: Set PAUSED", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setStatus(STATUS.PAUSED);

            const status = await firstVoting.status();

            expect(status).to.be.eq(STATUS.PAUSED);
        });

        it("Complete: Set OPEN", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setStatus(STATUS.OPEN);

            const status = await firstVoting.status();

            expect(status).to.be.eq(STATUS.OPEN);
        });

        it("Complete: Set CLOSED", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setStatus(STATUS.CLOSED);

            const status = await firstVoting.status();

            expect(status).to.be.eq(STATUS.CLOSED);
        });

        it("Complete: Set NOT_YET", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setStatus(STATUS.NOT_YET);

            const status = await firstVoting.status();

            expect(status).to.be.eq(STATUS.NOT_YET);
        });
    });

    describe("Vote Proposal", async function () {
        it("Fail: Not YET", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(firstVoting.vote([], [])).to.be.rejectedWith("Not open");
        });

        it("Fail: Invalid proposal length (less than total)", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await firstVoting.setStatus(STATUS.OPEN);

            await expect(firstVoting.vote([], [])).to.be.rejectedWith("Invalid proposal length");
        });

        it("Fail: Invalid proposal length (more than total)", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote(
                    [
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
                    ],
                    [],
                ),
            ).to.be.rejectedWith("Invalid proposal length");
        });

        it("Fail: Invalid nomination length (less than total)", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote(
                    [
                        {
                            index: 1,
                            option: 1,
                        },
                        {
                            index: 1,
                            option: 1,
                        },
                    ],
                    [],
                ),
            ).to.be.rejectedWith("Invalid nomination length");
        });

        it("Fail: Invalid nomination length (more than total)", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote(
                    [
                        {
                            index: 1,
                            option: 1,
                        },
                        {
                            index: 1,
                            option: 1,
                        },
                    ],
                    [1, 2, 3],
                ),
            ).to.be.rejectedWith("Invalid nomination length");
        });

        it("Fail: User cannot vote", async function () {
            const { firstVoting, accountManager, owner } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote(
                    [
                        {
                            index: 1,
                            option: 1,
                        },
                        {
                            index: 2,
                            option: 1,
                        },
                    ],
                    [1, 2],
                ),
            ).to.be.rejectedWith("You can't vote");

            const messageHash = await accountManager.getMessageHash(owner.address, 100000);
            const signature = web3.eth.accounts.sign(messageHash, process.env.DEPLOYER_PRIVATE_KEY ?? "");
            await accountManager.verify(100000, signature.signature);
        });

        it("Fail: Invalid proposal", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote(
                    [
                        {
                            index: 5,
                            option: 1,
                        },
                        {
                            index: 1,
                            option: 1,
                        },
                    ],
                    [1, 2],
                ),
            ).to.be.rejectedWith("Invalid proposal");
        });

        it("Fail: Cannot vote twice (vote same proposal)", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote(
                    [
                        {
                            index: 1,
                            option: 1,
                        },
                        {
                            index: 1,
                            option: 1,
                        },
                    ],
                    [1, 2],
                ),
            ).to.be.rejectedWith("Cannot vote twice");
        });

        it("Fail: Invalid nomination", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote(
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
                    [4, 5],
                ),
            ).to.be.rejectedWith("Invalid nomination");
        });

        it("Fail: Cannot vote twice (vote same nomination)", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote(
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
                    [1, 1],
                ),
            ).to.be.rejectedWith("Cannot vote twice");
        });

        it("Complete", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            const index1Voted = (await firstVoting.proposals(1))[2];
            const index2Voted = (await firstVoting.proposals(2))[2];

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
                [1, 2],
            );

            const index1VotedAfterVote = (await firstVoting.proposals(1))[2];
            const index2VotedAfterVote = (await firstVoting.proposals(2))[2];

            const results = await firstVoting.getAllResults();

            expect(BigNumber.from(index1Voted).add(100000)).to.be.eq(BigNumber.from(index1VotedAfterVote));
            expect(BigNumber.from(index2Voted).add(100000)).to.be.eq(BigNumber.from(index2VotedAfterVote));

            expect(results[0][0].agree).to.be.eq(BigNumber.from(0));
            expect(results[0][0].ignore).to.be.eq(BigNumber.from(100000));
            expect(results[0][0].noComment).to.be.eq(BigNumber.from(0));

            expect(results[0][1].agree).to.be.eq(BigNumber.from(100000));
            expect(results[0][1].ignore).to.be.eq(BigNumber.from(0));
            expect(results[0][1].noComment).to.be.eq(BigNumber.from(0));

            expect(BigNumber.from(results[1][0].totalVote)).to.be.eq(BigNumber.from(100000));
            expect(BigNumber.from(results[1][1].totalVote)).to.be.eq(BigNumber.from(100000));
            expect(BigNumber.from(results[1][2].totalVote)).to.be.eq(BigNumber.from(0));
        });

        it("Fail: Voted", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(
                firstVoting.vote(
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
                    [1, 2],
                ),
            ).to.be.rejectedWith("Cannot vote twice");
        });

        it("Fail: Delegated", async function () {
            const { otherAccounts, firstVoting, accountManager } = await loadFixture(deployContracts);

            const user = otherAccounts[0];
            const delegatedUser = otherAccounts[1];

            const messageHash1 = await accountManager.getMessageHash(delegatedUser.address, 1000);
            const signature1 = web3.eth.accounts.sign(messageHash1, process.env.DEPLOYER_PRIVATE_KEY ?? "");
            await accountManager.connect(delegatedUser).verify(1000, signature1.signature);

            const messageHash2 = await accountManager.getMessageHash(user.address, 1000);
            const signature2 = web3.eth.accounts.sign(messageHash2, process.env.DEPLOYER_PRIVATE_KEY ?? "");
            await accountManager.connect(user).verify(1000, signature2.signature);

            await firstVoting.setStatus(STATUS.NOT_YET);
            await accountManager.connect(user).delegate(delegatedUser.address);
            await firstVoting.setStatus(STATUS.OPEN);

            const instance = firstVoting.connect(user);

            await expect(
                instance.vote(
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
                    [1, 2],
                ),
            ).to.be.rejectedWith("You have delegated");
        });

        it("Complete: Delegated user vote", async function () {
            const { otherAccounts, firstVoting } = await loadFixture(deployContracts);
            const delegatedUser = otherAccounts[1];
            const instance = firstVoting.connect(delegatedUser);

            const index1Voted = (await firstVoting.proposals(1))[2];
            const index2Voted = (await firstVoting.proposals(2))[2];

            await instance.vote(
                [
                    {
                        index: 1,
                        option: 2,
                    },
                    {
                        index: 2,
                        option: 0,
                    },
                ],
                [1, 3],
            );

            const index1VotedAfterVote = (await firstVoting.proposals(1))[2];
            const index2VotedAfterVote = (await firstVoting.proposals(2))[2];

            const results = await firstVoting.getAllResults();

            expect(BigNumber.from(index1Voted).add(2000)).to.be.eq(BigNumber.from(index1VotedAfterVote));
            expect(BigNumber.from(index2Voted).add(2000)).to.be.eq(BigNumber.from(index2VotedAfterVote));

            expect(results[0][0].agree).to.be.eq(BigNumber.from(0));
            expect(results[0][0].ignore).to.be.eq(BigNumber.from(100000));
            expect(results[0][0].noComment).to.be.eq(BigNumber.from(2000));

            expect(results[0][1].agree).to.be.eq(BigNumber.from(102000));
            expect(results[0][1].ignore).to.be.eq(BigNumber.from(0));
            expect(results[0][1].noComment).to.be.eq(BigNumber.from(0));

            expect(BigNumber.from(results[1][0].totalVote)).to.be.eq(BigNumber.from(102000));
            expect(BigNumber.from(results[1][1].totalVote)).to.be.eq(BigNumber.from(100000));
            expect(BigNumber.from(results[1][2].totalVote)).to.be.eq(BigNumber.from(2000));
        });
    });

    describe("get result uinque proposal index", async function () {
        it("Fail: Invalid index", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(firstVoting.getResultOfProposal(10)).to.be.rejectedWith("Invalid index");
        });

        it("Complete", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            const result = await firstVoting.getResultOfProposal(1);

            expect(result[0]).to.be.eq(BigNumber.from(0));
            expect(result[1]).to.be.eq(BigNumber.from(100000));
            expect(result[2]).to.be.eq(BigNumber.from(2000));
        });
    });

    describe("get result of unique nomination index", async function () {
        it("Fail: Invalid index", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            await expect(firstVoting.getResultOfNomination(10)).to.be.rejectedWith("Invalid index");
        });

        it("Complete", async function () {
            const { firstVoting } = await loadFixture(deployContracts);

            const result = await firstVoting.getResultOfNomination(1);
            expect(result[2]).to.be.eq(BigNumber.from(102000));
        });
    });
});
