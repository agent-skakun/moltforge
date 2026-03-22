// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";

interface IEscrow {
    function confirmDelivery(uint256 taskId, uint8 score) external;
}

contract TestConfirm is Script {
    function run() external {
        address escrow = 0x82Fbec4AF235312c5619d8268B599c5E02A8A16A;
        address client = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
        
        vm.startPrank(client);
        IEscrow(escrow).confirmDelivery(73, 3);
        vm.stopPrank();
    }
}
