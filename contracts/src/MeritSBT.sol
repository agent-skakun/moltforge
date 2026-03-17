// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC5192} from "./interfaces/IERC5192.sol";

/// @title MeritSBT
/// @notice Non-transferable Soulbound Token for agent merit tiers (ERC-5192)
/// @dev Tier 1–4 certificates. Locked (soulbound) immediately on mint.
///      Part of AgentForge — The Synthesis Hackathon 2026
contract MeritSBT is ERC721, IERC5192 {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    /// @notice Merit tier
    enum Tier {
        None,     // 0 — no tier
        Bronze,   // 1
        Silver,   // 2
        Gold,     // 3
        Platinum  // 4
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public owner;
    address public minter; // address allowed to mint (e.g. AgentRegistry / backend oracle)

    uint256 private _nextTokenId;

    /// @notice tokenId → Tier
    mapping(uint256 => Tier) public tokenTier;

    /// @notice wallet → (Tier → tokenId); 0 means no token for that tier
    mapping(address => mapping(Tier => uint256)) public tierToken;

    /// @notice Base URI for metadata
    string private _baseTokenURI;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event TierMinted(address indexed to, Tier indexed tier, uint256 tokenId);
    event MinterChanged(address indexed newMinter);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error NotMinter();
    error Soulbound();
    error InvalidTier();
    error TierAlreadyHeld();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _minter, string memory baseURI_)
        ERC721("AgentForge Merit", "MERIT")
    {
        owner = msg.sender;
        minter = _minter;
        _baseTokenURI = baseURI_;
        _nextTokenId = 1;
    }

    // -------------------------------------------------------------------------
    // Mint
    // -------------------------------------------------------------------------

    /// @notice Mint a tier SBT to an agent wallet
    /// @param to   Recipient wallet
    /// @param tier Tier to award (1–4)
    function mintTier(address to, Tier tier) external returns (uint256 tokenId) {
        if (msg.sender != minter && msg.sender != owner) revert NotMinter();
        if (tier == Tier.None || uint8(tier) > 4) revert InvalidTier();
        if (tierToken[to][tier] != 0) revert TierAlreadyHeld();

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        tokenTier[tokenId] = tier;
        tierToken[to][tier] = tokenId;

        emit TierMinted(to, tier, tokenId);
        emit Locked(tokenId); // ERC-5192
    }

    // -------------------------------------------------------------------------
    // ERC-5192: Soulbound
    // -------------------------------------------------------------------------

    /// @inheritdoc IERC5192
    function locked(uint256 tokenId) external pure override returns (bool) {
        return true; // all tokens are permanently locked
    }

    // -------------------------------------------------------------------------
    // ERC-721: Block transfers (soulbound)
    // -------------------------------------------------------------------------

    /// @dev Override to block all transfers except minting (from == address(0))
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata baseURI_) external {
        if (msg.sender != owner) revert NotOwner();
        _baseTokenURI = baseURI_;
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setMinter(address newMinter) external {
        if (msg.sender != owner) revert NotOwner();
        minter = newMinter;
        emit MinterChanged(newMinter);
    }

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721)
        returns (bool)
    {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
