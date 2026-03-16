// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;

    address internal owner = address(this);
    address internal agentWallet = makeAddr("agentWallet");
    address internal agentWallet2 = makeAddr("agentWallet2");
    bytes32 internal did1 = keccak256("did:agent:alpha");
    bytes32 internal did2 = keccak256("did:agent:beta");

    function setUp() public {
        registry = new AgentRegistry();
    }

    // -------------------------------------------------------------------------
    // Registration
    // -------------------------------------------------------------------------

    function test_RegisterAgent_Success() public {
        uint256 id = registry.registerAgent(agentWallet, did1, "ipfs://Qm123");

        assertEq(id, 1, "first agent ID should be 1");
        assertEq(registry.agentCount(), 1);

        AgentRegistry.Agent memory a = registry.getAgent(1);
        assertEq(a.wallet, agentWallet);
        assertEq(a.did, did1);
        assertEq(a.metadataURI, "ipfs://Qm123");
        assertEq(uint8(a.status), uint8(AgentRegistry.AgentStatus.Active));
        assertEq(a.score, 0);
        assertGt(a.registeredAt, 0);
    }

    function test_RegisterAgent_EmitsEvent() public {
        vm.expectEmit(true, true, true, false);
        emit AgentRegistry.AgentRegistered(1, agentWallet, did1);
        registry.registerAgent(agentWallet, did1, "ipfs://Qm123");
    }

    function test_RegisterAgent_RevertZeroAddress() public {
        vm.expectRevert(AgentRegistry.ZeroAddress.selector);
        registry.registerAgent(address(0), did1, "");
    }

    function test_RegisterAgent_RevertInvalidDID() public {
        vm.expectRevert(AgentRegistry.InvalidDID.selector);
        registry.registerAgent(agentWallet, bytes32(0), "");
    }

    function test_RegisterAgent_RevertDuplicateWallet() public {
        registry.registerAgent(agentWallet, did1, "");
        vm.expectRevert(AgentRegistry.AlreadyRegistered.selector);
        registry.registerAgent(agentWallet, did2, "");
    }

    function test_RegisterAgent_RevertDuplicateDID() public {
        registry.registerAgent(agentWallet, did1, "");
        vm.expectRevert(AgentRegistry.AlreadyRegistered.selector);
        registry.registerAgent(agentWallet2, did1, "");
    }

    function test_RegisterAgent_RevertNotOwner() public {
        vm.prank(agentWallet);
        vm.expectRevert(AgentRegistry.NotOwner.selector);
        registry.registerAgent(agentWallet2, did2, "");
    }

    // -------------------------------------------------------------------------
    // Lookups
    // -------------------------------------------------------------------------

    function test_LookupByWallet() public {
        registry.registerAgent(agentWallet, did1, "");
        assertEq(registry.getAgentIdByWallet(agentWallet), 1);
        assertEq(registry.getAgentIdByWallet(agentWallet2), 0, "unknown wallet returns 0");
    }

    function test_LookupByDID() public {
        registry.registerAgent(agentWallet, did1, "");
        assertEq(registry.getAgentIdByDID(did1), 1);
        assertEq(registry.getAgentIdByDID(did2), 0, "unknown DID returns 0");
    }

    // -------------------------------------------------------------------------
    // Status management
    // -------------------------------------------------------------------------

    function test_SuspendAndReactivate() public {
        registry.registerAgent(agentWallet, did1, "");

        assertTrue(registry.isActive(1));

        registry.suspendAgent(1);
        assertFalse(registry.isActive(1));
        assertEq(uint8(registry.getAgent(1).status), uint8(AgentRegistry.AgentStatus.Suspended));

        registry.reactivateAgent(1);
        assertTrue(registry.isActive(1));
    }

    function test_SuspendRevertNotFound() public {
        vm.expectRevert(AgentRegistry.AgentNotFound.selector);
        registry.suspendAgent(99);
    }

    // -------------------------------------------------------------------------
    // Score
    // -------------------------------------------------------------------------

    function test_UpdateScore() public {
        registry.registerAgent(agentWallet, did1, "");

        vm.expectEmit(true, false, false, true);
        emit AgentRegistry.ScoreUpdated(1, 0, 750e18);
        registry.updateScore(1, 750e18);

        assertEq(registry.getAgent(1).score, 750e18);
    }

    function test_UpdateScoreRevertNotOwner() public {
        registry.registerAgent(agentWallet, did1, "");
        vm.prank(agentWallet);
        vm.expectRevert(AgentRegistry.NotOwner.selector);
        registry.updateScore(1, 100e18);
    }

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    function test_UpdateMetadata() public {
        registry.registerAgent(agentWallet, did1, "ipfs://old");
        registry.updateMetadata(1, "ipfs://new");
        assertEq(registry.getAgent(1).metadataURI, "ipfs://new");
    }

    // -------------------------------------------------------------------------
    // Fuzz
    // -------------------------------------------------------------------------

    /// @notice Fuzz: any non-zero wallet + did pair should register successfully
    function testFuzz_RegisterAgent(address wallet, bytes32 did) public {
        vm.assume(wallet != address(0));
        vm.assume(did != bytes32(0));

        uint256 id = registry.registerAgent(wallet, did, "");
        assertEq(id, 1);
        assertEq(registry.getAgentIdByWallet(wallet), 1);
        assertEq(registry.getAgentIdByDID(did), 1);
    }
}
