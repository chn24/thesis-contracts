// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

interface IAccountManager {
    struct DelegateInfo {
        address to;
        uint128 amount;
    }
    function setIsValidSender(address contractAddress, bool isValid) external;

    function verifyValidAccount(address user) external view returns (uint128);
}
