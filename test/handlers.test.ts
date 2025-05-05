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
    end: vi.fn((chunk) => chunks.push(chunk)),
    statusCode: 200,
  } as unknown as http.ServerResponse

  return { res, chunks }
}

describe('createEndpointHandler', () => {
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
