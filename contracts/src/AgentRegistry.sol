// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

    /// @notice Core agent record stored on-chain
    struct Agent {
        address wallet;       // EVM wallet controlling this agent
        bytes32 did;          // Decentralised Identity identifier (keccak256 of DID string)
        string metadataURI;   // IPFS/Arweave URI with extended agent metadata (name, description, etc.)
        uint64 registeredAt;  // Unix timestamp of registration
        AgentStatus status;   // Current status
        uint256 score;        // Aggregated reputation score (scaled ×1e18)
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @notice Owner of the registry (can suspend agents, update score)
    address public owner;

    /// @notice Total number of registered agents
    uint256 public agentCount;

    /// @notice agent ID → Agent record
    mapping(uint256 => Agent) private _agents;

    /// @notice wallet address → agent ID (0 means not registered)
    mapping(address => uint256) private _walletToId;

    /// @notice DID → agent ID (0 means not registered)
    mapping(bytes32 => uint256) private _didToId;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event AgentRegistered(uint256 indexed agentId, address indexed wallet, bytes32 indexed did);
    event AgentSuspended(uint256 indexed agentId);
    event AgentReactivated(uint256 indexed agentId);
    event ScoreUpdated(uint256 indexed agentId, uint256 oldScore, uint256 newScore);
    event MetadataUpdated(uint256 indexed agentId, string metadataURI);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error AlreadyRegistered();
    error AgentNotFound();
    error ZeroAddress();
    error InvalidDID();

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
    // Registration
    // -------------------------------------------------------------------------

    /// @notice Register a new agent in the registry
    /// @param wallet   EVM wallet address of the agent
    /// @param did      keccak256 hash of the agent's DID string
    /// @param metadataURI  IPFS/Arweave URI with agent metadata
    /// @return agentId The newly assigned agent ID (starts from 1)
    function registerAgent(
        address wallet,
        bytes32 did,
        string calldata metadataURI
    ) external onlyOwner returns (uint256 agentId) {
        if (wallet == address(0)) revert ZeroAddress();
        if (did == bytes32(0)) revert InvalidDID();
        if (_walletToId[wallet] != 0) revert AlreadyRegistered();
        if (_didToId[did] != 0) revert AlreadyRegistered();

        // IDs start from 1 so that 0 can serve as "not found" sentinel
        agentId = ++agentCount;

        _agents[agentId] = Agent({
            wallet: wallet,
            did: did,
            metadataURI: metadataURI,
            registeredAt: uint64(block.timestamp),
            status: AgentStatus.Active,
            score: 0
        });

        _walletToId[wallet] = agentId;
        _didToId[did] = agentId;

        emit AgentRegistered(agentId, wallet, did);
    }

    // -------------------------------------------------------------------------
    // Status management
    // -------------------------------------------------------------------------

    /// @notice Suspend an agent (e.g. detected malicious behaviour)
    function suspendAgent(uint256 agentId) external onlyOwner {
        _requireExists(agentId);
        _agents[agentId].status = AgentStatus.Suspended;
        emit AgentSuspended(agentId);
    }

    /// @notice Reactivate a previously suspended agent
    function reactivateAgent(uint256 agentId) external onlyOwner {
        _requireExists(agentId);
        _agents[agentId].status = AgentStatus.Active;
        emit AgentReactivated(agentId);
    }

    // -------------------------------------------------------------------------
    // Score management (will be called by ScoreAggregator in v2)
    // -------------------------------------------------------------------------

    /// @notice Update the reputation score for an agent
    /// @param agentId  Target agent ID
    /// @param newScore New score value (scaled ×1e18)
    function updateScore(uint256 agentId, uint256 newScore) external onlyOwner {
        _requireExists(agentId);
        uint256 old = _agents[agentId].score;
        _agents[agentId].score = newScore;
        emit ScoreUpdated(agentId, old, newScore);
    }

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    /// @notice Update the metadata URI for an agent
    function updateMetadata(uint256 agentId, string calldata metadataURI) external onlyOwner {
        _requireExists(agentId);
        _agents[agentId].metadataURI = metadataURI;
        emit MetadataUpdated(agentId, metadataURI);
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    /// @notice Get full agent record by ID
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        _requireExists(agentId);
        return _agents[agentId];
    }

    /// @notice Look up agent ID by wallet address (returns 0 if not registered)
    function getAgentIdByWallet(address wallet) external view returns (uint256) {
        return _walletToId[wallet];
    }

    /// @notice Look up agent ID by DID hash (returns 0 if not registered)
    function getAgentIdByDID(bytes32 did) external view returns (uint256) {
        return _didToId[did];
    }

    /// @notice Check whether an agent is currently active
    function isActive(uint256 agentId) external view returns (bool) {
        return _agents[agentId].status == AgentStatus.Active;
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _requireExists(uint256 agentId) internal view {
        if (agentId == 0 || agentId > agentCount) revert AgentNotFound();
    }
}
