// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MoltForgeEscrowV1
/// @notice Trustless escrow for AI-agent task marketplace on Base, UUPS upgradeable
/// @dev Supports USDC deposits, dispute resolution via 2-of-3 multisig arbiters
contract MoltForgeEscrowV1 is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuard,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    uint256 public constant PROTOCOL_FEE_BPS = 250; // 2.5%
    uint256 private constant BPS_DENOM = 10_000;

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum TaskStatus { Open, InProgress, Delivered, Completed, Disputed, Cancelled }

    struct Task {
        address client;
        address agent;
        address arbiter;
        IERC20 token;
        uint256 reward;
        uint256 fee;
        string descriptionCID;
        string deliveryCID;
        TaskStatus status;
        uint64 createdAt;
        uint64 deadlineAt;
        uint8 voteCount;
        uint8 votesForAgent;
    }

    // -------------------------------------------------------------------------
    // Storage (append-only)
    // -------------------------------------------------------------------------

    address public feeRecipient;
    uint256 public taskCount;
    mapping(uint256 => Task) private _tasks;
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

    error NotClient();
    error NotAgent();
    error NotArbiter();
    error InvalidTask();
    error WrongStatus(TaskStatus current, TaskStatus expected);
    error ZeroReward();
    error DeadlineInPast();
    error AlreadyVoted();
    error ArbiterNotSet();
    error NotPartyOrArbiter();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier taskExists(uint256 taskId) {
        if (taskId == 0 || taskId > taskCount) revert InvalidTask();
        _;
    }

    modifier onlyStatus(uint256 taskId, TaskStatus expected) {
        if (_tasks[taskId].status != expected) revert WrongStatus(_tasks[taskId].status, expected);
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor / Initializer
    // -------------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _feeRecipient, address _owner) external initializer {
        __Ownable_init(_owner);
        __Pausable_init();
        feeRecipient = _feeRecipient;
    }

    // -------------------------------------------------------------------------
    // UUPS
    // -------------------------------------------------------------------------

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // -------------------------------------------------------------------------
    // Task lifecycle
    // -------------------------------------------------------------------------

    function createTask(
        address tokenAddr,
        uint256 reward,
        string calldata descriptionCID,
        uint64 deadlineAt
    ) external nonReentrant whenNotPaused returns (uint256 taskId) {
        if (reward == 0) revert ZeroReward();
        if (deadlineAt != 0 && deadlineAt <= block.timestamp) revert DeadlineInPast();

        uint256 fee = (reward * PROTOCOL_FEE_BPS) / BPS_DENOM;
        IERC20 token = IERC20(tokenAddr);
        token.safeTransferFrom(msg.sender, address(this), reward + fee);

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

    function acceptTask(uint256 taskId)
        external nonReentrant whenNotPaused taskExists(taskId) onlyStatus(taskId, TaskStatus.Open)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender == t.client) revert NotAgent();
        t.agent = msg.sender;
        t.status = TaskStatus.InProgress;
        emit TaskAccepted(taskId, msg.sender);
    }

    function submitDelivery(uint256 taskId, string calldata deliveryCID)
        external nonReentrant whenNotPaused taskExists(taskId) onlyStatus(taskId, TaskStatus.InProgress)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.agent) revert NotAgent();
        t.deliveryCID = deliveryCID;
        t.status = TaskStatus.Delivered;
        emit DeliverySubmitted(taskId, deliveryCID);
    }

    function releasePayment(uint256 taskId)
        external nonReentrant taskExists(taskId) onlyStatus(taskId, TaskStatus.Delivered)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        _settleAgent(taskId, t);
    }

    function cancelTask(uint256 taskId)
        external nonReentrant taskExists(taskId) onlyStatus(taskId, TaskStatus.Open)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        t.status = TaskStatus.Cancelled;
        t.token.safeTransfer(t.client, t.reward + t.fee);
        emit TaskCancelled(taskId, t.client, t.reward + t.fee);
    }

    // -------------------------------------------------------------------------
    // Dispute
    // -------------------------------------------------------------------------

    function openDispute(uint256 taskId) external nonReentrant taskExists(taskId) {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.InProgress && t.status != TaskStatus.Delivered) {
            revert WrongStatus(t.status, TaskStatus.Delivered);
        }
        if (msg.sender != t.client && msg.sender != t.agent) revert NotPartyOrArbiter();
        t.status = TaskStatus.Disputed;
        emit DisputeOpened(taskId, msg.sender);
    }

    function setArbiter(uint256 taskId, address arbiter)
        external onlyOwner taskExists(taskId) onlyStatus(taskId, TaskStatus.Disputed)
    {
        if (!isArbiter[arbiter]) revert NotArbiter();
        _tasks[taskId].arbiter = arbiter;
        emit ArbiterSet(taskId, arbiter);
    }

    function voteDispute(uint256 taskId, bool voteForAgent)
        external nonReentrant taskExists(taskId) onlyStatus(taskId, TaskStatus.Disputed)
    {
        Task storage t = _tasks[taskId];
        if (t.arbiter == address(0)) revert ArbiterNotSet();
        bool isClient_ = msg.sender == t.client;
        bool isAgent_ = msg.sender == t.agent;
        bool isArbiter_ = msg.sender == t.arbiter;
        if (!isClient_ && !isAgent_ && !isArbiter_) revert NotPartyOrArbiter();
        if (t.voteCount >= 3) revert AlreadyVoted();

        t.voteCount++;
        if (voteForAgent) t.votesForAgent++;

        emit DisputeVoted(taskId, msg.sender, voteForAgent);

        if (t.voteCount >= 2) {
            uint8 votesForClient = t.voteCount - t.votesForAgent;
            if (t.votesForAgent >= 2) {
                emit DisputeResolved(taskId, true);
                _settleAgent(taskId, t);
            } else if (votesForClient >= 2) {
                emit DisputeResolved(taskId, false);
                _settleClient(taskId, t);
            }
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
        t.token.safeTransfer(feeRecipient, t.fee);
        t.token.safeTransfer(t.agent, t.reward);
        emit PaymentReleased(taskId, t.agent, t.reward);
    }

    function _settleClient(uint256 taskId, Task storage t) internal {
        t.status = TaskStatus.Cancelled;
        t.token.safeTransfer(feeRecipient, t.fee);
        t.token.safeTransfer(t.client, t.reward);
        emit TaskCancelled(taskId, t.client, t.reward);
    }
}
