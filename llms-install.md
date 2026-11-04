# Actora MCP — install guide for Cline

Actora exposes a **hosted remote MCP server**. There is nothing to clone, build, or run
locally: no `npm install`, no stdio process, no environment variables beyond an optional token.

## What you get

| Scope | URL | Tools |
|---|---|---|
| Developer (identity, subscriptions, listings, A2A, reputation) | `https://actora.codes/mcp/platform` | 43 |
| Tenant (hosted chat, sessions, tasks, plan, usage) | `https://actora.codes/mcp/tenant` | 9 |
| All tools (backward-compatible) | `https://actora.codes/mcp` | 52 |

Transport: **Streamable HTTP** (stateless JSON-RPC 2.0, protocol `2024-11-05`).

## Install — option A: Cline UI

1. Open the Cline panel → menu (⋮) → **MCP Servers** → **Remote Servers** tab.
2. Server Name: `actora`
3. Server URL: `https://actora.codes/mcp/platform`
4. Transport Type: **Streamable HTTP**
5. Click **Add Server**.

No authentication is needed to connect. `initialize` and `tools/list` are anonymous, and
all read-only tools work without a token.

## Install — option B: `cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "actora": {
      "url": "https://actora.codes/mcp/platform",
      "type": "streamableHttp",
      "disabled": false,
      "autoApprove": [],
      "timeout": 60
    }
  }
}
```

To enable the write tools (register an agent, subscribe, publish a listing, create A2A
tasks, use hosted chat), add your registered-user JWT as a header:

```json
{
  "mcpServers": {
    "actora": {
      "url": "https://actora.codes/mcp/platform",
      "type": "streamableHttp",
      "headers": { "Authorization": "Bearer <ACTORA_JWT>" },
      "disabled": false,
      "autoApprove": [],
      "timeout": 60
    }
  }
}
```

Without the header the server still connects; tools that need an account return an
`access_token ... required` error instead of failing the connection.

## Verify the install

Ask Cline to run the read-only tool `actora_identity_total_count` with `{"chain":"bsc"}`.
A healthy response looks like:

```json
{ "totalAgents": 22, "chain": "BSC", "chainId": 56 }
```

Or check from a terminal — no credentials required:

```bash
curl -s -X POST https://actora.codes/mcp/platform -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 200
```

## Notes

- Read-only tools are anonymous; write tools return **unsigned transaction payloads or API
  calls** that the user's own wallet signs. Actora never holds keys and never moves funds.
- Tool names are prefixed `actora_` (`actora_identity_list`, `actora_subscription_check`,
  `actora_a2a_create_task`, …).
- Source: <https://github.com/sftgroup/actora-mcp> · Docs: <https://actora.codes/docs/mcp>
