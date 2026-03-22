// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/MeritSBTV2.sol";
contract TestUpgrade is Script {
    function run() external {
        vm.startBroadcast();
        MeritSBTV2 impl = new MeritSBTV2();
        console2.log("impl:", address(impl));
        // Try upgrade
        MeritSBTV2 proxy = MeritSBTV2(0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331);
        proxy.upgradeToAndCall(address(impl), "");
        console2.log("upgrade OK");
        vm.stopBroadcast();
    }
}
