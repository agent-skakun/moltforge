// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import {ERC1967Proxy} from "lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MoltForgeEscrowV3} from "../src/MoltForgeEscrowV3.sol";
contract DeployEscrowFresh is Script {
    function run() external {
        address registry = 0xaB0009F91e5457fF5aA9cFB539820Bd3F74C713e;
        address merit    = 0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331;
        address dao      = 0x81Cf2d27aeca2E80465E78E9445aAEe1A612e177;
        address owner    = 0xa8E929BAeDC0C0F7E4ECf4d2945d2E7f17b751eD;
        address impl     = 0x8d6e43efd160dEA4d89bFc231e498ADEbc3aaE3F;
        bytes memory init = abi.encodeCall(MoltForgeEscrowV3.initialize, (dao, owner, merit, registry));
        vm.startBroadcast();
        ERC1967Proxy proxy = new ERC1967Proxy(impl, init);
        vm.stopBroadcast();
        console.log("FreshEscrow:", address(proxy));
    }
}
