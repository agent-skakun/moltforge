// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AgentRegistryV1} from "../src/AgentRegistryV1.sol";
import {MoltForgeEscrowV1} from "../src/MoltForgeEscrowV1.sol";
import {MeritSBTV1} from "../src/MeritSBTV1.sol";

/// @notice Deploy upgradeable V1 contracts (UUPS proxies)
/// @dev forge script script/DeployV1.s.sol --rpc-url <RPC> --broadcast --verify
contract DeployV1 is Script {
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);
        string memory meritBaseURI = vm.envOr("MERIT_BASE_URI", string("ipfs://agentforge-merit/"));

        console.log("=== MoltForge V1 Deploy (UUPS Upgradeable) ===");
        console.log("Deployer:     ", deployer);
        console.log("FeeRecipient: ", feeRecipient);
        console.log("Chain ID:     ", block.chainid);

        vm.startBroadcast(deployerKey);

        // --- 1. AgentRegistryV1 ---
        AgentRegistryV1 registryImpl = new AgentRegistryV1();
        bytes memory registryInit = abi.encodeCall(AgentRegistryV1.initialize, (deployer));
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInit);
        AgentRegistryV1 registry = AgentRegistryV1(address(registryProxy));
        console.log("AgentRegistryV1 impl:  ", address(registryImpl));
        console.log("AgentRegistryV1 proxy: ", address(registryProxy));

        // --- 2. MoltForgeEscrowV1 ---
        MoltForgeEscrowV1 escrowImpl = new MoltForgeEscrowV1();
        bytes memory escrowInit = abi.encodeCall(MoltForgeEscrowV1.initialize, (feeRecipient, deployer));
        ERC1967Proxy escrowProxy = new ERC1967Proxy(address(escrowImpl), escrowInit);
        console.log("MoltForgeEscrowV1 impl:  ", address(escrowImpl));
        console.log("MoltForgeEscrowV1 proxy: ", address(escrowProxy));

        // --- 3. MeritSBTV1 (minter = registry proxy) ---
        MeritSBTV1 meritImpl = new MeritSBTV1();
        bytes memory meritInit = abi.encodeCall(
            MeritSBTV1.initialize, (address(registryProxy), meritBaseURI, deployer)
        );
        ERC1967Proxy meritProxy = new ERC1967Proxy(address(meritImpl), meritInit);
        console.log("MeritSBTV1 impl:  ", address(meritImpl));
        console.log("MeritSBTV1 proxy: ", address(meritProxy));

        // --- 4. Wire registry → MeritSBT ---
        registry.setMeritSBT(address(meritProxy));

        vm.stopBroadcast();

        console.log("\n=== Proxy Addresses (use these) ===");
        console.log("{");
        console.log('  "network": "%s",', _chainName());
        console.log('  "chainId": %d,', block.chainid);
        console.log('  "AgentRegistryV1": "%s",', address(registryProxy));
        console.log('  "MoltForgeEscrowV1": "%s",', address(escrowProxy));
        console.log('  "MeritSBTV1": "%s",', address(meritProxy));
        console.log('  "USDC": "%s"', USDC_BASE);
        console.log("}");
    }

    function _chainName() internal view returns (string memory) {
        if (block.chainid == 8453)  return "base-mainnet";
        if (block.chainid == 84532) return "base-sepolia";
        return "unknown";
    }
}
