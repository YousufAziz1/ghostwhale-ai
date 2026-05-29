// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TransparencyLedger
 * @dev Integrates signals, vote audits, and execution logs on-chain for verification.
 */
contract TransparencyLedger is Ownable {
    struct AuditRecord {
        string signalId;
        bytes32 reasoningRoot; // Keccak256 root of the agent reasoning text
        address executionTarget; // The target dex router or factory contract
        uint256 blockNumber;
        uint256 timestamp;
    }

    mapping(string => AuditRecord) private _records;
    string[] private _signalIds;

    event AuditLogged(
        string indexed signalId,
        bytes32 reasoningRoot,
        address indexed executionTarget,
        uint256 blockNumber,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {}

    function logAudit(
        string calldata signalId,
        bytes32 reasoningRoot,
        address executionTarget,
        uint256 blockNumber
    ) external onlyOwner {
        _records[signalId] = AuditRecord({
            signalId: signalId,
            reasoningRoot: reasoningRoot,
            executionTarget: executionTarget,
            blockNumber: blockNumber,
            timestamp: block.timestamp
        });
        _signalIds.push(signalId);

        emit AuditLogged(signalId, reasoningRoot, executionTarget, blockNumber, block.timestamp);
    }

    function getAudit(string calldata signalId) external view returns (AuditRecord memory) {
        return _records[signalId];
    }

    function getAuditCount() external view returns (uint256) {
        return _signalIds.length;
    }
}
