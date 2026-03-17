// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentForgeEscrow} from "../src/AgentForgeEscrow.sol";
import {MeritSBT} from "../src/MeritSBT.sol";

/// @notice Deploy full AgentForge protocol
/// @dev Usage:
///   forge script script/Deploy.s.sol \
///     --rpc-url <RPC> --broadcast --verify \
///     --etherscan-api-key <KEY>
///
/// Environment variables:
///   PRIVATE_KEY      — deployer private key
///   FEE_RECIPIENT    — address that receives protocol fees
///   MERIT_BASE_URI   — base URI for MeritSBT metadata
contract Deploy is Script {
    // Base Mainnet USDC
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);
        string memory meritBaseURI = vm.envOr("MERIT_BASE_URI", string("ipfs://agentforge-merit/"));

        console.log("=== AgentForge Deploy ===");
        console.log("Deployer:      ", deployer);
        console.log("FeeRecipient:  ", feeRecipient);
        console.log("Chain ID:      ", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. AgentRegistry
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry: ", address(registry));

        // 2. AgentForgeEscrow
        AgentForgeEscrow escrow = new AgentForgeEscrow(feeRecipient);
        console.log("AgentForgeEscrow:", address(escrow));

        // 3. MeritSBT (minter = registry)
        MeritSBT meritSBT = new MeritSBT(address(registry), meritBaseURI);
        console.log("MeritSBT:      ", address(meritSBT));

        // 4. Wire up: registry knows about MeritSBT
        registry.setMeritSBT(address(meritSBT));

        vm.stopBroadcast();

        // Print summary
        console.log("\n=== Deployed Contracts ===");
        console.log("{");
        console.log('  "network": "%s",', _chainName());
        console.log('  "chainId": %d,', block.chainid);
        console.log('  "AgentRegistry": "%s",', address(registry));
        console.log('  "AgentForgeEscrow": "%s",', address(escrow));
        console.log('  "MeritSBT": "%s",', address(meritSBT));
        console.log('  "USDC": "%s"', USDC_BASE);
        console.log("}");
    }

    function _chainName() internal view returns (string memory) {
        if (block.chainid == 8453)  return "base-mainnet";
        if (block.chainid == 84532) return "base-sepolia";
        return "unknown";
    }
}
