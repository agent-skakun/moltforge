// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MoltForgeEscrowV3} from "../src/MoltForgeEscrowV3.sol";
import {MeritSBTV2} from "../src/MeritSBTV2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract MoltForgeEscrowV3Test is Test {
    MoltForgeEscrowV3 escrow;
    MeritSBTV2 merit;
    ERC20Mock usdc;

    address owner   = address(0xA1);
    address fee     = address(0xFE);
    address client  = address(0xC1);
    address agent   = address(0xA2);
    address agent2  = address(0xA3);

    uint256 constant REWARD = 100e6; // 100 USDC
    uint256 constant FEE    = (REWARD * 250) / 10_000; // 2.5 USDC

    function setUp() public {
        usdc = new ERC20Mock("USD Coin", "USDC", 6);

        // Deploy MeritSBTV2
        MeritSBTV2 meritImpl = new MeritSBTV2();
        bytes memory mInit = abi.encodeCall(MeritSBTV2.initialize, (address(0), owner)); // escrow set later
        merit = MeritSBTV2(address(new ERC1967Proxy(address(meritImpl), mInit)));

        // Deploy EscrowV3
        MoltForgeEscrowV3 impl = new MoltForgeEscrowV3();
        bytes memory eInit = abi.encodeCall(
            MoltForgeEscrowV3.initialize, (fee, owner, address(merit), address(0))
        );
        escrow = MoltForgeEscrowV3(address(new ERC1967Proxy(address(impl), eInit)));

        // Set escrow on merit
        vm.prank(owner);
        merit.setEscrow(address(escrow));

        // Fund client
        usdc.mint(client, 10_000e6);
        vm.prank(client);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ─── Open Task: create + claim + submit + confirm ────────────────────────

    function test_openTask_fullFlow() public {
        // Create open task (agentId=0)
        vm.prank(client);
        uint256 taskId = escrow.createTask(
            address(usdc), REWARD, 0, "Research Base DeFi", "", uint64(block.timestamp + 7 days)
        );
        assertEq(taskId, 1);
        MoltForgeEscrowV3.Task memory t = escrow.getTask(taskId);
        assertEq(uint8(t.status), uint8(MoltForgeEscrowV3.TaskStatus.Open));
        assertEq(t.agentId, 0);

        // Agent claims
        vm.prank(agent);
        escrow.claimTask(taskId);
        t = escrow.getTask(taskId);
        assertEq(uint8(t.status), uint8(MoltForgeEscrowV3.TaskStatus.Claimed));
        assertEq(t.claimedBy, agent);

        // Agent submits result
        vm.prank(agent);
        escrow.submitResult(taskId, "ipfs://QmResult123");
        t = escrow.getTask(taskId);
        assertEq(uint8(t.status), uint8(MoltForgeEscrowV3.TaskStatus.Delivered));
        assertEq(t.resultUrl, "ipfs://QmResult123");

        // Client confirms with rating
        vm.prank(client);
        escrow.confirmDelivery(taskId, 5);
        t = escrow.getTask(taskId);
        assertEq(uint8(t.status), uint8(MoltForgeEscrowV3.TaskStatus.Confirmed));
        assertEq(t.score, 5);

        // Agent received reward
        assertEq(usdc.balanceOf(agent), REWARD);
        assertEq(usdc.balanceOf(fee), FEE);
    }

    // ─── Direct hire task ─────────────────────────────────────────────────────

    function test_directHire_task() public {
        vm.prank(client);
        uint256 taskId = escrow.createTask(
            address(usdc), REWARD, 42, "Analyze portfolio", "", uint64(block.timestamp + 3 days)
        );
        MoltForgeEscrowV3.Task memory t = escrow.getTask(taskId);
        assertEq(t.agentId, 42);
        assertEq(uint8(t.status), uint8(MoltForgeEscrowV3.TaskStatus.Open));
    }

    // ─── Cancel open task ────────────────────────────────────────────────────

    function test_cancelTask_refunds() public {
        uint256 clientBefore = usdc.balanceOf(client);

        vm.prank(client);
        uint256 taskId = escrow.createTask(
            address(usdc), REWARD, 0, "Task to cancel", "", uint64(block.timestamp + 1 days)
        );

        vm.prank(client);
        escrow.cancelTask(taskId);

        MoltForgeEscrowV3.Task memory t = escrow.getTask(taskId);
        assertEq(uint8(t.status), uint8(MoltForgeEscrowV3.TaskStatus.Cancelled));
        // Full refund (reward + fee)
        assertEq(usdc.balanceOf(client), clientBefore);
    }

    function test_cancelTask_revertsAfterClaim() public {
        vm.prank(client);
        uint256 taskId = escrow.createTask(
            address(usdc), REWARD, 0, "Task", "", uint64(block.timestamp + 1 days)
        );
        vm.prank(agent);
        escrow.claimTask(taskId);

        vm.prank(client);
        vm.expectRevert();
        escrow.cancelTask(taskId);
    }

    // ─── Dispute ─────────────────────────────────────────────────────────────

    function test_disputeTask_agentWins() public {
        vm.prank(client);
        uint256 taskId = escrow.createTask(
            address(usdc), REWARD, 0, "Task", "", uint64(block.timestamp + 1 days)
        );
        vm.prank(agent);
        escrow.claimTask(taskId);
        vm.prank(agent);
        escrow.submitResult(taskId, "ipfs://result");

        vm.prank(client);
        escrow.disputeTask(taskId);
        assertEq(uint8(escrow.getTask(taskId).status), uint8(MoltForgeEscrowV3.TaskStatus.Disputed));

        vm.prank(owner);
        escrow.resolveDispute(taskId, true);
        assertEq(usdc.balanceOf(agent), REWARD);
    }

    function test_disputeTask_clientWins() public {
        uint256 clientBefore = usdc.balanceOf(client);
        vm.prank(client);
        uint256 taskId = escrow.createTask(
            address(usdc), REWARD, 0, "Task", "", uint64(block.timestamp + 1 days)
        );
        vm.prank(agent);
        escrow.claimTask(taskId);
        vm.prank(agent);
        escrow.submitResult(taskId, "ipfs://result");
        vm.prank(client);
        escrow.disputeTask(taskId);
        vm.prank(owner);
        escrow.resolveDispute(taskId, false);
        assertEq(usdc.balanceOf(client), clientBefore - FEE); // fee kept, reward refunded
    }

    // ─── Invalid score reverts ────────────────────────────────────────────────

    function test_confirmDelivery_invalidScoreReverts() public {
        vm.prank(client);
        uint256 taskId = escrow.createTask(
            address(usdc), REWARD, 0, "Task", "", uint64(block.timestamp + 1 days)
        );
        vm.prank(agent); escrow.claimTask(taskId);
        vm.prank(agent); escrow.submitResult(taskId, "url");

        vm.prank(client);
        vm.expectRevert(MoltForgeEscrowV3.InvalidScore.selector);
        escrow.confirmDelivery(taskId, 0);

        vm.prank(client);
        vm.expectRevert(MoltForgeEscrowV3.InvalidScore.selector);
        escrow.confirmDelivery(taskId, 6);
    }

    // ─── getOpenTasks pagination ──────────────────────────────────────────────

    function test_getOpenTasks() public {
        vm.startPrank(client);
        for (uint i = 0; i < 3; i++) {
            escrow.createTask(address(usdc), REWARD, 0, "Task", "", uint64(block.timestamp + 1 days));
        }
        vm.stopPrank();

        (MoltForgeEscrowV3.Task[] memory tasks, uint256 total) = escrow.getOpenTasks(0, 10);
        assertEq(total, 3);
        assertEq(tasks.length, 3);

        (MoltForgeEscrowV3.Task[] memory page, ) = escrow.getOpenTasks(1, 1);
        assertEq(page.length, 1);
        assertEq(page[0].id, 2);
    }

    // ─── Zero reward reverts ──────────────────────────────────────────────────

    function test_createTask_zeroRewardReverts() public {
        vm.prank(client);
        vm.expectRevert(MoltForgeEscrowV3.ZeroReward.selector);
        escrow.createTask(address(usdc), 0, 0, "Task", "", uint64(block.timestamp + 1 days));
    }
}
