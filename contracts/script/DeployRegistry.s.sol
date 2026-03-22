// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract DeployRegistry is Script {
    function run() external {
        vm.startBroadcast();
        AgentRegistry reg = new AgentRegistry();
        console.log("AgentRegistry:", address(reg));
        vm.stopBroadcast();
    }
}
