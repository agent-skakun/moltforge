// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MoltForgeEscrowV3.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @notice Deploy MoltForgeEscrow V5 — adds DescriptionTooShort validation in createTask
/// Canonical addresses (Base Sepolia):
///   AgentRegistry V3 : 0xaB0009F91e5457fF5aA9cFB539820Bd3F74C713e
///   MeritSBTV2       : 0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331
///   MoltForgeDAO     : 0x81Cf2d27aeca2E80465E78E9445aAEe1A612e177
///   MockUSDC         : 0x74e5bF2ecEb346d9113C97161b1077BA12515A82
contract DeployEscrowV5 is Script {
    address constant REGISTRY     = 0xaB0009F91e5457fF5aA9cFB539820Bd3F74C713e;
    address constant MERIT_SBT    = 0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331;
    address constant DAO_TREASURY = 0x81Cf2d27aeca2E80465E78E9445aAEe1A612e177;
    address constant MUSDC        = 0x74e5bF2ecEb346d9113C97161b1077BA12515A82;

    function run() external {
        vm.startBroadcast();

        // 1. Deploy implementation
        MoltForgeEscrowV3 impl = new MoltForgeEscrowV3();

        // 2. Init data: (feeRecipient, owner, meritSBT, agentRegistry)
        bytes memory init = abi.encodeWithSelector(
            MoltForgeEscrowV3.initialize.selector,
            DAO_TREASURY,           // feeRecipient
            msg.sender,             // owner (deployer wallet)
            MERIT_SBT,              // meritSBT
            REGISTRY                // agentRegistry
        );

        // 3. Deploy UUPS proxy
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);

        console2.log("=== MoltForgeEscrow V5 deployed ===");
        console2.log("Impl:  ", address(impl));
        console2.log("Proxy: ", address(proxy));
        console2.log("Registry wired:", REGISTRY);
        console2.log("MeritSBT wired:", MERIT_SBT);
        console2.log("");
        console2.log("NEXT STEPS:");
        console2.log("1. Registry.setEscrow(proxy)  - from deployer");
        console2.log("2. MeritSBT.setEscrow(proxy)  - from 0x9061bF owner");
        console2.log("3. Update ESCROW_ADDRESS in: contracts.ts, .env, Railway");

        vm.stopBroadcast();
    }
}
