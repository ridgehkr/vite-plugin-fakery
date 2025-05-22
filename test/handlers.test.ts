import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEndpointHandler } from '../src/handlers'
import { EndpointConfig } from '../src/types'
import http from 'http'

/**
 * Creates a mock HTTP request object for testing purposes.
 * @param {string} url - The URL of the request.
 * @param {string} [host='localhost'] - The host of the request.
 * @returns {http.IncomingMessage} A mock HTTP request object.
 */
function createMockReq(url: string, host = 'localhost'): http.IncomingMessage {
  return {
    url,
    headers: { host },
    method: 'GET',
  } as http.IncomingMessage
}

/**
 * Creates a mock HTTP response object for testing purposes.
 * Captures response chunks and allows assertions on headers and status codes.
 * @returns {{ res: http.ServerResponse, chunks: any[] }} An object containing the mock response and captured chunks.
 */
function createMockRes() {
  const chunks: any[] = []
  const res = {
    setHeader: vi.fn(),
    end: vi.fn((chunk?: any, cb?: () => void) => {
      if (typeof chunk !== 'undefined') chunks.push(chunk)
      if (cb) cb()
      return {} as http.ServerResponse
    }),
    statusCode: 200,
  } as unknown as http.ServerResponse

  return { res, chunks }
}

describe('Endpoint Handler Features', () => {
  beforeEach(() => {
    vi.resetAllMocks() // Reset mocks before each test
  })

  describe('Pagination', () => {
    it('automatically enables pagination when perPage is set', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-auto-pagination',
        perPage: 10,
        total: 25,
        responseProps: {
          name: 'person.firstName',
        },
      }

      const req = createMockReq('/test-auto-pagination?page=2')
      const { res, chunks } = createMockRes()

      await createEndpointHandler(endpoint)(req, res)

      expect(res.statusCode).toBe(200)
      const response = JSON.parse(chunks.join(''))
      expect(response.data).toHaveLength(10) // Should get 10 items for page 2
      expect(response.data[0].id).toBe(11) // First item should be id 11 for page 2
      expect(response.data[9].id).toBe(20) // Last item should be id 20 for page 2
    })

    it('works with explicit pagination flag', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-pagination-flag',
        pagination: true,
        perPage: 10,
        total: 25,
        responseProps: {
          name: 'person.firstName',
        },
      }

      const req = createMockReq('/test-pagination-flag?page=2')
      const { res, chunks } = createMockRes()

      await createEndpointHandler(endpoint)(req, res)

      expect(res.statusCode).toBe(200)
      const response = JSON.parse(chunks.join(''))
      expect(response.data).toHaveLength(10) // Should get 10 items for page 2
      expect(response.data[0].id).toBe(11) // First item should be id 11 for page 2
      expect(response.data[9].id).toBe(20) // Last item should be id 20 for page 2
    })

    it('does not paginate when perPage is not set', async () => {
      const endpoint: EndpointConfig = {
        url: '/test',
        total: 25,
        responseProps: {
          id: 'index',
          name: 'person.firstName',
        },
      }

      const req = createMockReq('/test')
      const { res, chunks } = createMockRes()

      await createEndpointHandler(endpoint)(req, res)

      expect(res.statusCode).toBe(200)
      const response = JSON.parse(chunks.join(''))
      expect(response.data).toHaveLength(25) // Should get all 25 items
    })

    it('returns full dataset when pagination is false', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-no-pagination',
        responseProps: { name: 'person.fullName' },
        pagination: false,
        perPage: 2,
        total: 5,
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-no-pagination')
      const { res, chunks } = createMockRes()

      await handler(req, res)
      const response = JSON.parse(chunks[0])
      expect(response.data).toHaveLength(5) // Total dataset size
    })

    it('returns the last page when page exceeds total pages', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-pagination-exceed',
        responseProps: { name: 'person.fullName' },
        pagination: true,
        perPage: 2,
        total: 5,
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-pagination-exceed?page=10') // Requesting a page that exceeds total pages
      const { res, chunks } = createMockRes()

      await handler(req, res)
      const response = JSON.parse(chunks[0])

      expect(response.page).toBe(3) // Requested page
      expect(response.data).toHaveLength(1) // Last page data size
    })
  })

  // Dynamic Query Parameters
  describe('Dynamic Query Parameters', () => {
    it('supports custom sort parameter', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-custom-sort',
        total: 10,
        responseProps: {
          id: 'number.int',
          name: 'person.fullName',
          sub: {
            id: 'number.int',
            name: 'person.firstName',
          },
          age: () => Math.floor(Math.random() * 100),
        },
        queryParams: { sort: 'customSort', order: 'desc' },
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-custom-sort?customSort=age')
      const { res, chunks } = createMockRes()

      await handler(req, res)
      const response = JSON.parse(chunks[0])

      expect(response.data.length).toBeGreaterThanOrEqual(2) // Ensure at least two items
      expect(response.data[0].age).toBeGreaterThanOrEqual(response.data[1].age)
    })

    it('handles empty search results gracefully', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-empty-search',
        responseProps: {
          name: 'person.fullName',
          email: 'internet.email',
        },
        queryParams: { search: 'customSearch' },
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-empty-search?customSearch=nonexistent')
      const { res, chunks } = createMockRes()

      await handler(req, res)
      const response = JSON.parse(chunks[0])
      const searchedData = response.data || [] // Handle undefined `data`

      expect(searchedData.length).toBe(0)
    })

    it('supports custom search parameter', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-custom-search',
        responseProps: {
          name: 'John Doe',
          email: 'internet.email',
        },
        queryParams: { search: 'customSearch' },
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-custom-search?customSearch=john')
      const { res, chunks } = createMockRes()

      await handler(req, res)
      const response = JSON.parse(chunks[0])

      expect(response.data.length).toBeGreaterThan(0)
      response.data.forEach((item) => {
        expect(
          Object.values(item).some((val) =>
            String(val).toLowerCase().includes('john'),
          ),
        ).toBeTruthy()
      })
    })
  })

  // Configurable Response Status and Delay
  describe('Response Status and Delay', () => {
    it('supports custom status code', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-status',
        responseProps: {},
        status: 201,
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-status')
      const { res } = createMockRes()

      handler(req, res)
      expect(res.statusCode).toBe(201)
    })

    it('simulates network delay', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-delay',
        responseProps: {},
        delay: 100,
      }
      const startTime = Date.now()
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-delay')
      const { res } = createMockRes()

      await new Promise<void>((resolve) => {
        handler(req, res)
        res.end = () => {
          const endTime = Date.now()
          expect(endTime - startTime).toBeGreaterThanOrEqual(100)
          resolve()
          return {} as http.ServerResponse
        }
      })
    })
  })

  // Preset Responses (Static Data)
  describe('Static Responses', () => {
    it('returns static response when provided', async () => {
      const staticResponse = { message: 'Test Static Response' }
      const endpoint: EndpointConfig = {
        url: '/test-static',
        staticResponse,
        responseProps: {},
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-static')
      const { res, chunks } = createMockRes()

      handler(req, res)
      const response = JSON.parse(chunks[0])
      expect(response).toEqual(staticResponse)
    })
  })

  // Random Error Injection
  describe('Error Injection', () => {
    it('randomly generates server errors based on error rate', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-error-rate',
        responseProps: {},
        errorRate: 1.0, // 100% error rate for testing
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-error-rate')
      const { res, chunks } = createMockRes()

      handler(req, res)
      const response = JSON.parse(chunks[0])
      expect(response).toEqual({ error: 'Simulated server error' })
      expect(res.statusCode).toBe(500)
    })
  })

  // Custom Response Structure
  describe('Response Transformation', () => {
    it('transforms response using responseFormat', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-transform',
        responseProps: {},
        responseFormat: (data: any) => ({
          customWrapper: {
            data,
            timestamp: new Date().toISOString(),
          },
        }),
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-transform')
      const { res, chunks } = createMockRes()

      handler(req, res)
      const response = JSON.parse(chunks[0])
      expect(response).toHaveProperty('customWrapper')
      expect(response.customWrapper).toHaveProperty('data')
      expect(response.customWrapper).toHaveProperty('timestamp')
    })
  })

  // Request Logging
  describe('Request Logging', () => {
    it('logs requests when logRequests is true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const endpoint: EndpointConfig = {
        url: '/test-logging',
        responseProps: {},
        logRequests: true,
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-logging')
      const { res } = createMockRes()

      handler(req, res)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request: GET /test'),
      )

      consoleSpy.mockRestore()
    })
  })

  // Caching
  describe('Caching', () => {
    it('returns cached response when cache is enabled', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-cache',
        responseProps: {
          name: 'person.fullName',
          email: 'internet.email',
        },
        cache: true, // Enable caching
      }

      const handler = createEndpointHandler(endpoint)

      const req1 = createMockReq('/test-cache')
      const { res: res1, chunks: chunks1 } = createMockRes()

      // First request - should generate a new response
      await handler(req1, res1)
      const response1 = JSON.parse(chunks1[0])

      const req2 = createMockReq('/test')
      const { res: res2, chunks: chunks2 } = createMockRes()

      // Second request - should return the cached response
      await handler(req2, res2)
      const response2 = JSON.parse(chunks2[0])

      // responses are identical (cached response is returned)
      expect(response1).toEqual(response2)

      // the response is cached (no new processing for the second request)
      expect(chunks1[0]).toBe(chunks2[0])
    })

    it('does not cache response when cache is disabled', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-no-cache',
        responseProps: {
          name: 'person.fullName',
          email: 'internet.email',
        },
        cache: false,
      }

      const handler = createEndpointHandler(endpoint)

      const req1 = createMockReq('/test-no-cache')
      const { res: res1, chunks: chunks1 } = createMockRes()

      // should generate a new response
      await handler(req1, res1)
      const response1 = JSON.parse(chunks1[0])

      const req2 = createMockReq('/test-no-cache')
      const { res: res2, chunks: chunks2 } = createMockRes()

      // should generate a new response
      await handler(req2, res2)
      const response2 = JSON.parse(chunks2[0])

      // responses are not identical (no caching)
      expect(response1).not.toEqual(response2)
    })

    it('bypasses cache for different query parameters', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-cache-query',
        responseProps: { name: 'person.fullName' },
        cache: true,
      }
      const handler = createEndpointHandler(endpoint)

      const req1 = createMockReq('/test-cache-query?key=value1')
      const { res: res1, chunks: chunks1 } = createMockRes()
      await handler(req1, res1)

      const req2 = createMockReq('/test-cache-query?key=value2')
      const { res: res2, chunks: chunks2 } = createMockRes()
      await handler(req2, res2)

      expect(chunks1[0]).not.toBe(chunks2[0]) // responses should differ
    })
  })

  // Unsupported HTTP Methods
  describe('Unsupported HTTP Methods', () => {
    it('returns 405 for unsupported HTTP methods', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-unsupported-method',
        responseProps: {},
        methods: ['GET'], // only allowing GET
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-unsupported-method')
      req.method = 'POST' // unsupported
      const { res, chunks } = createMockRes()

      await handler(req, res)
      expect(res.statusCode).toBe(405)
      expect(chunks.length).toBe(0) // Ensure no response body
    })
  })

  // Consistent Data Generation
  describe('Consistent Data Generation', () => {
    it('generates consistent data with the same seed', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-seed',
        responseProps: { name: 'person.fullName' },
        seed: 123, // Set seed
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-seed')
      const { res: res1, chunks: chunks1 } = createMockRes()
      const { res: res2, chunks: chunks2 } = createMockRes()

      await handler(req, res1)
      await handler(req, res2)

      expect(chunks1[0]).toBe(chunks2[0]) // Responses should match
    })
  })

  // Singular Response
  describe('Singular Response', () => {
    it('returns a single object when singular is true', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-singular',
        responseProps: { name: 'person.fullName' },
        singular: true,
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-singular')
      const { res, chunks } = createMockRes()

      await handler(req, res)
      const response = JSON.parse(chunks[0])
      expect(response).toHaveProperty('name') // Single object
    })
  })

  // Conditional Responses
  describe('Conditional Responses', () => {
    it('returns conditional response based on headers', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-conditional',
        conditions: [
          {
            when: { headers: { 'x-custom-header': 'value' } },
            staticResponse: { message: 'Header matched!' },
          },
        ],
        responseProps: {},
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-conditional')
      req.headers['x-custom-header'] = 'value'
      const { res, chunks } = createMockRes()

      await handler(req, res)
      const response = JSON.parse(chunks[0])
      expect(response).toEqual({ message: 'Header matched!' })
    })
  })

  // Invalid Response Props
  describe('Invalid Response Props', () => {
    it('throws an error for invalid responseProps', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-invalid',
        responseProps: { invalid: 'nonexistent.path' }, // Invalid Faker path
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-invalid')
      const { res } = createMockRes()

      await expect(handler(req, res)).rejects.toThrowError(/Invalid Faker path/)
    })
  })

  // Response Props Double-period Escaping
  describe('Response Props Escaping', () => {
    it('correctly escapes period characters in static string values', async () => {
      const endpoint: EndpointConfig = {
        url: '/test-escaping',
        responseProps: {
          staticGreeting: 'Hi.. How are you?',
          fakerData: 'person.firstName',
        },
        singular: true,
      }
      const handler = createEndpointHandler(endpoint)
      const req = createMockReq('/test-escaping')
      const { res, chunks } = createMockRes()

      await handler(req, res)
      const response = JSON.parse(chunks[0])

      expect(response.staticGreeting).toBe('Hi. How are you?')
      expect(typeof response.fakerData).toBe('string')
    })
  })
})
