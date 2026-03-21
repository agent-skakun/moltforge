// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Test.sol";

interface IEscrowV3 {
    struct Task {
        uint256 id;
        address client;
        uint256 agentId;
        address token;
        uint256 reward;
        uint256 fee;
        string description;
        string fileUrl;
        string resultUrl;
        uint8 status;
        address claimedBy;
        uint8 score;
        uint64 createdAt;
        uint64 deadlineAt;
        uint256 agentStake;
        uint256 disputeDeposit;
        uint64 deliveredAt;
    }
    
    function confirmDelivery(uint256 taskId, uint8 score) external;
}

// Minimal copy of _finalizeConfirm to debug step by step
contract DebugConfirm2Test is Test {
    address escrow = 0x82Fbec4AF235312c5619d8268B599c5E02A8A16A;
    address client = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;

    function setUp() public {
        vm.createSelectFork("https://sepolia.base.org");
    }

    // Read task data from storage slots
    function testReadTask73() public {
        // _tasks mapping - find its slot
        // Check contract storage layout
        address impl = 0xF2FC5E2A25135a31519e4d0789eb03d8783904f5;
        
        // Read storage slot 0..20 of proxy (uses impl storage layout)
        for (uint256 i = 0; i < 20; i++) {
            bytes32 val = vm.load(escrow, bytes32(i));
            if (val != bytes32(0)) {
                console.log("slot", i);
                console.logBytes32(val);
            }
        }
    }

    function testDirectConfirmWithVerboseRevert() public {
        // Try to execute step by step
        uint256 reward = 5000000; // 5 USDC
        uint256 fee = (reward * 10) / 10000; // 0.1%
        console.log("fee:", fee);
        uint256 agentPayout = reward - fee;
        console.log("agentPayout:", agentPayout);
        
        // This is all fine, no overflow
        // Let's try the actual call and see what happens at each step
        
        // Try calling with score=1 (should work since task 72 was score=1?)
        // Actually task 73 is status=Delivered, try score=1
        vm.prank(client);
        try IEscrowV3(escrow).confirmDelivery(73, 1) {
            console.log("score=1: success");
        } catch Error(string memory reason) {
            console.log("score=1 revert:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("score=1 low-level revert:");
            console.logBytes(lowLevelData);
        }
    }
}
