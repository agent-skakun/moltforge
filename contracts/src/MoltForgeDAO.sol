// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MoltForgeDAO — Treasury contract for MoltForge protocol fees
/// @notice Collects two types of fees:
///   1. Task completion fee: 0.1% of task reward on successful completion
///   2. Dispute slash fee: 5% of agent's reward when dispute opener wins
contract MoltForgeDAO is Ownable {
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant COMPLETION_FEE_BPS = 10;   // 0.1% (10 / 10_000)
    uint256 public constant DISPUTE_SLASH_BPS   = 500;  // 5%   (500 / 10_000)
    uint256 private constant BPS_DENOM          = 10_000;

    // ─── Storage ──────────────────────────────────────────────────────────────
    /// @notice Authorized callers (Escrow contracts only)
    mapping(address => bool) public isEscrow;

    /// @notice Accumulated balance per token
    mapping(address => uint256) public treasury;

    /// @notice Total collected per token (historical)
    mapping(address => uint256) public totalCollected;

    // ─── Events ───────────────────────────────────────────────────────────────
    event CompletionFeeCollected(uint256 indexed taskId, address token, uint256 amount);
    event DisputeSlashCollected(uint256 indexed taskId, address token, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event EscrowSet(address indexed escrow, bool status);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error NotEscrow();
    error ZeroAmount();
    error InsufficientBalance();

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyEscrow() {
        if (!isEscrow[msg.sender]) revert NotEscrow();
        _;
    }

    // ─── Escrow-callable functions ────────────────────────────────────────────

    /// @notice Called by Escrow on task completion — collects 0.1% of reward
    /// @param taskId   Task ID (for event tracking)
    /// @param token    Payment token address (mUSDC)
    /// @param reward   Full task reward amount
    function collectCompletionFee(
        uint256 taskId,
        address token,
        uint256 reward
    ) external onlyEscrow {
        if (reward == 0) revert ZeroAmount();
        uint256 fee = (reward * COMPLETION_FEE_BPS) / BPS_DENOM;
        if (fee == 0) return; // reward too small
        IERC20(token).safeTransferFrom(msg.sender, address(this), fee);
        treasury[token] += fee;
        totalCollected[token] += fee;
        emit CompletionFeeCollected(taskId, token, fee);
    }

    /// @notice Called by Escrow when dispute opener wins — slashes 5% from agent reward
    /// @param taskId   Task ID (for event tracking)
    /// @param token    Payment token address (mUSDC)
    /// @param reward   Agent reward that gets slashed
    function collectDisputeSlash(
        uint256 taskId,
        address token,
        uint256 reward
    ) external onlyEscrow {
        if (reward == 0) revert ZeroAmount();
        uint256 slash = (reward * DISPUTE_SLASH_BPS) / BPS_DENOM;
        if (slash == 0) return;
        IERC20(token).safeTransferFrom(msg.sender, address(this), slash);
        treasury[token] += slash;
        totalCollected[token] += slash;
        emit DisputeSlashCollected(taskId, token, slash);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /// @notice Current treasury balance for a token
    function balance(address token) external view returns (uint256) {
        return treasury[token];
    }

    /// @notice Fee amounts for a given reward (helper for UI)
    function calculateFees(uint256 reward) external pure returns (
        uint256 completionFee,
        uint256 disputeSlash
    ) {
        completionFee = (reward * COMPLETION_FEE_BPS) / BPS_DENOM;
        disputeSlash  = (reward * DISPUTE_SLASH_BPS) / BPS_DENOM;
    }

    // ─── Admin functions ──────────────────────────────────────────────────────

    /// @notice Authorize or revoke an Escrow contract
    function setEscrow(address escrow, bool status) external onlyOwner {
        isEscrow[escrow] = status;
        emit EscrowSet(escrow, status);
    }

    /// @notice Withdraw accumulated fees to a recipient (DAO governance)
    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        if (amount > treasury[token]) revert InsufficientBalance();
        treasury[token] -= amount;
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }

    /// @notice Withdraw all fees for a token
    function withdrawAll(address token, address to) external onlyOwner {
        uint256 amount = treasury[token];
        if (amount == 0) revert ZeroAmount();
        treasury[token] = 0;
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }
}
