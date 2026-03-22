// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";

interface IEscrow {
    function createTask(address,uint256,uint256,string calldata,string calldata,uint64) external returns (uint256);
    function claimTask(uint256) external;
    function submitResult(uint256,string calldata) external;
    function confirmDelivery(uint256,uint8) external;
    function taskCount() external view returns (uint256);
}
interface IUSDC {
    function mint(address,uint256) external;
    function approve(address,uint256) external returns (bool);
}

// Step 1: client creates task
contract E2ECanonical_Step1 is Script {
    address constant ESCROW  = 0x82Fbec4AF235312c5619d8268B599c5E02A8A16A;
    address constant MUSDC   = 0x74e5bF2ecEb346d9113C97161b1077BA12515A82;
    uint256 constant CLIENT_PK = 0x2590c45efe96127964ec62d9d4917f8d68dee1f98f0a93e35a3b2ee55c65077b;
    address constant CLIENT    = 0x815DCEbB61dc64c2BD4cBDD97774Cccd45887409;
    uint256 constant AGENT_ID  = 6;
    uint256 constant REWARD = 5_000_000;

    function run() external {
        vm.startBroadcast(CLIENT_PK);
        IUSDC(MUSDC).mint(CLIENT, REWARD * 2);
        IUSDC(MUSDC).approve(ESCROW, REWARD * 2);
        uint256 tid = IEscrow(ESCROW).createTask(
            MUSDC, REWARD, AGENT_ID,
            "E2E canonical MeritSBT wiring verification",
            "", 0
        );
        console2.log("createTask taskId:", tid);
        vm.stopBroadcast();
    }
}

// Step 2: agent claims + submits
contract E2ECanonical_Step2 is Script {
    address constant ESCROW  = 0x82Fbec4AF235312c5619d8268B599c5E02A8A16A;
    address constant MUSDC   = 0x74e5bF2ecEb346d9113C97161b1077BA12515A82;
    uint256 constant AGENT_PK  = 0xeba5387f59195d02139cdbaf8c0a3502591e9e866474633fd30ee54c64be359c;
    address constant AGENT     = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
    uint256 constant STAKE = 250_000;

    function run() external {
        uint256 tid = IEscrow(ESCROW).taskCount();
        console2.log("claiming taskId:", tid);
        vm.startBroadcast(AGENT_PK);
        IUSDC(MUSDC).mint(AGENT, STAKE);
        IUSDC(MUSDC).approve(ESCROW, STAKE);
        IEscrow(ESCROW).claimTask(tid);
        console2.log("claimTask ok");
        IEscrow(ESCROW).submitResult(tid, "https://moltforge.cloud/e2e-canonical-meritsbt-result");
        console2.log("submitResult ok");
        vm.stopBroadcast();
    }
}

// Step 3: client confirms
contract E2ECanonical_Step3 is Script {
    address constant ESCROW  = 0x82Fbec4AF235312c5619d8268B599c5E02A8A16A;
    uint256 constant CLIENT_PK = 0x2590c45efe96127964ec62d9d4917f8d68dee1f98f0a93e35a3b2ee55c65077b;

    function run() external {
        uint256 tid = IEscrow(ESCROW).taskCount();
        console2.log("confirming taskId:", tid);
        vm.startBroadcast(CLIENT_PK);
        IEscrow(ESCROW).confirmDelivery(tid, 4);
        console2.log("confirmDelivery(score=4) ok");
        vm.stopBroadcast();
    }
}
