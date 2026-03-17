// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MeritSBT} from "../src/MeritSBT.sol";

contract MeritSBTTest is Test {
    MeritSBT public sbt;

    address internal holder  = makeAddr("holder");
    address internal holder2 = makeAddr("holder2");
    address internal minter_ = makeAddr("minter");

    function setUp() public {
        sbt = new MeritSBT(minter_, "ipfs://merit/");
    }

    function test_MintBronze() public {
        vm.prank(minter_);
        uint256 tokenId = sbt.mintTier(holder, MeritSBT.Tier.Bronze);
        assertEq(tokenId, 1);
        assertEq(sbt.balanceOf(holder), 1);
        assertEq(uint8(sbt.tokenTier(1)), uint8(MeritSBT.Tier.Bronze));
        assertEq(sbt.tierToken(holder, MeritSBT.Tier.Bronze), 1);
    }

    function test_AllTiers() public {
        vm.startPrank(minter_);
        sbt.mintTier(holder, MeritSBT.Tier.Bronze);
        sbt.mintTier(holder, MeritSBT.Tier.Silver);
        sbt.mintTier(holder, MeritSBT.Tier.Gold);
        sbt.mintTier(holder, MeritSBT.Tier.Platinum);
        vm.stopPrank();
        assertEq(sbt.balanceOf(holder), 4);
    }

    function test_Locked() public {
        vm.prank(minter_);
        uint256 tokenId = sbt.mintTier(holder, MeritSBT.Tier.Bronze);
        assertTrue(sbt.locked(tokenId));
    }

    function test_Soulbound_RevertTransfer() public {
        vm.prank(minter_);
        sbt.mintTier(holder, MeritSBT.Tier.Bronze);
        vm.prank(holder);
        vm.expectRevert(MeritSBT.Soulbound.selector);
        sbt.transferFrom(holder, holder2, 1);
    }

    function test_DuplicateTier_Revert() public {
        vm.prank(minter_);
        sbt.mintTier(holder, MeritSBT.Tier.Bronze);
        vm.prank(minter_);
        vm.expectRevert(MeritSBT.TierAlreadyHeld.selector);
        sbt.mintTier(holder, MeritSBT.Tier.Bronze);
    }

    function test_InvalidTier_Revert() public {
        vm.prank(minter_);
        vm.expectRevert(MeritSBT.InvalidTier.selector);
        sbt.mintTier(holder, MeritSBT.Tier.None);
    }

    function test_NotMinter_Revert() public {
        vm.prank(holder);
        vm.expectRevert(MeritSBT.NotMinter.selector);
        sbt.mintTier(holder2, MeritSBT.Tier.Bronze);
    }

    function test_OwnerCanMint() public {
        // owner (this contract in setUp) can also mint
        sbt.mintTier(holder, MeritSBT.Tier.Gold);
        assertEq(sbt.balanceOf(holder), 1);
    }

    function test_SupportsInterface_ERC5192() public view {
        // ERC-5192 interface id
        bytes4 erc5192 = bytes4(keccak256("locked(uint256)"));
        assertTrue(sbt.supportsInterface(erc5192));
    }

    function test_SupportsInterface_ERC721() public view {
        bytes4 erc721 = 0x80ac58cd;
        assertTrue(sbt.supportsInterface(erc721));
    }
}
