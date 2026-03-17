// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC5192} from "./interfaces/IERC5192.sol";

/// @title MeritSBTV1
/// @notice Non-transferable Soulbound Token for agent merit tiers (ERC-5192), UUPS upgradeable
/// @dev Tier 1–4 certificates. Locked (soulbound) immediately on mint.
contract MeritSBTV1 is Initializable, ERC721Upgradeable, UUPSUpgradeable, OwnableUpgradeable, IERC5192 {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum Tier {
        None,     // 0
        Bronze,   // 1
        Silver,   // 2
        Gold,     // 3
        Platinum  // 4
    }

    // -------------------------------------------------------------------------
    // Storage (upgradeable-safe: never reorder/remove)
    // -------------------------------------------------------------------------

    /// @notice address allowed to mint (e.g. AgentRegistryV1)
    address public minter;

    uint256 private _nextTokenId;

    /// @notice tokenId → Tier
    mapping(uint256 => Tier) public tokenTier;

    /// @notice wallet → (Tier → tokenId); 0 means no token for that tier
    mapping(address => mapping(Tier => uint256)) public tierToken;

    string private _baseTokenURI;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event TierMinted(address indexed to, Tier indexed tier, uint256 tokenId);
    event MinterChanged(address indexed newMinter);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotMinter();
    error Soulbound();
    error InvalidTier();
    error TierAlreadyHeld();

    // -------------------------------------------------------------------------
    // Constructor / Initializer
    // -------------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _minter, string memory baseURI_, address _owner) external initializer {
        __ERC721_init("AgentForge Merit", "MERIT");
        __Ownable_init(_owner);
        minter = _minter;
        _baseTokenURI = baseURI_;
        _nextTokenId = 1;
    }

    // -------------------------------------------------------------------------
    // UUPS
    // -------------------------------------------------------------------------

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // -------------------------------------------------------------------------
    // Mint
    // -------------------------------------------------------------------------

    function mintTier(address to, Tier tier) external returns (uint256 tokenId) {
        if (msg.sender != minter && msg.sender != owner()) revert NotMinter();
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

    function locked(uint256 /*tokenId*/) external pure override returns (bool) {
        return true;
    }

    // -------------------------------------------------------------------------
    // ERC-721: Block transfers
    // -------------------------------------------------------------------------

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

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    function setMinter(address newMinter) external onlyOwner {
        minter = newMinter;
        emit MinterChanged(newMinter);
    }

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
