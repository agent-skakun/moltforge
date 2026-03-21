// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Test.sol";

interface IEscrow {
    function confirmDelivery(uint256 taskId, uint8 score) external;
}

interface IMeritSBT {
    function mintMerit(uint256 agentId, uint256 taskId, uint8 score, uint256 reward) external;
}

contract DebugConfirmTest is Test {
    address escrow = 0x82Fbec4AF235312c5619d8268B599c5E02A8A16A;
    address meritSBT = 0x9FDb0B06B2058C567c1Ea2B125bFD622C78820D1;
    address client = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;

    function setUp() public {
        vm.createSelectFork("https://sepolia.base.org");
    }

    function testConfirmDelivery73() public {
        // Test mintMerit alone first
        (bool ok, bytes memory ret) = meritSBT.call(
            abi.encodeWithSelector(
                IMeritSBT.mintMerit.selector,
                uint256(7), uint256(73), uint8(3), uint256(5000000)
            )
        );
        console.log("mintMerit low-level call ok:", ok);
        console.logBytes(ret);
        
        // Now test confirmDelivery
        vm.prank(client);
        (bool ok2, bytes memory ret2) = escrow.call(
            abi.encodeWithSelector(
                IEscrow.confirmDelivery.selector,
                uint256(73), uint8(3)
            )
        );
        console.log("confirmDelivery low-level call ok:", ok2);
        console.logBytes(ret2);
    }
}
