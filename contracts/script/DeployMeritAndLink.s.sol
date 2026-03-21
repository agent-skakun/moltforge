// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MeritSBTV2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployMeritAndLink is Script {
    address constant ESCROW = 0x7054E30Cae71066D7f34d0b1b25fD19cF974B620;
    address constant OWNER  = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;

    function run() external {
        vm.startBroadcast();

        // Deploy new MeritSBTV2 with new Escrow + deployer as owner
        MeritSBTV2 impl = new MeritSBTV2();
        bytes memory init = abi.encodeWithSelector(
            MeritSBTV2.initialize.selector,
            ESCROW,
            OWNER
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        address meritAddr = address(proxy);
        console2.log("MeritSBTV2 impl:", address(impl));
        console2.log("MeritSBTV2 proxy:", meritAddr);

        // Wire new MeritSBT into Escrow
        MoltForgeEscrowV3Interface(ESCROW).setMeritSBT(meritAddr);
        console2.log("Escrow.meritSBT updated to:", meritAddr);

        vm.stopBroadcast();
    }
}

interface MoltForgeEscrowV3Interface {
    function setMeritSBT(address _meritSBT) external;
}
