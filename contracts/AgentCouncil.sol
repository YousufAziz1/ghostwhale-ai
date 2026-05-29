// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentCouncil
 * @dev Governs registered AI council members and archives their debate votes on-chain.
 */
contract AgentCouncil is Ownable {
    struct CouncilMember {
        string name;
        string role;
        address agentAddress; // The address associated with the agent's keypair
        bool active;
    }

    struct Vote {
        string agentName;
        string direction; // BUY / SELL / HOLD
        uint256 confidence; // basis points (0-10000)
        string reasoning;
    }

    mapping(string => CouncilMember) private _members;
    string[] private _memberNames;

    // signalId => list of votes cast
    mapping(string => Vote[]) private _signalVotes;

    event MemberRegistered(string name, string role, address indexed agentAddress);
    event VoteLogged(
        string indexed signalId,
        string indexed agentName,
        string direction,
        uint256 confidence
    );

    constructor() Ownable(msg.sender) {}

    function registerMember(
        string calldata name,
        string calldata role,
        address agentAddress
    ) external onlyOwner {
        if (_members[name].agentAddress == address(0)) {
            _memberNames.push(name);
        }
        _members[name] = CouncilMember({
            name: name,
            role: role,
            agentAddress: agentAddress,
            active: true
        });
        emit MemberRegistered(name, role, agentAddress);
    }

    function deactivateMember(string calldata name) external onlyOwner {
        require(_members[name].agentAddress != address(0), "Member does not exist");
        _members[name].active = false;
    }

    function logVote(
        string calldata signalId,
        string calldata agentName,
        string calldata direction,
        uint256 confidence,
        string calldata reasoning
    ) external onlyOwner {
        require(_members[agentName].active, "Agent is not active in council");
        
        _signalVotes[signalId].push(Vote({
            agentName: agentName,
            direction: direction,
            confidence: confidence,
            reasoning: reasoning
        }));

        emit VoteLogged(signalId, agentName, direction, confidence);
    }

    function getVotes(string calldata signalId) external view returns (Vote[] memory) {
        return _signalVotes[signalId];
    }

    function getMember(string calldata name) external view returns (CouncilMember memory) {
        return _members[name];
    }

    function getMemberNames() external view returns (string[] memory) {
        return _memberNames;
    }
}
