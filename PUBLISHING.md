# Actora MCP — 公开目录上架清单

面向 B 端开发者的交付物是**托管 MCP 服务**（不是 marketplace 里的某个 agent）。本文件列出各目录的提交材料与验收方式；代码侧已就绪，剩余动作需要 `sftgroup` 的 GitHub 权限与各站点账号。

## 0. 服务事实（提交时统一使用）

| 字段 | 值 |
|---|---|
| 名称 | `io.github.sftgroup/actora` |
| 标题 | Actora — Agent Identity, Subscriptions & A2A |
| 描述 | ERC-8004 agent identity, on-chain subscriptions, reputation, A2A tasks and chat over 51 tools. |
| 远程地址 | `https://actora.codes/mcp` |
| 传输 | Streamable HTTP（无状态 POST JSON-RPC 2.0） |
| 协议版本 | `2024-11-05`（客户端请求新版本时回落，规范允许） |
| 仓库 | `https://github.com/sftgroup/Agentx` |
| 官网 | `https://actora.codes` |
| 图标 | `https://actora.codes/icon-512.png` |
| 鉴权 | 只读工具匿名；执行类工具需 JWT，支持 `Authorization: Bearer <JWT>` 或工具参数 `access_token` |
| 工具数 | 51（`tools/list`） |

## 1. 官方 MCP Registry（首选）

清单文件：[server.json](./server.json)（已按 `2025-12-11` schema 校验通过）。

```bash
# 安装 mcp-publisher（按官方 Registry README）
mcp-publisher login github   # 需 sftgroup 组织成员，验证 io.github.sftgroup 命名空间
cd mcp
mcp-publisher publish
```

发布后校验：

```bash
curl -s https://registry.modelcontextprotocol.io/v0/servers?search=actora | head -c 800
```

## 2. Smithery

- 入口：`https://smithery.ai`（控制台「New server」）
- 当前流程按 GitHub 仓库部署；在控制台绑定 `sftgroup/Agentx`，若支持远程 URL 则填 `https://actora.codes/mcp`
- 鉴权：在 server 配置里声明 header `Authorization: Bearer <JWT>`（不要写死 token）

## 3. mcp.so / Glama / PulseMCP

| 站点 | 提交方式 | 备注 |
|---|---|---|
| mcp.so | 站点提交表单 | 填仓库 + 远程地址；会展示工具列表 |
| Glama | 自动索引 GitHub，可认领 | 收录后补图标与描述 |
| PulseMCP | 站点提交表单 | 同上 |

三处均以第 0 节字段为准；提交入口路径以站点当前页面为准。

## 4. 提交后验收

```bash
# 握手
curl -s -X POST https://actora.codes/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}'

# 工具数应为 51
curl -s -X POST https://actora.codes/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["result"]["tools"]))'

# 鉴权头注入（无 token 时应报 access_token required；带 Bearer 时应继续走到 JWT 校验）
curl -s -X POST https://actora.codes/mcp -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer test-token' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"actora_gateway_chat","arguments":{"message":"hi"}}}'
```

MCP Inspector（`npx @modelcontextprotocol/inspector`）连接 `https://actora.codes/mcp` 可复验工具列表与单次调用。
