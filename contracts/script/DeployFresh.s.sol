// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MoltForgeEscrowV3} from "../src/MoltForgeEscrowV3.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployFresh is Script {
    function run() external {
        address agentReg  = vm.envAddress("AGENT_REG");
        address meritSbt  = vm.envAddress("MERIT_SBT");
        address feeAddr   = vm.envAddress("FEE_RECIPIENT");
        address owner     = vm.envAddress("MAIN_ADDR");

        vm.startBroadcast();

        MoltForgeEscrowV3 impl = new MoltForgeEscrowV3();
        bytes memory init = abi.encodeCall(
            MoltForgeEscrowV3.initialize,
            (feeAddr, owner, meritSbt, agentReg)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);

        console.log("IMPL:", address(impl));
        console.log("PROXY:", address(proxy));
        vm.stopBroadcast();
    }
}
