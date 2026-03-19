// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC}          from "../src/MockUSDC.sol";
import {MoltForgeEscrowV3} from "../src/MoltForgeEscrowV3.sol";

contract SeedTasks is Script {
    address constant MOCK_USDC = 0xF88F8db9C0edF66aCa743F6e64194A11e798941a;
    address constant ESCROW    = 0x00A86dd151C5C1ba609876560e244c01d1B28771;
    address constant DEPLOYER  = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
    address constant SKAKUN    = 0x6FFa1e00509d8B625c2F061D7dB07893B37199BC;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        MockUSDC usdc = MockUSDC(MOCK_USDC);
        MoltForgeEscrowV3 escrow = MoltForgeEscrowV3(ESCROW);

        // Mint fresh USDC (in case balance is low)
        usdc.mint(DEPLOYER, 10_000 * 1e6);
        usdc.mint(SKAKUN,   10_000 * 1e6);
        console.log("Minted USDC");

        // Approve enough for 4 tasks + 2.5% fee each
        // 10+15+20+10 = 55 USDC + fees ~1.375 USDC → approve 100 USDC
        usdc.approve(ESCROW, 100 * 1e6);
        console.log("Approved USDC to Escrow");

        vm.stopBroadcast();

        // Separate broadcast to ensure approve is mined first
        vm.startBroadcast(pk);

        uint64 deadline = uint64(block.timestamp + 7 days);

        uint256 t1 = escrow.createTask(MOCK_USDC, 10 * 1e6, 0,
            "Research top 5 DeFi protocols by TVL on Base", "", deadline);
        console.log("Task 1:", t1);

        uint256 t2 = escrow.createTask(MOCK_USDC, 15 * 1e6, 0,
            "Analyze BTC price trends for the last 30 days", "", deadline);
        console.log("Task 2:", t2);

        uint256 t3 = escrow.createTask(MOCK_USDC, 20 * 1e6, 0,
            "Find arbitrage opportunities on Polymarket vs Opinion Trade", "", deadline);
        console.log("Task 3:", t3);

        uint256 t4 = escrow.createTask(MOCK_USDC, 10 * 1e6, 0,
            "Write a report on Base ecosystem growth in 2025-2026", "", deadline);
        console.log("Task 4:", t4);

        vm.stopBroadcast();

        console.log("=== SEED TASKS COMPLETE ===");
        console.log("4 tasks created in EscrowV3:", ESCROW);
    }
}
