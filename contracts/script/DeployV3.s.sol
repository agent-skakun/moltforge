// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MoltForgeEscrowV3} from "../src/MoltForgeEscrowV3.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployV3 is Script {
    // Existing addresses
    address constant DEPLOYER        = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
    address constant REGISTRY_PROXY  = 0x68C2390146C795879758F2a71a62fd114cd1E88d;
    address constant MERIT_V2_PROXY  = 0xA047f715866C15f307A7cE6Af8Ee93a02640ec20;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        // Deploy EscrowV3 implementation
        MoltForgeEscrowV3 impl = new MoltForgeEscrowV3();
        console.log("EscrowV3 impl:", address(impl));

        // Deploy proxy with full config
        bytes memory initData = abi.encodeCall(
            MoltForgeEscrowV3.initialize,
            (DEPLOYER, DEPLOYER, MERIT_V2_PROXY, REGISTRY_PROXY)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        console.log("EscrowV3 proxy:", address(proxy));

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("MoltForgeEscrowV3 proxy:", address(proxy));
        console.log("MoltForgeEscrowV3 impl:", address(impl));
        console.log("meritSBT:", MERIT_V2_PROXY);
        console.log("agentRegistry:", REGISTRY_PROXY);
    }
}
