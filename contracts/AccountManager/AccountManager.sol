// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../utils/Ownable2Step.sol";
import "../interfaces/IVotingManager.sol";
import "../interfaces/IAccountManager.sol";
import "hardhat/console.sol";

contract AccountManager is IAccountManager, Ownable2Step {
    bool private initialized;
    IVotingManager public votingManager;

    mapping(address => bool) public isAdmin;
    mapping(address => bool) public isValidSender;

    mapping(address => mapping(uint24 => uint128)) private balances;

    mapping(address => mapping(uint24 => DelegateInfo)) private delegateInfos;

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Not admin");
        _;
    }

    function initialize() public {
        require(!initialized, "Initialized");
        isAdmin[msg.sender] = true;
        initOwnable(msg.sender);
        initialized = true;
    }

    function setVotingManager(IVotingManager _votingManager) public onlyOwner {
        votingManager = _votingManager;
    }

    function setIsValidSender(address contractAddress, bool isValid) public onlyAdmin {
        isValidSender[contractAddress] = isValid;
    }

    function setIsAdmin(address _admin, bool _isAdmin) public onlyOwner {
        isAdmin[_admin] = _isAdmin;
    }

    function verifyBalance(uint128 amount) public {
        uint24 currentRound = votingManager.totalVoting();
        require(balances[msg.sender][currentRound] == 0, "You have verified");
        balances[msg.sender][currentRound] = amount;
    }

    function delegate(address user) public {
        uint24 currentRound = votingManager.handleDelegate(user, msg.sender);
        require(balances[msg.sender][currentRound] > 0, "You must veridy balance first");
        require(balances[user][currentRound] > 0, "User haven't verified balance yet");
        require(delegateInfos[user][currentRound].amount == 0, "User had delegated");
        require(delegateInfos[msg.sender][currentRound].amount == 0, "You had delegated");
        balances[user][currentRound] += balances[msg.sender][currentRound];
        delegateInfos[msg.sender][currentRound] = DelegateInfo(user, balances[msg.sender][currentRound]);
    }

    function getCurrentBalance() external view returns (uint128) {
        uint24 currentRound = votingManager.totalVoting();
        return balances[msg.sender][currentRound];
    }

    function verifyValidAccount(address user) public view returns (uint128) {
        uint24 currentRound = votingManager.totalVoting();
        require(isValidSender[msg.sender], "Invalid sender");
        require(balances[user][currentRound] > 0, "You can't vote");
        require(delegateInfos[user][currentRound].amount == 0, "You have delegated");
        return balances[user][currentRound];
    }
}
