# @actora/mcp

**Actora MCP 客户端包** — 类型化访问 Actora Gateway 的 MCP 服务（43 个工具）：IdentityRegistry 读取、订阅套餐/操作、**中心化 Agent（C-6，链下市场）发布/订阅**、A2A、信誉、配置、端点、**对话与并行任务管理**。

```
第三方服务 ── @actora/mcp ──► POST <GATEWAY>/mcp (MCP JSON-RPC 2.0)
                                 ├─ actora_identity_*     链上 Agent 读取
                                 ├─ actora_subscription_* 订阅套餐 / 写操作描述
                                 ├─ actora_central_*      中心化 Agent（链下，负 ID）：发布 / 更新 / 列表 / 订阅状态 / 订阅购买
                                 ├─ actora_a2a_* / reputation / config / endpoint
                                 ├─ actora_gateway_health / tenant
                                 └─ actora_gateway_chat / create_session / create_task / get_task / list_tasks / cancel_task
```

> 与 [@actora/sdk](https://www.npmjs.com/package/@actora/sdk) 的区别：SDK 直连区块链（读/写/事件），本包走 Gateway MCP 协议（工具化调用，无需 RPC 端点，生产地址由 Gateway 提供）。

## 安装

```bash
npm install @actora/mcp
```

## 快速开始

```typescript
import { McpClient } from '@actora/mcp'

const mcp = new McpClient({
  gatewayUrl: 'https://actora.codes',  // Actora Gateway
})

// 握手 + 工具列表
const info = await mcp.initialize()
console.log('server:', info)                // { name, version }

const tools = await mcp.listTools()
console.log('工具数:', tools.length)         // 43

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
const status = await mcp.callTool('actora_gateway_health', {})
```

## 中心化 Agent（C-6，链下市场）用法示例

中心化 Agent（`agents.source='central'`，**负 ID**，不发布在链上）订阅计划存于网关 DB（`central_plans`），但付费复用与链上完全相同的 x402 通道。MCP 提供中心化 Agent 的**发布 / 更新 / 订阅购买 / 列表 / 订阅状态**共 5 个工具：

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
curl -s -X POST https://actora.codes/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"actora_central_agent_list",
                 "arguments":{"activeOnly":true,"pageSize":20}}}'
# → { agents: [...], total, page, pageSize }

curl -s -X POST https://actora.codes/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"actora_central_subscription_check",
                 "arguments":{"subscriber":"0x…","agentId":-3}}}'
# → { active: true, subscriber: '0x…', agentId: -3 }
```

**发布 / 更新与订阅购买**（WRITE，需 `access_token` 注册用户 JWT——MCP 的对话/中心化写工具不接受 B 端 `api_key`）：

```bash
# 发布中心化 Agent（C-6，链下）：自动创建默认月度计划
curl -s -X POST https://actora.codes/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call",
       "params":{"name":"actora_central_agent_create",
                 "arguments":{"access_token":"<user-jwt>","name":"My Agent",
                              "description":"...","capabilities":["chat","trading"]}}}'
# → { id: -N, name, owner, ... }

# 更新 / 上架 / 下架自己发布的中心化 Agent（仅提供变化的字段）
curl -s -X POST https://actora.codes/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call",
       "params":{"name":"actora_central_agent_update",
                 "arguments":{"access_token":"<user-jwt>","agentId":-3,"isActive":true}}}'

# 中心化订阅购买（x402）：首次调用返回付款指令（amountWei / payTo / network），
# 钱包完成链上转账后携 txHash 再次调用以验证并开通
curl -s -X POST https://actora.codes/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call",
       "params":{"name":"actora_central_subscription_subscribe",
                 "arguments":{"access_token":"<user-jwt>","subscriber":"0x…","agentId":-3,"period":"month"}}}'
# → { paymentRequired: true, amountWei, payTo, network, instructions }
```

> **注意**
> - 负 ID 是中心化 Agent 的标识，**不要**传给链上工具（`actora_identity_*` / `actora_subscription_*`）——那些工具读的是链上合约。
> - 中心化 Agent 的**发布 / 更新 / 订阅购买**（`actora_central_agent_create` / `actora_central_agent_update` / `actora_central_subscription_subscribe`）均需 `access_token` 注册用户 JWT。**周期订阅付费**也可用 SDK `SubscriptionPayments.pay({ method:'x402', agentId, planId, period, priceWei })`（v0.11.10+）或网关 REST 完成。

## 鉴权

Gateway MCP 公开无鉴权（读取与 WRITE 描述）。租户相关工具（`actora_gateway_tenant` 与全部对话/任务工具）需在调用参数中带 `api_key`（`X-Api-Key`）或 `access_token`（JWT）：

```typescript
const mcp = new McpClient({
  gatewayUrl: '...',
  headers: { 'X-Api-Key': 'actora_sk_live_...' },
})
```

## API 一览

| 方法 | 对应 MCP 工具 | 说明 |
|------|--------------|------|
| `initialize()` / `listTools()` / `callTool()` | — | 底层 MCP 协议 |
| `listAgents({chain,fromId,toId,activeOnly,capabilities})` | `actora_identity_list_all` | 批量查询 + 筛选 |
| `getAgentMetadata(agentId, chain?)` | `actora_identity_metadata` | 单 Agent 结构化元数据 |
| `totalAgents(chain?)` | `actora_identity_total_count` | 总注册数 |
| `agentExists(agentId, chain?)` | `actora_identity_exists` | 存在性检查 |
| `agentsOfOwner(owner, chain?)` | `actora_identity_list` | 钱包拥有的 Agent IDs |
| `getPlan(planId, chain?)` | `actora_subscription_plans` | 套餐详情 |
| `createPlan({agentId,price,period,...})` | `actora_subscription_create_plan` | 创建套餐（WRITE） |
| `subscribe(planId, {valueWei})` | `actora_subscription_subscribe` | 订阅（WRITE） |
| `cancelSubscription(id)` / `releaseFunds(id)` | `actora_subscription_cancel/release` | 取消/释放（WRITE） |
| `checkSubscription(sub, agentId)` | `actora_subscription_check` | 订阅有效性（链上） |
| `centralAgents({activeOnly,category,capabilities,page,pageSize})` | `actora_central_agent_list` | 中心化 Agent 列表 + 计划（链下，C-6） |
| `centralSubscriptionCheck(sub, agentId)` | `actora_central_subscription_check` | 中心化 Agent 订阅有效性（resolveAccess 链下优先） |
| `centralAgentCreate({name,...})` | `actora_central_agent_create` | 发布中心化 Agent（WRITE，需 `access_token`） |
| `centralAgentUpdate({agentId,...})` | `actora_central_agent_update` | 更新/上架/下架中心化 Agent（WRITE，需 `access_token`） |
| `centralSubscriptionSubscribe({agentId,subscriber,period,txHash})` | `actora_central_subscription_subscribe` | 中心化订阅购买（x402，WRITE，需 `access_token`） |
| `subscriptionDetail(id)` / `mySubscriptions(addr)` | `actora_subscription_detail/my_list` | 订阅详情/列表 |
| `platformFee(chain?)` | `actora_subscription_fee` | 平台费率（bps） |
| `gatewayHealth()` / `gatewayTenant()` | `actora_gateway_health/tenant` | Gateway 状态 |
| 对话/任务（`callTool`） | `actora_gateway_chat` / `..._create_session` / `..._create_task` / `..._get_task` / `..._list_tasks` / `..._cancel_task` | 单轮对话与并行任务管理（需 `access_token` JWT 参数） |

## 关键约定

- **period**：`createPlan` 仅接受 `'day' | 'week' | 'month' | 'year'`（合约 `_periodToSeconds` 只映射这四个值，其他字符串会静默回退 30 天）。
- **price**：wei 十进制字符串（避免精度丢失）。
- **WRITE 工具**：返回 `{ _writeOp: true, contract, chain, args }` 描述，交易签名/提交由调用方钱包完成。
- **chain**：`'sepolia'`（默认，测试网）。
- **Node 18+ / 浏览器**：依赖原生 `fetch`，无其他运行时依赖。

## 完整服务端工具与协议

见仓库 [MCP_SETUP.md](https://github.com/sftgroup/Agentx/blob/main/MCP_SETUP.md) 与 [docs/sdk-integration-example.md](https://github.com/sftgroup/Agentx/blob/main/docs/sdk-integration-example.md)。

## 公开目录登记（服务端分发）

服务端已托管在 `https://actora.codes/mcp`：MCP JSON-RPC 2.0，**43 个工具**，`initialize` / `tools/list` 无需鉴权（执行类工具需网关 JWT）。本目录的 `server.json` 是[官方 MCP Registry](https://registry.modelcontextprotocol.io) 清单（已按 `2025-12-11` schema 校验）：

```bash
cd mcp
mcp-publisher login github   # 需 sftgroup 组织权限，命名空间 io.github.sftgroup
mcp-publisher publish        # 读取 server.json
```

其他目录（Smithery / mcp.so / Glama / PulseMCP）均按 GitHub 仓库或该清单收录，提交时统一填：

| 字段 | 值 |
|---|---|
| 远程地址 | `https://actora.codes/mcp` |
| 传输 | Streamable HTTP |
| 仓库 | `https://github.com/sftgroup/Agentx` |
| 图标 | `https://actora.codes/icon-512.png` |

**兼容性**：服务端当前协商到 MCP `2024-11-05`（无 `Mcp-Session-Id`，无状态 POST）。新客户端请求 `2025-03-26` 时会回落到 `2024-11-05`，按规范可接受；若目录审核要求 Streamable HTTP 会话，需先补协议版本协商。

