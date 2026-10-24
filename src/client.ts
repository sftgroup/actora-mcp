import type {
  AgentExistsResult, AgentMetadataResult, CentralAgentsResult, CentralSubscriptionCheckResult,
  CheckSubscriptionResult, FeeResult, GatewayHealthResult, ListAgentsResult, McpChain,
  McpServerInfo, McpToolSchema, MySubscriptionsResult, OwnerAgentsResult, PlanResult,
  SubscriptionDetailResult, TenantResult, TotalAgentsResult, WriteOpResult,
} from './types'

export interface McpClientConfig {
  /** Actora Gateway base URL, e.g. https://actora.codes */
  gatewayUrl: string
  /** Chain used by default when a tool call omits `chain`. Aligns with the server default ('sepolia'). */
  defaultChain?: McpChain
  /** Extra headers (e.g. `X-Api-Key` for tenant-gated tools). */
  headers?: Record<string, string>
  /** Per-request timeout in ms (default 30_000). */
  timeoutMs?: number
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: unknown
}

interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

/** Result envelope: parsed JSON from `result.content[0].text`, or the raw result when absent. */
export interface McpResultEnvelope {
  content?: Array<{ type?: string; text?: string; [key: string]: unknown }>
  [key: string]: unknown
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
export class McpClient {
  private readonly url: string
  private readonly defaultChain: McpChain
  private readonly headers: Record<string, string>
  private readonly timeoutMs: number
  private requestId = 0
  private serverInfo?: McpServerInfo

  constructor(config: McpClientConfig) {
    const base = config.gatewayUrl.replace(/\/+$/, '')
    this.url = `${base}/mcp`
    this.defaultChain = config.defaultChain ?? 'sepolia'
    this.headers = { 'Content-Type': 'application/json', ...config.headers }
    this.timeoutMs = config.timeoutMs ?? 30_000
  }

  // ── Low-level MCP protocol ───────────────────────────────────────────────

  /** Perform a raw JSON-RPC request. */
  private async rpc(method: string, params?: unknown): Promise<unknown> {
    const id = ++this.requestId
    const body: JsonRpcRequest = { jsonrpc: '2.0', id, method, params }

    const res = await fetch(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!res.ok) {
      throw new Error(`MCP HTTP ${res.status}: ${await res.text().catch(() => '')}`)
    }
    const json = (await res.json()) as { result?: unknown; error?: JsonRpcError }
    if (json.error) {
      const err = new Error(`MCP error [${json.error.code}]: ${json.error.message}`)
      ;(err as { data?: unknown }).data = json.error.data
      throw err
    }
    return json.result
  }

  /** Parse a tool call result (JSON inside `content[0].text`), tolerant of non-JSON text. */
  private static parseToolResult<T>(result: unknown): T {
    const envelope = result as McpResultEnvelope | undefined
    const text = envelope?.content?.[0]?.text
    if (typeof text === 'string' && text.length > 0) {
      try {
        return JSON.parse(text) as T
      } catch {
        return text as unknown as T
      }
    }
    return result as T
  }

  /** `initialize` MCP handshake (cached). */
  async initialize(): Promise<McpServerInfo> {
    if (this.serverInfo) return this.serverInfo
    const result = (await this.rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: '@actora/mcp', version: '0.1.0' },
    })) as { serverInfo?: McpServerInfo }
    this.serverInfo = result.serverInfo ?? {}
    return this.serverInfo
  }

  /** `tools/list` — all tools registered on the server. */
  async listTools(): Promise<McpToolSchema[]> {
    const result = (await this.rpc('tools/list')) as { tools?: McpToolSchema[] }
    return result.tools ?? []
  }

  /** `tools/call` — invoke any tool and return the parsed result. */
  async callTool<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    await this.initialize()
    const result = await this.rpc('tools/call', { name, arguments: args })
    return McpClient.parseToolResult<T>(result)
  }

  // ── IdentityRegistry ─────────────────────────────────────────────────────

  /** `actora_identity_list_all` — batch query with filters (same as SDK `getAllAgents`). */
  listAgents(opts: {
    chain?: McpChain; fromId?: number; toId?: number;
    activeOnly?: boolean; capabilities?: string
  } = {}): Promise<ListAgentsResult> {
    return this.callTool('actora_identity_list_all', {
      chain: opts.chain ?? this.defaultChain,
      ...(opts.fromId !== undefined && { fromId: opts.fromId }),
      ...(opts.toId !== undefined && { toId: opts.toId }),
      ...(opts.activeOnly !== undefined && { activeOnly: opts.activeOnly }),
      ...(opts.capabilities !== undefined && { capabilities: opts.capabilities }),
    })
  }

  /** `actora_identity_metadata` — structured metadata for one agent. */
  getAgentMetadata(agentId: number, chain?: McpChain): Promise<AgentMetadataResult> {
    return this.callTool('actora_identity_metadata', { chain: chain ?? this.defaultChain, agentId })
  }

  /** `actora_identity_total_count` — total registered agents. */
  totalAgents(chain?: McpChain): Promise<TotalAgentsResult> {
    return this.callTool('actora_identity_total_count', { chain: chain ?? this.defaultChain })
  }

  /** `actora_identity_exists` — on-chain existence check. */
  agentExists(agentId: number, chain?: McpChain): Promise<AgentExistsResult> {
    return this.callTool('actora_identity_exists', { chain: chain ?? this.defaultChain, agentId })
  }

  /** `actora_identity_list` — agent IDs owned by a wallet. */
  agentsOfOwner(ownerAddress: string, chain?: McpChain): Promise<OwnerAgentsResult> {
    return this.callTool('actora_identity_list', { chain: chain ?? this.defaultChain, ownerAddress })
  }

  // ── SubscriptionManager ──────────────────────────────────────────────────

  /** `actora_subscription_plans` — single plan details (price is a decimal wei string). */
  getPlan(planId: number, chain?: McpChain): Promise<PlanResult> {
    return this.callTool('actora_subscription_plans', { chain: chain ?? this.defaultChain, planId })
  }

  /** `actora_subscription_create_plan` — WRITE descriptor (sign & submit with a wallet). */
  createPlan(args: {
    agentId: number
    /** Recurring price in wei/token units (required unless planType=1). */
    price?: string
    /** Per-use price (required when planType is 1 or 2). */
    usagePrice?: string
    period: 'day' | 'week' | 'month' | 'quarter' | 'year'
    planType?: 0 | 1 | 2
    name?: string
    description?: string
    payToken?: string
    maxUsage?: string
    totalUsageLimit?: string
    chain?: McpChain
  }): Promise<WriteOpResult> {
    const { chain, ...rest } = args
    return this.callTool('actora_subscription_create_plan', {
      chain: chain ?? this.defaultChain,
      ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)),
    })
  }

  /** `actora_subscription_check` — active subscription for (wallet, agent). */
  checkSubscription(subscriberAddress: string, agentId: number, chain?: McpChain): Promise<CheckSubscriptionResult> {
    return this.callTool('actora_subscription_check', { chain: chain ?? this.defaultChain, subscriberAddress, agentId })
  }

  /** `actora_subscription_detail` — full subscription detail. */
  subscriptionDetail(subscriptionId: number, chain?: McpChain): Promise<SubscriptionDetailResult> {
    return this.callTool('actora_subscription_detail', { chain: chain ?? this.defaultChain, subscriptionId })
  }

  /** `actora_subscription_my_list` — all subscription IDs of a wallet. */
  mySubscriptions(userAddress: string, chain?: McpChain): Promise<MySubscriptionsResult> {
    return this.callTool('actora_subscription_my_list', { chain: chain ?? this.defaultChain, userAddress })
  }

  /** `actora_subscription_subscribe` — WRITE descriptor. */
  subscribe(planId: number, opts: { valueWei?: string; chain?: McpChain } = {}): Promise<WriteOpResult> {
    return this.callTool('actora_subscription_subscribe', {
      chain: opts.chain ?? this.defaultChain,
      planId,
      ...(opts.valueWei !== undefined && { valueWei: opts.valueWei }),
    })
  }

  /** `actora_subscription_cancel` — WRITE descriptor. */
  cancelSubscription(subscriptionId: number, chain?: McpChain): Promise<WriteOpResult> {
    return this.callTool('actora_subscription_cancel', { chain: chain ?? this.defaultChain, subscriptionId })
  }

  /** `actora_subscription_release` — deprecated (no escrow); returns an error result. */
  releaseFunds(subscriptionId: number, chain?: McpChain): Promise<WriteOpResult> {
    return this.callTool('actora_subscription_release', { chain: chain ?? this.defaultChain, subscriptionId })
  }

  /** `actora_subscription_fee` — current platform fee in basis points. */
  platformFee(chain?: McpChain): Promise<FeeResult> {
    return this.callTool('actora_subscription_fee', { chain: chain ?? this.defaultChain })
  }

  // ── Gateway ──────────────────────────────────────────────────────────────

  /** `actora_gateway_health` — gateway health + indexer status. */
  gatewayHealth(): Promise<GatewayHealthResult> {
    return this.callTool('actora_gateway_health', {})
  }

  /** `actora_gateway_tenant` — current tenant info (needs `X-Api-Key` header). */
  gatewayTenant(): Promise<TenantResult> {
    return this.callTool('actora_gateway_tenant', {})
  }

  // ── Centralized agents (C-6, off-chain) ──────────────────────────────────

  /**
   * `actora_central_agent_list` — centralized agents (source="central", negative
   * IDs, NOT on-chain NFTs) with their subscription plans (central_plans, same
   * structure as on-chain plans). Public read.
   */
  centralAgents(opts: {
    activeOnly?: boolean; category?: string; capabilities?: string;
    page?: number; pageSize?: number
  } = {}): Promise<CentralAgentsResult> {
    return this.callTool('actora_central_agent_list', {
      ...(opts.activeOnly !== undefined && { activeOnly: opts.activeOnly }),
      ...(opts.category !== undefined && { category: opts.category }),
      ...(opts.capabilities !== undefined && { capabilities: opts.capabilities }),
      ...(opts.page !== undefined && { page: opts.page }),
      ...(opts.pageSize !== undefined && { pageSize: opts.pageSize }),
    })
  }

  /**
   * `actora_central_subscription_check` — whether a wallet has an active
   * subscription for a centralized agent (negative agentId). Resolves off-chain
   * fiat/x402 records first (resolveAccess). Public read.
   */
  centralSubscriptionCheck(subscriber: string, agentId: number): Promise<CentralSubscriptionCheckResult> {
    return this.callTool('actora_central_subscription_check', { subscriber, agentId })
  }
}
