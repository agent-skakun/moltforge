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
    function getReputation(uint256 numericId) external view returns (uint256 weightedScore, uint256 totalJobs, uint256 totalVolume, uint8 tier);
}

interface IMoltForgeDAO {
    function collectCompletionFee(uint256 taskId, address token, uint256 fee) external;
    function collectDisputeSlash(uint256 taskId, address token, uint256 slash) external;
}

/// @title MoltForgeEscrowV3
/// @notice Full task marketplace with apply/select flow, auto-confirm, stakes. UUPS upgradeable.
contract MoltForgeEscrowV3 is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuard,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant PROTOCOL_FEE_BPS = 10;       // 0.1% → DAO Treasury
    uint256 public constant AGENT_STAKE_BPS = 500;        // 5% of reward — agent deposits on apply
    uint256 public constant DISPUTE_DEPOSIT_BPS = 100;    // 1% of reward — client deposits on dispute
    uint256 public constant DISPUTE_SLASH_BPS = 500;      // 5% slash on dispute loss
    uint256 public constant AUTO_CONFIRM_DELAY = 24 hours;
    uint256 public constant VALIDATOR_STAKE_BPS = 50;     // 0.5% of reward — validator deposits to vote
    uint256 public constant MIN_VALIDATORS = 3;
    uint256 public constant MAX_VALIDATORS = 5;
    uint256 public constant DISPUTE_VOTE_WINDOW = 48 hours;
    uint256 public constant MIN_VALIDATOR_TIER = 2;       // Squid+ required to validate
    uint256 private constant BPS_DENOM = 10_000;

    // ─── Types ────────────────────────────────────────────────────────────────

    enum TaskStatus {
        Open,       // 0 — created, awaiting applications
        Claimed,    // 1 — agent selected (assigned)
        InProgress, // 2 — reserved for future use
        Delivered,  // 3 — agent submitted result
        Confirmed,  // 4 — confirmed, payment released
        Cancelled,  // 5 — cancelled
        Disputed    // 6 — dispute raised
    }

    struct Task {
        uint256 id;
        address client;
        uint256 agentId;
        address token;
        uint256 reward;
        uint256 fee;
        string description;
        string fileUrl;
        string resultUrl;
        TaskStatus status;
        address claimedBy;
        uint8 score;
        uint64 createdAt;
        uint64 deadlineAt;
        // ─── V4 additions (appended for proxy safety) ───
        uint256 agentStake;      // selected agent's locked stake
        uint256 disputeDeposit;  // client's dispute deposit
        uint64  deliveredAt;     // timestamp of result submission
    }

    struct Application {
        address agent;
        uint256 agentId;
        uint256 stake;
        uint64  appliedAt;
        bool    withdrawn;
    }

    struct DisputeVote {
        address validator;
        uint256 agentId;
        uint256 stake;
        bool    agentWon;       // true = vote for agent, false = vote for client
        uint64  votedAt;
    }

    // ─── Storage (order MUST NOT change for proxy) ────────────────────────────

    // slot 0
    address public feeRecipient;
    // slot 1
    address public meritSBT;
    // slot 2
    address public agentRegistry;
    // slot 3
    uint256 public taskCount;
    // slot 4 — mapping
    mapping(uint256 => Task) internal _tasks;
    // slot 5 — mapping
    mapping(address => bool) public isArbiter;
    // slot 6
    address public daoTreasury;
    // slot 7 — NEW: applications per task
    mapping(uint256 => Application[]) internal _applications;
    // slot 8 — NEW: track if agent already applied
    mapping(uint256 => mapping(address => bool)) internal _hasApplied;
    // slot 9 — V5: dispute validator votes per task
    mapping(uint256 => DisputeVote[]) internal _disputeVotes;
    // slot 10 — V5: track if validator already voted
    mapping(uint256 => mapping(address => bool)) internal _hasVoted;
    // slot 11 — V5: dispute opened timestamp
    mapping(uint256 => uint64) internal _disputeOpenedAt;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TaskCreated(uint256 indexed taskId, address indexed client, uint256 agentId, uint256 reward);
    event TaskClaimed(uint256 indexed taskId, address indexed agent, uint256 agentId);
    event ApplicationSubmitted(uint256 indexed taskId, address indexed agent, uint256 agentId, uint256 stake);
    event ApplicationWithdrawn(uint256 indexed taskId, address indexed agent, uint256 stakeReturned);
    event AgentSelected(uint256 indexed taskId, address indexed agent, uint256 agentId, uint256 applicationsReturned);
    event ResultSubmitted(uint256 indexed taskId, address indexed agent, string resultUrl);
    event DeliveryConfirmed(uint256 indexed taskId, address indexed client, uint8 score, uint256 payout);
    event AutoConfirmed(uint256 indexed taskId, address indexed caller, uint256 payout);
    event TaskCancelled(uint256 indexed taskId, address indexed client, uint256 refund);
    event TaskDisputed(uint256 indexed taskId, address indexed opener);
    event DisputeResolved(uint256 indexed taskId, bool agentWon);
    event DisputeVoteCast(uint256 indexed taskId, address indexed validator, uint256 agentId, uint256 stake);
    event DisputeFinalized(uint256 indexed taskId, bool agentWon, uint256 agentVotes, uint256 clientVotes);
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
    error AlreadyApplied();
    error ApplicationNotFound();
    error TooEarly();
    error NoApplications();
    error AlreadyVoted();
    error NotEligibleValidator();
    error VoteWindowClosed();
    error VoteWindowOpen();
    error MaxValidatorsReached();
    error DisputeNotReady();

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
        daoTreasury = address(0);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ─── Task Creation ────────────────────────────────────────────────────────

    /// @notice Create a task. agentId=0 → open (agents apply), agentId>0 → direct hire
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

        IERC20(tokenAddr).safeTransferFrom(msg.sender, address(this), reward);

        taskId = ++taskCount;
        Task storage t = _tasks[taskId];
        t.id = taskId;
        t.client = msg.sender;
        t.agentId = agentId;
        t.token = tokenAddr;
        t.reward = reward;
        t.status = TaskStatus.Open;
        t.description = description;
        t.fileUrl = fileUrl;
        t.createdAt = uint64(block.timestamp);
        t.deadlineAt = deadlineAt;

        emit TaskCreated(taskId, msg.sender, agentId, reward);
    }

    // ─── Agent: Apply for task ────────────────────────────────────────────────

    /// @notice Agent applies for open task by depositing 5% stake. Multiple agents can apply.
    function applyForTask(uint256 taskId)
        external nonReentrant whenNotPaused taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Open) revert WrongStatus(t.status);
        if (t.agentId != 0) revert NotOpenTask(); // direct-hire tasks skip application
        if (msg.sender == t.client) revert NotClient(); // client can't apply to own task
        if (_hasApplied[taskId][msg.sender]) revert AlreadyApplied();

        uint256 stake = (t.reward * AGENT_STAKE_BPS) / BPS_DENOM;
        IERC20(t.token).safeTransferFrom(msg.sender, address(this), stake);

        uint256 claimerAgentId = 0;
        if (agentRegistry != address(0)) {
            try IAgentRegistry(agentRegistry).getAgentIdByWallet(msg.sender) returns (uint256 id) {
                claimerAgentId = id;
            } catch {}
        }

        _applications[taskId].push(Application({
            agent: msg.sender,
            agentId: claimerAgentId,
            stake: stake,
            appliedAt: uint64(block.timestamp),
            withdrawn: false
        }));
        _hasApplied[taskId][msg.sender] = true;

        emit ApplicationSubmitted(taskId, msg.sender, claimerAgentId, stake);
    }

    /// @notice Agent withdraws application and gets stake back (only before selection)
    function withdrawApplication(uint256 taskId)
        external nonReentrant taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Open) revert WrongStatus(t.status);

        Application[] storage apps = _applications[taskId];
        bool found = false;
        for (uint256 i = 0; i < apps.length; i++) {
            if (apps[i].agent == msg.sender && !apps[i].withdrawn) {
                apps[i].withdrawn = true;
                IERC20(t.token).safeTransfer(msg.sender, apps[i].stake);
                _hasApplied[taskId][msg.sender] = false;
                emit ApplicationWithdrawn(taskId, msg.sender, apps[i].stake);
                found = true;
                break;
            }
        }
        if (!found) revert ApplicationNotFound();
    }

    /// @notice Client selects an agent from applicants. Other stakes returned.
    function selectAgent(uint256 taskId, uint256 applicationIndex)
        external nonReentrant taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        if (t.status != TaskStatus.Open) revert WrongStatus(t.status);

        Application[] storage apps = _applications[taskId];
        if (apps.length == 0) revert NoApplications();
        if (applicationIndex >= apps.length) revert ApplicationNotFound();

        Application storage selected = apps[applicationIndex];
        if (selected.withdrawn) revert ApplicationNotFound();

        // Assign selected agent
        t.claimedBy = selected.agent;
        t.agentId = selected.agentId;
        t.agentStake = selected.stake;
        t.status = TaskStatus.Claimed;

        // Return stakes to all non-selected applicants
        uint256 returned = 0;
        for (uint256 i = 0; i < apps.length; i++) {
            if (i != applicationIndex && !apps[i].withdrawn) {
                IERC20(t.token).safeTransfer(apps[i].agent, apps[i].stake);
                apps[i].withdrawn = true; // mark as returned
                returned++;
            }
        }

        emit AgentSelected(taskId, selected.agent, selected.agentId, returned);
        emit TaskClaimed(taskId, selected.agent, selected.agentId);
    }

    // ─── Agent: Claim direct-hire task (backward compat) ──────────────────────

    /// @notice Direct-hire: assigned agent accepts + deposits stake
    function claimTask(uint256 taskId)
        external nonReentrant whenNotPaused taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Open) revert WrongStatus(t.status);
        if (t.agentId == 0) revert NotOpenTask(); // open tasks use applyForTask
        if (msg.sender == t.client) revert NotClient();

        // Verify agent matches direct-hire agentId
        if (agentRegistry != address(0)) {
            try IAgentRegistry(agentRegistry).getAgentIdByWallet(msg.sender) returns (uint256 id) {
                if (id != t.agentId) revert AgentMismatch();
            } catch { revert NotAgent(); }
        }

        // Agent deposits stake
        uint256 stake = (t.reward * AGENT_STAKE_BPS) / BPS_DENOM;
        IERC20(t.token).safeTransferFrom(msg.sender, address(this), stake);

        t.claimedBy = msg.sender;
        t.agentStake = stake;
        t.status = TaskStatus.Claimed;

        emit TaskClaimed(taskId, msg.sender, t.agentId);
    }

    // ─── Agent: Submit result ─────────────────────────────────────────────────

    /// @notice Agent submits delivery. Sets deliveredAt for 24h auto-confirm timer.
    function submitResult(uint256 taskId, string calldata resultUrl)
        external nonReentrant whenNotPaused taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Claimed && t.status != TaskStatus.InProgress) {
            revert WrongStatus(t.status);
        }
        if (msg.sender != t.claimedBy) revert NotAgent();

        t.resultUrl = resultUrl;
        t.status = TaskStatus.Delivered;
        t.deliveredAt = uint64(block.timestamp);

        emit ResultSubmitted(taskId, msg.sender, resultUrl);
    }

    // ─── Client: Confirm delivery ─────────────────────────────────────────────

    /// @notice Client confirms delivery, rates 1–5, releases payment + returns stake.
    function confirmDelivery(uint256 taskId, uint8 score)
        external nonReentrant taskExists(taskId)
    {
        if (score < 1 || score > 5) revert InvalidScore();
        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();
        if (t.status != TaskStatus.Delivered) revert WrongStatus(t.status);

        _finalizeConfirm(taskId, t, score);
    }

    /// @notice Anyone can auto-confirm after 24h if client hasn't acted. Score = 3.
    function autoConfirm(uint256 taskId)
        external nonReentrant taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Delivered) revert WrongStatus(t.status);
        if (t.deliveredAt == 0 || block.timestamp < t.deliveredAt + AUTO_CONFIRM_DELAY) revert TooEarly();

        _finalizeConfirm(taskId, t, 3);
    }

    /// @dev Internal: finalize confirmation (shared by confirmDelivery + autoConfirm)
    function _finalizeConfirm(uint256 taskId, Task storage t, uint8 score) internal {
        address agentWallet = t.claimedBy;
        uint256 reward = t.reward;
        uint256 agentId = t.agentId;

        t.status = TaskStatus.Confirmed;
        t.score = score;

        // 0.1% fee deducted from reward → DAO
        uint256 fee = (reward * PROTOCOL_FEE_BPS) / BPS_DENOM;
        uint256 agentPayout = reward - fee;
        t.fee = fee;

        IERC20 token = IERC20(t.token);

        if (fee > 0) {
            if (daoTreasury != address(0)) {
                token.safeTransfer(daoTreasury, fee);
            } else {
                token.safeTransfer(feeRecipient, fee);
            }
        }
        token.safeTransfer(agentWallet, agentPayout);

        // Return agent stake
        if (t.agentStake > 0) {
            token.safeTransfer(agentWallet, t.agentStake);
        }

        emit DeliveryConfirmed(taskId, t.client, score, agentPayout);

        // Mint merit (non-reverting)
        if (meritSBT != address(0) && agentId > 0) {
            try IMeritSBTV2(meritSBT).mintMerit(agentId, taskId, score, reward) {} catch {}
        }

        // Add XP (non-reverting)
        if (agentRegistry != address(0) && agentId > 0) {
            bool isLate = t.deadlineAt > 0 && block.timestamp > t.deadlineAt;
            uint256 rewardUsd = reward / 1e6;
            try IAgentRegistry(agentRegistry).addXP(agentId, rewardUsd, uint32(score * 100), isLate, false, false) {} catch {}
        }
    }

    // ─── Client: Cancel task ──────────────────────────────────────────────────

    /// @notice Client cancels task.
    /// - Open (no selection): reward → client, all application stakes returned
    /// - Assigned but deadline passed + no submit: reward → client, agent stake → client
    function cancelTask(uint256 taskId)
        external nonReentrant taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.client) revert NotClient();

        IERC20 token = IERC20(t.token);

        if (t.status == TaskStatus.Open) {
            t.status = TaskStatus.Cancelled;

            // Return all application stakes
            Application[] storage apps = _applications[taskId];
            for (uint256 i = 0; i < apps.length; i++) {
                if (!apps[i].withdrawn) {
                    token.safeTransfer(apps[i].agent, apps[i].stake);
                    apps[i].withdrawn = true;
                }
            }

            // Return reward to client
            token.safeTransfer(t.client, t.reward);
            emit TaskCancelled(taskId, msg.sender, t.reward);

        } else if (t.status == TaskStatus.Claimed || t.status == TaskStatus.InProgress) {
            // Only if deadline passed and agent hasn't submitted
            if (t.deadlineAt == 0 || block.timestamp < t.deadlineAt) revert DeadlineNotPassed();

            t.status = TaskStatus.Cancelled;

            // Reward back to client
            token.safeTransfer(t.client, t.reward);

            // Agent stake → client (penalty for missing deadline)
            if (t.agentStake > 0) {
                token.safeTransfer(t.client, t.agentStake);
            }

            emit TaskCancelled(taskId, msg.sender, t.reward + t.agentStake);
        } else {
            revert WrongStatus(t.status);
        }
    }

    // ─── Dispute ──────────────────────────────────────────────────────────────

    /// @notice Client opens dispute on delivered task. Requires 1% deposit.
    function disputeTask(uint256 taskId)
        external nonReentrant taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Delivered) revert WrongStatus(t.status);
        if (msg.sender != t.client) revert NotClient();

        // Client deposits 1% of reward
        uint256 deposit = (t.reward * DISPUTE_DEPOSIT_BPS) / BPS_DENOM;
        if (deposit > 0) {
            IERC20(t.token).safeTransferFrom(msg.sender, address(this), deposit);
        }
        t.disputeDeposit = deposit;
        t.status = TaskStatus.Disputed;
        _disputeOpenedAt[taskId] = uint64(block.timestamp);

        emit TaskDisputed(taskId, msg.sender);
    }

    /// @notice Validator votes on a dispute. Must be Squid+ tier, stakes 0.5% of reward.
    function voteOnDispute(uint256 taskId, bool agentWon)
        external nonReentrant taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Disputed) revert WrongStatus(t.status);
        if (_hasVoted[taskId][msg.sender]) revert AlreadyVoted();
        if (_disputeVotes[taskId].length >= MAX_VALIDATORS) revert MaxValidatorsReached();

        // Check vote window
        uint64 openedAt = _disputeOpenedAt[taskId];
        if (openedAt > 0 && block.timestamp > openedAt + DISPUTE_VOTE_WINDOW) revert VoteWindowClosed();

        // Must not be client or agent on this task
        if (msg.sender == t.client) revert NotClient();
        if (msg.sender == t.claimedBy) revert NotAgent();

        // Must be registered agent with Squid+ tier
        uint256 voterId = 0;
        if (agentRegistry != address(0)) {
            try IAgentRegistry(agentRegistry).getAgentIdByWallet(msg.sender) returns (uint256 id) {
                voterId = id;
            } catch {
                revert NotEligibleValidator();
            }
            // Check tier (Squid = 2+)
            try IAgentRegistry(agentRegistry).getReputation(voterId) returns (uint256, uint256, uint256, uint8 tier) {
                if (tier < MIN_VALIDATOR_TIER) revert NotEligibleValidator();
            } catch {
                revert NotEligibleValidator();
            }
        } else {
            revert NotEligibleValidator();
        }

        // Check not an applicant on this task
        if (_hasApplied[taskId][msg.sender]) revert NotEligibleValidator();

        // Validator stakes 0.5% of reward
        uint256 stake = (t.reward * VALIDATOR_STAKE_BPS) / BPS_DENOM;
        if (stake > 0) {
            IERC20(t.token).safeTransferFrom(msg.sender, address(this), stake);
        }

        _disputeVotes[taskId].push(DisputeVote({
            validator: msg.sender,
            agentId: voterId,
            stake: stake,
            agentWon: agentWon,
            votedAt: uint64(block.timestamp)
        }));
        _hasVoted[taskId][msg.sender] = true;

        emit DisputeVoteCast(taskId, msg.sender, voterId, stake);
    }

    /// @notice Finalize dispute after vote window closes or max validators reached.
    function finalizeDispute(uint256 taskId)
        external nonReentrant taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Disputed) revert WrongStatus(t.status);

        DisputeVote[] storage votes = _disputeVotes[taskId];
        uint64 openedAt = _disputeOpenedAt[taskId];
        bool windowClosed = block.timestamp > openedAt + DISPUTE_VOTE_WINDOW;
        bool maxReached = votes.length >= MAX_VALIDATORS;

        // Can finalize if: window closed OR max validators voted
        if (!windowClosed && !maxReached) revert VoteWindowOpen();

        // Count votes
        uint256 agentVotes = 0;
        uint256 clientVotes = 0;
        for (uint256 i = 0; i < votes.length; i++) {
            if (votes[i].agentWon) {
                agentVotes++;
            } else {
                clientVotes++;
            }
        }

        // Determine winner: supermajority (3/5) or benefit of doubt to agent
        // If < MIN_VALIDATORS voted, agent wins by default (work presumed acceptable)
        bool agentWinsDispute;
        if (votes.length < MIN_VALIDATORS) {
            agentWinsDispute = true; // Not enough validators → agent wins by default
        } else if (agentVotes > clientVotes) {
            agentWinsDispute = true;
        } else if (clientVotes > agentVotes) {
            agentWinsDispute = false;
        } else {
            agentWinsDispute = true; // Tie → agent wins (benefit of doubt)
        }

        IERC20 token = IERC20(t.token);

        // --- Distribute validator stakes ---
        // Correct voters get stake back + share of wrong voters' stakes
        uint256 wrongVoterStakePool = 0;
        uint256 correctVoterCount = 0;

        for (uint256 i = 0; i < votes.length; i++) {
            if (votes[i].agentWon == agentWinsDispute) {
                correctVoterCount++;
            } else {
                wrongVoterStakePool += votes[i].stake;
            }
        }

        // Return correct voters' stakes + bonus from wrong voters
        for (uint256 i = 0; i < votes.length; i++) {
            if (votes[i].agentWon == agentWinsDispute) {
                uint256 payout = votes[i].stake; // return own stake
                if (correctVoterCount > 0 && wrongVoterStakePool > 0) {
                    payout += wrongVoterStakePool / correctVoterCount; // share of wrong voters
                }
                if (payout > 0) {
                    token.safeTransfer(votes[i].validator, payout);
                }
            }
            // Wrong voters lose their stake (already in pool)
        }

        // --- Main dispute resolution ---
        if (agentWinsDispute) {
            t.status = TaskStatus.Confirmed;

            // 0.1% fee → DAO
            uint256 fee = (t.reward * PROTOCOL_FEE_BPS) / BPS_DENOM;
            uint256 agentPayout = t.reward - fee;
            t.fee = fee;

            if (fee > 0) {
                if (daoTreasury != address(0)) {
                    token.safeTransfer(daoTreasury, fee);
                } else {
                    token.safeTransfer(feeRecipient, fee);
                }
            }
            token.safeTransfer(t.claimedBy, agentPayout);

            // Return agent stake
            if (t.agentStake > 0) {
                token.safeTransfer(t.claimedBy, t.agentStake);
            }

            // Client dispute deposit: 50% → agent, 50% → validators
            if (t.disputeDeposit > 0) {
                uint256 halfDeposit = t.disputeDeposit / 2;
                uint256 agentShare = halfDeposit;
                uint256 validatorShare = t.disputeDeposit - halfDeposit; // handles rounding

                token.safeTransfer(t.claimedBy, agentShare);

                // Split validator share equally among correct voters
                if (correctVoterCount > 0 && validatorShare > 0) {
                    uint256 perValidator = validatorShare / correctVoterCount;
                    uint256 distributed = 0;
                    for (uint256 i = 0; i < votes.length; i++) {
                        if (votes[i].agentWon == agentWinsDispute && perValidator > 0) {
                            token.safeTransfer(votes[i].validator, perValidator);
                            distributed += perValidator;
                        }
                    }
                    // Dust → first correct voter
                    uint256 dust = validatorShare - distributed;
                    if (dust > 0) {
                        for (uint256 i = 0; i < votes.length; i++) {
                            if (votes[i].agentWon == agentWinsDispute) {
                                token.safeTransfer(votes[i].validator, dust);
                                break;
                            }
                        }
                    }
                } else {
                    // No correct voters (shouldn't happen) → agent gets all
                    token.safeTransfer(t.claimedBy, validatorShare);
                }
            }

            // XP — dispute opened, but agent won
            if (agentRegistry != address(0) && t.agentId > 0) {
                uint256 rewardUsd = t.reward / 1e6;
                try IAgentRegistry(agentRegistry).addXP(t.agentId, rewardUsd, 300, false, false, true) {} catch {}
            }
        } else {
            t.status = TaskStatus.Cancelled;

            // 5% of reward → DAO slash
            uint256 slash = (t.reward * DISPUTE_SLASH_BPS) / BPS_DENOM;
            uint256 clientRefund = t.reward - slash;

            // Refund client
            token.safeTransfer(t.client, clientRefund);

            // Slash → DAO
            if (daoTreasury != address(0) && slash > 0) {
                token.safeTransfer(daoTreasury, slash);
            } else if (slash > 0) {
                token.safeTransfer(feeRecipient, slash);
            }

            // Agent stake: 80% → client, 20% → validators
            if (t.agentStake > 0) {
                uint256 clientStakeShare = (t.agentStake * 80) / 100;  // 4% of reward
                uint256 validatorStakeShare = t.agentStake - clientStakeShare; // 1% of reward

                token.safeTransfer(t.client, clientStakeShare);

                // Split validator share among correct voters
                if (correctVoterCount > 0 && validatorStakeShare > 0) {
                    uint256 perValidator = validatorStakeShare / correctVoterCount;
                    uint256 distributed = 0;
                    for (uint256 i = 0; i < votes.length; i++) {
                        if (votes[i].agentWon == agentWinsDispute && perValidator > 0) {
                            token.safeTransfer(votes[i].validator, perValidator);
                            distributed += perValidator;
                        }
                    }
                    uint256 dust = validatorStakeShare - distributed;
                    if (dust > 0) {
                        for (uint256 i = 0; i < votes.length; i++) {
                            if (votes[i].agentWon == agentWinsDispute) {
                                token.safeTransfer(votes[i].validator, dust);
                                break;
                            }
                        }
                    }
                } else {
                    token.safeTransfer(t.client, validatorStakeShare);
                }
            }

            // Return client dispute deposit
            if (t.disputeDeposit > 0) {
                token.safeTransfer(t.client, t.disputeDeposit);
            }

            // Dispute lost — 0 XP
            if (agentRegistry != address(0) && t.agentId > 0) {
                try IAgentRegistry(agentRegistry).addXP(t.agentId, 0, 0, false, true, true) {} catch {}
            }
        }
        emit DisputeFinalized(taskId, agentWinsDispute, agentVotes, clientVotes);
    }

    /// @notice Emergency owner resolution — only if dispute >7 days old with no finalization
    function resolveDispute(uint256 taskId, bool agentWon)
        external nonReentrant onlyOwner taskExists(taskId)
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Disputed) revert WrongStatus(t.status);

        // Owner can only resolve after 7 days (emergency fallback)
        uint64 openedAt = _disputeOpenedAt[taskId];
        if (openedAt > 0 && block.timestamp < openedAt + 7 days) revert TooEarly();

        IERC20 token = IERC20(t.token);

        // Return all validator stakes first
        DisputeVote[] storage votes = _disputeVotes[taskId];
        for (uint256 i = 0; i < votes.length; i++) {
            if (votes[i].stake > 0) {
                token.safeTransfer(votes[i].validator, votes[i].stake);
            }
        }

        if (agentWon) {
            t.status = TaskStatus.Confirmed;
            uint256 fee = (t.reward * PROTOCOL_FEE_BPS) / BPS_DENOM;
            uint256 agentPayout = t.reward - fee;
            t.fee = fee;
            if (fee > 0) {
                if (daoTreasury != address(0)) { token.safeTransfer(daoTreasury, fee); }
                else { token.safeTransfer(feeRecipient, fee); }
            }
            token.safeTransfer(t.claimedBy, agentPayout);
            if (t.agentStake > 0) token.safeTransfer(t.claimedBy, t.agentStake);
            if (t.disputeDeposit > 0) token.safeTransfer(t.claimedBy, t.disputeDeposit);
            if (agentRegistry != address(0) && t.agentId > 0) {
                try IAgentRegistry(agentRegistry).addXP(t.agentId, t.reward / 1e6, 300, false, false, true) {} catch {}
            }
        } else {
            t.status = TaskStatus.Cancelled;
            uint256 slash = (t.reward * DISPUTE_SLASH_BPS) / BPS_DENOM;
            token.safeTransfer(t.client, t.reward - slash);
            if (daoTreasury != address(0) && slash > 0) { token.safeTransfer(daoTreasury, slash); }
            else if (slash > 0) { token.safeTransfer(feeRecipient, slash); }
            if (t.agentStake > 0) token.safeTransfer(t.client, t.agentStake);
            if (t.disputeDeposit > 0) token.safeTransfer(t.client, t.disputeDeposit);
            if (agentRegistry != address(0) && t.agentId > 0) {
                try IAgentRegistry(agentRegistry).addXP(t.agentId, 0, 0, false, true, true) {} catch {}
            }
        }
        emit DisputeResolved(taskId, agentWon);
    }

    // ─── View: Dispute Votes ─────────────────────────────────────────────────

    function getDisputeVotes(uint256 taskId) external view returns (DisputeVote[] memory) {
        return _disputeVotes[taskId];
    }

    function disputeDeadline(uint256 taskId) external view returns (uint64) {
        uint64 openedAt = _disputeOpenedAt[taskId];
        if (openedAt == 0) return 0;
        return openedAt + uint64(DISPUTE_VOTE_WINDOW);
    }

    function disputeVoteCount(uint256 taskId) external view returns (uint256) {
        return _disputeVotes[taskId].length;
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

    function getApplications(uint256 taskId)
        external view taskExists(taskId) returns (Application[] memory)
    {
        return _applications[taskId];
    }

    function getApplicationCount(uint256 taskId)
        external view taskExists(taskId) returns (uint256)
    {
        uint256 count = 0;
        Application[] storage apps = _applications[taskId];
        for (uint256 i = 0; i < apps.length; i++) {
            if (!apps[i].withdrawn) count++;
        }
        return count;
    }

    function getOpenTasks(uint256 offset, uint256 limit)
        external view returns (Task[] memory tasks, uint256 total)
    {
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
