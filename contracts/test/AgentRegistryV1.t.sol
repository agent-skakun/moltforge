// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AgentRegistryV1} from "../src/AgentRegistryV1.sol";
import {MeritSBTV1} from "../src/MeritSBTV1.sol";

contract AgentRegistryV1Test is Test {
    AgentRegistryV1 public registry;
    MeritSBTV1 public meritSBT;

    address internal owner_   = address(this);
    address internal agentWallet  = makeAddr("agentWallet");
    address internal agentWallet2 = makeAddr("agentWallet2");
    address internal client_      = makeAddr("client");
    address internal vclient      = makeAddr("verifiedClient");
    bytes32 internal aid1 = keccak256("agent:alpha");
    bytes32 internal aid2 = keccak256("agent:beta");

    function setUp() public {
        // Deploy proxies
        AgentRegistryV1 regImpl = new AgentRegistryV1();
        bytes memory regInit = abi.encodeCall(AgentRegistryV1.initialize, (owner_));
        registry = AgentRegistryV1(address(new ERC1967Proxy(address(regImpl), regInit)));

        MeritSBTV1 meritImpl = new MeritSBTV1();
        bytes memory meritInit = abi.encodeCall(MeritSBTV1.initialize, (address(registry), "ipfs://merit/", owner_));
        meritSBT = MeritSBTV1(address(new ERC1967Proxy(address(meritImpl), meritInit)));

        registry.setMeritSBT(address(meritSBT));
    }

    // --- Proxy / upgrade ---

    function test_Initialize() public view {
        assertEq(registry.owner(), owner_);
        assertEq(registry.meritThreshold(), 5e6);
        assertEq(registry.verifiedMeritMonthlyAllowance(), 100);
    }

    // --- Registration ---

    function test_RegisterAgent_Success() public {
        uint256 id = registry.registerAgent(agentWallet, aid1, "ipfs://Qm123", "https://hook.io");
        assertEq(id, 1);
        assertEq(registry.agentCount(), 1);
        AgentRegistryV1.Agent memory a = registry.getAgent(1);
        assertEq(a.wallet, agentWallet);
    }

    function test_RegisterAgent_RevertNotOwner() public {
        vm.prank(agentWallet);
        vm.expectRevert();
        registry.registerAgent(agentWallet2, aid2, "", "");
    }

    function test_RegisterAgent_RevertDuplicateWallet() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        vm.expectRevert(AgentRegistryV1.AlreadyRegistered.selector);
        registry.registerAgent(agentWallet, aid2, "", "");
    }

    // --- Tier system ---

    function test_TierUpgrade_Bronze() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        for (uint i = 0; i < 5; i++) registry.recordJobCompleted(1, 400);
        (AgentRegistryV1.Tier tier,,,, ) = registry.getAgentProfile(1);
        assertEq(uint8(tier), uint8(AgentRegistryV1.Tier.Bronze));
    }

    function test_TierUpgrade_Platinum() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        for (uint i = 0; i < 100; i++) registry.recordJobCompleted(1, 500);
        (AgentRegistryV1.Tier tier,,,, ) = registry.getAgentProfile(1);
        assertEq(uint8(tier), uint8(AgentRegistryV1.Tier.Platinum));
    }

    // --- Merit 2.0: Verified Merit ---

    function _setupVerifiedClient() internal {
        registry.setVerifiedClient(vclient, true);
    }

    function test_SetVerifiedClient_GivesAllowance() public {
        _setupVerifiedClient();
        assertEq(registry.verifiedMeritBudget(vclient), 100);
        assertTrue(registry.verifiedClients(vclient));
    }

    function test_GiveVerifiedMerit_Success() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        _setupVerifiedClient();
        vm.prank(vclient);
        registry.giveVerifiedMerit(agentWallet, 10);
        assertEq(registry.verifiedMerit(agentWallet), 10);
        assertEq(registry.verifiedMeritBudget(vclient), 90);
    }

    function test_GiveVerifiedMerit_RevertNotVerifiedClient() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        vm.prank(client_);
        vm.expectRevert(AgentRegistryV1.NotVerifiedClient.selector);
        registry.giveVerifiedMerit(agentWallet, 1);
    }

    function test_GiveVerifiedMerit_RevertInsufficientBudget() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        _setupVerifiedClient();
        vm.prank(vclient);
        vm.expectRevert(AgentRegistryV1.InsufficientMeritBudget.selector);
        registry.giveVerifiedMerit(agentWallet, 101);
    }

    function test_GiveVerifiedMerit_RevertAgentNotRegistered() public {
        _setupVerifiedClient();
        vm.prank(vclient);
        vm.expectRevert(AgentRegistryV1.AgentNotRegistered.selector);
        registry.giveVerifiedMerit(agentWallet, 1);
    }

    function test_VerifiedMerit_MonthlyReset() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        _setupVerifiedClient();
        vm.prank(vclient);
        registry.giveVerifiedMerit(agentWallet, 100); // drain full budget
        assertEq(registry.verifiedMeritBudget(vclient), 0);

        // Fast-forward 30 days
        vm.warp(block.timestamp + 31 days);

        // Budget should auto-reset on next call
        vm.prank(vclient);
        registry.giveVerifiedMerit(agentWallet, 5);
        assertEq(registry.verifiedMeritBudget(vclient), 95);
    }

    // --- Merit 2.0: Regular Merit ---

    function test_GiveRegularMerit_Success() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        vm.prank(client_);
        registry.giveRegularMerit(agentWallet, 5e6); // exactly threshold
        assertEq(registry.regularMerit(agentWallet), 1);
    }

    function test_GiveRegularMerit_RevertBelowThreshold() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        vm.prank(client_);
        vm.expectRevert(AgentRegistryV1.TaskValueBelowThreshold.selector);
        registry.giveRegularMerit(agentWallet, 4e6); // below 5 USDC
    }

    function test_GiveRegularMerit_RevertAgentNotRegistered() public {
        vm.prank(client_);
        vm.expectRevert(AgentRegistryV1.AgentNotRegistered.selector);
        registry.giveRegularMerit(agentWallet, 10e6);
    }

    // --- getMeritScore ---

    function test_GetMeritScore_Combined() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        _setupVerifiedClient();

        vm.prank(vclient);
        registry.giveVerifiedMerit(agentWallet, 3); // +30 in score

        vm.prank(client_);
        registry.giveRegularMerit(agentWallet, 5e6); // +1 in score
        vm.prank(client_);
        registry.giveRegularMerit(agentWallet, 5e6); // +1 in score

        // score = 3*10 + 2*1 = 32
        assertEq(registry.getMeritScore(agentWallet), 32);
    }

    // --- Config ---

    function test_SetMeritThreshold() public {
        registry.setMeritThreshold(10e6);
        assertEq(registry.meritThreshold(), 10e6);
    }

    function test_SetVerifiedMeritMonthlyAllowance() public {
        registry.setVerifiedMeritMonthlyAllowance(200);
        assertEq(registry.verifiedMeritMonthlyAllowance(), 200);
    }

    // --- SBT ---

    function test_MintVerifierSBT() public {
        registry.registerAgent(agentWallet, aid1, "", "");
        for (uint i = 0; i < 5; i++) registry.recordJobCompleted(1, 400);
        registry.mintVerifierSBT(1);
        assertEq(meritSBT.balanceOf(agentWallet), 1);
    }

    // --- Upgrade ---

    function test_Upgrade_OnlyOwner() public {
        AgentRegistryV1 newImpl = new AgentRegistryV1();
        vm.prank(agentWallet);
        vm.expectRevert();
        registry.upgradeToAndCall(address(newImpl), "");
    }
}
