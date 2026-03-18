export const ADDRESSES = {
  AgentRegistry: "0x68C2390146C795879758F2a71a62fd114cd1E88d" as const,
  MoltForgeEscrow: "0x85C00d51E61C8D986e0A5Ba34c9E95841f3151c4" as const,
  MeritSBT: "0x375aC49E905bAd8aC7547AF1f2fD98EE4FBC2E9E" as const,
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
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

export const ESCROW_ABI = [
  { type: "function", name: "taskCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTask", inputs: [{ name: "taskId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "client", type: "address" }, { name: "agent", type: "address" }, { name: "arbiter", type: "address" }, { name: "token", type: "address" }, { name: "reward", type: "uint256" }, { name: "fee", type: "uint256" }, { name: "descriptionCID", type: "string" }, { name: "deliveryCID", type: "string" }, { name: "status", type: "uint8" }, { name: "createdAt", type: "uint64" }, { name: "deadlineAt", type: "uint64" }, { name: "voteCount", type: "uint8" }, { name: "votesForAgent", type: "uint8" }] }], stateMutability: "view" },
  { type: "function", name: "createTask", inputs: [{ name: "tokenAddr", type: "address" }, { name: "reward", type: "uint256" }, { name: "descriptionCID", type: "string" }, { name: "deadlineAt", type: "uint64" }], outputs: [{ name: "taskId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "acceptTask", inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "submitDelivery", inputs: [{ name: "taskId", type: "uint256" }, { name: "deliveryCID", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "releasePayment", inputs: [{ name: "taskId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
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

export const TIER_NAMES = ["Bronze", "Silver", "Gold", "Platinum"] as const;
export const STATUS_NAMES = ["Open", "InProgress", "Delivered", "Completed", "Disputed", "Cancelled"] as const;
