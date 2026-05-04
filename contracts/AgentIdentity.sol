// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GhostWhale Agent Identity — ERC-8004 Implementation
 * @dev Each AI agent receives a unique identity NFT with on-chain reputation tracking.
 *      Reputation score (0–1000) is updated after each settled trade by the owner.
 *      Deployed on Mantle Testnet for the Turing Test Hackathon 2026.
 *
 * ERC-8004 compliance:
 *   - Agent has a persistent on-chain identity (NFT)
 *   - Performance metrics stored on-chain (win rate, P&L, signal count)
 *   - Reputation is publicly verifiable
 *   - Agent name and metadata are immutable after mint
 */
contract AgentIdentity is ERC721, Ownable {

    // ── Structs ───────────────────────────────────────────────────────────────

    struct AgentStats {
        string  agentName;
        uint256 totalSignals;
        uint256 winningSignals;
        int256  totalPnLBps;       // Cumulative P&L in basis points (1 bps = 0.01%)
        uint256 reputationScore;   // 0–1000 (derived from win rate + P&L)
        uint256 createdAt;
        bool    isActive;
    }

    // ── State ─────────────────────────────────────────────────────────────────

    mapping(uint256 => AgentStats) public agentStats;
    uint256 public nextTokenId;

    // ── Events ────────────────────────────────────────────────────────────────

    event AgentMinted(uint256 indexed tokenId, address indexed owner, string agentName);
    event StatsUpdated(uint256 indexed tokenId, uint256 reputationScore, int256 totalPnLBps);
    event AgentStatusChanged(uint256 indexed tokenId, bool isActive);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() ERC721("GhostWhale Agent", "GHOST") Ownable(msg.sender) {}

    // ── Minting ───────────────────────────────────────────────────────────────

    /**
     * @notice Mint a new agent identity NFT.
     * @param to        Recipient address (typically the deployer / operator wallet)
     * @param agentName Human-readable agent name (e.g., "GhostWhale-001")
     * @return tokenId  The minted NFT's token ID
     */
    function mintAgent(address to, string memory agentName)
        external
        onlyOwner
        returns (uint256)
    {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);

        agentStats[tokenId] = AgentStats({
            agentName:       agentName,
            totalSignals:    0,
            winningSignals:  0,
            totalPnLBps:     0,
            reputationScore: 500,   // Start at 500/1000 (neutral reputation)
            createdAt:       block.timestamp,
            isActive:        true
        });

        emit AgentMinted(tokenId, to, agentName);
        return tokenId;
    }

    // ── Stats Update ──────────────────────────────────────────────────────────

    /**
     * @notice Record the outcome of a settled trade signal.
     * @dev Only callable by owner (the GhostWhale backend operator).
     * @param tokenId   Agent NFT token ID
     * @param signalWon Whether the signal resulted in a profitable trade
     * @param pnlBps    Trade P&L in basis points (can be negative)
     */
    function updateStats(
        uint256 tokenId,
        bool    signalWon,
        int256  pnlBps
    ) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        AgentStats storage stats = agentStats[tokenId];
        require(stats.isActive, "Agent is not active");

        stats.totalSignals++;
        if (signalWon) stats.winningSignals++;
        stats.totalPnLBps += pnlBps;

        // ── Reputation formula ────────────────────────────────────────────────
        // Base: win rate scaled 0–800
        // Bonus: positive cumulative P&L adds up to 200 extra points
        uint256 winRate = stats.totalSignals > 0
            ? (stats.winningSignals * 800) / stats.totalSignals
            : 400;

        uint256 pnlBonus = 0;
        if (stats.totalPnLBps > 0) {
            // Cap P&L bonus at 200 points (earned at 10,000 bps = 100% total return)
            uint256 pnlUnsigned = uint256(stats.totalPnLBps);
            pnlBonus = pnlUnsigned >= 10_000 ? 200 : (pnlUnsigned * 200) / 10_000;
        }

        stats.reputationScore = winRate + pnlBonus;
        emit StatsUpdated(tokenId, stats.reputationScore, stats.totalPnLBps);
    }

    // ── Agent Control ─────────────────────────────────────────────────────────

    /**
     * @notice Pause or resume an agent (e.g., during maintenance).
     */
    function setAgentStatus(uint256 tokenId, bool isActive) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        agentStats[tokenId].isActive = isActive;
        emit AgentStatusChanged(tokenId, isActive);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /**
     * @notice Get full stats for an agent.
     */
    function getStats(uint256 tokenId) external view returns (AgentStats memory) {
        return agentStats[tokenId];
    }

    /**
     * @notice Compute win rate in basis points (0–10000).
     */
    function getWinRateBps(uint256 tokenId) external view returns (uint256) {
        AgentStats storage stats = agentStats[tokenId];
        if (stats.totalSignals == 0) return 0;
        return (stats.winningSignals * 10_000) / stats.totalSignals;
    }

    // ── Token URI ─────────────────────────────────────────────────────────────

    /**
     * @notice On-chain SVG token URI — no external IPFS dependency.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        AgentStats storage stats = agentStats[tokenId];

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">',
            '<rect width="400" height="400" fill="#0a0a0f"/>',
            '<text x="200" y="80" text-anchor="middle" fill="#00ff88" font-size="24" font-family="monospace">',
            unicode'🐋 GhostWhale AI</text>',
            '<text x="200" y="130" text-anchor="middle" fill="#e8e8f0" font-size="18" font-family="monospace">',
            stats.agentName, '</text>',
            '<text x="200" y="200" text-anchor="middle" fill="#00d4ff" font-size="48" font-family="monospace">',
            _uint2str(stats.reputationScore), '</text>',
            '<text x="200" y="230" text-anchor="middle" fill="#6b6b80" font-size="14" font-family="monospace">',
            'Reputation / 1000</text>',
            '<text x="200" y="290" text-anchor="middle" fill="#e8e8f0" font-size="12" font-family="monospace">',
            'Signals: ', _uint2str(stats.totalSignals), ' | Wins: ', _uint2str(stats.winningSignals),
            '</text>',
            '<text x="200" y="360" text-anchor="middle" fill="#6c63ff" font-size="10" font-family="monospace">',
            'ERC-8004 | Mantle Network | Turing Test 2026</text>',
            '</svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"', stats.agentName, '",',
            '"description":"GhostWhale AI Agent Identity NFT",',
            '"image":"data:image/svg+xml;utf8,', svg, '",',
            '"attributes":[',
            '{"trait_type":"Reputation","value":', _uint2str(stats.reputationScore), '},',
            '{"trait_type":"Total Signals","value":', _uint2str(stats.totalSignals), '},',
            '{"trait_type":"Winning Signals","value":', _uint2str(stats.winningSignals), '},',
            '{"trait_type":"Standard","value":"ERC-8004"}',
            ']}'
        ));

        return string(abi.encodePacked(
            "data:application/json;utf8,", json
        ));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
