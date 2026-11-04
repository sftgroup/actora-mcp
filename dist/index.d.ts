/** Chain selector accepted by every Actora MCP tool. */
type McpChain = 'bsc' | 'ethereum' | 'base';
/** A tool schema as returned by `tools/list`. */
interface McpToolSchema {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties?: Record<string, unknown>;
        required?: string[];
    };
}
/** Standard MCP server info from `initialize`. */
interface McpServerInfo {
    name?: string;
    version?: string;
    [key: string]: unknown;
}
interface AgentMetadata {
    name: string;
    description: string;
    capabilities: string[];
    skills: string[];
    isActive: boolean;
}
interface AgentSummary {
    agentId: number;
    owner: string;
    tokenURI: string;
    metadata: AgentMetadata;
    createdAt: number;
}
interface ListAgentsResult {
    agents: AgentSummary[];
    total: number;
    range: {
        fromId: number;
        toId: number;
    };
    chain: string;
    chainId: number;
}
interface AgentMetadataResult {
    agentId: number;
    owner?: string;
    tokenURI?: string;
    metadata?: AgentMetadata;
    createdAt?: number;
    exists: boolean;
    chain: string;
    chainId: number;
}
interface TotalAgentsResult {
    total: number;
    chain: string;
    chainId: number;
}
interface AgentExistsResult {
    agentId: number;
    exists: boolean;
    chain: string;
    chainId: number;
}
interface OwnerAgentsResult {
    agentIds: number[];
    owner: string;
    chain: string;
    chainId: number;
}
interface PlanResult {
    planId: number;
    agentId: number;
    creator: string;
    /** Alias of `subscriptionPrice` (wei / token units, decimal string). */
    price: string;
    period: string;
    active: boolean;
    payToken: string;
    /** Always 0 — ERC8004SubscriptionManager has no trial period. */
    trialDays: number;
    name: string;
    description: string;
    /** 0=Subscription, 1=UsageBased, 2=Hybrid */
    planType: number;
    subscriptionPrice: string;
    usagePrice: string;
    /** 0=Daily, 1=Weekly, 2=Monthly, 3=Quarterly, 4=Yearly */
    billingPeriod: number;
    maxUsage: string;
    totalUsageLimit: string;
    platformFeePercentage: number;
    chain: string;
    chainId: number;
}
interface CheckSubscriptionResult {
    active: boolean;
    subscriber: string;
    agentId: number;
    chain: string;
    chainId: number;
}
interface SubscriptionDetailResult {
    subscriptionId: number;
    planId: number;
    subscriber: string;
    agentId: number;
    /** 0=Active, 1=Cancelled, 2=Expired, 3=PaymentFailed, 4=Suspended */
    status: number;
    /** 0=Subscription, 1=UsageBased, 2=Hybrid */
    planType: number;
    startedAt: number;
    /** Next charge date (renewal anchor). */
    nextBillingDate: number;
    endDate: number;
    period: string;
    payToken: string;
    amountPaid: string;
    currentPeriodUsage: string;
    totalUsage: string;
    remainingUsage: string;
    lastPaymentDate: number;
    chain: string;
    chainId: number;
}
interface MySubscriptionsResult {
    subscriptionIds: string[];
    user: string;
    chain: string;
    chainId: number;
}
interface FeeResult {
    platformFeeBps: number;
    chain: string;
    chainId: number;
}
/** WRITE tools don't sign — they return a descriptor for the wallet client to submit. */
interface WriteOpResult {
    _writeOp: boolean;
    message: string;
    contract: string;
    chain: string;
    chainId: number;
    args?: Record<string, unknown>;
}
/** Subscription plan of a centralized agent (same shape as on-chain plans). */
interface CentralPlanResult {
    planId: number;
    /** wei, decimal string. */
    price: string;
    period: string;
    payToken: string;
    isActive: boolean;
    trialDays: number;
    creator: string | null;
}
interface CentralAgentResult {
    id: number;
    owner: string;
    name: string;
    description: string;
    tags: string[];
    capabilities: string[];
    skills: string[];
    category: string;
    isActive: boolean;
    source: 'central';
    createdAt: string;
    subscriptionPlans: CentralPlanResult[];
}
interface CentralAgentsResult {
    agents: CentralAgentResult[];
    total: number;
    page: number;
    pageSize: number;
}
interface CentralSubscriptionCheckResult {
    active: boolean;
    subscriber: string;
    agentId: number;
}
/** Result of `actora_central_subscription_subscribe` — payment instruction or activated subscription. */
interface CentralSubscriptionResult {
    paymentRequired?: boolean;
    active?: boolean;
    amountWei?: string;
    payTo?: string;
    network?: string;
    instructions?: string;
    [key: string]: unknown;
}
interface GatewayHealthResult {
    status: string;
    services?: Record<string, unknown>;
    time?: string;
    [key: string]: unknown;
}
interface TenantResult {
    tenant: string;
    [key: string]: unknown;
}

interface McpClientConfig {
    /** Actora Gateway base URL, e.g. https://actora.codes */
    gatewayUrl: string;
    /** Chain used by default when a tool call omits `chain`. Aligns with the server default ('bsc'). */
    defaultChain?: McpChain;
    /** Extra headers, e.g. `Authorization: Bearer <jwt>` for registered-user tools. */
    headers?: Record<string, string>;
    /** Per-request timeout in ms (default 30_000). */
    timeoutMs?: number;
}
/**
 * Typed MCP client for the Actora Gateway MCP server.
 *
 * Connects to `<gatewayUrl>/mcp` over standard MCP JSON-RPC 2.0 and exposes
 * the Actora tools — with typed convenience methods for the IdentityRegistry,
 * SubscriptionManager and centralized-agent (C-6) groups. All WRITE tools return
 * a `WriteOpResult` descriptor; the actual transaction must be signed/submitted
 * with a wallet.
 */
declare class McpClient {
    private readonly url;
    private readonly defaultChain;
    private readonly headers;
    private readonly timeoutMs;
    private requestId;
    private serverInfo?;
    constructor(config: McpClientConfig);
    /** Perform a raw JSON-RPC request. */
    private rpc;
    /** Parse a tool call result (JSON inside `content[0].text`), tolerant of non-JSON text. */
    private static parseToolResult;
    /** `initialize` MCP handshake (cached). */
    initialize(): Promise<McpServerInfo>;
    /** `tools/list` — all tools registered on the server. */
    listTools(): Promise<McpToolSchema[]>;
    /** `tools/call` — invoke any tool and return the parsed result. */
    callTool<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T>;
    /** `actora_identity_list_all` — batch query with filters (same as SDK `getAllAgents`). */
    listAgents(opts?: {
        chain?: McpChain;
        fromId?: number;
        toId?: number;
        activeOnly?: boolean;
        capabilities?: string;
    }): Promise<ListAgentsResult>;
    /** `actora_identity_metadata` — structured metadata for one agent. */
    getAgentMetadata(agentId: number, chain?: McpChain): Promise<AgentMetadataResult>;
    /** `actora_identity_total_count` — total registered agents. */
    totalAgents(chain?: McpChain): Promise<TotalAgentsResult>;
    /** `actora_identity_exists` — on-chain existence check. */
    agentExists(agentId: number, chain?: McpChain): Promise<AgentExistsResult>;
    /** `actora_identity_list` — agent IDs owned by a wallet. */
    agentsOfOwner(ownerAddress: string, chain?: McpChain): Promise<OwnerAgentsResult>;
    /** `actora_subscription_plans` — single plan details (price is a decimal wei string). */
    getPlan(planId: number, chain?: McpChain): Promise<PlanResult>;
    /** `actora_subscription_create_plan` — WRITE descriptor (sign & submit with a wallet). */
    createPlan(args: {
        agentId: number;
        /** Recurring price in wei/token units (required unless planType=1). */
        price?: string;
        /** Per-use price (required when planType is 1 or 2). */
        usagePrice?: string;
        period: 'day' | 'week' | 'month' | 'quarter' | 'year';
        planType?: 0 | 1 | 2;
        name?: string;
        description?: string;
        payToken?: string;
        maxUsage?: string;
        totalUsageLimit?: string;
        chain?: McpChain;
    }): Promise<WriteOpResult>;
    /** `actora_subscription_check` — active subscription for (wallet, agent). */
    checkSubscription(subscriberAddress: string, agentId: number, chain?: McpChain): Promise<CheckSubscriptionResult>;
    /** `actora_subscription_detail` — full subscription detail. */
    subscriptionDetail(subscriptionId: number, chain?: McpChain): Promise<SubscriptionDetailResult>;
    /** `actora_subscription_my_list` — all subscription IDs of a wallet. */
    mySubscriptions(userAddress: string, chain?: McpChain): Promise<MySubscriptionsResult>;
    /** `actora_subscription_subscribe` — WRITE descriptor. */
    subscribe(planId: number, opts?: {
        valueWei?: string;
        chain?: McpChain;
    }): Promise<WriteOpResult>;
    /** `actora_subscription_cancel` — WRITE descriptor. */
    cancelSubscription(subscriptionId: number, chain?: McpChain): Promise<WriteOpResult>;
    /** `actora_subscription_release` — deprecated (no escrow); returns an error result. */
    releaseFunds(subscriptionId: number, chain?: McpChain): Promise<WriteOpResult>;
    /** `actora_subscription_fee` — current platform fee in basis points. */
    platformFee(chain?: McpChain): Promise<FeeResult>;
    /** `actora_gateway_health` — gateway health + indexer status. */
    gatewayHealth(): Promise<GatewayHealthResult>;
    /**
     * `actora_gateway_tenant` — current tenant info. Requires a registered-user
     * JWT: pass `accessToken` here, or configure `headers: { Authorization: 'Bearer <jwt>' }`
     * (the gateway injects the Bearer token into the `access_token` argument).
     */
    gatewayTenant(accessToken?: string): Promise<TenantResult>;
    /**
     * `actora_central_agent_list` — centralized agents (source="central", negative
     * IDs, NOT on-chain NFTs) with their subscription plans (central_plans, same
     * structure as on-chain plans). Public read.
     */
    centralAgents(opts?: {
        activeOnly?: boolean;
        category?: string;
        capabilities?: string;
        page?: number;
        pageSize?: number;
    }): Promise<CentralAgentsResult>;
    /**
     * `actora_central_subscription_check` — whether a wallet has an active
     * subscription for a centralized agent (negative agentId). Resolves off-chain
     * fiat/x402 records first (resolveAccess). Public read.
     */
    centralSubscriptionCheck(subscriber: string, agentId: number): Promise<CentralSubscriptionCheckResult>;
    /** `actora_central_agent_create` — publish a centralized agent (needs registered-user JWT). */
    centralAgentCreate(args: {
        accessToken: string;
        name: string;
        description?: string;
        tags?: string[];
        capabilities?: string[];
        skills?: string[];
        category?: string;
    }): Promise<CentralAgentResult>;
    /** `actora_central_agent_update` — update / list / delist a centralized agent you own. */
    centralAgentUpdate(args: {
        accessToken: string;
        agentId: number;
        name?: string;
        description?: string;
        tags?: string[];
        capabilities?: string[];
        skills?: string[];
        category?: string;
        isActive?: boolean;
    }): Promise<CentralAgentResult>;
    /**
     * `actora_central_subscription_subscribe` — x402 purchase for a centralized
     * agent. First call (no `txHash`) returns the payment instruction; call again
     * with the on-chain `txHash` to activate.
     */
    centralSubscriptionSubscribe(args: {
        accessToken: string;
        agentId: number;
        subscriber: string;
        period?: 'day' | 'week' | 'month' | 'year';
        priceWei?: string;
        txHash?: string;
    }): Promise<CentralSubscriptionResult>;
}

export { type AgentExistsResult, type AgentMetadata, type AgentMetadataResult, type AgentSummary, type CentralAgentResult, type CentralAgentsResult, type CentralPlanResult, type CentralSubscriptionCheckResult, type CentralSubscriptionResult, type CheckSubscriptionResult, type FeeResult, type GatewayHealthResult, type ListAgentsResult, type McpChain, McpClient, type McpClientConfig, type McpServerInfo, type McpToolSchema, type MySubscriptionsResult, type OwnerAgentsResult, type PlanResult, type SubscriptionDetailResult, type TenantResult, type TotalAgentsResult, type WriteOpResult };
