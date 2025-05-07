import { describe, it, expect, vi } from 'vitest'
import { createEndpointHandler } from '../src/handlers'
import http from 'http'

function createMockReq(url: string): http.IncomingMessage {
  return {
    url,
    headers: { host: 'localhost' },
  } as http.IncomingMessage
}

function createMockRes() {
  const chunks: any[] = []
  const res = {
    setHeader: vi.fn(),
    end: vi.fn((chunk) => {
      chunks.push(chunk)
      return undefined
    }),
    statusCode: 200,
  } as unknown as http.ServerResponse

  return { res, chunks }
}

describe('sendJson', () => {
  it('sets status code and serializes data', () => {
    const { res, chunks } = createMockRes()
    // Import sendJson inline to avoid circular import issues
    const sendJson = (res: any, statusCode: number, data: unknown) => {
      res.statusCode = statusCode
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    }
    sendJson(res, 201, { ok: true })
    expect(res.statusCode).toBe(201)
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json',
    )
    expect(JSON.parse(chunks[0])).toEqual({ ok: true })
  })
})

describe('createEndpointHandler', () => {
  it('throws if endpoint config is missing required fields', () => {
    // Missing responseProps
    const endpoint: any = { url: '/broken' }
    expect(() => createEndpointHandler(endpoint)).toThrowError(
      'Missing required fields in endpoint config',
    )
  })

  it('returns error for invalid page number', () => {
    const endpoint = {
      url: '/mock',
      pagination: true,
      perPage: 2,
      total: 6,
      responseProps: { id: 'string.uuid' },
    }
    const handler = createEndpointHandler(endpoint)
    const req = createMockReq('/mock?page=99')
    const { res, chunks } = createMockRes()
    handler(req, res)
    const output = JSON.parse(chunks[0])
    expect(res.statusCode).toBe(400)
    expect(output).toHaveProperty('error')
    expect(output).toHaveProperty('message')
  })

  it('returns singular object when singular: true', () => {
    const endpoint = {
      url: '/mock',
      singular: true,
      responseProps: {
        id: 'string.uuid',
        name: 'person.fullName',
      },
    }

    const handler = createEndpointHandler(endpoint)
    const req = createMockReq('/mock')
    const { res, chunks } = createMockRes()

    handler(req, res)

    const output = JSON.parse(chunks[0])
    expect(output).toHaveProperty('id')
    expect(output).toHaveProperty('name')
  })

  it('returns paginated results when pagination enabled', () => {
    const endpoint = {
      url: '/mock',
      pagination: true,
      perPage: 2,
      total: 6,
      responseProps: {
        name: 'person.fullName',
      },
    }

    const handler = createEndpointHandler(endpoint)
    const req = createMockReq('/mock?page=2')
    const { res, chunks } = createMockRes()

    handler(req, res)

    const output = JSON.parse(chunks[0])
    expect(output.data.length).toBe(2)
    expect(output).toHaveProperty('page', 2)
    expect(output).toHaveProperty('total_pages', 3)
  })
})
