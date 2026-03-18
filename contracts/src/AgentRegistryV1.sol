// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {MeritSBTV1} from "./MeritSBTV1.sol";

/// @title AgentRegistryV1
/// @notice On-chain registry of AI agents with UUPS upgradeability and Merit 2.0 dual-track system
/// @dev Part of MoltForge — The Synthesis Hackathon 2026 — "Agents that trust" track
contract AgentRegistryV1 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum AgentStatus { Unregistered, Active, Suspended }

    enum Tier { None, Bronze, Silver, Gold, Platinum }

    struct Agent {
        address wallet;
        bytes32 agentId;
        string metadataURI;
        string webhookUrl;
        uint64 registeredAt;
        AgentStatus status;
        uint256 score;
        uint32 jobsCompleted;
        uint32 rating;
        Tier tier;
    }

    // -------------------------------------------------------------------------
    // Storage (append-only for upgrade safety)
    // -------------------------------------------------------------------------

    MeritSBTV1 public meritSBT;
    uint256 public agentCount;

    mapping(uint256 => Agent) internal _agents;
    mapping(address => uint256) internal _walletToId;
    mapping(bytes32 => uint256) internal _agentIdToId;

    // --- Merit 2.0 ---

    /// @notice Minimum task value (in USDC, 6 decimals) to earn Regular Merit (default: 5 USDC)
    uint256 public meritThreshold;

    /// @notice Monthly Verified Merit allowance per verified client (default: 100)
    uint256 public verifiedMeritMonthlyAllowance;

    /// @notice address → is verified client
    mapping(address => bool) public verifiedClients;

    /// @notice verified client → remaining merit budget this month
    mapping(address => uint256) public verifiedMeritBudget;

    /// @notice verified client → timestamp of last monthly reset
    mapping(address => uint256) public verifiedMeritLastReset;

    /// @notice agent wallet → Verified Merit score (weight ×10 in getMeritScore)
    mapping(address => uint256) public verifiedMerit;

    /// @notice agent wallet → Regular Merit score (weight ×1 in getMeritScore)
    mapping(address => uint256) public regularMerit;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event AgentRegistered(uint256 indexed numericId, address indexed wallet, bytes32 indexed agentId);
    event AgentSuspended(uint256 indexed numericId);
    event AgentReactivated(uint256 indexed numericId);
    event ScoreUpdated(uint256 indexed numericId, uint256 oldScore, uint256 newScore);
    event MetadataUpdated(uint256 indexed numericId, string metadataURI);
    event JobCompleted(uint256 indexed numericId, uint32 newTotal, uint32 newRating);
    event TierUpgraded(uint256 indexed numericId, Tier newTier);
    event VerifierSBTMinted(uint256 indexed numericId, address indexed wallet, uint256 tokenId);
    event MeritSBTSet(address meritSBT);
    // Merit 2.0
    event VerifiedMeritGiven(address indexed client, address indexed agent, uint256 amount);
    event RegularMeritGiven(address indexed client, address indexed agent);
    event VerifiedClientSet(address indexed client, bool status);
    event MeritThresholdSet(uint256 threshold);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error AlreadyRegistered();
    error AgentNotFound();
    error ZeroAddress();
    error InvalidAgentId();
    error MeritSBTNotSet();
    error NotTier1();
    error NotVerifiedClient();
    error InsufficientMeritBudget();
    error TaskValueBelowThreshold();
    error AgentNotRegistered();

    // -------------------------------------------------------------------------
    // Constructor / Initializer
    // -------------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) external initializer {
        __Ownable_init(_owner);
        meritThreshold = 5e6;                  // 5 USDC (6 decimals)
        verifiedMeritMonthlyAllowance = 100;
    }

    // -------------------------------------------------------------------------
    // UUPS
    // -------------------------------------------------------------------------

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    function setMeritSBT(address _meritSBT) external onlyOwner {
        meritSBT = MeritSBTV1(_meritSBT);
        emit MeritSBTSet(_meritSBT);
    }

    // -------------------------------------------------------------------------
    // Registration
    // -------------------------------------------------------------------------

    function registerAgent(
        address wallet,
        bytes32 agentId,
        string calldata metadataURI,
        string calldata webhookUrl
    ) external returns (uint256 numericId) {
        if (wallet == address(0)) revert ZeroAddress();
        if (agentId == bytes32(0)) revert InvalidAgentId();
        if (_walletToId[wallet] != 0) revert AlreadyRegistered();
        if (_agentIdToId[agentId] != 0) revert AlreadyRegistered();

        numericId = ++agentCount;
        _agents[numericId] = Agent({
            wallet: wallet,
            agentId: agentId,
            metadataURI: metadataURI,
            webhookUrl: webhookUrl,
            registeredAt: uint64(block.timestamp),
            status: AgentStatus.Active,
            score: 0,
            jobsCompleted: 0,
            rating: 0,
            tier: Tier.None
        });
        _walletToId[wallet] = numericId;
        _agentIdToId[agentId] = numericId;
        emit AgentRegistered(numericId, wallet, agentId);
    }

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

    function suspendAgent(uint256 numericId) external onlyOwner {
        _requireExists(numericId);
        _agents[numericId].status = AgentStatus.Suspended;
        emit AgentSuspended(numericId);
    }

    function reactivateAgent(uint256 numericId) external onlyOwner {
        _requireExists(numericId);
        _agents[numericId].status = AgentStatus.Active;
        emit AgentReactivated(numericId);
    }

    // -------------------------------------------------------------------------
    // Score & jobs
    // -------------------------------------------------------------------------

    function updateScore(uint256 numericId, uint256 newScore) external onlyOwner {
        _requireExists(numericId);
        uint256 old = _agents[numericId].score;
        _agents[numericId].score = newScore;
        emit ScoreUpdated(numericId, old, newScore);
    }

    function recordJobCompleted(uint256 numericId, uint32 ratingX100) external onlyOwner {
        _requireExists(numericId);
        Agent storage a = _agents[numericId];
        a.jobsCompleted++;
        a.rating = uint32(
            (uint256(a.rating) * (a.jobsCompleted - 1) + ratingX100) / a.jobsCompleted
        );
        emit JobCompleted(numericId, a.jobsCompleted, a.rating);
        _maybeTierUp(numericId, a);
    }

    // -------------------------------------------------------------------------
    // Tier & SBT
    // -------------------------------------------------------------------------

    function mintVerifierSBT(uint256 numericId) external onlyOwner {
        _requireExists(numericId);
        if (address(meritSBT) == address(0)) revert MeritSBTNotSet();
        Agent storage a = _agents[numericId];
        if (a.tier < Tier.Bronze) revert NotTier1();
        uint256 tokenId = meritSBT.mintTier(a.wallet, MeritSBTV1.Tier(uint8(a.tier)));
        emit VerifierSBTMinted(numericId, a.wallet, tokenId);
    }

    // -------------------------------------------------------------------------
    // Merit 2.0
    // -------------------------------------------------------------------------

    /// @notice Give Verified Merit to an agent (weight ×10 in score)
    /// @dev Only callable by verified clients; monthly budget enforced with auto-reset
    /// @param agent  Agent wallet address
    /// @param amount Amount of Verified Merit to give (≥1)
    function giveVerifiedMerit(address agent, uint256 amount) external {
        if (!verifiedClients[msg.sender]) revert NotVerifiedClient();
        if (_walletToId[agent] == 0) revert AgentNotRegistered();

        // Auto-reset monthly budget if >30 days have passed
        _resetBudgetIfNeeded(msg.sender);

        if (verifiedMeritBudget[msg.sender] < amount) revert InsufficientMeritBudget();

        verifiedMeritBudget[msg.sender] -= amount;
        verifiedMerit[agent] += amount;

        emit VerifiedMeritGiven(msg.sender, agent, amount);
    }

    /// @notice Give Regular Merit to an agent (weight ×1 in score)
    /// @dev Any caller; requires task value ≥ meritThreshold
    /// @param agent      Agent wallet address
    /// @param taskValue  Task value in token units (e.g. USDC 6 decimals)
    function giveRegularMerit(address agent, uint256 taskValue) external {
        if (taskValue < meritThreshold) revert TaskValueBelowThreshold();
        if (_walletToId[agent] == 0) revert AgentNotRegistered();
        regularMerit[agent] += 1;
        emit RegularMeritGiven(msg.sender, agent);
    }

    /// @notice Composite Merit score: verifiedMerit×10 + regularMerit×1
    function getMeritScore(address agent) external view returns (uint256) {
        return verifiedMerit[agent] * 10 + regularMerit[agent];
    }

    function setVerifiedClient(address client, bool status) external onlyOwner {
        verifiedClients[client] = status;
        if (status) {
            // Give fresh allowance immediately on grant
            verifiedMeritBudget[client] = verifiedMeritMonthlyAllowance;
            verifiedMeritLastReset[client] = block.timestamp;
        }
        emit VerifiedClientSet(client, status);
    }

    function setMeritThreshold(uint256 threshold) external onlyOwner {
        meritThreshold = threshold;
        emit MeritThresholdSet(threshold);
    }

    function setVerifiedMeritMonthlyAllowance(uint256 allowance) external onlyOwner {
        verifiedMeritMonthlyAllowance = allowance;
    }

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    function updateMetadata(uint256 numericId, string calldata metadataURI) external onlyOwner {
        _requireExists(numericId);
        _agents[numericId].metadataURI = metadataURI;
        emit MetadataUpdated(numericId, metadataURI);
    }

    // -------------------------------------------------------------------------
    // View
    // -------------------------------------------------------------------------

    function getAgentProfile(uint256 numericId)
        external
        view
        returns (Tier tier, uint32 jobsCompleted, uint32 rating, uint256 score, AgentStatus status)
    {
        _requireExists(numericId);
        Agent memory a = _agents[numericId];
        return (a.tier, a.jobsCompleted, a.rating, a.score, a.status);
    }

    function getAgent(uint256 numericId) external view returns (Agent memory) {
        _requireExists(numericId);
        return _agents[numericId];
    }

    function getAgentIdByWallet(address wallet) external view returns (uint256) {
        return _walletToId[wallet];
    }

    function getAgentIdByAgentHash(bytes32 agentId) external view returns (uint256) {
        return _agentIdToId[agentId];
    }

    function isActive(uint256 numericId) external view returns (bool) {
        return _agents[numericId].status == AgentStatus.Active;
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _requireExists(uint256 numericId) internal view {
        if (numericId == 0 || numericId > agentCount) revert AgentNotFound();
    }

    function _maybeTierUp(uint256 numericId, Agent storage a) internal {
        Tier newTier = a.tier;
        if (a.jobsCompleted >= 100 && a.tier < Tier.Platinum) newTier = Tier.Platinum;
        else if (a.jobsCompleted >= 50 && a.tier < Tier.Gold) newTier = Tier.Gold;
        else if (a.jobsCompleted >= 20 && a.tier < Tier.Silver) newTier = Tier.Silver;
        else if (a.jobsCompleted >= 5 && a.tier < Tier.Bronze) newTier = Tier.Bronze;
        if (newTier != a.tier) {
            a.tier = newTier;
            emit TierUpgraded(numericId, newTier);
        }
    }

    /// @dev Auto-reset monthly Verified Merit budget if 30 days elapsed
    function _resetBudgetIfNeeded(address client) internal {
        if (block.timestamp >= verifiedMeritLastReset[client] + 30 days) {
            verifiedMeritBudget[client] = verifiedMeritMonthlyAllowance;
            verifiedMeritLastReset[client] = block.timestamp;
        }
    }
}
