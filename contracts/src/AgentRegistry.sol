// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MeritSBT} from "./MeritSBT.sol";

/// @title AgentRegistry
/// @notice On-chain registry of AI agents for AgentScore reputation system
/// @dev Part of The Synthesis Hackathon 2026 — "Agents that trust" track
contract AgentRegistry {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    /// @notice Agent status in the registry
    enum AgentStatus {
        Unregistered, // 0 — default, not in registry
        Active,       // 1 — registered and active
        Suspended     // 2 — suspended (e.g. malicious behaviour detected)
    }

    /// @notice Agent tier aligned with MeritSBT tiers
    enum Tier {
        None,     // 0 — no tier
        Bronze,   // 1
        Silver,   // 2
        Gold,     // 3
        Platinum  // 4
    }

    /// @notice Core agent record stored on-chain
    struct Agent {
        address wallet;        // EVM wallet controlling this agent
        bytes32 agentId;       // unique agent identifier (keccak256 of agentId string)
        string metadataURI;    // IPFS/Arweave URI with extended agent metadata
        string webhookUrl;     // off-chain webhook for task notifications
        uint64 registeredAt;   // Unix timestamp of registration
        AgentStatus status;    // Current status
        uint256 score;         // Aggregated reputation score (scaled ×1e18)
        uint32 jobsCompleted;  // total successfully completed tasks
        uint32 rating;         // average rating ×100 (e.g. 450 = 4.50 / 5.00)
        Tier tier;             // current merit tier
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @notice Owner of the registry (can suspend agents, update score)
    address public owner;

    /// @notice Reference to MeritSBT contract for Tier 1 minting
    MeritSBT public meritSBT;

    /// @notice Total number of registered agents
    uint256 public agentCount;

    /// @notice numeric ID → Agent record (IDs start from 1)
    mapping(uint256 => Agent) private _agents;

    /// @notice wallet address → numeric agent ID (0 = not registered)
    mapping(address => uint256) private _walletToId;

    /// @notice agentId hash → numeric agent ID (0 = not registered)
    mapping(bytes32 => uint256) private _agentIdToId;

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

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error AlreadyRegistered();
    error AgentNotFound();
    error ZeroAddress();
    error InvalidAgentId();
    error MeritSBTNotSet();
    error NotTier1();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
    }

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    function setMeritSBT(address _meritSBT) external onlyOwner {
        meritSBT = MeritSBT(_meritSBT);
        emit MeritSBTSet(_meritSBT);
    }

    // -------------------------------------------------------------------------
    // Registration
    // -------------------------------------------------------------------------

    /// @notice Register a new agent
    /// @param wallet       EVM wallet of the agent
    /// @param agentId      keccak256 hash of the agent's unique string ID
    /// @param metadataURI  IPFS/Arweave URI
    /// @param webhookUrl   Optional webhook for task notifications
    /// @return numericId   Assigned numeric ID (starts from 1)
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
    // Status management
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
    // Score & job tracking (called by ScoreAggregator / Escrow)
    // -------------------------------------------------------------------------

    /// @notice Update reputation score
    function updateScore(uint256 numericId, uint256 newScore) external onlyOwner {
        _requireExists(numericId);
        uint256 old = _agents[numericId].score;
        _agents[numericId].score = newScore;
        emit ScoreUpdated(numericId, old, newScore);
    }

    /// @notice Record a completed job and update rating
    /// @param numericId   Agent numeric ID
    /// @param ratingX100  Rating for this job (0–500, i.e. 0–5.00 stars ×100)
    function recordJobCompleted(uint256 numericId, uint32 ratingX100) external onlyOwner {
        _requireExists(numericId);
        Agent storage a = _agents[numericId];
        a.jobsCompleted++;
        // Rolling average rating
        a.rating = uint32(
            (uint256(a.rating) * (a.jobsCompleted - 1) + ratingX100) / a.jobsCompleted
        );
        emit JobCompleted(numericId, a.jobsCompleted, a.rating);
        // Auto-upgrade tier
        _maybeTierUp(numericId, a);
    }

    // -------------------------------------------------------------------------
    // Tier & SBT
    // -------------------------------------------------------------------------

    /// @notice Manually mint Verifier SBT when agent first reaches Tier 1 (Bronze)
    function mintVerifierSBT(uint256 numericId) external onlyOwner {
        _requireExists(numericId);
        if (address(meritSBT) == address(0)) revert MeritSBTNotSet();
        Agent storage a = _agents[numericId];
        if (a.tier < Tier.Bronze) revert NotTier1();
        uint256 tokenId = meritSBT.mintTier(a.wallet, MeritSBT.Tier(uint8(a.tier)));
        emit VerifierSBTMinted(numericId, a.wallet, tokenId);
    }

    // -------------------------------------------------------------------------
    // Metadata — callable by the agent's own wallet (self-sovereign)
    // -------------------------------------------------------------------------

    /// @notice Update metadataURI — only the agent's registered wallet can call this
    function updateMetadata(uint256 numericId, string calldata metadataURI) external {
        _requireExists(numericId);
        if (msg.sender != _agents[numericId].wallet) revert NotOwner();
        _agents[numericId].metadataURI = metadataURI;
        emit MetadataUpdated(numericId, metadataURI);
    }

    /// @notice Update webhookUrl — only the agent's registered wallet can call this
    function updateWebhook(uint256 numericId, string calldata webhookUrl) external {
        _requireExists(numericId);
        if (msg.sender != _agents[numericId].wallet) revert NotOwner();
        _agents[numericId].webhookUrl = webhookUrl;
    }

    /// @notice Admin updateMetadata (owner can fix corrupted records)
    function adminUpdateMetadata(uint256 numericId, string calldata metadataURI) external onlyOwner {
        _requireExists(numericId);
        _agents[numericId].metadataURI = metadataURI;
        emit MetadataUpdated(numericId, metadataURI);
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    /// @notice Full agent profile (matches task spec: tier, jobsCompleted, rating)
    function getAgentProfile(uint256 numericId)
        external
        view
        returns (
            Tier tier,
            uint32 jobsCompleted,
            uint32 rating,
            uint256 score,
            AgentStatus status
        )
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
    // Internal helpers
    // -------------------------------------------------------------------------

    function _requireExists(uint256 numericId) internal view {
        if (numericId == 0 || numericId > agentCount) revert AgentNotFound();
    }

    /// @dev Upgrade tier based on jobs completed milestones
    function _maybeTierUp(uint256 numericId, Agent storage a) internal {
        Tier newTier = a.tier;

        if (a.jobsCompleted >= 100 && a.tier < Tier.Platinum) {
            newTier = Tier.Platinum;
        } else if (a.jobsCompleted >= 50 && a.tier < Tier.Gold) {
            newTier = Tier.Gold;
        } else if (a.jobsCompleted >= 20 && a.tier < Tier.Silver) {
            newTier = Tier.Silver;
        } else if (a.jobsCompleted >= 5 && a.tier < Tier.Bronze) {
            newTier = Tier.Bronze;
        }

        if (newTier != a.tier) {
            a.tier = newTier;
            emit TierUpgraded(numericId, newTier);
        }
    }
}
