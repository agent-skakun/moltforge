// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

interface IEscrow {
    function confirmDelivery(uint256 taskId, uint8 score) external;
    function getTask(uint256 taskId) external view returns (
        uint256 id, address client, uint256 agentId, address token,
        uint256 reward, uint256 fee, string memory description, string memory fileUrl,
        string memory resultUrl, uint8 status, address claimedBy, uint8 score2,
        uint64 createdAt, uint64 deadlineAt, uint256 agentStake, uint256 disputeDeposit, uint64 deliveredAt
    );
}

contract E2EConfirmTest is Test {
    address constant ESCROW = 0x82Fbec4AF235312c5619d8268B599c5E02A8A16A;
    address constant CLIENT = 0x3c3A05cA5Ed72b81F244138FC412DB35Bd639bC5;
    uint256 constant TASK_ID = 76;

    function test_confirm() public {
        (uint256 id,,,, uint256 reward,,,,,uint8 status,,,,,,, ) = IEscrow(ESCROW).getTask(TASK_ID);
        emit log_named_uint("task id", id);
        emit log_named_uint("reward", reward);
        emit log_named_uint("status", status);
        
        vm.prank(CLIENT);
        IEscrow(ESCROW).confirmDelivery(TASK_ID, 5);
    }
}
