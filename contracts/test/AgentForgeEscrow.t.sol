// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {AgentForgeEscrow} from "../src/AgentForgeEscrow.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract AgentForgeEscrowTest is Test {
    AgentForgeEscrow public escrow;
    ERC20Mock public usdc;

    address internal feeRecipient = makeAddr("feeRecipient");
    address internal client       = makeAddr("client");
    address internal agent        = makeAddr("agent");
    address internal arbiter      = makeAddr("arbiter");

    uint256 constant REWARD = 100e6; // 100 USDC (6 decimals)

    function setUp() public {
        escrow = new AgentForgeEscrow(feeRecipient);
        usdc   = new ERC20Mock("USD Coin", "USDC", 6);

        // Fund client
        usdc.mint(client, 10_000e6);
        vm.prank(client);
        usdc.approve(address(escrow), type(uint256).max);

        // Whitelist arbiter
        escrow.setArbiterStatus(arbiter, true);
    }

    // -------------------------------------------------------------------------
    // Task creation
    // -------------------------------------------------------------------------

    function _createTask() internal returns (uint256 taskId) {
        vm.prank(client);
        taskId = escrow.createTask(address(usdc), REWARD, "ipfs://brief", 0);
    }

    function test_CreateTask_Success() public {
        uint256 taskId = _createTask();
        assertEq(taskId, 1);

        AgentForgeEscrow.Task memory t = escrow.getTask(1);
        assertEq(t.client, client);
        assertEq(t.reward, REWARD);
        assertEq(uint8(t.status), uint8(AgentForgeEscrow.TaskStatus.Open));

        uint256 fee = (REWARD * 250) / 10_000;
        assertEq(t.fee, fee);
        // escrow holds reward + fee
        assertEq(usdc.balanceOf(address(escrow)), REWARD + fee);
    }

    function test_CreateTask_RevertZeroReward() public {
        vm.prank(client);
        vm.expectRevert(AgentForgeEscrow.ZeroReward.selector);
        escrow.createTask(address(usdc), 0, "", 0);
    }

    function test_CreateTask_RevertDeadlineInPast() public {
        vm.warp(1_000_000); // ensure block.timestamp > 0
        vm.prank(client);
        vm.expectRevert(AgentForgeEscrow.DeadlineInPast.selector);
        escrow.createTask(address(usdc), REWARD, "", uint64(block.timestamp - 1));
    }

    // -------------------------------------------------------------------------
    // Happy path
    // -------------------------------------------------------------------------

    function test_HappyPath_CreateAcceptDeliverRelease() public {
        uint256 taskId = _createTask();
        uint256 fee = (REWARD * 250) / 10_000;

        // agent accepts
        vm.prank(agent);
        escrow.acceptTask(taskId);
        assertEq(uint8(escrow.getTask(taskId).status), uint8(AgentForgeEscrow.TaskStatus.InProgress));

        // agent delivers
        vm.prank(agent);
        escrow.submitDelivery(taskId, "ipfs://delivery");
        assertEq(uint8(escrow.getTask(taskId).status), uint8(AgentForgeEscrow.TaskStatus.Delivered));

        // client releases
        vm.prank(client);
        escrow.releasePayment(taskId);
        assertEq(uint8(escrow.getTask(taskId).status), uint8(AgentForgeEscrow.TaskStatus.Completed));

        assertEq(usdc.balanceOf(agent), REWARD);
        assertEq(usdc.balanceOf(feeRecipient), fee);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    // -------------------------------------------------------------------------
    // Cancel
    // -------------------------------------------------------------------------

    function test_Cancel_Open() public {
        uint256 taskId = _createTask();
        uint256 fee = (REWARD * 250) / 10_000;
        uint256 before = usdc.balanceOf(client);

        vm.prank(client);
        escrow.cancelTask(taskId);

        assertEq(usdc.balanceOf(client), before + REWARD + fee);
        assertEq(uint8(escrow.getTask(taskId).status), uint8(AgentForgeEscrow.TaskStatus.Cancelled));
    }

    function test_Cancel_RevertNotOpen() public {
        uint256 taskId = _createTask();
        vm.prank(agent);
        escrow.acceptTask(taskId);

        vm.prank(client);
        vm.expectRevert();
        escrow.cancelTask(taskId);
    }

    // -------------------------------------------------------------------------
    // Dispute: agent wins 2-of-3
    // -------------------------------------------------------------------------

    function test_Dispute_AgentWins() public {
        uint256 taskId = _createTask();
        uint256 fee = (REWARD * 250) / 10_000;

        vm.prank(agent);
        escrow.acceptTask(taskId);
        vm.prank(agent);
        escrow.submitDelivery(taskId, "ipfs://work");

        // client opens dispute
        vm.prank(client);
        escrow.openDispute(taskId);

        escrow.setArbiter(taskId, arbiter);

        // agent votes for agent
        vm.prank(agent);
        escrow.voteDispute(taskId, true);

        // arbiter votes for agent → 2-of-3 → resolved
        vm.prank(arbiter);
        escrow.voteDispute(taskId, true);

        assertEq(uint8(escrow.getTask(taskId).status), uint8(AgentForgeEscrow.TaskStatus.Completed));
        assertEq(usdc.balanceOf(agent), REWARD);
        assertEq(usdc.balanceOf(feeRecipient), fee);
    }

    function test_Dispute_ClientWins() public {
        uint256 taskId = _createTask();
        uint256 fee = (REWARD * 250) / 10_000;

        vm.prank(agent);
        escrow.acceptTask(taskId);
        vm.prank(agent);
        escrow.submitDelivery(taskId, "ipfs://work");

        vm.prank(client);
        escrow.openDispute(taskId);
        escrow.setArbiter(taskId, arbiter);

        // client votes for client
        vm.prank(client);
        escrow.voteDispute(taskId, false);

        // arbiter votes for client → 2-of-3 → resolved
        vm.prank(arbiter);
        escrow.voteDispute(taskId, false);

        assertEq(uint8(escrow.getTask(taskId).status), uint8(AgentForgeEscrow.TaskStatus.Cancelled));
        assertEq(usdc.balanceOf(client), 10_000e6 - fee); // fee kept, reward returned
    }

    // -------------------------------------------------------------------------
    // Protocol fee constant
    // -------------------------------------------------------------------------

    function test_ProtocolFee_Is250Bps() public view {
        assertEq(escrow.PROTOCOL_FEE_BPS(), 250);
    }

    // -------------------------------------------------------------------------
    // Pause
    // -------------------------------------------------------------------------

    function test_Pause_BlocksCreateTask() public {
        escrow.pause();
        vm.prank(client);
        vm.expectRevert();
        escrow.createTask(address(usdc), REWARD, "", 0);
        escrow.unpause();
        _createTask(); // works after unpause
    }
}
