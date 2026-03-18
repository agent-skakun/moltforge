// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MoltForgeEscrowV1} from "./MoltForgeEscrowV1.sol";

/// @notice Minimal interface to MeritSBTV2
interface IMeritSBT {
    function mintMerit(uint256 agentId, uint256 taskId, uint8 score, uint256 reward) external;
}

/// @notice Minimal interface to AgentRegistry (V1+)
interface IAgentRegistry {
    function getAgentIdByWallet(address wallet) external view returns (uint256);
}

/// @title MoltForgeEscrowV2
/// @notice Extends V1 with score-based release + MeritSBT integration
/// @dev Storage-appended UUPS upgrade, inherits all V1 storage
contract MoltForgeEscrowV2 is MoltForgeEscrowV1 {

    // ─── Appended Storage (V2) ────────────────────────────────────────────────

    address public meritSBT;
    address public agentRegistry;

    // ─── Events ───────────────────────────────────────────────────────────────

    event MeritSBTUpdated(address indexed meritSBT);
    event AgentRegistryUpdated(address indexed registry);
    event PaymentReleasedWithScore(uint256 indexed taskId, address indexed agent, uint256 amount, uint8 score);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error InvalidScore();

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setMeritSBT(address _meritSBT) external onlyOwner {
        meritSBT = _meritSBT;
        emit MeritSBTUpdated(_meritSBT);
    }

    function setAgentRegistry(address _registry) external onlyOwner {
        agentRegistry = _registry;
        emit AgentRegistryUpdated(_registry);
    }

    // ─── Core: releasePayment with score ─────────────────────────────────────

    /// @notice Client confirms task completion and rates the agent 1-5
    /// @param taskId   Escrow task ID
    /// @param score    Rating 1–5 (passed to MeritSBT)
    function releasePaymentWithScore(uint256 taskId, uint8 score) external nonReentrant taskExists(taskId) {
        if (score < 1 || score > 5) revert InvalidScore();

        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        if (t.status != TaskStatus.Delivered) revert WrongStatus(t.status, TaskStatus.Delivered);

        uint256 reward = t.reward;
        address agentWallet = t.agent;

        // Settle payment (sets status=Completed, transfers tokens)
        _settleAgent(taskId, t);

        emit PaymentReleasedWithScore(taskId, agentWallet, reward, score);

        // Mint merit (non-reverting — don't block payment if merit fails)
        if (meritSBT != address(0) && agentRegistry != address(0)) {
            try IAgentRegistry(agentRegistry).getAgentIdByWallet(agentWallet) returns (uint256 agentId) {
                if (agentId > 0) {
                    try IMeritSBT(meritSBT).mintMerit(agentId, taskId, score, reward) {
                        // success
                    } catch { /* non-reverting */ }
                }
            } catch { /* non-reverting */ }
        }
    }
}
