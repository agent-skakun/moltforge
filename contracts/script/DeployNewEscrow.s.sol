// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MoltForgeEscrowV3.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployNewEscrow is Script {
    address constant REGISTRY     = 0xB5Cee4234D4770C241a09d228F757C6473408827;
    address constant MERIT_SBT    = 0x9FDb0B06B2058C567c1Ea2B125bFD622C78820D1;
    address constant FEE_RECIPIENT = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
    address constant OWNER        = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;

    function run() external {
        vm.startBroadcast();

        MoltForgeEscrowV3 impl = new MoltForgeEscrowV3();

        bytes memory init = abi.encodeWithSelector(
            MoltForgeEscrowV3.initialize.selector,
            FEE_RECIPIENT,
            OWNER,
            MERIT_SBT,
            REGISTRY
        );

        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);

        console2.log("Escrow impl:", address(impl));
        console2.log("Escrow proxy:", address(proxy));

        vm.stopBroadcast();
    }
}
