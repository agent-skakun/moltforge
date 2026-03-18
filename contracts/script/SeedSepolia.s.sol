// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC}          from "../src/MockUSDC.sol";
import {AgentRegistryV2}   from "../src/AgentRegistryV2.sol";
import {MoltForgeEscrowV3} from "../src/MoltForgeEscrowV3.sol";
import {IERC20}            from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SeedSepolia is Script {
    // ── Addresses ──────────────────────────────────────────────────────────
    address constant DEPLOYER      = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
    address constant SKAKUN        = 0x6FFa1e00509d8B625c2F061D7dB07893B37199BC;
    address constant MOCK_USDC     = 0x7C8192c65775Cb1ba575cb24f1a4Ea8Ec714f2Bb;
    address constant REGISTRY      = 0x0C9E94D02D48e3BE3E8892B0B8b07ba17A6EB728;
    address constant ESCROW        = 0x4B9A5C6f434C34882952F1D5ab3B4feC52BaB3Ad;
    string  constant AGENT_URL     = "https://agent-production-f600.up.railway.app";

    uint256 constant MINT_AMOUNT   = 10_000 * 1e6; // 10k USDC each
    uint64  constant DEADLINE      = 7 days;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        MockUSDC     usdc     = MockUSDC(MOCK_USDC);
        AgentRegistryV2 reg  = AgentRegistryV2(REGISTRY);
        MoltForgeEscrowV3 escrow = MoltForgeEscrowV3(ESCROW);

        // ── 1. Mint MockUSDC ──────────────────────────────────────────────
        usdc.mint(DEPLOYER, MINT_AMOUNT);
        usdc.mint(SKAKUN,   MINT_AMOUNT);
        console.log("Minted", MINT_AMOUNT / 1e6, "USDC to DEPLOYER and SKAKUN");

        // ── 2. Register reference agent ───────────────────────────────────
        // Skip if already registered
        uint256 existingId = reg.getAgentIdByWallet(DEPLOYER);
        uint256 numericId;
        if (existingId > 0) {
            numericId = existingId;
            console.log("Agent already registered, ID:", numericId);
        } else {
            bytes32 agentId = keccak256(abi.encodePacked("moltbot alpha"));
            string[] memory skills = new string[](3);
            skills[0] = "blockchain";
            skills[1] = "data-analytics";
            skills[2] = "defi-trading";

            string[] memory tools = new string[](2);
            tools[0] = "web-search";
            tools[1] = "coingecko";

            string memory metaURI = string(abi.encodePacked(
                'data:application/json;base64,',
                _b64('{"name":"MoltBot Alpha","specialization":"research","tone":"professional","description":"MoltForge reference research agent. Blockchain analytics, DeFi research, on-chain data.","llmProvider":"claude","llmModel":"claude-3-5-sonnet-20241022"}')
            ));

            numericId = reg.registerAgentV2(
                DEPLOYER, agentId, metaURI, AGENT_URL,
                keccak256(abi.encodePacked("ai-avatar")),
                skills, tools, AGENT_URL
            );
            console.log("Registered MoltBot Alpha, ID:", numericId);
        }

        // ── 3. Approve USDC for escrow ────────────────────────────────────
        uint256 totalReward = (10 + 15 + 20 + 10) * 1e6; // 55 USDC
        // fee = reward * 250 / 10000 = 2.5%, total ≈ 56.4 USDC → approve 100 USDC
        usdc.approve(ESCROW, 100 * 1e6);

        // ── 4. Create tasks ───────────────────────────────────────────────
        uint64 deadline = uint64(block.timestamp) + DEADLINE;

        uint256 t1 = escrow.createTask(
            MOCK_USDC, 10 * 1e6, 0,
            "Research top 5 DeFi protocols by TVL on Base",
            "", deadline
        );
        console.log("Task 1 created, ID:", t1);

        uint256 t2 = escrow.createTask(
            MOCK_USDC, 15 * 1e6, 0,
            "Analyze BTC price trends for the last 30 days",
            "", deadline
        );
        console.log("Task 2 created, ID:", t2);

        uint256 t3 = escrow.createTask(
            MOCK_USDC, 20 * 1e6, 0,
            "Find arbitrage opportunities on Polymarket vs Opinion Trade",
            "", deadline
        );
        console.log("Task 3 created, ID:", t3);

        uint256 t4 = escrow.createTask(
            MOCK_USDC, 10 * 1e6, 0,
            "Write a report on Base ecosystem growth in 2025-2026",
            "", deadline
        );
        console.log("Task 4 created, ID:", t4);

        vm.stopBroadcast();

        console.log("\n=== SEED COMPLETE ===");
        console.log("MockUSDC minted: 10000 USDC x2");
        console.log("MoltBot Alpha ID:", numericId);
        console.log("Tasks created: 4 open tasks (10+15+20+10 USDC)");
        console.log("Total locked:", totalReward / 1e6, "USDC");
    }

    // Minimal base64 for short JSON strings
    function _b64(string memory s) internal pure returns (string memory) {
        bytes memory data = bytes(s);
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        bytes memory tableBytes = bytes(table);
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        uint256 i = 0;
        uint256 j = 0;
        while (i < data.length) {
            uint256 a = i < data.length ? uint8(data[i++]) : 0;
            uint256 b = i < data.length ? uint8(data[i++]) : 0;
            uint256 c = i < data.length ? uint8(data[i++]) : 0;
            uint256 triple = (a << 16) | (b << 8) | c;
            result[j++] = tableBytes[(triple >> 18) & 63];
            result[j++] = tableBytes[(triple >> 12) & 63];
            result[j++] = tableBytes[(triple >>  6) & 63];
            result[j++] = tableBytes[triple         & 63];
        }
        if (data.length % 3 == 1) { result[encodedLen - 1] = "="; result[encodedLen - 2] = "="; }
        else if (data.length % 3 == 2) { result[encodedLen - 1] = "="; }
        return string(result);
    }
}
