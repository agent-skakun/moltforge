// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MeritSBT} from "../src/MeritSBT.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    MeritSBT public meritSBT;

    address internal agentWallet  = makeAddr("agentWallet");
    address internal agentWallet2 = makeAddr("agentWallet2");
    bytes32 internal aid1 = keccak256("agent:alpha");
    bytes32 internal aid2 = keccak256("agent:beta");

    function setUp() public {
        registry = new AgentRegistry();
        meritSBT = new MeritSBT(address(registry), "ipfs://merit/");
        registry.setMeritSBT(address(meritSBT));
    }

    // --- Registration ---

    function test_RegisterAgent_Success() public {
        uint256 id = registry.registerAgent(agentWallet, aid1, "ipfs://Qm123", "https://hook.io");
        assertEq(id, 1);
        assertEq(registry.agentCount(), 1);

        AgentRegistry.Agent memory a = registry.getAgent(1);
        assertEq(a.wallet, agentWallet);
        assertEq(a.agentId, aid1);
        assertEq(a.metadataURI, "ipfs://Qm123");
        assertEq(a.webhookUrl, "https://hook.io");
        assertEq(uint8(a.status), uint8(AgentRegistry.AgentStatus.Active));
        assertEq(a.score, 0);
        assertGt(a.registeredAt, 0);
    }

    function test_RegisterAgent_EmitsEvent() public {
        vm.expectEmit(true, true, true, false);
        emit AgentRegistry.AgentRegistered(1, agentWallet, aid1);
        registry.registerAgent(agentWallet, aid1, "", "");
    }

    function test_RegisterAgent_RevertZeroAddress() public {
        vm.expectRevert(AgentRegistry.ZeroAddress.selector);
        registry.registerAgent(address(0), aid1, "", "");
    }

    function test_RegisterAgent_RevertInvalidAgentId() public {
        vm.expectRevert(AgentRegistry.InvalidAgentId.selector);
        registry.registerAgent(agentWallet, bytes32(0), "", "");
    }

    function test_RegisterAgent_RevertDuplicateWallet() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        vm.expectRevert(AgentRegistry.AlreadyRegistered.selector);
        registry.registerAgent(agentWallet, aid2, "", "");
    }

    function test_RegisterAgent_RevertDuplicateAgentId() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        vm.expectRevert(AgentRegistry.AlreadyRegistered.selector);
        registry.registerAgent(agentWallet2, aid1, "", "");
    }

    function test_RegisterAgent_RevertNotOwner() public {
        vm.prank(agentWallet);
        vm.expectRevert(AgentRegistry.NotOwner.selector);
        registry.registerAgent(agentWallet2, aid2, "", "");
    }

    // --- Lookups ---

    function test_LookupByWallet() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        assertEq(registry.getAgentIdByWallet(agentWallet), 1);
        assertEq(registry.getAgentIdByWallet(agentWallet2), 0);
    }

    function test_LookupByAgentHash() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        assertEq(registry.getAgentIdByAgentHash(aid1), 1);
        assertEq(registry.getAgentIdByAgentHash(aid2), 0);
    }

    // --- Status ---

    function test_SuspendAndReactivate() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        assertTrue(registry.isActive(1));
        registry.suspendAgent(1);
        assertFalse(registry.isActive(1));
        registry.reactivateAgent(1);
        assertTrue(registry.isActive(1));
    }

    // --- Score ---

    function test_UpdateScore() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        registry.updateScore(1, 750e18);
        assertEq(registry.getAgent(1).score, 750e18);
    }

    // --- Job tracking & Tier ---

    function test_TierUpgrade_Bronze() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        // complete 5 jobs → Bronze
        for (uint i = 0; i < 5; i++) {
            registry.recordJobCompleted(1, 400);
        }
        (AgentRegistry.Tier tier, uint32 jobs, uint32 rating,,) = registry.getAgentProfile(1);
        assertEq(uint8(tier), uint8(AgentRegistry.Tier.Bronze));
        assertEq(jobs, 5);
        assertEq(rating, 400);
    }

    function test_TierUpgrade_Silver() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        for (uint i = 0; i < 20; i++) registry.recordJobCompleted(1, 500);
        (AgentRegistry.Tier tier,,,, ) = registry.getAgentProfile(1);
        assertEq(uint8(tier), uint8(AgentRegistry.Tier.Silver));
    }

    function test_TierUpgrade_Gold() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        for (uint i = 0; i < 50; i++) registry.recordJobCompleted(1, 500);
        (AgentRegistry.Tier tier,,,, ) = registry.getAgentProfile(1);
        assertEq(uint8(tier), uint8(AgentRegistry.Tier.Gold));
    }

    function test_TierUpgrade_Platinum() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        for (uint i = 0; i < 100; i++) registry.recordJobCompleted(1, 500);
        (AgentRegistry.Tier tier,,,, ) = registry.getAgentProfile(1);
        assertEq(uint8(tier), uint8(AgentRegistry.Tier.Platinum));
    }

    // --- SBT mint ---

    function test_MintVerifierSBT() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        for (uint i = 0; i < 5; i++) registry.recordJobCompleted(1, 400);
        registry.mintVerifierSBT(1);
        assertEq(meritSBT.balanceOf(agentWallet), 1);
    }

    function test_MintVerifierSBT_RevertNotTier1() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        vm.expectRevert(AgentRegistry.NotTier1.selector);
        registry.mintVerifierSBT(1);
    }

    // --- Metadata ---

    function test_UpdateMetadata() public {
        registry.registerAgent(agentWallet, aid1, "ipfs://old", "");
        registry.updateMetadata(1, "ipfs://new");
        assertEq(registry.getAgent(1).metadataURI, "ipfs://new");
    }

    // --- Fuzz ---

    function testFuzz_RegisterAgent(address wallet, bytes32 agentId) public {
        vm.assume(wallet != address(0));
        vm.assume(agentId != bytes32(0));
        uint256 id = registry.registerAgent(wallet, agentId, "", "");
        assertEq(id, 1);
        assertEq(registry.getAgentIdByWallet(wallet), 1);
    }
}
