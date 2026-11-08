/** Chain selector accepted by every Actora MCP tool. */
export type McpChain = 'bsc' | 'ethereum' | 'base'

/** A tool schema as returned by `tools/list`. */
export interface McpToolSchema {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

/** Standard MCP server info from `initialize`. */
export interface McpServerInfo {
  name?: string
  version?: string
  [key: string]: unknown
}

// ── Agent summaries (actora_identity_list_all) ─────────────────────────────

export interface AgentMetadata {
  name: string
  description: string
  capabilities: string[]
  skills: string[]
  isActive: boolean
}

export interface AgentSummary {
  agentId: number
  owner: string
  tokenURI: string
  metadata: AgentMetadata
  createdAt: number
}

export interface ListAgentsResult {
  agents: AgentSummary[]
  total: number
  range: { fromId: number; toId: number }
  chain: string
  chainId: number
}

export interface AgentMetadataResult {
  agentId: number
  owner?: string
  tokenURI?: string
  metadata?: AgentMetadata
  createdAt?: number
  exists: boolean
  chain: string
  chainId: number
}

export interface TotalAgentsResult {
  total: number
  chain: string
  chainId: number
}

export interface AgentExistsResult {
  agentId: number
  exists: boolean
  chain: string
  chainId: number
}

export interface OwnerAgentsResult {
  agentIds: number[]
  owner: string
  chain: string
  chainId: number
}

// ── Subscription (actora_subscription_*) ────────────────────────────────────

export interface PlanResult {
  planId: number
  agentId: number
  creator: string
  /** Alias of `subscriptionPrice` (wei / token units, decimal string). */
  price: string
  period: string
  active: boolean
  payToken: string
  /** Always 0 — ERC8004SubscriptionManager has no trial period. */
  trialDays: number
  name: string
  description: string
  /** 0=Subscription, 1=UsageBased, 2=Hybrid */
  planType: number
  subscriptionPrice: string
  usagePrice: string
  /** 0=Daily, 1=Weekly, 2=Monthly, 3=Quarterly, 4=Yearly */
  billingPeriod: number
  maxUsage: string
  totalUsageLimit: string
  platformFeePercentage: number
  chain: string
  chainId: number
}

export interface CheckSubscriptionResult {
  active: boolean
  subscriber: string
  agentId: number
  chain: string
  chainId: number
}

export interface SubscriptionDetailResult {
  subscriptionId: number
  planId: number
  subscriber: string
  agentId: number
  /** 0=Active, 1=Cancelled, 2=Expired, 3=PaymentFailed, 4=Suspended */
  status: number
  /** 0=Subscription, 1=UsageBased, 2=Hybrid */
  planType: number
  startedAt: number
  /** Next charge date (renewal anchor). */
  nextBillingDate: number
  endDate: number
  period: string
  payToken: string
  amountPaid: string
  currentPeriodUsage: string
  totalUsage: string
  remainingUsage: string
  lastPaymentDate: number
  chain: string
  chainId: number
}

export interface MySubscriptionsResult {
  subscriptionIds: string[]
  user: string
  chain: string
  chainId: number
}

export interface FeeResult {
  platformFeeBps: number
  chain: string
  chainId: number
}

/** WRITE tools don't sign — they return a descriptor for the wallet client to submit. */
export interface WriteOpResult {
  _writeOp: boolean
  message: string
  contract: string
  chain: string
  chainId: number
  args?: Record<string, unknown>
}

// ── Centralized agents (C-6, off-chain) ────────────────────────────────────

/** Subscription plan of a centralized agent (same shape as on-chain plans). */
export interface CentralPlanResult {
  planId: number
  /** wei, decimal string. */
  price: string
  period: string
  payToken: string
  isActive: boolean
  trialDays: number
  creator: string | null
}

export interface CentralAgentResult {
  id: number
  owner: string
  name: string
  description: string
  tags: string[]
  capabilities: string[]
  skills: string[]
  category: string
  isActive: boolean
  source: 'central'
  createdAt: string
  subscriptionPlans: CentralPlanResult[]
}

export interface CentralAgentsResult {
  agents: CentralAgentResult[]
  total: number
  page: number
  pageSize: number
}

export interface CentralSubscriptionCheckResult {
  active: boolean
  subscriber: string
  agentId: number
}

/** Result of `actora_central_subscription_subscribe` — payment instruction or activated subscription. */
export interface CentralSubscriptionResult {
  paymentRequired?: boolean
  active?: boolean
  amountWei?: string
  payTo?: string
  network?: string
  instructions?: string
  [key: string]: unknown
}

// ── Generic ─────────────────────────────────────────────────────────────────

export interface GatewayHealthResult {
  status: string
  services?: Record<string, unknown>
  time?: string
  [key: string]: unknown
}

export interface TenantResult {
  tenant: string
  [key: string]: unknown
}

/** Result of `actora_agent_call` — a reply, or a 402 payment instruction. */
export interface AgentCallResult {
  reply?: string
  error?: string
  /** Present when `error === 'payment_required'` (x402 direct payment). */
  payTo?: string
  token?: string
  amount?: string
  chain?: string
  refId?: string
  [key: string]: unknown
}
