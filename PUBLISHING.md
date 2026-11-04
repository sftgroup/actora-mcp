# Actora MCP — 公开目录上架清单

面向 B 端开发者的交付物是**托管 MCP 服务**（不是 marketplace 里的某个 agent）。本文件是可直接粘贴的提交材料与验收方式；代码侧与仓库可见性均已就绪，剩余发布动作需要**各站点账号登录**（见 §6）。

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

**已发布（2026-11-05）**：`io.github.sftgroup/actora` / `actora-platform` / `actora-tenant` 均为 **0.2.1**（`status: active`，`repository.url` 指向 `actora-mcp`），搜索 `sftgroup` 与 `actora` 均可检索到三条记录。

后续版本更新只需改清单里的 `version` 并重跑 `mcp-publisher publish <file>`（同版本号不可覆盖，必须升版本）。

## 3. Smithery（被动，暂不投入）

**2026-10-31 起 Smithery 关停了 MCP 代理 / CLI / API key 体系**，站点现由 Arcade 运营，仅作目录展示，新提交路径未公开。当前动作只有一项：

- 打开 `https://smithery.ai` 搜 `actora`；若存在旧条目，认领并把 URL 改为 `https://actora.codes/mcp/platform`（旧的 `run.tools` 代理地址已失效）
- 不存在则跳过，不占用时间

历史备注：其配置表单把 `authorization` 保留给 OAuth，本服务的 `Authorization: Bearer <JWT>` 无法作为用户字段；匿名只读工具（`actora_identity_*`）可直连，写工具需客户端直连或把 JWT 作为工具参数 `access_token` 传入。

## 4. mcp.so / Glama / PulseMCP

| 站点 | 现状（2026-11-05 实测） | 剩余动作 |
|---|---|---|
| Glama | ✅ **已自动收录 3 个 connector 并完成认领**：`io.github.sftgroup/actora` / `actora-platform` / `actora-tenant`，`status: healthy`；2026-11-05 已在后台补齐分类 / operator / website / vendor relationship / documentation / restrictions / thumbnail | — |
| mcp.so | ✅ 已提交（2026-11-05，免费通道 `https://mcp.so/submit?type=server`） | 等目录侧抓取 `tools/list` 生效 |
| MCP Market | ✅ 已提交（2026-11-05，免费队列） | 排队审核 |
| PulseMCP | **提交入口 2026-09-03 起暂停**，官方说明「先发 Registry，重开后自动收录」 | 不提交；我们已在 Registry，等其重开自动出现 |

Glama 认领用文件（放在 `actora-mcp` 仓库根，org 仓库必须用此方式）：

```json
{
  "$schema": "https://glama.ai/mcp/schemas/server.json",
  "maintainers": ["<github-username>"]
}
```

> Glama 的 API key 属 **Gateway（模型代理）** 凭证，只能读目录数据（`GET /api/mcp/v1/servers`、`/api/mcp/v1/connectors`），**没有提交/认领权限**；认领必须走网页 GitHub 登录。

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
| 官方 MCP Registry | ✅ **已发布 0.2.1（2026-11-05）**，三条均 `active`，`repository.url` 指向 `actora-mcp` | — |
| Glama | ✅ **已收录 3 个 connector 并完成认领 + 元数据补全**（2026-11-05） | — |
| mcp.so | ✅ **已提交**（2026-11-05，免费通道） | 等目录侧抓取生效 |
| MCP Market | ✅ **已提交**（2026-11-05，免费队列） | 排队审核 |
| awesome-remote-mcp-servers | ⏳ **PR [#3889](https://github.com/punkpeye/awesome-remote-mcp-servers/pull/3889) 已提**（2026-11-05，`check-submission` 通过，待合并） | — |
| Cursor Marketplace | ⏳ 未提交：需**已登录的 Cursor 账号**在 `cursor.com/marketplace/publish` 申请 publisher，仓库需带 `.cursor-plugin/plugin.json` + `mcp.json`（远程 URL + `${TOKEN}` 变量），人工审核 | Cursor 账号 + plugin 包 |
| Cline MCP Marketplace | ⏳ 未提交：向 `cline/mcp-marketplace` 提 issue（仓库 URL + 400×400 PNG + 理由），审核会看社区采用度，并对**加密货币类工具加验** | 一个 GitHub issue |
| Claude Connectors Directory | ⏸ 暂不具备条件：需 OAuth 2.0（现有鉴权是 Bearer JWT）、每个工具带 `title` + `readOnlyHint`/`destructiveHint`、隐私政策页、审核测试账号；提交入口 `claude.ai/directory/manage` | 见 §7.3 前置改造 |
| Smithery | 被动：代理/CLI 已于 2026-10-31 关停 | 只查旧条目，不新提交 |
| PulseMCP | 被动：提交入口 2026-09-03 起暂停 | 等其重开后从 Registry 自动收录 |

> **仓库可见性**：`sftgroup/actora-mcp` 已公开。Glama 已从官方 Registry 自动收录（无需再提交）；Smithery 现仅作目录展示。

## 7. 客户端市场（Cursor / Cline / Claude）

### 7.1 Cursor Marketplace（可做，成本低）

- **提交流程**：登录 Cursor → `https://cursor.com/marketplace/publish` 申请 publisher → 填仓库 URL → 人工审核（每次更新也要审）。
- **物料**：仓库根 `.cursor-plugin/plugin.json`（`name` 必填，kebab-case；`logo` / `keywords` / `repository` 建议填）+ `mcp.json`，远程服务写法：

```json
{ "mcpServers": { "actora": {
  "url": "https://actora.codes/mcp/platform",
  "headers": { "Authorization": "Bearer ${ACTORA_TOKEN}" }
} } }
```

- **鉴权**：插件 `variables` 声明 `ACTORA_TOKEN`（JSON Schema），用户在 Cursor 的 Plugins → Configure 填值，密钥不入库。只读工具可匿名，变量可留空。
- **注意**：Cursor 的插件以 Git 仓库分发，必须公开；我们可复用 `sftgroup/actora-mcp` 或单独建 `actora-cursor-plugin`。

### 7.2 Cline MCP Marketplace（可做，成本最低）

- **提交流程**：在 `github.com/cline/mcp-marketplace` 开 issue（模板 `mcp-server-submission.yml`），三项：仓库 URL、**400×400 PNG logo**、入选理由。
- **安装方式**：Cline 读 `README.md`（可选 `llms-install.md`）自主安装 → 需在 README 增加「添加到 Cline」的远程配置片段。
- **风险**：审核明确会看社区采用度与维护者可信度，且对**加密货币/金融类工具额外加验**，不保证通过。

### 7.3 Claude Connectors Directory（有硬前置）

官方提交页 `claude.ai/directory/manage`，要求（2026-11 现行）：

1. 远程 HTTPS 服务（✅ 已有）；
2. **有鉴权就必须是 OAuth 2.0**，或完全匿名 —— 当前 Bearer JWT / `access_token` 参数不满足；
3. **每个工具都要有 `title` 与 `readOnlyHint`/`destructiveHint` 注解** —— 当前 43/52 个工具均未声明；
4. 必填隐私政策 URL（`actora.codes/privacy` 目前 404）、文档 URL、支持联系方式、图标；
5. 供审核用的测试账号与三个可用 prompt 示例；
6. 提交账号需付费 Claude 计划。

**结论**：Cursor / Cline 是「填表 + 打一个插件包」；Claude 需要先做 OAuth + 工具注解 + 隐私政策页三项工程改造，建议与 T8 的真实扣费一起排期。
