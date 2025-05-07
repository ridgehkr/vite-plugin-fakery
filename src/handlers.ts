import { faker } from '@faker-js/faker'
import { resolveFakerValue } from './fakerResolver.js'
import type { EndpointConfig } from './types'
import type { IncomingMessage, ServerResponse } from 'http'

/**
 * Creates a request handler for a specific endpoint config.
 * Handles pagination, seeding, and response shape.
 *
 * @param endpoint - Endpoint configuration object
 * @returns Middleware-compatible handler function
 */
export function createEndpointHandler(endpoint: EndpointConfig) {
  if (
    !endpoint ||
    typeof endpoint.url !== 'string' ||
    !endpoint.responseProps
  ) {
    throw new Error('Missing required fields in endpoint config')
  }
  if (endpoint.seed) {
    faker.seed(endpoint.seed)
  }

  /**
   * Handles a request to the endpoint.
   *
   * @param req - Node HTTP IncomingMessage object
   * @param res - Node HTTP ServerResponse object
   */
  return (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`)

    const perPage = parseInt(
      url.searchParams.get('per_page') || `${endpoint.perPage || 10}`,
      10,
    )
    const total = parseInt(
      url.searchParams.get('total') || `${endpoint.total || 100}`,
      10,
    )
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const totalPages = endpoint.pagination ? Math.ceil(total / perPage) : 1
    const startId = endpoint.pagination ? (page - 1) * perPage + 1 : 1
    const length = Math.min(perPage, total - startId + 1)

    // Handle invalid page numbers
    if (endpoint.pagination && (page < 1 || page > totalPages)) {
      sendJson(res, 400, {
        error: 'Invalid page number',
        message: `Page ${page} is out of bounds. Total pages: ${totalPages}.`,
      })
      return
    }

    // Generate response content from Faker
    const result = endpoint.singular
      ? resolveFakerValue(endpoint.responseProps)
      : {
          total,
          per_page: perPage,
          ...(endpoint.pagination && { page, total_pages: totalPages }),
          data: Array.from({ length }).map((_, i) => ({
            id: startId + i,
            ...resolveFakerValue(endpoint.responseProps),
          })),
        }

    sendJson(res, 200, result)
  }
}

/**
 * Sends a JSON response with the given status code.
 *
 * @param res - Node HTTP ServerResponse object
 * @param statusCode - HTTP status code to return
 * @param data - Data to serialize as JSON
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = statusCode
  res.end(JSON.stringify(data))
}
