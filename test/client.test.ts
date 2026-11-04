// @actora/mcp 单元测试 —— 覆盖 JSON-RPC 封装、结果解析、默认链、鉴权参数映射。
// 所有网络请求均 mock（fetch），不依赖真实 Gateway。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { McpClient } from '../src/client'

type FetchMock = ReturnType<typeof vi.fn>

function ok(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

function fail(status: number, text = 'boom'): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => text,
  } as unknown as Response
}

/** 解析第 N 次 fetch 的 JSON-RPC 请求体。 */
function bodyOf(fetchMock: FetchMock, index = 0): { method: string; params?: any } {
  const [, init] = fetchMock.mock.calls[index] as [string, RequestInit]
  return JSON.parse(String(init.body))
}

/** 构造初始化成功 + 后续工具结果（可重复调用）的响应序列。 */
function mockInitThen(result: unknown): FetchMock {
  const fetchMock = vi.fn() as unknown as FetchMock
  fetchMock.mockResolvedValueOnce(ok({ result: { serverInfo: { name: 'actora-gateway', version: '0.2.1' } } }))
  fetchMock.mockResolvedValue(ok({ result: { content: [{ type: 'text', text: JSON.stringify(result) }] } }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('McpClient protocol', () => {
  it('posts JSON-RPC to <gatewayUrl>/mcp and strips trailing slashes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ result: { serverInfo: { name: 'actora-tenant' } } })) as unknown as FetchMock
    vi.stubGlobal('fetch', fetchMock)

    const client = new McpClient({ gatewayUrl: 'https://actora.codes///' })
    const info = await client.initialize()

    expect(fetchMock.mock.calls[0][0]).toBe('https://actora.codes/mcp')
    expect(info.name).toBe('actora-tenant')
  })

  it('initialize sends protocolVersion + clientInfo 0.2.1 and caches the handshake', async () => {
    const fetchMock = mockInitThen({ totalAgents: 22 })

    const client = new McpClient({ gatewayUrl: 'https://actora.codes' })
    await client.totalAgents()
    await client.totalAgents()

    const first = bodyOf(fetchMock, 0)
    expect(first.method).toBe('initialize')
    expect(first.params.protocolVersion).toBe('2024-11-05')
    expect(first.params.clientInfo).toEqual({ name: '@actora/mcp', version: '0.2.1' })

    // 三次请求：initialize + tools/call + tools/call（initialize 已缓存）
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(bodyOf(fetchMock, 1).method).toBe('tools/call')
  })

  it('merges custom headers (Authorization)', async () => {
    const fetchMock = mockInitThen({ ok: true })
    const client = new McpClient({
      gatewayUrl: 'https://actora.codes',
      headers: { Authorization: 'Bearer jwt' },
    })
    await client.gatewayHealth()

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('parses JSON inside content[0].text, falls back to raw text, then to the raw result', async () => {
    const fetchMock = vi.fn() as unknown as FetchMock
    fetchMock
      .mockResolvedValueOnce(ok({ result: { serverInfo: {} } }))
      .mockResolvedValueOnce(ok({ result: { content: [{ text: '{"a":1}' }] } }))
      .mockResolvedValueOnce(ok({ result: { content: [{ text: 'plain text' }] } }))
      .mockResolvedValueOnce(ok({ result: { tools: [] } }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new McpClient({ gatewayUrl: 'https://actora.codes' })
    expect(await client.callTool('t1')).toEqual({ a: 1 })
    expect(await client.callTool('t2')).toBe('plain text')
    expect(await client.callTool('t3')).toEqual({ tools: [] })
  })

  it('throws on HTTP failure and JSON-RPC errors', async () => {
    const fetchMock = vi.fn() as unknown as FetchMock
    fetchMock.mockResolvedValueOnce(fail(503, 'unavailable'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(new McpClient({ gatewayUrl: 'https://actora.codes' }).listTools()).rejects.toThrow(
      'MCP HTTP 503: unavailable',
    )

    fetchMock.mockResolvedValueOnce(ok({ error: { code: -32601, message: 'Method not found' } }))
    await expect(new McpClient({ gatewayUrl: 'https://actora.codes' }).listTools()).rejects.toThrow(
      'MCP error [-32601]: Method not found',
    )
  })

  it('lists tools from tools/list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ result: { tools: [{ name: 'a' }, { name: 'b' }] } })) as unknown as FetchMock
    vi.stubGlobal('fetch', fetchMock)
    expect(await new McpClient({ gatewayUrl: 'https://actora.codes' }).listTools()).toHaveLength(2)
  })
})

describe('McpClient tool argument mapping', () => {
  it('uses defaultChain bsc, honours per-call chain and config defaultChain', async () => {
    const fetchMock = mockInitThen({ totalAgents: 1 })
    const client = new McpClient({ gatewayUrl: 'https://actora.codes' })
    await client.totalAgents()
    expect(bodyOf(fetchMock, 1).params.arguments).toEqual({ chain: 'bsc' })

    const fetchMock2 = mockInitThen({ totalAgents: 1 })
    await new McpClient({ gatewayUrl: 'https://actora.codes' }).totalAgents('base')
    expect(bodyOf(fetchMock2, 1).params.arguments).toEqual({ chain: 'base' })

    const fetchMock3 = mockInitThen({ totalAgents: 1 })
    await new McpClient({ gatewayUrl: 'https://actora.codes', defaultChain: 'ethereum' }).totalAgents()
    expect(bodyOf(fetchMock3, 1).params.arguments).toEqual({ chain: 'ethereum' })
  })

  it('omits undefined listAgents filters', async () => {
    const fetchMock = mockInitThen({ agents: [] })
    const client = new McpClient({ gatewayUrl: 'https://actora.codes' })
    await client.listAgents({ activeOnly: true, capabilities: 'trading' })
    expect(bodyOf(fetchMock, 1).params.arguments).toEqual({
      chain: 'bsc',
      activeOnly: true,
      capabilities: 'trading',
    })
  })

  it('gatewayTenant maps accessToken to access_token and can omit it', async () => {
    const fetchMock = mockInitThen({ plan: { name: 'Pro' } })
    const client = new McpClient({ gatewayUrl: 'https://actora.codes' })
    await client.gatewayTenant('jwt-1')
    expect(bodyOf(fetchMock, 1).params.arguments).toEqual({ access_token: 'jwt-1' })

    const fetchMock2 = mockInitThen({})
    await new McpClient({ gatewayUrl: 'https://actora.codes' }).gatewayTenant()
    expect(bodyOf(fetchMock2, 1).params.arguments).toEqual({})
  })

  it('central agent tools map accessToken and drop undefined fields', async () => {
    const fetchMock = mockInitThen({ id: -7 })
    const client = new McpClient({ gatewayUrl: 'https://actora.codes' })

    await client.centralAgentCreate({ accessToken: 'jwt-2', name: 'Demo', capabilities: ['chat'] })
    expect(bodyOf(fetchMock, 1).params.name).toBe('actora_central_agent_create')
    expect(bodyOf(fetchMock, 1).params.arguments).toEqual({
      access_token: 'jwt-2',
      name: 'Demo',
      capabilities: ['chat'],
    })

    const fetchMock2 = mockInitThen({ id: -7 })
    await new McpClient({ gatewayUrl: 'https://actora.codes' }).centralAgentUpdate({
      accessToken: 'jwt-2',
      agentId: -7,
      isActive: false,
    })
    expect(bodyOf(fetchMock2, 1).params.arguments).toEqual({
      access_token: 'jwt-2',
      agentId: -7,
      isActive: false,
    })

    const fetchMock3 = mockInitThen({ paymentRequired: true })
    await new McpClient({ gatewayUrl: 'https://actora.codes' }).centralSubscriptionSubscribe({
      accessToken: 'jwt-2',
      agentId: -7,
      subscriber: '0xabc',
      period: 'month',
    })
    expect(bodyOf(fetchMock3, 1).params.arguments).toEqual({
      access_token: 'jwt-2',
      agentId: -7,
      subscriber: '0xabc',
      period: 'month',
    })
  })
})
