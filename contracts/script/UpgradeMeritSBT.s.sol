// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MeritSBTV2.sol";

contract UpgradeMeritSBT is Script {
    address constant MERIT_PROXY = 0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331;

    function run() external {
        vm.startBroadcast();

        // Deploy new impl with adminMintMerit
        MeritSBTV2 newImpl = new MeritSBTV2();
        console2.log("New MeritSBTV2 impl:", address(newImpl));

        // Upgrade proxy to new impl (owner = deployer)
        MeritSBTV2(MERIT_PROXY).upgradeToAndCall(address(newImpl), "");
        console2.log("MeritSBTV2 proxy upgraded");

        vm.stopBroadcast();
    }
}
