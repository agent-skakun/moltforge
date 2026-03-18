// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MeritSBTV2} from "../src/MeritSBTV2.sol";
import {MoltForgeEscrowV2} from "../src/MoltForgeEscrowV2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract DeployV2 is Script {
    // ── Existing addresses ───────────────────────────────────────────────────
    address constant ESCROW_PROXY    = 0x85C00d51E61C8D986e0A5Ba34c9E95841f3151c4;
    address constant REGISTRY_PROXY  = 0x68C2390146C795879758F2a71a62fd114cd1E88d;
    address constant DEPLOYER        = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        // 1. Deploy MeritSBTV2 implementation
        MeritSBTV2 meritImpl = new MeritSBTV2();
        console.log("MeritSBTV2 impl:", address(meritImpl));

        // 2. Deploy proxy with ESCROW_PROXY as initial escrow (will update after escrow upgrade)
        bytes memory initData = abi.encodeCall(MeritSBTV2.initialize, (ESCROW_PROXY, DEPLOYER));
        ERC1967Proxy meritProxy = new ERC1967Proxy(address(meritImpl), initData);
        console.log("MeritSBTV2 proxy:", address(meritProxy));

        // 3. Deploy MoltForgeEscrowV2 implementation
        MoltForgeEscrowV2 escrowImpl = new MoltForgeEscrowV2();
        console.log("MoltForgeEscrowV2 impl:", address(escrowImpl));

        // 4. Upgrade existing ESCROW_PROXY to V2
        UUPSUpgradeable(ESCROW_PROXY).upgradeToAndCall(address(escrowImpl), "");
        console.log("Escrow proxy upgraded to V2");

        // 5. Configure V2 escrow: set meritSBT + agentRegistry
        MoltForgeEscrowV2 escrowV2 = MoltForgeEscrowV2(ESCROW_PROXY);
        escrowV2.setMeritSBT(address(meritProxy));
        escrowV2.setAgentRegistry(REGISTRY_PROXY);
        console.log("Escrow V2 configured");

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("MeritSBTV2 proxy (new):", address(meritProxy));
        console.log("MeritSBTV2 impl:", address(meritImpl));
        console.log("MoltForgeEscrowV2 impl:", address(escrowImpl));
        console.log("MoltForgeEscrow proxy (upgraded):", ESCROW_PROXY);
    }
}
