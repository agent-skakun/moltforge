// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistryV1} from "../src/AgentRegistryV1.sol";
import {AgentRegistryV2} from "../src/AgentRegistryV2.sol";

/// @notice Deploy AgentRegistryV2 impl and upgrade proxy
/// @dev forge script script/UpgradeRegistryV2.s.sol --rpc-url https://sepolia.base.org --broadcast --private-key $PRIVATE_KEY
contract UpgradeRegistryV2 is Script {
    address constant PROXY = 0x68C2390146C795879758F2a71a62fd114cd1E88d;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=== AgentRegistry V1 -> V2 Upgrade ===");
        console.log("Deployer:", deployer);
        console.log("Proxy:   ", PROXY);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // Deploy new V2 implementation
        AgentRegistryV2 v2Impl = new AgentRegistryV2();
        console.log("V2 impl deployed:", address(v2Impl));

        // Upgrade proxy to V2 (no reinitializer needed — no new init state)
        AgentRegistryV1(PROXY).upgradeToAndCall(address(v2Impl), "");
        console.log("Proxy upgraded to V2");

        vm.stopBroadcast();

        // Verify
        AgentRegistryV2 registry = AgentRegistryV2(PROXY);
        console.log("Owner:      ", registry.owner());
        console.log("Agent count:", registry.agentCount());
    }
}
