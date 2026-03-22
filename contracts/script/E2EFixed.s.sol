// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

interface IMockUSDC {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IEscrowV3 {
    function createTask(
        address tokenAddr,
        uint256 reward,
        uint256 agentId,
        string calldata description,
        string calldata fileUrl,
        uint64 deadlineAt
    ) external returns (uint256 taskId);
    function claimTask(uint256 taskId) external;
    function submitResult(uint256 taskId, string calldata resultUrl) external;
    function confirmDelivery(uint256 taskId, uint8 score) external;
}

contract E2EFixed is Script {
    address constant ESCROW   = 0x7054E30Cae71066D7f34d0b1b25fD19cF974B620;
    address constant MUSDC    = 0x74e5bF2ecEb346d9113C97161b1077BA12515A82;

    address constant CLIENT        = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
    uint256 constant CLIENT_PK     = 0xeba5387f59195d02139cdbaf8c0a3502591e9e866474633fd30ee54c64be359c;

    address constant AGENT_WALLET  = 0x815DCEbB61dc64c2BD4cBDD97774Cccd45887409;
    uint256 constant AGENT_PK      = 0x2590c45efe96127964ec62d9d4917f8d68dee1f98f0a93e35a3b2ee55c65077b;

    uint256 constant AGENT_ID = 10; // registered via registerAgent
    uint256 constant REWARD   = 5_000_000; // 5 USDC (6 dec)
    uint256 constant STAKE    = REWARD * 500 / 10000; // 5% = 250_000

    function run() external {
        // ── Step 1: Client mints USDC + approves Escrow ───────────────────
        vm.startBroadcast(CLIENT_PK);
        IMockUSDC(MUSDC).mint(CLIENT, REWARD * 2);
        IMockUSDC(MUSDC).approve(ESCROW, REWARD * 2);
        console2.log("Step 1: USDC minted + approved");

        // ── Step 2: Create direct-hire task (agentId=10) ──────────────────
        uint256 taskId = IEscrowV3(ESCROW).createTask(
            MUSDC,
            REWARD,
            AGENT_ID,
            "E2E test: confirm uint32 overflow fix on 0x7054E30C",
            "",
            0
        );
        console2.log("Step 2: createTask -> taskId:", taskId);
        vm.stopBroadcast();

        // ── Step 3: Agent mints stake + approves + claims ─────────────────
        vm.startBroadcast(AGENT_PK);
        IMockUSDC(MUSDC).mint(AGENT_WALLET, STAKE);
        IMockUSDC(MUSDC).approve(ESCROW, STAKE);
        IEscrowV3(ESCROW).claimTask(taskId);
        console2.log("Step 3: claimTask");

        // ── Step 4: Agent submits result ──────────────────────────────────
        IEscrowV3(ESCROW).submitResult(taskId, "https://moltforge.cloud/e2e-result-fixed");
        console2.log("Step 4: submitResult");
        vm.stopBroadcast();

        // ── Step 5: Client confirms delivery with score=3 ─────────────────
        vm.startBroadcast(CLIENT_PK);
        IEscrowV3(ESCROW).confirmDelivery(taskId, 3);
        console2.log("Step 5: confirmDelivery(score=3) - overflow fix verified");
        vm.stopBroadcast();
    }
}
