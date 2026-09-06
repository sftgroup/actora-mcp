// src/client.ts
var McpClient = class _McpClient {
  constructor(config) {
    this.requestId = 0;
    const base = config.gatewayUrl.replace(/\/+$/, "");
    this.url = `${base}/mcp`;
    this.defaultChain = config.defaultChain ?? "sepolia";
    this.headers = { "Content-Type": "application/json", ...config.headers };
    this.timeoutMs = config.timeoutMs ?? 3e4;
  }
  // ── Low-level MCP protocol ───────────────────────────────────────────────
  /** Perform a raw JSON-RPC request. */
  async rpc(method, params) {
    const id = ++this.requestId;
    const body = { jsonrpc: "2.0", id, method, params };
    const res = await fetch(this.url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!res.ok) {
      throw new Error(`MCP HTTP ${res.status}: ${await res.text().catch(() => "")}`);
    }
    const json = await res.json();
    if (json.error) {
      const err = new Error(`MCP error [${json.error.code}]: ${json.error.message}`);
      err.data = json.error.data;
      throw err;
    }
    return json.result;
  }
  /** Parse a tool call result (JSON inside `content[0].text`), tolerant of non-JSON text. */
  static parseToolResult(result) {
    const envelope = result;
    const text = envelope?.content?.[0]?.text;
    if (typeof text === "string" && text.length > 0) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return result;
  }
  /** `initialize` MCP handshake (cached). */
  async initialize() {
    if (this.serverInfo) return this.serverInfo;
    const result = await this.rpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "@actora/mcp", version: "0.1.0" }
    });
    this.serverInfo = result.serverInfo ?? {};
    return this.serverInfo;
  }
  /** `tools/list` — all tools registered on the server. */
  async listTools() {
    const result = await this.rpc("tools/list");
    return result.tools ?? [];
  }
  /** `tools/call` — invoke any tool and return the parsed result. */
  async callTool(name, args = {}) {
    await this.initialize();
    const result = await this.rpc("tools/call", { name, arguments: args });
    return _McpClient.parseToolResult(result);
  }
  // ── IdentityRegistry ─────────────────────────────────────────────────────
  /** `actora_identity_list_all` — batch query with filters (same as SDK `getAllAgents`). */
  listAgents(opts = {}) {
    return this.callTool("actora_identity_list_all", {
      chain: opts.chain ?? this.defaultChain,
      ...opts.fromId !== void 0 && { fromId: opts.fromId },
      ...opts.toId !== void 0 && { toId: opts.toId },
      ...opts.activeOnly !== void 0 && { activeOnly: opts.activeOnly },
      ...opts.capabilities !== void 0 && { capabilities: opts.capabilities }
    });
  }
  /** `actora_identity_metadata` — structured metadata for one agent. */
  getAgentMetadata(agentId, chain) {
    return this.callTool("actora_identity_metadata", { chain: chain ?? this.defaultChain, agentId });
  }
  /** `actora_identity_total_count` — total registered agents. */
  totalAgents(chain) {
    return this.callTool("actora_identity_total_count", { chain: chain ?? this.defaultChain });
  }
  /** `actora_identity_exists` — on-chain existence check. */
  agentExists(agentId, chain) {
    return this.callTool("actora_identity_exists", { chain: chain ?? this.defaultChain, agentId });
  }
  /** `actora_identity_list` — agent IDs owned by a wallet. */
  agentsOfOwner(ownerAddress, chain) {
    return this.callTool("actora_identity_list", { chain: chain ?? this.defaultChain, ownerAddress });
  }
  // ── SubscriptionManager ──────────────────────────────────────────────────
  /** `actora_subscription_plans` — single plan details (price is a decimal wei string). */
  getPlan(planId, chain) {
    return this.callTool("actora_subscription_plans", { chain: chain ?? this.defaultChain, planId });
  }
  /** `actora_subscription_create_plan` — WRITE descriptor (sign & submit with a wallet). */
  createPlan(args) {
    return this.callTool("actora_subscription_create_plan", {
      chain: args.chain ?? this.defaultChain,
      agentId: args.agentId,
      price: args.price,
      period: args.period,
      ...args.payToken !== void 0 && { payToken: args.payToken },
      ...args.trialDays !== void 0 && { trialDays: args.trialDays }
    });
  }
  /** `actora_subscription_check` — active subscription for (wallet, agent). */
  checkSubscription(subscriberAddress, agentId, chain) {
    return this.callTool("actora_subscription_check", { chain: chain ?? this.defaultChain, subscriberAddress, agentId });
  }
  /** `actora_subscription_detail` — full subscription detail. */
  subscriptionDetail(subscriptionId, chain) {
    return this.callTool("actora_subscription_detail", { chain: chain ?? this.defaultChain, subscriptionId });
  }
  /** `actora_subscription_my_list` — all subscription IDs of a wallet. */
  mySubscriptions(userAddress, chain) {
    return this.callTool("actora_subscription_my_list", { chain: chain ?? this.defaultChain, userAddress });
  }
  /** `actora_subscription_subscribe` — WRITE descriptor. */
  subscribe(planId, opts = {}) {
    return this.callTool("actora_subscription_subscribe", {
      chain: opts.chain ?? this.defaultChain,
      planId,
      ...opts.valueWei !== void 0 && { valueWei: opts.valueWei }
    });
  }
  /** `actora_subscription_cancel` — WRITE descriptor. */
  cancelSubscription(subscriptionId, chain) {
    return this.callTool("actora_subscription_cancel", { chain: chain ?? this.defaultChain, subscriptionId });
  }
  /** `actora_subscription_release` — WRITE descriptor (release escrowed funds). */
  releaseFunds(subscriptionId, chain) {
    return this.callTool("actora_subscription_release", { chain: chain ?? this.defaultChain, subscriptionId });
  }
  /** `actora_subscription_fee` — current platform fee in basis points. */
  platformFee(chain) {
    return this.callTool("actora_subscription_fee", { chain: chain ?? this.defaultChain });
  }
  // ── Gateway ──────────────────────────────────────────────────────────────
  /** `actora_gateway_health` — gateway health + indexer status. */
  gatewayHealth() {
    return this.callTool("actora_gateway_health", {});
  }
  /** `actora_gateway_tenant` — current tenant info (needs `X-Api-Key` header). */
  gatewayTenant() {
    return this.callTool("actora_gateway_tenant", {});
  }
  // ── Centralized agents (C-6, off-chain) ──────────────────────────────────
  /**
   * `actora_central_agent_list` — centralized agents (source="central", negative
   * IDs, NOT on-chain NFTs) with their subscription plans (central_plans, same
   * structure as on-chain plans). Public read.
   */
  centralAgents(opts = {}) {
    return this.callTool("actora_central_agent_list", {
      ...opts.activeOnly !== void 0 && { activeOnly: opts.activeOnly },
      ...opts.category !== void 0 && { category: opts.category },
      ...opts.capabilities !== void 0 && { capabilities: opts.capabilities },
      ...opts.page !== void 0 && { page: opts.page },
      ...opts.pageSize !== void 0 && { pageSize: opts.pageSize }
    });
  }
  /**
   * `actora_central_subscription_check` — whether a wallet has an active
   * subscription for a centralized agent (negative agentId). Resolves off-chain
   * fiat/x402 records first (resolveAccess). Public read.
   */
  centralSubscriptionCheck(subscriber, agentId) {
    return this.callTool("actora_central_subscription_check", { subscriber, agentId });
  }
};
export {
  McpClient
};
