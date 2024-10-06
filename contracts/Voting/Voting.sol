// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "hardhat/console.sol";
import "../utils/Ownable2Step.sol";
import "../interfaces/IVoting.sol";
import "../interfaces/IAccountManager.sol";

contract Voting is Ownable2Step, IVoting {
    bool private initialized;
    STATUS public status;
    uint16 public totalProposal;
    uint16 public totalNomination;
    uint16 public limitNominationVoted;
    IAccountManager public accountManager;

    mapping(uint16 => Proposal) public proposals;
    mapping(bytes => bool) public validProposal;
    mapping(uint16 => mapping(address => bool)) public isProposalVoted;
    mapping(uint16 => mapping(address => bool)) public isNominationVoted;
    mapping(uint16 => bytes) public nominations;
    mapping(uint16 => uint128) public nominationVoteCount;

    event AddProposal(bytes[] contents, bool[] isImportants, uint16 startIndex, uint16 totalProposal);

    function initialize(address _owner, IAccountManager _accountManager) public {
        require(!initialized, "initialized");
        initOwnable(_owner);
        accountManager = _accountManager;
        initialized = true;
    }

    function setStatus(STATUS _status) public onlyOwner {
        status = _status;
    }

    function setLimitNominationVoted(uint16 _limitNominationVoted) public onlyOwner {
        limitNominationVoted = _limitNominationVoted;
    }

    function checkBytesEmpty(bytes memory data) public pure {
        if(data.length == 64) {

        bytes memory empty = abi.encode("");
        uint total = 0;
        for(uint i = 0; i < data.length; i++) {
            if(data[i] == empty[i]) {
                total += 1;
            }
        }

        require(total < empty.length, "Empty content");
        }
    }

    function addProposal(bytes[] calldata contents, bool[] calldata isImportants) public onlyOwner {
        require(contents.length == isImportants.length, "Invalid array length");
        require(contents.length != 0, "Empty");
        uint256 length = contents.length;
        for (uint16 i = 0; i < length; i++) {
            checkBytesEmpty(contents[i]);
            Proposal storage _proposal = proposals[totalProposal + i + 1];
            _proposal.content = contents[i];
            _proposal.isImportant = isImportants[i];
            _proposal.totalVote = 0;
        }
        totalProposal += uint16(length);

        emit AddProposal(contents, isImportants, totalProposal - uint16(length), totalProposal);
    }

    function addNomination(bytes[] memory listNomination) public onlyOwner {
        require(listNomination.length != 0, "Empty");
        uint256 length = listNomination.length;
        for (uint index = 0; index < length; index++) {
            checkBytesEmpty(listNomination[index]);
            nominations[totalNomination + uint16(index) + 1] = listNomination[index];
        }
        totalNomination = totalNomination + uint16(length);
    }

    function vote(Answer[] calldata answers, uint16[] calldata nominationIndexs) public {
        require(status == STATUS.OPEN, "Not open");
        require(uint16(answers.length) == totalProposal, "Invalid proposal length");
        require(uint16(nominationIndexs.length) == limitNominationVoted, "Invalid nomination length");
        uint128 balance = accountManager.verifyValidAccount(msg.sender);

        for (uint256 i = 0; i < answers.length; i++) {
            require(answers[i].index > 0 && answers[i].index <= totalProposal, "Invalid proposal");
            require(!isProposalVoted[answers[i].index][msg.sender], "Cannot vote twice");
            if(answers[i].option != OPTION.NO_COMMENT) {
                proposals[answers[i].index].totalVote = proposals[answers[i].index].totalVote + balance;
                if (answers[i].option == OPTION.AGREE) {
                proposals[answers[i].index].agreeCount = proposals[answers[i].index].agreeCount + balance;

                }
            }
            isProposalVoted[answers[i].index][msg.sender] = true;
        }

        for (uint index = 0; index < limitNominationVoted; index++) {
            require(nominationIndexs[index] > 0 && nominationIndexs[index] <= totalNomination, "Invalid nomination");
            require(!isNominationVoted[nominationIndexs[index]][msg.sender], "Cannot vote twice");

            nominationVoteCount[nominationIndexs[index]] += balance;
            isNominationVoted[nominationIndexs[index]][msg.sender] = true;
        }
    }

    function getResultOfProposal(uint16 index) public view returns (uint, uint) {
        require(index > 0 && index <= totalProposal, "Invalid index");

        return (proposals[index].agreeCount, proposals[index].totalVote);
    }

    function getResultOfNomination(uint16 index) public view returns (bytes memory, uint16, uint128) {
        require(index > 0 && index <= totalNomination, "Invalid index");

        return (nominations[index], index, nominationVoteCount[index]);
    }

    function getAllResults() public view returns (Result[] memory, NominationResult[] memory) {
        Result[] memory results = new Result[](totalProposal);

        for (uint16 i = 0; i < totalProposal; i++) {
            (results[i].agree, results[i].totalVote) = getResultOfProposal(i + 1);
        }

        NominationResult[] memory nominationResults = new NominationResult[](totalNomination);
        for(uint16 index = 0; index < totalNomination; index ++) {
            (nominationResults[index].content, nominationResults[index].index, nominationResults[index].totalVote) = getResultOfNomination(index + 1);
        }

        return (results, nominationResults);
    }

    function checkUserVoted(address _user) public view returns (bool) {
        if (status == STATUS.NOT_YET || !isProposalVoted[1][_user]) {
            return false;
        }
        return true;
    }

    function getAllNominations() public view returns (uint16, Nomination[] memory) {
        Nomination[] memory listNomination = new Nomination[](totalNomination);
        uint16 len = 0;
        for(uint16 index = 0; index < totalNomination; index ++) {
            listNomination[len] = Nomination(index + 1, nominations[index + 1]);
            len += 1;
        }

        return (limitNominationVoted, listNomination);
    }
}
