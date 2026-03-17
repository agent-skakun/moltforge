// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MoltForgeEscrowV1} from "../src/MoltForgeEscrowV1.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract MoltForgeEscrowV1Test is Test {
    MoltForgeEscrowV1 public escrow;
    ERC20Mock public usdc;

    address internal owner_       = address(this);
    address internal feeRecipient = makeAddr("feeRecipient");
    address internal client       = makeAddr("client");
    address internal agent        = makeAddr("agent");
    address internal arbiter      = makeAddr("arbiter");

    uint256 constant REWARD = 100e6;

    function setUp() public {
        MoltForgeEscrowV1 impl = new MoltForgeEscrowV1();
        bytes memory init = abi.encodeCall(MoltForgeEscrowV1.initialize, (feeRecipient, owner_));
        escrow = MoltForgeEscrowV1(address(new ERC1967Proxy(address(impl), init)));

        usdc = new ERC20Mock("USD Coin", "USDC", 6);
        usdc.mint(client, 10_000e6);
        vm.prank(client);
        usdc.approve(address(escrow), type(uint256).max);

        escrow.setArbiterStatus(arbiter, true);
    }

    function _createTask() internal returns (uint256) {
        vm.prank(client);
        return escrow.createTask(address(usdc), REWARD, "ipfs://brief", 0);
    }

    // --- Initialize ---

    function test_Initialize() public view {
        assertEq(escrow.owner(), owner_);
        assertEq(escrow.feeRecipient(), feeRecipient);
        assertEq(escrow.PROTOCOL_FEE_BPS(), 250);
    }

    // --- Happy path ---

    function test_HappyPath() public {
        uint256 taskId = _createTask();
        uint256 fee = (REWARD * 250) / 10_000;

        vm.prank(agent);
        escrow.acceptTask(taskId);
        vm.prank(agent);
        escrow.submitDelivery(taskId, "ipfs://delivery");
        vm.prank(client);
        escrow.releasePayment(taskId);

        assertEq(usdc.balanceOf(agent), REWARD);
        assertEq(usdc.balanceOf(feeRecipient), fee);
    }

    // --- Dispute ---

    function test_Dispute_AgentWins() public {
        uint256 taskId = _createTask();
        uint256 fee = (REWARD * 250) / 10_000;

        vm.prank(agent); escrow.acceptTask(taskId);
        vm.prank(agent); escrow.submitDelivery(taskId, "ipfs://work");
        vm.prank(client); escrow.openDispute(taskId);
        escrow.setArbiter(taskId, arbiter);
        vm.prank(agent); escrow.voteDispute(taskId, true);
        vm.prank(arbiter); escrow.voteDispute(taskId, true);

        assertEq(usdc.balanceOf(agent), REWARD);
        assertEq(usdc.balanceOf(feeRecipient), fee);
    }

    function test_Dispute_ClientWins() public {
        uint256 taskId = _createTask();
        uint256 fee = (REWARD * 250) / 10_000;
        uint256 clientBefore = usdc.balanceOf(client);

        vm.prank(agent); escrow.acceptTask(taskId);
        vm.prank(agent); escrow.submitDelivery(taskId, "ipfs://work");
        vm.prank(client); escrow.openDispute(taskId);
        escrow.setArbiter(taskId, arbiter);
        vm.prank(client); escrow.voteDispute(taskId, false);
        vm.prank(arbiter); escrow.voteDispute(taskId, false);

        assertEq(usdc.balanceOf(client), clientBefore + REWARD);
        assertEq(usdc.balanceOf(feeRecipient), fee);
    }

    // --- Cancel ---

    function test_Cancel() public {
        uint256 taskId = _createTask();
        uint256 fee = (REWARD * 250) / 10_000;
        uint256 before = usdc.balanceOf(client);
        vm.prank(client);
        escrow.cancelTask(taskId);
        assertEq(usdc.balanceOf(client), before + REWARD + fee);
    }

    // --- Pause ---

    function test_Pause() public {
        escrow.pause();
        vm.prank(client);
        vm.expectRevert();
        escrow.createTask(address(usdc), REWARD, "", 0);
        escrow.unpause();
        _createTask(); // works
    }

    // --- Upgrade ---

    function test_Upgrade_OnlyOwner() public {
        MoltForgeEscrowV1 newImpl = new MoltForgeEscrowV1();
        vm.prank(agent);
        vm.expectRevert();
        escrow.upgradeToAndCall(address(newImpl), "");
    }
}
