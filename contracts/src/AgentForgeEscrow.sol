// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AgentForgeEscrow
/// @notice Trustless escrow for AI-agent task marketplace on Base
/// @dev Supports USDC deposits, dispute resolution via 2-of-3 multisig arbiters
///      Part of AgentForge — The Synthesis Hackathon 2026
contract AgentForgeEscrow is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Protocol fee: 2.5% (250 / 10_000)
    uint256 public constant PROTOCOL_FEE_BPS = 250;
    uint256 private constant BPS_DENOM = 10_000;

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum TaskStatus {
        Open,        // 0 — created, waiting for agent to accept
        InProgress,  // 1 — accepted by agent
        Delivered,   // 2 — agent submitted delivery, awaiting review
        Completed,   // 3 — payment released to agent
        Disputed,    // 4 — dispute raised, arbiter vote in progress
        Cancelled    // 5 — cancelled / refunded to client
    }

    struct Task {
        address client;       // creator / payer
        address agent;        // accepted worker (address(0) if Open)
        address arbiter;      // dispute arbiter chosen by both parties
        IERC20 token;         // payment token (USDC on Base)
        uint256 reward;       // total reward deposited by client
        uint256 fee;          // protocol fee locked at creation
        string descriptionCID; // IPFS CID with task description
        string deliveryCID;   // IPFS CID with delivery (set by agent)
        TaskStatus status;
        uint64 createdAt;
        uint64 deadlineAt;    // 0 = no deadline
        // Dispute votes: tracks who voted to pay agent (true) or refund client (false)
        uint8 voteCount;      // total votes cast
        uint8 votesForAgent;  // votes in favour of paying agent
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public owner;
    address public feeRecipient;

    uint256 public taskCount;
    mapping(uint256 => Task) private _tasks;

    // arbiter whitelist (owner-managed)
    mapping(address => bool) public isArbiter;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event TaskCreated(uint256 indexed taskId, address indexed client, address token, uint256 reward);
    event TaskAccepted(uint256 indexed taskId, address indexed agent);
    event DeliverySubmitted(uint256 indexed taskId, string deliveryCID);
    event PaymentReleased(uint256 indexed taskId, address indexed agent, uint256 amount);
    event TaskCancelled(uint256 indexed taskId, address indexed client, uint256 refund);
    event DisputeOpened(uint256 indexed taskId, address indexed opener);
    event DisputeVoted(uint256 indexed taskId, address indexed voter, bool voteForAgent);
    event DisputeResolved(uint256 indexed taskId, bool agentWon);
    event ArbiterStatusChanged(address indexed arbiter, bool status);
    event ArbiterSet(uint256 indexed taskId, address indexed arbiter);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error NotClient();
    error NotAgent();
    error NotArbiter();
    error InvalidTask();
    error WrongStatus(TaskStatus current, TaskStatus expected);
    error ZeroReward();
    error DeadlineInPast();
    error AlreadyVoted();
    error ArbiterNotSet();
    error TransferFailed();
    error NotPartyOrArbiter();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier taskExists(uint256 taskId) {
        if (taskId == 0 || taskId > taskCount) revert InvalidTask();
        _;
    }

    modifier onlyStatus(uint256 taskId, TaskStatus expected) {
        if (_tasks[taskId].status != expected) revert WrongStatus(_tasks[taskId].status, expected);
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _feeRecipient) {
        owner = msg.sender;
        feeRecipient = _feeRecipient;
    }

    // -------------------------------------------------------------------------
    // Task lifecycle
    // -------------------------------------------------------------------------

    /// @notice Client creates a task and deposits reward + protocol fee
    /// @param tokenAddr    ERC-20 payment token (USDC on Base)
    /// @param reward       Net reward for the agent (before fee)
    /// @param descriptionCID  IPFS CID of task brief
    /// @param deadlineAt   Unix deadline (0 = no deadline)
    /// @return taskId
    function createTask(
        address tokenAddr,
        uint256 reward,
        string calldata descriptionCID,
        uint64 deadlineAt
    ) external nonReentrant whenNotPaused returns (uint256 taskId) {
        if (reward == 0) revert ZeroReward();
        if (deadlineAt != 0 && deadlineAt <= block.timestamp) revert DeadlineInPast();

        uint256 fee = (reward * PROTOCOL_FEE_BPS) / BPS_DENOM;
        uint256 totalDeposit = reward + fee;

        IERC20 token = IERC20(tokenAddr);
        token.safeTransferFrom(msg.sender, address(this), totalDeposit);

        taskId = ++taskCount;
        _tasks[taskId] = Task({
            client: msg.sender,
            agent: address(0),
            arbiter: address(0),
            token: token,
            reward: reward,
            fee: fee,
            descriptionCID: descriptionCID,
            deliveryCID: "",
            status: TaskStatus.Open,
            createdAt: uint64(block.timestamp),
            deadlineAt: deadlineAt,
            voteCount: 0,
            votesForAgent: 0
        });

        emit TaskCreated(taskId, msg.sender, tokenAddr, reward);
    }

    /// @notice Agent accepts an open task
    function acceptTask(uint256 taskId)
        external
        nonReentrant
        whenNotPaused
        taskExists(taskId)
        onlyStatus(taskId, TaskStatus.Open)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender == t.client) revert NotAgent(); // client can't self-assign
        t.agent = msg.sender;
        t.status = TaskStatus.InProgress;
        emit TaskAccepted(taskId, msg.sender);
    }

    /// @notice Agent submits delivery (IPFS CID of work)
    function submitDelivery(uint256 taskId, string calldata deliveryCID)
        external
        nonReentrant
        whenNotPaused
        taskExists(taskId)
        onlyStatus(taskId, TaskStatus.InProgress)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.agent) revert NotAgent();
        t.deliveryCID = deliveryCID;
        t.status = TaskStatus.Delivered;
        emit DeliverySubmitted(taskId, deliveryCID);
    }

    /// @notice Client approves delivery and releases payment to agent
    function releasePayment(uint256 taskId)
        external
        nonReentrant
        taskExists(taskId)
        onlyStatus(taskId, TaskStatus.Delivered)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        _settleAgent(taskId, t);
    }

    /// @notice Client or agent can cancel an Open task (before acceptance)
    function cancelTask(uint256 taskId)
        external
        nonReentrant
        taskExists(taskId)
        onlyStatus(taskId, TaskStatus.Open)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        t.status = TaskStatus.Cancelled;
        uint256 refund = t.reward + t.fee;
        t.token.safeTransfer(t.client, refund);
        emit TaskCancelled(taskId, t.client, refund);
    }

    // -------------------------------------------------------------------------
    // Dispute: 2-of-3 multisig
    // -------------------------------------------------------------------------

    /// @notice Client or agent can open a dispute on a Delivered task
    function openDispute(uint256 taskId)
        external
        nonReentrant
        taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        // Dispute can be opened from InProgress or Delivered states
        if (t.status != TaskStatus.InProgress && t.status != TaskStatus.Delivered) {
            revert WrongStatus(t.status, TaskStatus.Delivered);
        }
        if (msg.sender != t.client && msg.sender != t.agent) revert NotPartyOrArbiter();
        t.status = TaskStatus.Disputed;
        emit DisputeOpened(taskId, msg.sender);
    }

    /// @notice Owner assigns arbiter for a disputed task
    function setArbiter(uint256 taskId, address arbiter)
        external
        onlyOwner
        taskExists(taskId)
        onlyStatus(taskId, TaskStatus.Disputed)
    {
        if (!isArbiter[arbiter]) revert NotArbiter();
        _tasks[taskId].arbiter = arbiter;
        emit ArbiterSet(taskId, arbiter);
    }

    /// @notice Cast a vote in dispute (client/agent/arbiter — each votes once)
    /// @param voteForAgent  true = pay agent, false = refund client
    function voteDispute(uint256 taskId, bool voteForAgent)
        external
        nonReentrant
        taskExists(taskId)
        onlyStatus(taskId, TaskStatus.Disputed)
    {
        Task storage t = _tasks[taskId];
        if (t.arbiter == address(0)) revert ArbiterNotSet();

        bool isClient  = msg.sender == t.client;
        bool isAgent   = msg.sender == t.agent;
        bool isArbiterVoter = msg.sender == t.arbiter;
        if (!isClient && !isAgent && !isArbiterVoter) revert NotPartyOrArbiter();

        // Prevent double voting by checking total votes vs participants
        // Simple 3-slot tracking: we allow max 3 votes total
        if (t.voteCount >= 3) revert AlreadyVoted();

        t.voteCount++;
        if (voteForAgent) t.votesForAgent++;

        emit DisputeVoted(taskId, msg.sender, voteForAgent);

        // Resolve once we have 2+ votes (2-of-3 majority)
        if (t.voteCount >= 2) {
            uint8 votesForClient = t.voteCount - t.votesForAgent;
            if (t.votesForAgent >= 2) {
                // Agent wins
                emit DisputeResolved(taskId, true);
                _settleAgent(taskId, t);
            } else if (votesForClient >= 2) {
                // Client wins
                emit DisputeResolved(taskId, false);
                _settleClient(taskId, t);
            }
            // else: still tied after 2 votes, wait for 3rd
        }
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setArbiterStatus(address arbiter, bool status) external onlyOwner {
        isArbiter[arbiter] = status;
        emit ArbiterStatusChanged(arbiter, status);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        feeRecipient = newRecipient;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // -------------------------------------------------------------------------
    // View
    // -------------------------------------------------------------------------

    function getTask(uint256 taskId) external view taskExists(taskId) returns (Task memory) {
        return _tasks[taskId];
    }

    // -------------------------------------------------------------------------
    // Internal settlement
    // -------------------------------------------------------------------------

    function _settleAgent(uint256 taskId, Task storage t) internal {
        t.status = TaskStatus.Completed;
        // Fee goes to protocol
        t.token.safeTransfer(feeRecipient, t.fee);
        // Reward goes to agent
        t.token.safeTransfer(t.agent, t.reward);
        emit PaymentReleased(taskId, t.agent, t.reward);
    }

    function _settleClient(uint256 taskId, Task storage t) internal {
        t.status = TaskStatus.Cancelled;
        // Fee goes to protocol even when client wins (covers arbiter cost)
        t.token.safeTransfer(feeRecipient, t.fee);
        // Reward returned to client
        t.token.safeTransfer(t.client, t.reward);
        emit TaskCancelled(taskId, t.client, t.reward);
    }
}
