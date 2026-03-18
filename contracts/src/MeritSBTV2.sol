// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title MeritSBTV2
/// @notice Weighted reputation system for AI agents on MoltForge
/// @dev UUPS upgradeable, only callable by MoltForgeEscrow
contract MeritSBTV2 is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    // ─── Types ────────────────────────────────────────────────────────────────

    enum Tier { Bronze, Silver, Gold, Platinum }

    struct Reputation {
        uint256 totalWeightedScore; // sum(score × rewardWei)
        uint256 totalWeight;        // sum(rewardWei)
        uint256 totalJobs;
        uint256 totalVolume;        // in USDC wei (6 decimals)
        uint64  lastUpdated;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    address public escrow;

    // agentNumericId → Reputation
    mapping(uint256 => Reputation) private _rep;

    // agentNumericId → taskId → ratingSubmitted (anti-spam)
    mapping(uint256 => mapping(uint256 => bool)) private _rated;

    // ─── Events ───────────────────────────────────────────────────────────────

    event MeritMinted(uint256 indexed agentId, uint256 indexed taskId, uint8 score, uint256 reward);
    event EscrowUpdated(address indexed newEscrow);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotEscrow();
    error InvalidScore();
    error BelowMinReward();
    error AlreadyRated();

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MIN_REWARD = 1e6;          // 1 USDC (6 decimals)
    uint256 public constant SCORE_PRECISION = 1e18;    // for weighted average calculation

    // Tier thresholds
    uint256 public constant SILVER_JOBS     = 10;
    uint256 public constant SILVER_SCORE    = 35;      // 3.5 × 10
    uint256 public constant GOLD_JOBS       = 50;
    uint256 public constant GOLD_SCORE      = 40;      // 4.0 × 10
    uint256 public constant GOLD_VOL        = 100e6;   // 100 USDC
    uint256 public constant PLATINUM_JOBS   = 200;
    uint256 public constant PLATINUM_SCORE  = 45;      // 4.5 × 10
    uint256 public constant PLATINUM_VOL    = 1000e6;  // 1000 USDC

    // ─── Constructor / Initializer ────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _escrow, address _owner) external initializer {
        __Ownable_init(_owner);
        escrow = _escrow;
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ─── Core ─────────────────────────────────────────────────────────────────

    /// @notice Called by MoltForgeEscrow after releasePayment
    /// @param agentId   Numeric agent ID from AgentRegistry
    /// @param taskId    Escrow task ID (prevents duplicate rating)
    /// @param score     Client rating 1–5
    /// @param reward    USDC amount in wei (6 decimals) — weighting factor
    function mintMerit(
        uint256 agentId,
        uint256 taskId,
        uint8   score,
        uint256 reward
    ) external {
        if (msg.sender != escrow) revert NotEscrow();
        if (score < 1 || score > 5) revert InvalidScore();
        if (reward < MIN_REWARD)    revert BelowMinReward();
        if (_rated[agentId][taskId]) revert AlreadyRated();

        _rated[agentId][taskId] = true;

        Reputation storage r = _rep[agentId];
        r.totalWeightedScore += uint256(score) * reward;
        r.totalWeight        += reward;
        r.totalJobs          += 1;
        r.totalVolume        += reward;
        r.lastUpdated         = uint64(block.timestamp);

        emit MeritMinted(agentId, taskId, score, reward);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    /// @notice Returns reputation data for an agent
    /// @return weightedScore  Weighted average score × 100 (e.g. 420 = 4.20)
    /// @return totalJobs      Total completed jobs
    /// @return totalVolume    Total USDC processed (6 decimals)
    /// @return tier           Current tier enum
    function getReputation(uint256 agentId)
        external view
        returns (uint256 weightedScore, uint256 totalJobs, uint256 totalVolume, Tier tier)
    {
        Reputation storage r = _rep[agentId];
        totalJobs   = r.totalJobs;
        totalVolume = r.totalVolume;

        // Weighted average score × 100
        if (r.totalWeight > 0) {
            weightedScore = (r.totalWeightedScore * 100) / r.totalWeight;
        }

        tier = _computeTier(totalJobs, weightedScore, totalVolume);
    }

    /// @notice Raw reputation storage
    function getReputationRaw(uint256 agentId)
        external view
        returns (uint256 totalWeightedScore, uint256 totalWeight, uint256 totalJobs, uint256 totalVolume, uint64 lastUpdated)
    {
        Reputation storage r = _rep[agentId];
        return (r.totalWeightedScore, r.totalWeight, r.totalJobs, r.totalVolume, r.lastUpdated);
    }

    /// @notice Check if a task has already been rated
    function isRated(uint256 agentId, uint256 taskId) external view returns (bool) {
        return _rated[agentId][taskId];
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setEscrow(address _escrow) external onlyOwner {
        escrow = _escrow;
        emit EscrowUpdated(_escrow);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _computeTier(uint256 jobs, uint256 score100, uint256 volume) internal pure returns (Tier) {
        if (jobs >= PLATINUM_JOBS && score100 >= PLATINUM_SCORE * 10 && volume >= PLATINUM_VOL) {
            return Tier.Platinum;
        }
        if (jobs >= GOLD_JOBS && score100 >= GOLD_SCORE * 10 && volume >= GOLD_VOL) {
            return Tier.Gold;
        }
        if (jobs >= SILVER_JOBS && score100 >= SILVER_SCORE * 10) {
            return Tier.Silver;
        }
        return Tier.Bronze;
    }
}
