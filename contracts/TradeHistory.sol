// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TradeHistory
 * @dev Records realized entries, exits, and PnL metrics of execution trades on-chain.
 */
contract TradeHistory is Ownable {
    struct OnChainTrade {
        string signalId;
        string token;
        string direction;
        uint256 entryPrice; // Scaled by 1e8 for decimal precision
        uint256 exitPrice;  // Scaled by 1e8, 0 if unsettled
        uint256 sizeUsd;    // Scaled by 1e8
        int256 pnlUsd;      // Scaled by 1e8, can be negative
        uint256 timestamp;
        uint256 settledAt;
        bool settled;
    }

    mapping(string => OnChainTrade) private _trades;
    string[] private _tradeIds;

    event TradeExecuted(
        string indexed signalId,
        string token,
        string direction,
        uint256 entryPrice,
        uint256 sizeUsd,
        uint256 timestamp
    );
    
    event TradeSettled(
        string indexed signalId,
        uint256 exitPrice,
        int256 pnlUsd,
        uint256 settledAt
    );

    constructor() Ownable(msg.sender) {}

    function recordTrade(
        string calldata signalId,
        string calldata token,
        string calldata direction,
        uint256 entryPrice,
        uint256 sizeUsd
    ) external onlyOwner {
        require(!_trades[signalId].settled, "Trade already settled");
        
        _trades[signalId] = OnChainTrade({
            signalId: signalId,
            token: token,
            direction: direction,
            entryPrice: entryPrice,
            exitPrice: 0,
            sizeUsd: sizeUsd,
            pnlUsd: 0,
            timestamp: block.timestamp,
            settledAt: 0,
            settled: false
        });
        _tradeIds.push(signalId);

        emit TradeExecuted(signalId, token, direction, entryPrice, sizeUsd, block.timestamp);
    }

    function recordSettlement(
        string calldata signalId,
        uint256 exitPrice,
        int256 pnlUsd
    ) external onlyOwner {
        require(_trades[signalId].timestamp > 0, "Trade does not exist");
        require(!_trades[signalId].settled, "Trade already settled");

        OnChainTrade storage trade = _trades[signalId];
        trade.exitPrice = exitPrice;
        trade.pnlUsd = pnlUsd;
        trade.settled = true;
        trade.settledAt = block.timestamp;

        emit TradeSettled(signalId, exitPrice, pnlUsd, block.timestamp);
    }

    function getTrade(string calldata signalId) external view returns (OnChainTrade memory) {
        return _trades[signalId];
    }

    function getTradeCount() external view returns (uint256) {
        return _tradeIds.length;
    }

    function getTradeIdAt(uint256 index) external view returns (string memory) {
        require(index < _tradeIds.length, "Index out of bounds");
        return _tradeIds[index];
    }
}
