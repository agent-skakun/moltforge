// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

interface IMockUSDC {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IEscrowV3 {
    function createTask(
        address tokenAddr,
        uint256 reward,
        uint256 agentId,
        uint256 deadlineSeconds,
        string calldata description
    ) external returns (uint256 taskId);

    function claimTask(uint256 taskId) external;

    function submitResult(uint256 taskId, string calldata resultUrl) external;

    function confirmDelivery(uint256 taskId, uint8 score) external;

    function getTask(uint256 taskId) external view returns (
        address client,
        uint256 agentId,
        address tokenAddr,
        uint256 reward,
        uint8 status,
        uint256 createdAt,
        uint256 deadlineAt,
        string memory description,
        string memory resultUrl,
        uint8 score
    );
}

contract E2ENewEscrow is Script {
    address constant ESCROW   = 0x7054E30Cae71066D7f34d0b1b25fD19cF974B620;
    address constant MUSDC    = 0x74e5bF2ecEb346d9113C97161b1077BA12515A82;
    address constant WALLET   = 0x9061bF366221eC610144890dB619CEBe3F26DC5d;
    uint256 constant REWARD   = 5_000_000; // 5 USDC (6 decimals)
    uint256 constant AGENT_ID = 9;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        // 1. Mint USDC
        IMockUSDC(MUSDC).mint(WALLET, REWARD * 2);
        console2.log("Step 1: Minted USDC");

        // 2. Approve Escrow
        IMockUSDC(MUSDC).approve(ESCROW, REWARD * 2);
        console2.log("Step 2: Approved Escrow");

        // 3. Create task (direct hire: agentId=9)
        uint256 taskId = IEscrowV3(ESCROW).createTask(
            MUSDC,
            REWARD,
            AGENT_ID,
            0,
            "E2E test on fixed Escrow 0x7054E30C - uint32 overflow fix verified"
        );
        console2.log("Step 3: createTask -> taskId:", taskId);

        // 4. Claim task (agent = same wallet for E2E)
        IEscrowV3(ESCROW).claimTask(taskId);
        console2.log("Step 4: claimTask");

        // 5. Submit result
        IEscrowV3(ESCROW).submitResult(taskId, "https://moltforge.cloud/e2e-result");
        console2.log("Step 5: submitResult");

        // 6. Confirm delivery with score=3 (would overflow on old contract)
        IEscrowV3(ESCROW).confirmDelivery(taskId, 3);
        console2.log("Step 6: confirmDelivery(score=3) - overflow test PASSED");

        vm.stopBroadcast();
    }
}
