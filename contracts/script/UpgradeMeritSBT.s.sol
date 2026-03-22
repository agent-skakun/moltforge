// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MeritSBTV2.sol";

/// @notice Upgrade MeritSBTV2 proxy to new impl with XP-based tiers
/// Proxy address stays the same: 0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331
/// Owner: 0x9061bF366221eC610144890dB619CEBe3F26DC5d
contract UpgradeMeritSBT is Script {
    address constant PROXY = 0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331;

    function run() external {
        vm.startBroadcast();

        // Deploy new implementation
        MeritSBTV2 newImpl = new MeritSBTV2();
        console2.log("New impl:", address(newImpl));

        // Upgrade proxy to new impl (no re-init needed — storage preserved)
        MeritSBTV2(PROXY).upgradeToAndCall(address(newImpl), "");
        console2.log("Proxy upgraded:", PROXY);
        console2.log("XP-based tiers active");
        console2.log("Lobster: 500 XP, Squid: 2000 XP, Octopus: 8000 XP, Shark: 25000 XP");

        vm.stopBroadcast();
    }
}
