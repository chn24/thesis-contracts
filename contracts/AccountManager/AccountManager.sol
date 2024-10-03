// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../utils/Ownable2Step.sol";
import "../interfaces/IVotingManager.sol";
import "../interfaces/IAccountManager.sol";
import "hardhat/console.sol";

contract AccountManager is IAccountManager, Ownable2Step {
    bool private initialized;
    IVotingManager public votingManager;
    string private message;

    mapping(address => bool) public isAdmin;
    mapping(address => bool) public isValidSender;

    mapping(address => mapping(uint24 => uint128)) private balances;

    mapping(address => mapping(uint24 => DelegateInfo)) private delegateInfos;

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Not admin");
        _;
    }

    function initialize(string memory _message) public {
        require(!initialized, "Initialized");
        isAdmin[msg.sender] = true;
        message = _message;
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

    function delegate(address user) public {
        uint24 currentRound = votingManager.handleDelegate(user, msg.sender);
        require(balances[msg.sender][currentRound] > 0, "You must verify balance first");
        require(balances[user][currentRound] > 0, "User haven't verified balance yet");
        require(delegateInfos[user][currentRound].amount == 0, "User had delegated");
        require(delegateInfos[msg.sender][currentRound].amount == 0, "You had delegated");
        require(user != msg.sender, "Cannot delegate yourself");
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

    function getMessageHash(address user, uint128 amount) public view returns (bytes32) {
        return keccak256(abi.encodePacked(message, user, amount));
    }

    function getEthSignedMessageHash(bytes32 _messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        // implicitly return (r, s, v)
    }

    function verify(uint128 amount, bytes memory signature) public {
        bytes32 messageHash = getMessageHash(msg.sender, amount);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        address signer = recoverSigner(ethSignedMessageHash, signature);

        require(isAdmin[signer], "Invalid signature");
        uint24 currentRound = votingManager.totalVoting();
        require(balances[msg.sender][currentRound] == 0, "You have verified");

        balances[msg.sender][currentRound] = amount;
    }

    // function delegateVerify(address delegatedUser, uint128 amount, bytes memory signature) public {

        // require(user != msg.sender, "Cannot delegate yourself");
    //     uint24 currentRound = votingManager.totalVoting();
    //     require(balances[delegatedUser][currentRound] > 0, "User haven't verified balance yet");
    //     require(delegateInfos[delegatedUser][currentRound].amount == 0, "User had delegated");
    //     require(delegateInfos[msg.sender][currentRound].amount == 0, "You had delegated");
    //     bytes32 messageHash = getMessageHash(msg.sender, amount);
    //     bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

    //     address signer = recoverSigner(ethSignedMessageHash, signature);

    //     require(isAdmin[signer], "Invalid signature");
    //     require(balances[msg.sender][currentRound] == 0, "You have verified");

    //     balances[msg.sender][currentRound] = amount;
    //     balances[delegatedUser][currentRound] += balances[msg.sender][currentRound];
    //     delegateInfos[msg.sender][currentRound] = DelegateInfo(delegatedUser, balances[msg.sender][currentRound]);

    // }
}
