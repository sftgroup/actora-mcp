# Actora MCP — 公开目录上架清单

面向 B 端开发者的交付物是**托管 MCP 服务**（不是 marketplace 里的某个 agent）。本文件是可直接粘贴的提交材料与验收方式；代码侧已就绪，剩余发布动作需要**账号登录 / 仓库可见性**（见 §6）。

3 分钟接入示例见 [README.md](./README.md#3-分钟接入远程-http无需安装)。

## 0. 服务事实（提交时统一使用）

| 服务 | 清单 | 远程地址 | 工具数 |
|---|---|---|---|
| 全量（兼容旧调用方） | `server.json` | `https://actora.codes/mcp` | 52 |
| 开发者（Agent 开发/上架/订阅/A2A/信誉） | `server-platform.json` | `https://actora.codes/mcp/platform` | 43 |
| B 端（托管对话/会话/任务/套餐/用量） | `server-tenant.json` | `https://actora.codes/mcp/tenant` | 9 |

公共字段：

| 字段 | 值 |
|---|---|
| 传输 | Streamable HTTP（无状态 POST JSON-RPC 2.0，协商到 `2024-11-05`） |
| 仓库 | `https://github.com/sftgroup/actora-mcp` |
| 官网 | `https://actora.codes` |
| 图标 | `https://actora.codes/icon-512.png` |
| 鉴权 | 只读工具匿名；执行类工具需注册用户 JWT，支持 `Authorization: Bearer <JWT>` 或工具参数 `access_token` |
| 分类建议 | `developer-tools` / `blockchain` / `ai-agents` |

> `initialize` / `tools/list` 无需鉴权，任何目录的健康检查都能直接通过。

## 1. 提交材料（可直接粘贴）

**全量 `io.github.sftgroup/actora`**

```
title:       Actora — Agent Identity, Subscriptions & A2A
description: ERC-8004 agent identity, on-chain subscriptions, reputation, A2A tasks and chat over 52 tools.
url:         https://actora.codes/mcp
repo:        https://github.com/sftgroup/actora-mcp
```

**开发者 `io.github.sftgroup/actora-platform`**

```
title:       Actora Platform — Agent Publishing, Subscriptions & A2A
description: Actora developer tools: ERC-8004 identity, subscriptions, listings, A2A, reputation.
url:         https://actora.codes/mcp/platform
repo:        https://github.com/sftgroup/actora-mcp
```

**B 端 `io.github.sftgroup/actora-tenant`**

```
title:       Actora Tenant — Hosted Chat, Tasks & Usage
description: Actora B-side tools: hosted chat, sessions, tasks, tenant plan and usage.
url:         https://actora.codes/mcp/tenant
repo:        https://github.com/sftgroup/actora-mcp
```

## 2. 官方 MCP Registry（首选）

三个清单均已按 `2025-12-11` schema 校验通过，命名空间 `io.github.sftgroup` 由 GitHub 账号 `sftgroup`（仓库 admin）持有。

```bash
# 安装（Linux x86_64；其他平台见 registry releases）
curl -sL https://github.com/modelcontextprotocol/registry/releases/download/v1.8.7/mcp-publisher_linux_amd64.tar.gz \
  | tar xz -C /tmp mcp-publisher

/tmp/mcp-publisher login github     # 交互式设备授权：打开打印出的 URL 输入 code
cd mcp
/tmp/mcp-publisher validate server-platform.json
/tmp/mcp-publisher publish  server-platform.json
/tmp/mcp-publisher publish  server-tenant.json
/tmp/mcp-publisher publish  server.json
```

发布后校验（应能查到三条 `io.github.sftgroup/…`）：

```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=sftgroup" \
  | python3 -c 'import sys,json;print([s["server"]["name"] for s in json.load(sys.stdin)["servers"]])'
```

**已发布（2026-11-04）**：`io.github.sftgroup/actora` / `actora-platform` / `actora-tenant` 均为 **0.2.0**，搜索 `sftgroup` 与 `actora` 均可检索到三条记录。

后续版本更新只需改清单里的 `version` 并重跑 `mcp-publisher publish <file>`（同版本号不可覆盖，必须升版本）。

## 3. Smithery

- 入口：`https://smithery.ai` 控制台 →「New server」→ 选择 **Remote / URL**
- URL 填 `https://actora.codes/mcp/platform`（或 `/mcp/tenant`）
- 传输选 Streamable HTTP；健康检查走 `initialize`，无需凭证即可通过
- **鉴权限制**：Smithery 的配置表单把 `authorization` 保留给 OAuth，不能作为用户输入字段；本服务的 JWT 只认 `Authorization: Bearer`。因此：
  - 匿名可用的只读工具（`actora_identity_*` 等）可正常通过 Smithery 使用
  - 写工具/对话工具需把 JWT 作为工具参数 `access_token` 显式传入，或由客户端直连
- 若控制台要求仓库部署（而非远程 URL），需先让 `sftgroup/Agentx` 公开（见 §6）

## 4. mcp.so / Glama / PulseMCP

| 站点 | 提交方式 | 需要准备 |
|---|---|---|
| mcp.so | 站点提交表单（填仓库 + 远程地址） | 站点账号；仓库公开后自动展示工具列表 |
| Glama | 自动索引 GitHub 仓库，可认领 | 仓库公开（自动索引前提）；认领需 Glama 账号 |
| PulseMCP | 站点提交表单 | 站点账号；填 §1 的 title/description/url |

三处统一按 §1 字段填写；工具列表会由目录侧调用 `tools/list` 自动抓取（52 / 43 / 9）。

## 5. 提交后验收（三入口）

```bash
# 握手：serverInfo.name 分别为 actora-gateway / actora-platform / actora-tenant
for p in "" "/platform" "/tenant"; do
  curl -s -X POST "https://actora.codes/mcp$p" -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}'
  echo
done

# 工具数：52 / 43 / 9
for p in "" "/platform" "/tenant"; do
  curl -s -X POST "https://actora.codes/mcp$p" -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
    | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["result"]["tools"]))'
done

# 匿名只读调用（应返回 totalAgents，不报鉴权错误）
curl -s -X POST https://actora.codes/mcp/platform -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"actora_identity_total_count","arguments":{"chain":"bsc"}}}'

# Bearer 注入链路：无效 token 应报 HTTP 401 Invalid or expired token（说明 header 已生效）
curl -s -X POST https://actora.codes/mcp/tenant -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer test-token' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"actora_gateway_chat","arguments":{"message":"hi"}}}'
```

MCP Inspector（`npx @modelcontextprotocol/inspector`）连接上述任一 URL 可复验工具列表与单次调用。

## 6. 状态与阻塞项

| 目录 | 状态 | 阻塞项 |
|---|---|---|
| 官方 MCP Registry | ✅ **已发布 0.2.0（2026-11-04）**，三条均可检索 | — |
| Smithery | 材料就绪，**待提交** | 站点账号（远程 URL 型可先上只读工具） |
| mcp.so | 材料就绪，**待提交** | 站点账号 |
| Glama | 材料就绪，**待索引/认领** | 仓库公开或 Glama 账号认领 |
| PulseMCP | 材料就绪，**待提交** | 站点账号 |

> **仓库可见性**：`sftgroup/Agentx` 当前为 **private**，官方 Registry 与远程 URL 型入口不受影响（清单里只记录仓库地址），但 Glama / Smithery 的 GitHub 自动索引需要公开仓库。是否开源由业务侧决定，本清单不代为变更。
