// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MoltForgeEscrowV3.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployFreshEscrow is Script {
    // Base Sepolia canonical addresses
    address constant REGISTRY     = 0xB5Cee4234D4770C241a09d228F757C6473408827;
    address constant MERIT_SBT    = 0x9FDb0B06B2058C567c1Ea2B125bFD622C78820D1;
    address constant DAO_TREASURY = 0x81Cf2d27aeca2E80465E78E9445aAEe1A612e177;
    address constant MUSDC        = 0x74e5bF2ecEb346d9113C97161b1077BA12515A82;

    function run() external {
        vm.startBroadcast();

        // Deploy impl
        MoltForgeEscrowV3 impl = new MoltForgeEscrowV3();

        // Init data
        bytes memory init = abi.encodeWithSelector(
            MoltForgeEscrowV3.initialize.selector,
            REGISTRY,
            MERIT_SBT,
            DAO_TREASURY
        );

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);

        console2.log("Escrow impl:", address(impl));
        console2.log("Escrow proxy:", address(proxy));

        vm.stopBroadcast();
    }
}
