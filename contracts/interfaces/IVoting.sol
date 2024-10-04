// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IAccountManager.sol";

interface IVoting {
    enum STATUS {
        NOT_YET,
        PAUSED,
        OPEN,
        CLOSED
    }

    enum OPTION {
        AGREE,
        IGNORE,
        NO_COMMENT
    }

    struct Proposal {
        bytes content;
        bool isImportant;
        uint128 totalVote;
        mapping(OPTION => uint128) options;
    }

    struct Answer {
        uint16 index;
        OPTION option;
    }

    struct Nomination {
        uint16 index;
        bytes content;
    }

    struct Result {
        uint agree;
        uint ignore;
        uint noComment;
    }

    struct NominationResult {
        uint16 index;
        bytes content;
        uint128 totalVote;
    }

    function initialize(address _owner, IAccountManager _accountManager) external;
    function status() external view returns (STATUS);
    function checkUserVoted(address _user) external view returns (bool);
}
