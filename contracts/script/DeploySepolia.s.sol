// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistryV2}   from "../src/AgentRegistryV2.sol";
import {AgentRegistryV1}   from "../src/AgentRegistryV1.sol";
import {MeritSBTV2}        from "../src/MeritSBTV2.sol";
import {MoltForgeEscrowV3} from "../src/MoltForgeEscrowV3.sol";
import {MockUSDC}          from "../src/MockUSDC.sol";
import {ERC1967Proxy}      from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeploySepolia is Script {
    address constant DEPLOYER     = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
    uint16  constant FEE_BPS      = 250; // 2.5%

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        // ── 1. MockUSDC ───────────────────────────────────────────────────
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:", address(usdc));
        // Mint 100k USDC to deployer for testing
        usdc.mint(DEPLOYER, 100_000 * 1e6);

        // ── 2. AgentRegistryV2 ────────────────────────────────────────────
        AgentRegistryV2 regImpl = new AgentRegistryV2();
        bytes memory regInit = abi.encodeCall(AgentRegistryV1.initialize, (DEPLOYER));
        ERC1967Proxy regProxy = new ERC1967Proxy(address(regImpl), regInit);
        console.log("AgentRegistryV2 proxy:", address(regProxy));
        console.log("AgentRegistryV2 impl: ", address(regImpl));

        // ── 3. MeritSBTV2 ─────────────────────────────────────────────────
        MeritSBTV2 meritImpl = new MeritSBTV2();
        // escrow set to address(0) initially — wired after escrow deploy
        bytes memory meritInit = abi.encodeCall(MeritSBTV2.initialize, (address(0), DEPLOYER));
        ERC1967Proxy meritProxy = new ERC1967Proxy(address(meritImpl), meritInit);
        console.log("MeritSBTV2 proxy:", address(meritProxy));
        console.log("MeritSBTV2 impl: ", address(meritImpl));

        // ── 4. MoltForgeEscrowV3 ──────────────────────────────────────────
        MoltForgeEscrowV3 escrowImpl = new MoltForgeEscrowV3();
        bytes memory escrowInit = abi.encodeCall(
            MoltForgeEscrowV3.initialize,
            (DEPLOYER, DEPLOYER, address(meritProxy), address(regProxy))
        );
        ERC1967Proxy escrowProxy = new ERC1967Proxy(address(escrowImpl), escrowInit);
        console.log("MoltForgeEscrowV3 proxy:", address(escrowProxy));
        console.log("MoltForgeEscrowV3 impl: ", address(escrowImpl));

        // ── 5. Wire MeritSBTV2 → EscrowV3 ─────────────────────────────────
        MeritSBTV2(address(meritProxy)).setEscrow(address(escrowProxy));
        console.log("MeritSBTV2.escrow set to EscrowV3");

        vm.stopBroadcast();

        console.log("\n=== BASE SEPOLIA DEPLOYMENT ===");
        console.log("MockUSDC:            ", address(usdc));
        console.log("AgentRegistryV2:     ", address(regProxy));
        console.log("MeritSBTV2:          ", address(meritProxy));
        console.log("MoltForgeEscrowV3:   ", address(escrowProxy));
    }
}
