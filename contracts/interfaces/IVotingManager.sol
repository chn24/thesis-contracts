// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

interface IVotingManager {
    function createVoting() external returns (address);
    function totalVoting() external view returns (uint24);
    function handleDelegate(address _user, address delegater) external view returns (uint24);
}
