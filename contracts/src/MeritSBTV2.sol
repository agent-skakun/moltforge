// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title MeritSBTV2
/// @notice XP-based reputation system for AI agents on MoltForge
/// @dev UUPS upgradeable. XP formula: baseXP = sqrt(rewardUsd) / 10, with multipliers.
///      Tier thresholds are owner-configurable (no redeploy needed).
contract MeritSBTV2 is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    // ─── Types ────────────────────────────────────────────────────────────────

    enum Tier { Crab, Lobster, Squid, Octopus, Shark }

    struct Reputation {
        uint256 totalWeightedScore; // sum(score x rewardWei) — for weighted avg display
        uint256 totalWeight;        // sum(rewardWei)
        uint256 totalJobs;
        uint256 totalVolume;        // USDC wei (6 decimals)
        uint256 totalXP;            // accumulated XP (18 decimals, e.g. 1e18 = 1 XP)
        uint64  lastUpdated;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    address public escrow;

    mapping(uint256 => Reputation) private _rep;
    mapping(uint256 => mapping(uint256 => bool)) private _rated;

    uint256 public agentCount;

    // ─── Tier thresholds (XP, 18 decimals) — owner-configurable ──────────────
    //
    // Default values match the landing page:
    //   Crab:    0 – 499 XP
    //   Lobster: 500 – 1 999 XP
    //   Squid:   2 000 – 7 999 XP
    //   Octopus: 8 000 – 24 999 XP
    //   Shark:   25 000+ XP

    uint256 public lobsterMinXP  =    500e18;
    uint256 public squidMinXP    =  2_000e18;
    uint256 public octopusMinXP  =  8_000e18;
    uint256 public sharkMinXP    = 25_000e18;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MIN_REWARD     = 1e6;    // 1 USDC (6 decimals)
    uint256 public constant SCORE_PRECISION = 1e18;

    // ─── Events ───────────────────────────────────────────────────────────────

    event MeritMinted(uint256 indexed agentId, uint256 indexed taskId, uint8 score, uint256 reward, uint256 xpEarned);
    event EscrowUpdated(address indexed newEscrow);
    event TierThresholdsUpdated(uint256 lobster, uint256 squid, uint256 octopus, uint256 shark);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotEscrow();
    error InvalidScore();
    error BelowMinReward();
    error AlreadyRated();

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

    /// @notice Called by MoltForgeEscrow after confirmDelivery
    /// @param agentId   Numeric agent ID from AgentRegistry
    /// @param taskId    Escrow task ID (prevents duplicate rating)
    /// @param score     Client rating 1–5
    /// @param reward    USDC amount in wei (6 decimals)
    /// @param isLate    True if delivered after deadline
    /// @param disputeOpened True if client opened a dispute (penalty)
    function mintMerit(
        uint256 agentId,
        uint256 taskId,
        uint8   score,
        uint256 reward,
        bool    isLate,
        bool    disputeOpened
    ) external {
        if (msg.sender != escrow) revert NotEscrow();
        if (score < 1 || score > 5) revert InvalidScore();
        if (reward < MIN_REWARD)    revert BelowMinReward();
        if (_rated[agentId][taskId]) revert AlreadyRated();

        _rated[agentId][taskId] = true;

        Reputation storage r = _rep[agentId];
        if (r.totalJobs == 0) agentCount += 1;

        r.totalWeightedScore += uint256(score) * reward;
        r.totalWeight        += reward;
        r.totalJobs          += 1;
        r.totalVolume        += reward;
        r.lastUpdated         = uint64(block.timestamp);

        // ── XP calculation ──────────────────────────────────────────────────
        // baseXP = sqrt(rewardUsd) / 10  (in 1e18 units)
        // rewardUsd = reward / 1e6  (USDC 6 decimals)
        // We compute: baseXP = sqrt(reward * 1e30) / (10 * 1e6) / 1e6 * 1e18
        // Simplified: baseXP = sqrt(reward * 1e6) * 1e8 / 1e6  = sqrt(reward) * 1e2
        // But to keep precision: baseXP18 = isqrt(reward * 1e30) / 1000
        uint256 xp = _computeXP(reward, score, isLate, disputeOpened);
        r.totalXP += xp;

        emit MeritMinted(agentId, taskId, score, reward, xp);
    }

    /// @notice Legacy 4-arg mintMerit for backward compat with old Escrow
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
        if (r.totalJobs == 0) agentCount += 1;

        r.totalWeightedScore += uint256(score) * reward;
        r.totalWeight        += reward;
        r.totalJobs          += 1;
        r.totalVolume        += reward;
        r.lastUpdated         = uint64(block.timestamp);

        uint256 xp = _computeXP(reward, score, false, false);
        r.totalXP += xp;

        emit MeritMinted(agentId, taskId, score, reward, xp);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    /// @notice Returns reputation data for an agent
    function getReputation(uint256 agentId)
        external view
        returns (uint256 weightedScore, uint256 totalJobs, uint256 totalVolume, Tier tier)
    {
        Reputation storage r = _rep[agentId];
        totalJobs   = r.totalJobs;
        totalVolume = r.totalVolume;

        if (r.totalWeight > 0) {
            weightedScore = (r.totalWeightedScore * 100) / r.totalWeight;
        }

        tier = _computeTier(r.totalXP);
    }

    /// @notice Returns XP and tier for an agent
    function getXP(uint256 agentId) external view returns (uint256 xp, Tier tier) {
        xp   = _rep[agentId].totalXP;
        tier = _computeTier(xp);
    }

    /// @notice Raw reputation storage
    function getReputationRaw(uint256 agentId)
        external view
        returns (uint256 totalWeightedScore, uint256 totalWeight, uint256 totalJobs, uint256 totalVolume, uint256 totalXP, uint64 lastUpdated)
    {
        Reputation storage r = _rep[agentId];
        return (r.totalWeightedScore, r.totalWeight, r.totalJobs, r.totalVolume, r.totalXP, r.lastUpdated);
    }

    function isRated(uint256 agentId, uint256 taskId) external view returns (bool) {
        return _rated[agentId][taskId];
    }

    function totalSupply() external view returns (uint256) {
        return agentCount;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setEscrow(address _escrow) external onlyOwner {
        escrow = _escrow;
        emit EscrowUpdated(_escrow);
    }

    /// @notice Update tier XP thresholds without redeploy
    function setTierThresholds(
        uint256 _lobster,
        uint256 _squid,
        uint256 _octopus,
        uint256 _shark
    ) external onlyOwner {
        require(_lobster < _squid && _squid < _octopus && _octopus < _shark, "Invalid thresholds order");
        lobsterMinXP = _lobster;
        squidMinXP   = _squid;
        octopusMinXP = _octopus;
        sharkMinXP   = _shark;
        emit TierThresholdsUpdated(_lobster, _squid, _octopus, _shark);
    }

    /// @notice Admin retroactive mint
    function adminMintMerit(
        uint256 agentId,
        uint256 taskId,
        uint8   score,
        uint256 reward
    ) external onlyOwner {
        if (score < 1 || score > 5) revert InvalidScore();
        if (reward < MIN_REWARD)    revert BelowMinReward();
        if (_rated[agentId][taskId]) revert AlreadyRated();

        _rated[agentId][taskId] = true;

        Reputation storage r = _rep[agentId];
        if (r.totalJobs == 0) agentCount += 1;

        r.totalWeightedScore += uint256(score) * reward;
        r.totalWeight        += reward;
        r.totalJobs          += 1;
        r.totalVolume        += reward;
        r.lastUpdated         = uint64(block.timestamp);

        uint256 xp = _computeXP(reward, score, false, false);
        r.totalXP += xp;

        emit MeritMinted(agentId, taskId, score, reward, xp);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev XP formula: baseXP = sqrt(rewardUsd) / 10
    ///      Multipliers: 5star=+50%, 4star=+10%, 2star=-25%, 1star=-25%
    ///                   late=-50%, disputeOpened=-10%
    ///      Result in 1e18 units (1 XP = 1e18)
    function _computeXP(
        uint256 reward,
        uint8   score,
        bool    isLate,
        bool    disputeOpened
    ) internal pure returns (uint256) {
        // baseXP = sqrt(reward_usdc) / 10
        // reward in 6 decimals: reward_usdc = reward / 1e6
        // baseXP in 1e18: baseXP = isqrt(reward * 1e6) * 1e5
        // because: sqrt(reward/1e6) * 1e18 / 10 = isqrt(reward) * 1e9 / 1e3 / 10 (approx)
        // Cleaner: baseXP = isqrt(reward * 1e30) / 1e6 / 10 = isqrt(reward * 1e30) / 1e7
        uint256 base = _isqrt(reward * 1e30) / 1e7;   // result in 1e18 units

        if (base == 0) return 0;

        // Apply multipliers (scaled x1000 to avoid fractions)
        uint256 bps = 1000;
        if (score == 5)        bps += 500;   // +50%
        else if (score == 4)   bps += 100;   // +10%
        else if (score <= 2)   bps -= 250;   // -25%
        if (isLate)            bps -= 500;   // -50%
        if (disputeOpened)     bps -= 100;   // -10%

        // Floor at 0
        if (bps == 0 || int256(bps) < 0) return 0;

        return (base * bps) / 1000;
    }

    /// @dev XP-based tier computation
    function _computeTier(uint256 xp) internal view returns (Tier) {
        if (xp >= sharkMinXP)   return Tier.Shark;
        if (xp >= octopusMinXP) return Tier.Octopus;
        if (xp >= squidMinXP)   return Tier.Squid;
        if (xp >= lobsterMinXP) return Tier.Lobster;
        return Tier.Crab;
    }

    /// @dev Integer square root (Babylonian method)
    function _isqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
