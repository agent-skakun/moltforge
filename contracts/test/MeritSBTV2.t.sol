// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MeritSBTV2} from "../src/MeritSBTV2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MeritSBTV2Test is Test {
    MeritSBTV2 public merit;
    address public owner = address(0x1);
    address public escrow = address(0x2);
    address public agent1 = address(0x3);

    function setUp() public {
        MeritSBTV2 impl = new MeritSBTV2();
        bytes memory initData = abi.encodeCall(MeritSBTV2.initialize, (escrow, owner));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        merit = MeritSBTV2(address(proxy));
    }

    function test_mintMerit_basic() public {
        vm.prank(escrow);
        merit.mintMerit(1, 1, 5, 10e6); // agentId=1, taskId=1, score=5, 10 USDC

        (uint256 score, uint256 jobs, uint256 volume, MeritSBTV2.Tier tier) = merit.getReputation(1);
        assertEq(jobs, 1);
        assertEq(score, 500); // 5 × 10e6 / 10e6 × 100 = 500
        assertEq(volume, 10e6);
        // 1 job, score=500 — below SILVER_JOBS(10) threshold → Lobster (index 1)
        assertEq(uint8(tier), uint8(MeritSBTV2.Tier.Lobster));
    }

    function test_mintMerit_weightedAverage() public {
        vm.startPrank(escrow);
        merit.mintMerit(1, 1, 4, 10e6); // score=4, reward=10
        merit.mintMerit(1, 2, 2, 30e6); // score=2, reward=30
        vm.stopPrank();

        // weighted = (4×10 + 2×30) / (10+30) = (40+60)/40 = 2.5 → 250
        (uint256 score, uint256 jobs,,) = merit.getReputation(1);
        assertEq(jobs, 2);
        assertEq(score, 250); // 2.50 × 100
    }

    function test_mintMerit_duplicateTaskReverts() public {
        vm.startPrank(escrow);
        merit.mintMerit(1, 1, 4, 10e6);
        vm.expectRevert(MeritSBTV2.AlreadyRated.selector);
        merit.mintMerit(1, 1, 5, 10e6);
        vm.stopPrank();
    }

    function test_mintMerit_invalidScoreReverts() public {
        vm.prank(escrow);
        vm.expectRevert(MeritSBTV2.InvalidScore.selector);
        merit.mintMerit(1, 1, 0, 10e6);
    }

    function test_mintMerit_belowMinRewardReverts() public {
        vm.prank(escrow);
        vm.expectRevert(MeritSBTV2.BelowMinReward.selector);
        merit.mintMerit(1, 1, 4, 0.5e6); // 0.5 USDC < 1 USDC min
    }

    function test_mintMerit_notEscrowReverts() public {
        vm.prank(agent1);
        vm.expectRevert(MeritSBTV2.NotEscrow.selector);
        merit.mintMerit(1, 1, 4, 10e6);
    }

    // ── Tier tests (updated to match Tier enum: Crab/Lobster/Squid/Octopus/Shark) ──

    function test_tier_lobster_default() public {
        // < SILVER_JOBS(10) → always Lobster regardless of score
        vm.startPrank(escrow);
        for (uint256 i = 1; i <= 5; i++) {
            merit.mintMerit(1, i, 5, 10e6);
        }
        vm.stopPrank();

        (,, , MeritSBTV2.Tier tier) = merit.getReputation(1);
        assertEq(uint8(tier), uint8(MeritSBTV2.Tier.Lobster));
    }

    function test_tier_squid() public {
        vm.startPrank(escrow);
        // 10 jobs with score=4.0 each (≥ SILVER_SCORE*10=350) → Squid
        for (uint256 i = 1; i <= 10; i++) {
            merit.mintMerit(1, i, 4, 10e6);
        }
        vm.stopPrank();

        (uint256 score, uint256 jobs,, MeritSBTV2.Tier tier) = merit.getReputation(1);
        assertEq(jobs, 10);
        assertEq(score, 400); // 4.00 × 100
        assertEq(uint8(tier), uint8(MeritSBTV2.Tier.Squid));
    }

    function test_tier_octopus() public {
        vm.startPrank(escrow);
        // 50 jobs, score=5.0, volume=150 USDC > GOLD_VOL(100 USDC) → Octopus
        for (uint256 i = 1; i <= 50; i++) {
            merit.mintMerit(1, i, 5, 3e6); // 3 USDC × 50 = 150 USDC total
        }
        vm.stopPrank();

        (uint256 score, uint256 jobs, uint256 volume, MeritSBTV2.Tier tier) = merit.getReputation(1);
        assertEq(jobs, 50);
        assertEq(score, 500); // 5.00 × 100
        assertEq(volume, 150e6);
        assertEq(uint8(tier), uint8(MeritSBTV2.Tier.Octopus));
    }

    // ── totalSupply() tests (new) ──────────────────────────────────────────────

    function test_totalSupply_zero_initially() public view {
        assertEq(merit.totalSupply(), 0);
    }

    function test_totalSupply_increments_on_first_merit() public {
        assertEq(merit.totalSupply(), 0);

        vm.prank(escrow);
        merit.mintMerit(1, 1, 5, 10e6);
        assertEq(merit.totalSupply(), 1);

        // Second merit for same agent — should NOT increment
        vm.prank(escrow);
        merit.mintMerit(1, 2, 4, 10e6);
        assertEq(merit.totalSupply(), 1);
    }

    function test_totalSupply_counts_unique_agents() public {
        vm.startPrank(escrow);
        merit.mintMerit(1, 1, 5, 10e6); // agent 1
        merit.mintMerit(2, 2, 4, 10e6); // agent 2
        merit.mintMerit(3, 3, 3, 10e6); // agent 3
        merit.mintMerit(1, 4, 5, 10e6); // agent 1 again — no increment
        vm.stopPrank();

        assertEq(merit.totalSupply(), 3);
        assertEq(merit.agentCount(), 3);
    }

    function test_setEscrow_onlyOwner() public {
        address newEscrow = address(0x99);
        vm.prank(owner);
        merit.setEscrow(newEscrow);
        assertEq(merit.escrow(), newEscrow);

        vm.prank(agent1);
        vm.expectRevert();
        merit.setEscrow(agent1);
    }
}
