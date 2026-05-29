// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationManager
 * @dev Computes and maintains agent reputation score (0-1000) and risk parameters on-chain.
 */
contract ReputationManager is Ownable {
    struct AgentReputation {
        string agentName;
        uint256 score; // 0-1000
        uint256 riskScore; // 0-100 (e.g. wash trading exposure / false positive rate)
        uint256 totalDebates;
        uint256 correctVotes; // Votes that aligned with final winning trade outcomes
    }

    mapping(string => AgentReputation) private _reputations;
    string[] private _agentNames;

    event ReputationUpdated(string indexed agentName, uint256 newScore, uint256 riskScore);

    constructor() Ownable(msg.sender) {}

    function updateReputation(
        string calldata agentName,
        uint256 newScore,
        uint256 riskScore,
        bool votedCorrectly
    ) external onlyOwner {
        if (_reputations[agentName].score == 0 && _reputations[agentName].totalDebates == 0) {
            _agentNames.push(agentName);
        }
        
        AgentReputation storage rep = _reputations[agentName];
        rep.agentName = agentName;
        rep.score = newScore;
        rep.riskScore = riskScore;
        rep.totalDebates++;
        if (votedCorrectly) {
            rep.correctVotes++;
        }

        emit ReputationUpdated(agentName, newScore, riskScore);
    }

    function getReputation(string calldata agentName) external view returns (AgentReputation memory) {
        return _reputations[agentName];
    }

    function getAgentCount() external view returns (uint256) {
        return _agentNames.length;
    }

    function getAgentNameAt(uint256 index) external view returns (string memory) {
        require(index < _agentNames.length, "Index out of bounds");
        return _agentNames[index];
    }
}
