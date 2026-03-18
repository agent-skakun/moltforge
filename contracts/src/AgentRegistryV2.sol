// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AgentRegistryV1} from "./AgentRegistryV1.sol";

/// @title AgentRegistryV2
/// @notice Extends V1 with avatarHash, skills[], tools[], and agentUrl
/// @dev UUPS upgrade — new storage appended after V1 slots
contract AgentRegistryV2 is AgentRegistryV1 {
    // -------------------------------------------------------------------------
    // V2 Storage (appended after V1 — never reorder V1 slots)
    // -------------------------------------------------------------------------

    mapping(uint256 => bytes32)   public agentAvatarHash;
    mapping(uint256 => string[])  private _agentSkills;
    mapping(uint256 => string[])  private _agentTools;
    mapping(uint256 => string)    public agentUrl;

    // -------------------------------------------------------------------------
    // V2 Events
    // -------------------------------------------------------------------------

    event AgentRegisteredV2(
        uint256 indexed numericId,
        address indexed wallet,
        bytes32 indexed agentId,
        bytes32 avatarHash,
        string agentUrl
    );
    event AgentUrlUpdated(uint256 indexed numericId, string agentUrl);

    // -------------------------------------------------------------------------
    // V2 Registration (overloaded — new signature)
    // -------------------------------------------------------------------------

    /// @notice Register agent with extended fields (V2)
    /// @dev Duplicates V1 core logic because V1.registerAgent is external + onlyOwner
    function registerAgentV2(
        address wallet,
        bytes32 agentId,
        string calldata metadataURI,
        string calldata webhookUrl,
        bytes32 avatarHash,
        string[] calldata skills,
        string[] calldata tools,
        string calldata _agentUrl
    ) external onlyOwner returns (uint256 numericId) {
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

        // Store V2 extended fields
        agentAvatarHash[numericId] = avatarHash;
        _setStringArray(_agentSkills[numericId], skills);
        _setStringArray(_agentTools[numericId], tools);
        agentUrl[numericId] = _agentUrl;

        emit AgentRegisteredV2(numericId, wallet, agentId, avatarHash, _agentUrl);
    }

    // -------------------------------------------------------------------------
    // V2 Update
    // -------------------------------------------------------------------------

    function updateAgentUrl(uint256 numericId, string calldata _agentUrl) external onlyOwner {
        _requireExists(numericId);
        agentUrl[numericId] = _agentUrl;
        emit AgentUrlUpdated(numericId, _agentUrl);
    }

    function updateAgentSkills(uint256 numericId, string[] calldata skills) external onlyOwner {
        _requireExists(numericId);
        _setStringArray(_agentSkills[numericId], skills);
    }

    function updateAgentTools(uint256 numericId, string[] calldata tools) external onlyOwner {
        _requireExists(numericId);
        _setStringArray(_agentTools[numericId], tools);
    }

    function updateAvatarHash(uint256 numericId, bytes32 avatarHash) external onlyOwner {
        _requireExists(numericId);
        agentAvatarHash[numericId] = avatarHash;
    }

    // -------------------------------------------------------------------------
    // V2 Views
    // -------------------------------------------------------------------------

    /// @notice Get extended agent info (V2 fields)
    function getAgentExtended(uint256 numericId)
        external
        view
        returns (
            Agent memory agent,
            bytes32 avatarHash,
            string[] memory skills,
            string[] memory tools,
            string memory _agentUrl
        )
    {
        _requireExists(numericId);
        agent = _agents[numericId];
        avatarHash = agentAvatarHash[numericId];
        skills = _agentSkills[numericId];
        tools = _agentTools[numericId];
        _agentUrl = agentUrl[numericId];
    }

    function getAgentSkills(uint256 numericId) external view returns (string[] memory) {
        _requireExists(numericId);
        return _agentSkills[numericId];
    }

    function getAgentTools(uint256 numericId) external view returns (string[] memory) {
        _requireExists(numericId);
        return _agentTools[numericId];
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _setStringArray(string[] storage dest, string[] calldata src) internal {
        // Clear existing
        while (dest.length > 0) dest.pop();
        for (uint256 i = 0; i < src.length; i++) {
            dest.push(src[i]);
        }
    }
}
