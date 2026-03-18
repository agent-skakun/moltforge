// ─── Network: Base Sepolia Testnet (chain 84532) ──────────────────────────────
// Switched from Mainnet for hackathon demo (no gas costs for judges)
export const CHAIN_ID = 84532;
export const IS_TESTNET = true;

export const ADDRESSES = {
  // Base Sepolia (testnet) — redeployed 2026-03-18 [v4 registerAgent open, no onlyOwner]
  AgentRegistry: "0x5F46aaA28612Bb3dB280fDbb36198Dc5b608850d" as const,
  MoltForgeEscrow: "0xF52041606e9286B8CfFbf7d6A113F8cDC7bd75bc" as const,
  MoltForgeEscrowV3: "0xF52041606e9286B8CfFbf7d6A113F8cDC7bd75bc" as const,
  MeritSBT: "0xe3C5b5a24fB481302C13E5e069ddD77E700C2113" as const,
  MeritSBTV2: "0xe3C5b5a24fB481302C13E5e069ddD77E700C2113" as const,
  USDC: "0xF88F8db9C0edF66aCa743F6e64194A11e798941a" as const,               // MockUSDC
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
  {
    type: "function", name: "getTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "id",          type: "uint256" },
      { name: "client",      type: "address" },
      { name: "agentId",     type: "uint256" },
      { name: "token",       type: "address" },
      { name: "reward",      type: "uint256" },
      { name: "fee",         type: "uint256" },
      { name: "description", type: "string" },
      { name: "fileUrl",     type: "string" },
      { name: "resultUrl",   type: "string" },
      { name: "status",      type: "uint8" },
      { name: "claimedBy",   type: "address" },
      { name: "score",       type: "uint8" },
      { name: "createdAt",   type: "uint64" },
      { name: "deadlineAt",  type: "uint64" },
    ]}],
    stateMutability: "view",
  },
  {
    type: "function", name: "getTasksBatch",
    inputs: [{ name: "from", type: "uint256" }, { name: "to", type: "uint256" }],
    outputs: [{ name: "tasks", type: "tuple[]", components: [
      { name: "id",          type: "uint256" },
      { name: "client",      type: "address" },
      { name: "agentId",     type: "uint256" },
      { name: "token",       type: "address" },
      { name: "reward",      type: "uint256" },
      { name: "fee",         type: "uint256" },
      { name: "description", type: "string" },
      { name: "fileUrl",     type: "string" },
      { name: "resultUrl",   type: "string" },
      { name: "status",      type: "uint8" },
      { name: "claimedBy",   type: "address" },
      { name: "score",       type: "uint8" },
      { name: "createdAt",   type: "uint64" },
      { name: "deadlineAt",  type: "uint64" },
    ]}],
    stateMutability: "view",
  },
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
  { type: "function", name: "claimTask",     inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "submitResult",  inputs: [{ name: "taskId", type: "uint256" }, { name: "resultUrl", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "confirmDelivery", inputs: [{ name: "taskId", type: "uint256" }, { name: "score", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancelTask",    inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "disputeTask",   inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "resolveDispute", inputs: [{ name: "taskId", type: "uint256" }, { name: "agentWon", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "event", name: "TaskCreated",   inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "client", type: "address", indexed: true }, { name: "agentId", type: "uint256", indexed: false }, { name: "reward", type: "uint256", indexed: false }] },
  { type: "event", name: "TaskClaimed",   inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "agentId", type: "uint256", indexed: false }] },
  { type: "event", name: "ResultSubmitted", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "resultUrl", type: "string", indexed: false }] },
  { type: "event", name: "DeliveryConfirmed", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "client", type: "address", indexed: true }, { name: "score", type: "uint8", indexed: false }, { name: "payout", type: "uint256", indexed: false }] },
  { type: "event", name: "TaskCancelled", inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "client", type: "address", indexed: true }, { name: "refund", type: "uint256", indexed: false }] },
  { type: "event", name: "TaskDisputed",  inputs: [{ name: "taskId", type: "uint256", indexed: true }, { name: "opener", type: "address", indexed: true }] },
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
] as const;

// V2 Escrow — legacy with releasePaymentWithScore
export const ESCROW_V2_ABI = [
  { type: "function", name: "releasePaymentWithScore", inputs: [{ name: "taskId", type: "uint256" }, { name: "score", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "meritSBT", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "agentRegistry", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
] as const;

export const TIER_NAMES = ["Bronze", "Silver", "Gold", "Platinum"] as const;

// V3 task status names
export const V3_STATUS_NAMES = ["Open", "Claimed", "InProgress", "Delivered", "Confirmed", "Cancelled", "Disputed"] as const;
export const V3_STATUS_COLORS = {
  0: { label: "Open",       color: "#1db8a8", bg: "#1db8a815" },
  1: { label: "Claimed",    color: "#f07828", bg: "#f0782815" },
  2: { label: "In Progress",color: "#f07828", bg: "#f0782815" },
  3: { label: "Delivered",  color: "#e8c842", bg: "#e8c84215" },
  4: { label: "Confirmed",  color: "#3ec95a", bg: "#3ec95a15" },
  5: { label: "Cancelled",  color: "#6b7280", bg: "#6b728015" },
  6: { label: "Disputed",   color: "#e63030", bg: "#e6303015" },
} as const;
