# @agentxv2/mcp

**AgentX MCP 客户端包** — 类型化访问 AgentX Gateway 的 MCP 服务（40 个工具）：IdentityRegistry 读取、订阅套餐/操作、**中心化 Agent（C-6，链下市场）**、A2A、信誉、配置、端点、**对话与并行任务管理**。

```
第三方服务 ── @agentxv2/mcp ──► POST <GATEWAY>/mcp (MCP JSON-RPC 2.0)
                                 ├─ agentx_identity_*     链上 Agent 读取
                                 ├─ agentx_subscription_* 订阅套餐 / 写操作描述
                                 ├─ agentx_central_*      中心化 Agent（链下，负 ID）：列表 / 订阅状态
                                 ├─ agentx_a2a_* / reputation / config / endpoint
                                 ├─ agentx_gateway_health / tenant
                                 └─ agentx_gateway_chat / create_session / create_task / get_task / list_tasks / cancel_task
```

> 与 [@agentxv2/sdk](https://www.npmjs.com/package/@agentxv2/sdk) 的区别：SDK 直连区块链（读/写/事件），本包走 Gateway MCP 协议（工具化调用，无需 RPC 端点，生产地址由 Gateway 提供）。

## 安装

```bash
npm install @agentxv2/mcp
```

## 快速开始

```typescript
import { McpClient } from '@agentxv2/mcp'

const mcp = new McpClient({
  gatewayUrl: 'https://agentx.0xainet.top',  // AgentX Gateway
  defaultChain: 'oxachain',                 // 默认链（对齐服务端默认 'sepolia'）
})

// 握手 + 工具列表
const info = await mcp.initialize()
console.log('server:', info)                // { name, version }

const tools = await mcp.listTools()
console.log('工具数:', tools.length)         // 40

// 批量查询 Agent（等价 SDK getAllAgents）
const { agents, total } = await mcp.listAgents({ fromId: 1, toId: total, activeOnly: true })
for (const a of agents) {
  console.log(a.agentId, a.metadata.name, a.metadata.capabilities, a.metadata.isActive)
}

// 单个元数据 / 总数
const meta = await mcp.getAgentMetadata(1)
const count = await mcp.totalAgents()

// 订阅套餐（price 为 wei 十进制字符串）
const plan = await mcp.getPlan(1)
// → { planId: 1, agentId: 1, creator, price: "10000000000000000", period, active, payToken, trialDays }

// WRITE：返回待签名交易描述（需用钱包签名提交，包内不直接发交易）
const op = await mcp.createPlan({ agentId: 2, price: '10000000000000000', period: 'month' })
// → { _writeOp: true, contract, chain, args: { agentId, price, period, ... } }

// 通用调用：任何工具（a2a / reputation / config / endpoint 等）
const status = await mcp.callTool('agentx_gateway_health', {})
```

## 中心化 Agent（C-6，链下市场）用法示例

中心化 Agent（`agents.source='central'`，**负 ID**，不发布在链上）订阅计划存于网关 DB（`central_plans`），但付费复用与链上完全相同的 x402 通道。MCP 提供两个公开读工具，用于发现中心化 Agent 与校验订阅状态：

```typescript
// 1. 中心化 Agent 列表 + 订阅计划（与链上 subscriptionPlans 同一响应结构）
const { agents, total } = await mcp.centralAgents({
  activeOnly: true, category: 'finance', page: 1, pageSize: 20,
})
// agents[0] → { id: -3, name, owner, description, category, isActive, subscriptionPlans: [...] }
// plan     → { planId, price: "1000000000000000000", period: "month", payToken: "native", isActive, ... }

// 2. 订阅状态检查（resolveAccess 链下优先 —— 与 App 订阅守卫同一判定）
const { active } = await mcp.centralSubscriptionCheck('0x…', agents[0].id)
// → { active: true, subscriber: '0x…', agentId: -3 }
```

等价于直接调用底层工具（通用 `callTool`，任何语言/HTTP 客户端可用）：

```bash
curl -s -X POST https://agentx.0xainet.top/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"agentx_central_agent_list",
                 "arguments":{"activeOnly":true,"pageSize":20}}}'
# → { agents: [...], total, page, pageSize }

curl -s -X POST https://agentx.0xainet.top/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"agentx_central_subscription_check",
                 "arguments":{"subscriber":"0x…","agentId":-3}}}'
# → { active: true, subscriber: '0x…', agentId: -3 }
```

> **注意**
> - 负 ID 是中心化 Agent 的标识，**不要**传给链上工具（`agentx_identity_*` / `agentx_subscription_*`）——那些工具读的是链上合约。
> - 中心化 Agent 的**周期订阅付费**不在 MCP（MCP 不做支付），请用 SDK `SubscriptionPayments.pay({ method:'x402', agentId, planId, period, priceWei })`（v0.11.10+）或网关 REST。
> - **发布**中心化 Agent：`POST /api/v1/agents/central`（JWT 或租户 Key，MCP 不提供发布/写工具）。

## 鉴权

Gateway MCP 公开无鉴权（读取与 WRITE 描述）。租户相关工具（`agentx_gateway_tenant` 与全部对话/任务工具）需在调用参数中带 `api_key`（`X-Api-Key`）或 `access_token`（JWT）：

```typescript
const mcp = new McpClient({
  gatewayUrl: '...',
  headers: { 'X-Api-Key': 'agentx_sk_live_...' },
})
```

## API 一览

| 方法 | 对应 MCP 工具 | 说明 |
|------|--------------|------|
| `initialize()` / `listTools()` / `callTool()` | — | 底层 MCP 协议 |
| `listAgents({chain,fromId,toId,activeOnly,capabilities})` | `agentx_identity_list_all` | 批量查询 + 筛选 |
| `getAgentMetadata(agentId, chain?)` | `agentx_identity_metadata` | 单 Agent 结构化元数据 |
| `totalAgents(chain?)` | `agentx_identity_total_count` | 总注册数 |
| `agentExists(agentId, chain?)` | `agentx_identity_exists` | 存在性检查 |
| `agentsOfOwner(owner, chain?)` | `agentx_identity_list` | 钱包拥有的 Agent IDs |
| `getPlan(planId, chain?)` | `agentx_subscription_plans` | 套餐详情 |
| `createPlan({agentId,price,period,...})` | `agentx_subscription_create_plan` | 创建套餐（WRITE） |
| `subscribe(planId, {valueWei})` | `agentx_subscription_subscribe` | 订阅（WRITE） |
| `cancelSubscription(id)` / `releaseFunds(id)` | `agentx_subscription_cancel/release` | 取消/释放（WRITE） |
| `checkSubscription(sub, agentId)` | `agentx_subscription_check` | 订阅有效性（链上） |
| `centralAgents({activeOnly,category,capabilities,page,pageSize})` | `agentx_central_agent_list` | 中心化 Agent 列表 + 计划（链下，C-6） |
| `centralSubscriptionCheck(sub, agentId)` | `agentx_central_subscription_check` | 中心化 Agent 订阅有效性（resolveAccess 链下优先） |
| `subscriptionDetail(id)` / `mySubscriptions(addr)` | `agentx_subscription_detail/my_list` | 订阅详情/列表 |
| `platformFee(chain?)` | `agentx_subscription_fee` | 平台费率（bps） |
| `gatewayHealth()` / `gatewayTenant()` | `agentx_gateway_health/tenant` | Gateway 状态 |
| 对话/任务（`callTool`） | `agentx_gateway_chat` / `..._create_session` / `..._create_task` / `..._get_task` / `..._list_tasks` / `..._cancel_task` | 单轮对话与并行任务管理（需 `access_token` JWT 参数） |

## 关键约定

- **period**：`createPlan` 仅接受 `'day' | 'week' | 'month' | 'year'`（合约 `_periodToSeconds` 只映射这四个值，其他字符串会静默回退 30 天）。
- **price**：wei 十进制字符串（避免精度丢失）。
- **WRITE 工具**：返回 `{ _writeOp: true, contract, chain, args }` 描述，交易签名/提交由调用方钱包完成。
- **chain**：`'sepolia'`（默认，对齐服务端）或 `'oxachain'`（L1 主网）。
- **Node 18+ / 浏览器**：依赖原生 `fetch`，无其他运行时依赖。

## 完整服务端工具与协议

见仓库 [MCP_SETUP.md](https://github.com/sftgroup/Agentx/blob/main/MCP_SETUP.md) 与 [docs/sdk-integration-example.md](https://github.com/sftgroup/Agentx/blob/main/docs/sdk-integration-example.md)。
