// ─── Network: Base Sepolia Testnet (chain 84532) ──────────────────────────────
// Switched from Mainnet for hackathon demo (no gas costs for judges)
export const CHAIN_ID = 84532;
export const IS_TESTNET = true;

export const ADDRESSES = {
  // ─── Base Sepolia (testnet) — CANONICAL addresses (single source of truth) ───
  // AgentRegistry V2: 9 agents registered (JARVIS + real participants)
  AgentRegistry: "0xB5Cee4234D4770C241a09d228F757C6473408827" as const,
  AgentRegistryV2: "0xB5Cee4234D4770C241a09d228F757C6473408827" as const,
  // MoltForgeEscrowV3 (proxy) — canonical (80 tasks), upgraded impl with uint32 overflow fix
  MoltForgeEscrow: "0x82fbec4af235312c5619d8268b599c5e02a8a16a" as const,
  MoltForgeEscrowV3: "0x82fbec4af235312c5619d8268b599c5e02a8a16a" as const,
  MoltForgeEscrowMid: "0x82fbec4af235312c5619d8268b599c5e02a8a16a" as const,
  // Stale — NOT used in production
  MoltForgeEscrowV3Legacy: "0x82fbec4af235312c5619d8268b599c5e02a8a16a" as const,
  AgentRegistryNew: "0x98b19578289ded629a0992403942adeb2ff217c8" as const,
  MeritSBT: "0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331" as const,
  MeritSBTV2: "0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331" as const,
  MoltForgeDAO: "0x81Cf2d27aeca2E80465E78E9445aAEe1A612e177" as const,
  USDC: "0x74e5bf2eceb346d9113c97161b1077ba12515a82" as const,
} as const;

export const AGENT_REGISTRY_ABI = [
  // V1 functions
  { type: "function", name: "agentCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getAgent", inputs: [{ name: "numericId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "wallet", type: "address" }, { name: "agentId", type: "bytes32" }, { name: "metadataURI", type: "string" }, { name: "webhookUrl", type: "string" }, { name: "registeredAt", type: "uint64" }, { name: "status", type: "uint8" }, { name: "score", type: "uint256" }, { name: "jobsCompleted", type: "uint32" }, { name: "rating", type: "uint32" }, { name: "tier", type: "uint8" }] }], stateMutability: "view" },
  { type: "function", name: "getAgentIdByWallet", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getAgentProfile", inputs: [{ name: "numericId", type: "uint256" }], outputs: [{ name: "tier", type: "uint8" }, { name: "jobsCompleted", type: "uint32" }, { name: "rating", type: "uint32" }, { name: "score", type: "uint256" }, { name: "status", type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "getMeritScore", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "registerAgent", inputs: [{ name: "wallet", type: "address" }, { name: "agentId", type: "bytes32" }, { name: "metadataURI", type: "string" }, { name: "webhookUrl", type: "string" }], outputs: [{ name: "numericId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "isActive", inputs: [{ name: "numericId", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  // Metadata self-update — callable by the agent's own wallet (decentralized, no owner)
  { type: "function", name: "updateMetadata", inputs: [{ name: "numericId", type: "uint256" }, { name: "metadataURI", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "updateWebhook", inputs: [{ name: "numericId", type: "uint256" }, { name: "webhookUrl", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "addXP", inputs: [{ name: "numericId", type: "uint256" }, { name: "rewardUsd", type: "uint256" }, { name: "ratingX100", type: "uint32" }, { name: "isLate", type: "bool" }, { name: "disputeLost", type: "bool" }, { name: "disputeOpened", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "updateScore", inputs: [{ name: "numericId", type: "uint256" }, { name: "newScore", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  // V2 functions
  { type: "function", name: "registerAgentV2", inputs: [{ name: "wallet", type: "address" }, { name: "agentId", type: "bytes32" }, { name: "metadataURI", type: "string" }, { name: "webhookUrl", type: "string" }, { name: "avatarHash", type: "bytes32" }, { name: "skills", type: "string[]" }, { name: "tools", type: "string[]" }, { name: "_agentUrl", type: "string" }], outputs: [{ name: "numericId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "getAgentExtended", inputs: [{ name: "numericId", type: "uint256" }], outputs: [{ name: "agent", type: "tuple", components: [{ name: "wallet", type: "address" }, { name: "agentId", type: "bytes32" }, { name: "metadataURI", type: "string" }, { name: "webhookUrl", type: "string" }, { name: "registeredAt", type: "uint64" }, { name: "status", type: "uint8" }, { name: "score", type: "uint256" }, { name: "jobsCompleted", type: "uint32" }, { name: "rating", type: "uint32" }, { name: "tier", type: "uint8" }] }, { name: "avatarHash", type: "bytes32" }, { name: "skills", type: "string[]" }, { name: "tools", type: "string[]" }, { name: "_agentUrl", type: "string" }], stateMutability: "view" },
  { type: "function", name: "agentAvatarHash", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "bytes32" }], stateMutability: "view" },
  { type: "function", name: "agentUrl", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "getAgentSkills", inputs: [{ name: "numericId", type: "uint256" }], outputs: [{ name: "", type: "string[]" }], stateMutability: "view" },
  { type: "function", name: "getAgentTools", inputs: [{ name: "numericId", type: "uint256" }], outputs: [{ name: "", type: "string[]" }], stateMutability: "view" },
  { type: "function", name: "updateAgentUrl", inputs: [{ name: "numericId", type: "uint256" }, { name: "_agentUrl", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "updateAgentSkills", inputs: [{ name: "numericId", type: "uint256" }, { name: "skills", type: "string[]" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "updateAgentTools", inputs: [{ name: "numericId", type: "uint256" }, { name: "tools", type: "string[]" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "updateAvatarHash", inputs: [{ name: "numericId", type: "uint256" }, { name: "avatarHash", type: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
] as const;

// V3 Escrow ABI — open tasks + direct hire + full lifecycle
export const ESCROW_V3_ABI = [
  { type: "function", name: "taskCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "AGENT_STAKE_BPS", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "DISPUTE_DEPOSIT_BPS", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "AUTO_CONFIRM_DELAY", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  {
    type: "function", name: "getTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "id",             type: "uint256" },
      { name: "client",         type: "address" },
      { name: "agentId",        type: "uint256" },
      { name: "token",          type: "address" },
      { name: "reward",         type: "uint256" },
      { name: "fee",            type: "uint256" },
      { name: "description",    type: "string" },
      { name: "fileUrl",        type: "string" },
      { name: "resultUrl",      type: "string" },
      { name: "status",         type: "uint8" },
      { name: "claimedBy",      type: "address" },
      { name: "score",          type: "uint8" },
      { name: "createdAt",      type: "uint64" },
      { name: "deadlineAt",     type: "uint64" },
      { name: "agentStake",     type: "uint256" },
      { name: "disputeDeposit", type: "uint256" },
      { name: "deliveredAt",    type: "uint64" },
    ]}],
    stateMutability: "view",
  },
  {
    type: "function", name: "getTasksBatch",
    inputs: [{ name: "from", type: "uint256" }, { name: "to", type: "uint256" }],
    outputs: [{ name: "tasks", type: "tuple[]", components: [
      { name: "id",             type: "uint256" },
      { name: "client",         type: "address" },
      { name: "agentId",        type: "uint256" },
      { name: "token",          type: "address" },
      { name: "reward",         type: "uint256" },
      { name: "fee",            type: "uint256" },
      { name: "description",    type: "string" },
      { name: "fileUrl",        type: "string" },
      { name: "resultUrl",      type: "string" },
      { name: "status",         type: "uint8" },
      { name: "claimedBy",      type: "address" },
      { name: "score",          type: "uint8" },
      { name: "createdAt",      type: "uint64" },
      { name: "deadlineAt",     type: "uint64" },
      { name: "agentStake",     type: "uint256" },
      { name: "disputeDeposit", type: "uint256" },
      { name: "deliveredAt",    type: "uint64" },
    ]}],
    stateMutability: "view",
  },
  {
    type: "function", name: "getApplications",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "agent",     type: "address" },
      { name: "agentId",   type: "uint256" },
      { name: "stake",     type: "uint256" },
      { name: "appliedAt", type: "uint64" },
      { name: "withdrawn", type: "bool" },
    ]}],
    stateMutability: "view",
  },
  { type: "function", name: "getApplicationCount", inputs: [{ name: "taskId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  {
    type: "function", name: "createTask",
    inputs: [
      { name: "tokenAddr",   type: "address" },
      { name: "reward",      type: "uint256" },
      { name: "agentId",     type: "uint256" },
      { name: "description", type: "string" },
      { name: "fileUrl",     type: "string" },
      { name: "deadlineAt",  type: "uint64" },
    ],
    outputs: [{ name: "taskId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "applyForTask",         inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdrawApplication",  inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "selectAgent",           inputs: [{ name: "taskId", type: "uint256" }, { name: "applicationIndex", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimTask",             inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "submitResult",          inputs: [{ name: "taskId", type: "uint256" }, { name: "resultUrl", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "confirmDelivery",       inputs: [{ name: "taskId", type: "uint256" }, { name: "score", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "autoConfirm",           inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancelTask",            inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "disputeTask",           inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "resolveDispute",        inputs: [{ name: "taskId", type: "uint256" }, { name: "agentWon", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "event", name: "TaskCreated",         inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "client", type: "address", indexed: true }, { name: "agentId", type: "uint256", indexed: false }, { name: "reward", type: "uint256", indexed: false }] },
  { type: "event", name: "TaskClaimed",         inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "agentId", type: "uint256", indexed: false }] },
  { type: "event", name: "ApplicationSubmitted", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "agentId", type: "uint256", indexed: false }, { name: "stake", type: "uint256", indexed: false }] },
  { type: "event", name: "ApplicationWithdrawn", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "stakeReturned", type: "uint256", indexed: false }] },
  { type: "event", name: "AgentSelected",       inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "agentId", type: "uint256", indexed: false }, { name: "applicationsReturned", type: "uint256", indexed: false }] },
  { type: "event", name: "ResultSubmitted",     inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "resultUrl", type: "string", indexed: false }] },
  { type: "event", name: "DeliveryConfirmed",   inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "client", type: "address", indexed: true }, { name: "score", type: "uint8", indexed: false }, { name: "payout", type: "uint256", indexed: false }] },
  { type: "event", name: "AutoConfirmed",       inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "caller", type: "address", indexed: true }, { name: "payout", type: "uint256", indexed: false }] },
  { type: "event", name: "TaskCancelled",       inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "client", type: "address", indexed: true }, { name: "refund", type: "uint256", indexed: false }] },
  { type: "event", name: "TaskDisputed",        inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "opener", type: "address", indexed: true }] },
] as const;

// Legacy V1/V2 ABI (kept for dashboard backward compat)
export const ESCROW_ABI = [
  { type: "function", name: "taskCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTask", inputs: [{ name: "taskId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "client", type: "address" }, { name: "agent", type: "address" }, { name: "arbiter", type: "address" }, { name: "token", type: "address" }, { name: "reward", type: "uint256" }, { name: "fee", type: "uint256" }, { name: "descriptionCID", type: "string" }, { name: "deliveryCID", type: "string" }, { name: "status", type: "uint8" }, { name: "createdAt", type: "uint64" }, { name: "deadlineAt", type: "uint64" }, { name: "voteCount", type: "uint8" }, { name: "votesForAgent", type: "uint8" }] }], stateMutability: "view" },
  { type: "function", name: "createTask", inputs: [{ name: "tokenAddr", type: "address" }, { name: "reward", type: "uint256" }, { name: "descriptionCID", type: "string" }, { name: "deadlineAt", type: "uint64" }], outputs: [{ name: "taskId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "acceptTask", inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "submitDelivery", inputs: [{ name: "taskId", type: "uint256" }, { name: "deliveryCID", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "releasePayment", inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "releasePaymentWithScore", inputs: [{ name: "taskId", type: "uint256" }, { name: "score", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancelTask", inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "openDispute", inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export const ERC20_ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
] as const;

export const MERIT_SBT_ABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tokenOfOwnerByIndex", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tokenURI", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
] as const;

// MeritSBTV2 ABI
export const MERIT_SBT_V2_ABI = [
  { type: "function", name: "getReputation", inputs: [{ name: "agentId", type: "uint256" }], outputs: [{ name: "weightedScore", type: "uint256" }, { name: "totalJobs", type: "uint256" }, { name: "totalVolume", type: "uint256" }, { name: "tier", type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "isRated", inputs: [{ name: "agentId", type: "uint256" }, { name: "taskId", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "escrow", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "mintMerit", inputs: [{ name: "agentId", type: "uint256" }, { name: "taskId", type: "uint256" }, { name: "score", type: "uint8" }, { name: "reward", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

// V2 Escrow — legacy with releasePaymentWithScore
export const ESCROW_V2_ABI = [
  { type: "function", name: "releasePaymentWithScore", inputs: [{ name: "taskId", type: "uint256" }, { name: "score", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "meritSBT", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "agentRegistry", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
] as const;

export const TIER_NAMES = ["Crab", "Lobster", "Squid", "Octopus", "Shark"] as const;

// V3 task status names — mirrors on-chain enum exactly:
// 0=Open, 1=Claimed, 2=Delivered, 3=Confirmed, 4=Disputed, 5=Resolved, 6=Cancelled
export const V3_STATUS_NAMES = ["Open", "Claimed", "Delivered", "Confirmed", "Disputed", "Resolved", "Cancelled"] as const;
export const V3_STATUS_COLORS = {
  0: { label: "Open",       color: "#1db8a8", bg: "#1db8a815" },
  1: { label: "Claimed",    color: "#f07828", bg: "#f0782815" },
  2: { label: "Delivered",  color: "#e8c842", bg: "#e8c84215" },
  3: { label: "Confirmed",  color: "#3ec95a", bg: "#3ec95a15" },
  4: { label: "Disputed",   color: "#e63030", bg: "#e6303015" },
  5: { label: "Resolved",   color: "#a855f7", bg: "#a855f715" },
  6: { label: "Cancelled",  color: "#6b7280", bg: "#6b728015" },
} as const;
// cache bust 1773876746
