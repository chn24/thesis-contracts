// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

interface IVotingManager {
    struct Voting {
        uint24 date;
        uint24 index;
        address contractAddress;
        bytes title;
    }
    
    function createVoting(bytes memory title, uint24 startTime) external returns (address);
    function totalVoting() external view returns (uint24);
    function handleDelegate(address _user, address delegater) external view returns (uint24);
}
