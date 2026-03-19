// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IMeritSBTV2 {
    function mintMerit(uint256 agentId, uint256 taskId, uint8 score, uint256 reward) external;
}

interface IAgentRegistry {
    function getAgentIdByWallet(address wallet) external view returns (uint256);
    function isActive(uint256 numericId) external view returns (bool);
    function addXP(uint256 numericId, uint256 rewardUsd, uint32 ratingX100, bool isLate, bool disputeLost, bool disputeOpened) external;
}

interface IMoltForgeDAO {
    function collectCompletionFee(uint256 taskId, address token, uint256 fee) external;
    function collectDisputeSlash(uint256 taskId, address token, uint256 slash) external;
}

/// @title MoltForgeEscrowV3
/// @notice Full task marketplace: open tasks + direct hire. UUPS upgradeable.
/// @dev New proxy deployment (not upgrade of V1/V2 — different storage layout)
contract MoltForgeEscrowV3 is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuard,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant PROTOCOL_FEE_BPS = 10;  // 0.1% → DAO Treasury
    uint256 private constant BPS_DENOM = 10_000;

    // ─── Types ────────────────────────────────────────────────────────────────

    /// @notice Full task lifecycle
    enum TaskStatus {
        Open,       // 0 — created, awaiting agent
        Claimed,    // 1 — agent claimed open task
        InProgress, // 2 — direct-hire task accepted by agent (via webhook/auto)
        Delivered,  // 3 — agent submitted result
        Confirmed,  // 4 — client confirmed, payment released
        Cancelled,  // 5 — client cancelled (only when Open)
        Disputed    // 6 — dispute raised
    }

    struct Task {
        uint256 id;
        address client;
        uint256 agentId;      // 0 = open task (any agent can claim)
        address token;
        uint256 reward;
        uint256 fee;
        string description;   // human-readable task (or base64 JSON)
        string fileUrl;       // optional file/IPFS URL
        string resultUrl;     // agent submits result here
        TaskStatus status;
        address claimedBy;    // wallet of agent who claimed/accepted
        uint8 score;          // 1–5, set on confirmDelivery
        uint64 createdAt;
        uint64 deadlineAt;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    address public feeRecipient;
    address public meritSBT;
    address public agentRegistry;
    address public daoTreasury;
    uint256 public taskCount;

    mapping(uint256 => Task) internal _tasks;
    mapping(address => bool) public isArbiter;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TaskCreated(uint256 indexed taskId, address indexed client, uint256 agentId, uint256 reward);
    event TaskClaimed(uint256 indexed taskId, address indexed agent, uint256 agentId);
    event ResultSubmitted(uint256 indexed taskId, address indexed agent, string resultUrl);
    event DeliveryConfirmed(uint256 indexed taskId, address indexed client, uint8 score, uint256 payout);
    event TaskCancelled(uint256 indexed taskId, address indexed client, uint256 refund);
    event TaskDisputed(uint256 indexed taskId, address indexed opener);
    event DisputeResolved(uint256 indexed taskId, bool agentWon);
    event MeritSBTSet(address indexed meritSBT);
    event AgentRegistrySet(address indexed registry);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotClient();
    error NotAgent();
    error InvalidTask();
    error WrongStatus(TaskStatus current);
    error ZeroReward();
    error DeadlineInPast();
    error InvalidScore();
    error AlreadyOpen();
    error NotOpenTask();
    error AgentMismatch();
    error DeadlineNotPassed();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier taskExists(uint256 taskId) {
        if (taskId == 0 || taskId > taskCount) revert InvalidTask();
        _;
    }

    // ─── Constructor / Initializer ────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _feeRecipient,
        address _owner,
        address _meritSBT,
        address _agentRegistry
    ) external initializer {
        __Ownable_init(_owner);
        __Pausable_init();
        feeRecipient = _feeRecipient;
        meritSBT = _meritSBT;
        agentRegistry = _agentRegistry;
        daoTreasury = address(0); // set via setDaoTreasury after deploy
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ─── Task Creation ────────────────────────────────────────────────────────

    /// @notice Create a task. agentId=0 → open (any agent), agentId>0 → direct hire
    function createTask(
        address tokenAddr,
        uint256 reward,
        uint256 agentId,
        string calldata description,
        string calldata fileUrl,
        uint64 deadlineAt
    ) external nonReentrant whenNotPaused returns (uint256 taskId) {
        if (reward == 0) revert ZeroReward();
        if (deadlineAt != 0 && deadlineAt <= block.timestamp) revert DeadlineInPast();

        uint256 fee = (reward * PROTOCOL_FEE_BPS) / BPS_DENOM;
        IERC20(tokenAddr).safeTransferFrom(msg.sender, address(this), reward + fee);

        taskId = ++taskCount;
        _tasks[taskId] = Task({
            id:          taskId,
            client:      msg.sender,
            agentId:     agentId,
            token:       tokenAddr,
            reward:      reward,
            fee:         fee,
            description: description,
            fileUrl:     fileUrl,
            resultUrl:   "",
            status:      TaskStatus.Open,
            claimedBy:   address(0),
            score:       0,
            createdAt:   uint64(block.timestamp),
            deadlineAt:  deadlineAt
        });

        emit TaskCreated(taskId, msg.sender, agentId, reward);
    }

    // ─── Agent: Claim open task ────────────────────────────────────────────────

    /// @notice Agent claims an open task (agentId == 0). Only registered agents.
    function claimTask(uint256 taskId)
        external nonReentrant whenNotPaused taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Open) revert WrongStatus(t.status);
        if (t.agentId != 0) revert NotOpenTask();
        if (msg.sender == t.client) revert NotAgent();

        // Resolve agentId from wallet
        uint256 claimerAgentId = 0;
        if (agentRegistry != address(0)) {
            try IAgentRegistry(agentRegistry).getAgentIdByWallet(msg.sender) returns (uint256 id) {
                claimerAgentId = id;
            } catch {}
        }

        t.agentId = claimerAgentId;
        t.claimedBy = msg.sender;
        t.status = TaskStatus.Claimed;

        emit TaskClaimed(taskId, msg.sender, claimerAgentId);
    }

    // ─── Agent: Submit result ─────────────────────────────────────────────────

    /// @notice Agent submits delivery. Allowed in Claimed, InProgress.
    function submitResult(uint256 taskId, string calldata resultUrl)
        external nonReentrant whenNotPaused taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Claimed && t.status != TaskStatus.InProgress) {
            revert WrongStatus(t.status);
        }
        // Must be the claiming agent or (for direct-hire) any registered agent with matching agentId
        if (t.claimedBy != address(0) && msg.sender != t.claimedBy) revert NotAgent();
        if (t.claimedBy == address(0)) {
            // Direct-hire: verify msg.sender matches agentId
            if (agentRegistry != address(0)) {
                try IAgentRegistry(agentRegistry).getAgentIdByWallet(msg.sender) returns (uint256 id) {
                    if (id != t.agentId) revert AgentMismatch();
                } catch { revert NotAgent(); }
            }
            t.claimedBy = msg.sender;
        }

        t.resultUrl = resultUrl;
        t.status = TaskStatus.Delivered;

        emit ResultSubmitted(taskId, msg.sender, resultUrl);
    }

    // ─── Client: Confirm delivery ─────────────────────────────────────────────

    /// @notice Client confirms delivery and rates 1–5. Releases payment + mints Merit.
    function confirmDelivery(uint256 taskId, uint8 score)
        external nonReentrant taskExists(taskId)
    {
        if (score < 1 || score > 5) revert InvalidScore();
        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        if (t.status != TaskStatus.Delivered) revert WrongStatus(t.status);

        address agentWallet = t.claimedBy;
        uint256 reward = t.reward;
        uint256 agentId = t.agentId;

        t.status = TaskStatus.Confirmed;
        t.score = score;

        // Transfer: fee → DAO Treasury (0.1%), reward → agent
        if (daoTreasury != address(0) && t.fee > 0) {
            IERC20(t.token).safeTransfer(daoTreasury, t.fee);
        } else if (t.fee > 0) {
            IERC20(t.token).safeTransfer(feeRecipient, t.fee);
        }
        IERC20(t.token).safeTransfer(agentWallet, reward);

        emit DeliveryConfirmed(taskId, msg.sender, score, reward);

        // Mint merit (non-reverting)
        if (meritSBT != address(0) && agentId > 0) {
            try IMeritSBTV2(meritSBT).mintMerit(agentId, taskId, score, reward) {} catch {}
        }

        // Add XP to registry (non-reverting)
        if (agentRegistry != address(0) && agentId > 0) {
            bool isLate = t.deadlineAt > 0 && block.timestamp > t.deadlineAt;
            uint256 rewardUsd = reward / 1e6; // USDC has 6 decimals
            try IAgentRegistry(agentRegistry).addXP(agentId, rewardUsd, uint32(score * 100), isLate, false, false) {} catch {}
        }
    }

    // ─── Client: Cancel open task ─────────────────────────────────────────────

    /// @notice Client cancels task. Only allowed when Open (agent hasn't claimed yet).
    function cancelTask(uint256 taskId)
        external nonReentrant taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        if (t.status != TaskStatus.Open) revert WrongStatus(t.status);

        t.status = TaskStatus.Cancelled;
        IERC20(t.token).safeTransfer(t.client, t.reward + t.fee);

        emit TaskCancelled(taskId, msg.sender, t.reward + t.fee);
    }

    // ─── Dispute ──────────────────────────────────────────────────────────────

    /// @notice Client or agent opens dispute on Delivered task.
    function disputeTask(uint256 taskId)
        external nonReentrant taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Delivered && t.status != TaskStatus.Claimed && t.status != TaskStatus.InProgress) {
            revert WrongStatus(t.status);
        }
        if (msg.sender != t.client && msg.sender != t.claimedBy) revert NotAgent();
        t.status = TaskStatus.Disputed;
        emit TaskDisputed(taskId, msg.sender);
    }

    /// @notice Owner resolves dispute: agentWon=true → pay agent, false → refund client
    function resolveDispute(uint256 taskId, bool agentWon)
        external nonReentrant onlyOwner taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Disputed) revert WrongStatus(t.status);

        IERC20 token = IERC20(t.token);
        if (agentWon) {
            t.status = TaskStatus.Confirmed;
            token.safeTransfer(feeRecipient, t.fee);
            token.safeTransfer(t.claimedBy, t.reward);
            // Add XP — dispute opened, but agent won
            if (agentRegistry != address(0) && t.agentId > 0) {
                uint256 rewardUsd = t.reward / 1e6;
                try IAgentRegistry(agentRegistry).addXP(t.agentId, rewardUsd, 300, false, false, true) {} catch {}
            }
        } else {
            t.status = TaskStatus.Cancelled;
            // 5% of reward → DAO Treasury (dispute slash)
            uint256 slash = (t.reward * 500) / 10_000; // 5%
            uint256 clientRefund = t.reward - slash;
            token.safeTransfer(feeRecipient, t.fee);
            token.safeTransfer(t.client, clientRefund);
            if (daoTreasury != address(0) && slash > 0) {
                token.safeTransfer(daoTreasury, slash);
            } else if (slash > 0) {
                token.safeTransfer(feeRecipient, slash);
            }
            // Dispute lost — 0 XP
            if (agentRegistry != address(0) && t.agentId > 0) {
                try IAgentRegistry(agentRegistry).addXP(t.agentId, 0, 0, false, true, true) {} catch {}
            }
        }
        emit DisputeResolved(taskId, agentWon);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setMeritSBT(address _meritSBT) external onlyOwner {
        meritSBT = _meritSBT;
        emit MeritSBTSet(_meritSBT);
    }

    function setAgentRegistry(address _registry) external onlyOwner {
        agentRegistry = _registry;
        emit AgentRegistrySet(_registry);
    }

    function setDaoTreasury(address _dao) external onlyOwner {
        daoTreasury = _dao;
    }

    function setArbiterStatus(address arbiter, bool status) external onlyOwner {
        isArbiter[arbiter] = status;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        feeRecipient = newRecipient;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── View ─────────────────────────────────────────────────────────────────

    function getTask(uint256 taskId) external view taskExists(taskId) returns (Task memory) {
        return _tasks[taskId];
    }

    function getTasksBatch(uint256 from, uint256 to)
        external view returns (Task[] memory tasks)
    {
        if (from == 0) from = 1;
        if (to > taskCount) to = taskCount;
        if (from > to) return new Task[](0);
        tasks = new Task[](to - from + 1);
        for (uint256 i = from; i <= to; i++) {
            tasks[i - from] = _tasks[i];
        }
    }

    /// @notice Get open tasks (paginated)
    function getOpenTasks(uint256 offset, uint256 limit)
        external view returns (Task[] memory tasks, uint256 total)
    {
        // Count open tasks
        uint256 count = 0;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].status == TaskStatus.Open) count++;
        }
        total = count;

        if (offset >= count || limit == 0) return (new Task[](0), total);
        uint256 resultLen = count - offset < limit ? count - offset : limit;
        tasks = new Task[](resultLen);

        uint256 seen = 0;
        uint256 added = 0;
        for (uint256 i = 1; i <= taskCount && added < resultLen; i++) {
            if (_tasks[i].status == TaskStatus.Open) {
                if (seen >= offset) {
                    tasks[added++] = _tasks[i];
                }
                seen++;
            }
        }
    }
}
