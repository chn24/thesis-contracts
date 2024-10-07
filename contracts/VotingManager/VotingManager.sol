// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../utils/Ownable2Step.sol";
import "../proxy/ProxyAdmin.sol";
import "../interfaces/IVoting.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/IVotingManager.sol";

contract VotingManager is IVotingManager, Ownable2Step {
    address public implement;
    bool private initialized;
    IAccountManager public accountManager;

    uint24 public totalVoting;

    mapping(uint24 => Voting) public votings;

    event NewVoting(uint24 indexed index, uint24 startTime, address voting, bytes title);

    function initialize(address _implement, IAccountManager _accountManager) public {
        require(!initialized, "Initialized");
        implement = _implement;
        accountManager = _accountManager;
        initialized = true;
    }

    function createVoting(bytes memory title, uint24 startTime) public onlyOwner returns (address) {
        address _owner = owner();
        totalVoting += 1;
        bytes32 _salt = keccak256(abi.encodePacked(totalVoting, block.timestamp));
        address voting = address(new ProxyAdmin{ salt: _salt }(implement, _owner));
        IVoting(voting).initialize(_owner, accountManager);
        votings[totalVoting] = Voting(startTime, totalVoting, voting, title);
        accountManager.setIsValidSender(voting, true);

        emit NewVoting(totalVoting, startTime, voting, title);

        return voting;
    }

    function setImplement(address _implement) public onlyOwner {
        implement = _implement;
    }

    function setAccountManager(IAccountManager _accountManager) public onlyOwner {
        accountManager = _accountManager;
    }

    function handleDelegate(address _user, address delegater) public view returns (uint24) {
        require(!IVoting(votings[totalVoting].contractAddress).checkUserVoted(_user), "User had voted");
        require(!IVoting(votings[totalVoting].contractAddress).checkUserVoted(delegater), "You had voted");
        return totalVoting;
    }

    function getAllVoting() public view returns(Voting[] memory) {
        Voting[] memory listVoting = new Voting[](totalVoting);
        for(uint16 index = 0; index < totalVoting; index ++) {
            listVoting[index] = votings[index + 1];
        }
        return listVoting;
    }
}
