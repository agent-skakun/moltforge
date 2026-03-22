// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MoltForgeEscrowV3} from "../src/MoltForgeEscrowV3.sol";

contract UpgradeEscrow is Script {
    function run() external {
        address proxy = vm.envAddress("ESCROW_PROXY");
        vm.startBroadcast();
        MoltForgeEscrowV3 newImpl = new MoltForgeEscrowV3();
        console.log("New impl:", address(newImpl));
        MoltForgeEscrowV3(proxy).upgradeToAndCall(address(newImpl), "");
        console.log("Upgraded proxy:", proxy);
        vm.stopBroadcast();
    }
}
