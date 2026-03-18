// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AgentRegistryV1} from "../src/AgentRegistryV1.sol";
import {AgentRegistryV2} from "../src/AgentRegistryV2.sol";
import {MeritSBTV1} from "../src/MeritSBTV1.sol";

contract AgentRegistryV2Test is Test {
    AgentRegistryV2 public registry;
    ERC1967Proxy public proxy;

    address internal owner_ = address(this);
    address internal wallet1 = makeAddr("wallet1");
    address internal wallet2 = makeAddr("wallet2");
    bytes32 internal aid1 = keccak256("agent:v2-alpha");
    bytes32 internal aid2 = keccak256("agent:v2-beta");

    function setUp() public {
        // Deploy V1 proxy first (simulates existing deployment)
        AgentRegistryV1 v1Impl = new AgentRegistryV1();
        bytes memory initData = abi.encodeCall(AgentRegistryV1.initialize, (owner_));
        proxy = new ERC1967Proxy(address(v1Impl), initData);

        // Upgrade to V2
        AgentRegistryV2 v2Impl = new AgentRegistryV2();
        AgentRegistryV1(address(proxy)).upgradeToAndCall(address(v2Impl), "");
        registry = AgentRegistryV2(address(proxy));
    }

    // --- Upgrade preserves state ---

    function test_UpgradePreservesOwner() public view {
        assertEq(registry.owner(), owner_);
    }

    // --- V1 registerAgent still works after upgrade ---

    function test_V1RegisterAgent_StillWorks() public {
        uint256 id = registry.registerAgent(wallet1, aid1, "ipfs://meta", "https://hook");
        assertEq(id, 1);
        AgentRegistryV1.Agent memory a = registry.getAgent(1);
        assertEq(a.wallet, wallet1);
    }

    // --- V2 registerAgentV2 ---

    function test_RegisterAgentV2_Success() public {
        string[] memory skills = new string[](2);
        skills[0] = "blockchain/erc8004.md";
        skills[1] = "defi/swap.md";

        string[] memory tools = new string[](1);
        tools[0] = "web-search";

        bytes32 avatarHash = keccak256('{"style":"cyberpunk"}');

        uint256 id = registry.registerAgentV2(
            wallet1, aid1, "ipfs://meta", "https://hook",
            avatarHash, skills, tools, "https://agent.example.com"
        );
        assertEq(id, 1);

        // Check V1 fields
        AgentRegistryV1.Agent memory a = registry.getAgent(1);
        assertEq(a.wallet, wallet1);
        assertEq(a.metadataURI, "ipfs://meta");

        // Check V2 fields
        assertEq(registry.agentAvatarHash(1), avatarHash);
        assertEq(registry.agentUrl(1), "https://agent.example.com");

        string[] memory storedSkills = registry.getAgentSkills(1);
        assertEq(storedSkills.length, 2);
        assertEq(storedSkills[0], "blockchain/erc8004.md");
        assertEq(storedSkills[1], "defi/swap.md");

        string[] memory storedTools = registry.getAgentTools(1);
        assertEq(storedTools.length, 1);
        assertEq(storedTools[0], "web-search");
    }

    function test_RegisterAgentV2_RevertNotOwner() public {
        string[] memory skills = new string[](0);
        string[] memory tools = new string[](0);
        vm.prank(wallet1);
        vm.expectRevert();
        registry.registerAgentV2(wallet1, aid1, "", "", bytes32(0), skills, tools, "");
    }

    function test_RegisterAgentV2_RevertDuplicateWallet() public {
        string[] memory skills = new string[](0);
        string[] memory tools = new string[](0);
        registry.registerAgentV2(wallet1, aid1, "", "", bytes32(0), skills, tools, "");
        vm.expectRevert(AgentRegistryV1.AlreadyRegistered.selector);
        registry.registerAgentV2(wallet1, aid2, "", "", bytes32(0), skills, tools, "");
    }

    // --- getAgentExtended ---

    function test_GetAgentExtended() public {
        string[] memory skills = new string[](1);
        skills[0] = "blockchain/erc8004.md";
        string[] memory tools = new string[](2);
        tools[0] = "web-search";
        tools[1] = "blockchain";
        bytes32 avatarHash = keccak256("avatar");

        registry.registerAgentV2(
            wallet1, aid1, "ipfs://meta", "https://hook",
            avatarHash, skills, tools, "https://agent.io"
        );

        (
            AgentRegistryV1.Agent memory agent,
            bytes32 retAvatarHash,
            string[] memory retSkills,
            string[] memory retTools,
            string memory retUrl
        ) = registry.getAgentExtended(1);

        assertEq(agent.wallet, wallet1);
        assertEq(retAvatarHash, avatarHash);
        assertEq(retSkills.length, 1);
        assertEq(retTools.length, 2);
        assertEq(retUrl, "https://agent.io");
    }

    // --- updateAgentUrl ---

    function test_UpdateAgentUrl() public {
        string[] memory s = new string[](0);
        registry.registerAgentV2(wallet1, aid1, "", "", bytes32(0), s, s, "https://old.io");
        registry.updateAgentUrl(1, "https://new.io");
        assertEq(registry.agentUrl(1), "https://new.io");
    }

    function test_UpdateAgentUrl_RevertNotOwner() public {
        string[] memory s = new string[](0);
        registry.registerAgentV2(wallet1, aid1, "", "", bytes32(0), s, s, "");
        vm.prank(wallet1);
        vm.expectRevert();
        registry.updateAgentUrl(1, "https://new.io");
    }

    function test_UpdateAgentUrl_RevertNotFound() public {
        vm.expectRevert(AgentRegistryV1.AgentNotFound.selector);
        registry.updateAgentUrl(999, "https://new.io");
    }

    // --- updateAgentSkills / updateAgentTools ---

    function test_UpdateAgentSkills() public {
        string[] memory s = new string[](0);
        registry.registerAgentV2(wallet1, aid1, "", "", bytes32(0), s, s, "");

        string[] memory newSkills = new string[](2);
        newSkills[0] = "skill-a";
        newSkills[1] = "skill-b";
        registry.updateAgentSkills(1, newSkills);

        string[] memory stored = registry.getAgentSkills(1);
        assertEq(stored.length, 2);
        assertEq(stored[0], "skill-a");
    }

    function test_UpdateAgentTools() public {
        string[] memory s = new string[](0);
        registry.registerAgentV2(wallet1, aid1, "", "", bytes32(0), s, s, "");

        string[] memory newTools = new string[](1);
        newTools[0] = "tool-x";
        registry.updateAgentTools(1, newTools);

        string[] memory stored = registry.getAgentTools(1);
        assertEq(stored.length, 1);
        assertEq(stored[0], "tool-x");
    }

    // --- updateAvatarHash ---

    function test_UpdateAvatarHash() public {
        string[] memory s = new string[](0);
        registry.registerAgentV2(wallet1, aid1, "", "", bytes32(0), s, s, "");
        bytes32 newHash = keccak256("new-avatar");
        registry.updateAvatarHash(1, newHash);
        assertEq(registry.agentAvatarHash(1), newHash);
    }

    // --- Mixed V1 + V2 agents ---

    function test_MixedV1V2Agents() public {
        // Register via V1 method
        registry.registerAgent(wallet1, aid1, "ipfs://v1", "https://v1hook");

        // V2 fields should be empty/zero for V1-registered agent
        assertEq(registry.agentAvatarHash(1), bytes32(0));
        assertEq(registry.agentUrl(1), "");
        assertEq(registry.getAgentSkills(1).length, 0);
        assertEq(registry.getAgentTools(1).length, 0);

        // Register via V2 method
        string[] memory skills = new string[](1);
        skills[0] = "skill-1";
        string[] memory tools = new string[](1);
        tools[0] = "tool-1";
        registry.registerAgentV2(
            wallet2, aid2, "ipfs://v2", "https://v2hook",
            keccak256("avatar"), skills, tools, "https://v2agent.io"
        );

        // Both agents accessible
        assertEq(registry.agentCount(), 2);
        assertEq(registry.getAgent(1).wallet, wallet1);
        assertEq(registry.getAgent(2).wallet, wallet2);
        assertEq(registry.getAgentSkills(2).length, 1);
    }
}
