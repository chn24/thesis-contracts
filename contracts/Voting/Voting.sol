// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../utils/Ownable2Step.sol";
import "../interfaces/IVoting.sol";
import "../interfaces/IAccountManager.sol";

contract Voting is Ownable2Step, IVoting {
    bool private initialized;
    STATUS public status;
    uint16 public totalProposal;
    IAccountManager public accountManager;

    mapping(uint16 => Proposal) public proposals;
    mapping(bytes => bool) public validProposal;
    mapping(uint16 => mapping(address => bool)) public isVoted;

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

    function addProposal(bytes[] calldata contents, bool[] calldata isImportants) public onlyOwner {
        require(contents.length == isImportants.length, "Invalid array length");
        uint256 length = contents.length;
        for (uint16 i = 0; i < length; i++) {
            Proposal storage _proposal = proposals[totalProposal + i + 1];
            _proposal.content = contents[i];
            _proposal.isImportant = isImportants[i];
            _proposal.totalVote = 0;
        }
        totalProposal += uint16(length);

        emit AddProposal(contents, isImportants, totalProposal - uint16(length), totalProposal);
    }

    function vote(Answer[] calldata answers) public {
        require(status == STATUS.OPEN, "Not open");
        require(uint16(answers.length) == totalProposal, "Invalid length");
        uint128 balance = accountManager.verifyValidAccount(msg.sender);

        for (uint256 i = 0; i < answers.length; i++) {
            require(answers[i].index > 0 && answers[i].index <= totalProposal, "Invalid index");
            require(!isVoted[answers[i].index][msg.sender], "Cannot vote twice");
            proposals[answers[i].index].options[answers[i].option] += balance;
            proposals[answers[i].index].totalVote = proposals[answers[i].index].totalVote + balance;
            isVoted[answers[i].index][msg.sender] = true;
        }
    }

    function getResultOfProposal(uint16 index) public view returns (uint, uint, uint) {
        require(index > 0 && index <= totalProposal, "Invalid index");

        return (proposals[index].options[OPTION.AGREE], proposals[index].options[OPTION.IGNORE], proposals[index].options[OPTION.NO_COMMENT]);
    }

    function getAllResults() public view returns (Result[] memory) {
        Result[] memory results = new Result[](totalProposal);

        for (uint16 i = 0; i < totalProposal; i++) {
            (results[i].agree, results[i].ignore, results[i].noComment) = getResultOfProposal(i + 1);
        }

        return results;
    }

    function checkUserVoted(address _user) public view returns (bool) {
        if (status == STATUS.NOT_YET || !isVoted[1][_user]) {
            return false;
        }
        return true;
    }
}
