// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MoltForgeEscrowV3} from "../src/MoltForgeEscrowV3.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployV3 is Script {
    // Existing addresses
    address constant DEPLOYER        = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
    address constant REGISTRY_PROXY  = 0x98b19578289DED629A0992403942ADeb2FF217C8;
    address constant MERIT_V2_PROXY  = 0x9FDb0B06B2058C567c1Ea2B125bFD622C78820D1;
    address constant DAO_TREASURY    = 0x81Cf2d27aeca2E80465E78E9445aAEe1A612e177;

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

        // Set DAO treasury
        MoltForgeEscrowV3(address(proxy)).setDaoTreasury(DAO_TREASURY);
        console.log("daoTreasury set:", DAO_TREASURY);

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("MoltForgeEscrowV3 proxy:", address(proxy));
        console.log("MoltForgeEscrowV3 impl:", address(impl));
        console.log("meritSBT:", MERIT_V2_PROXY);
        console.log("agentRegistry:", REGISTRY_PROXY);
    }
}
