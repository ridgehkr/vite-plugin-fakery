import { resolveFakerValue } from './fakerResolver.js'
import { faker } from '@faker-js/faker'
import type { SortOrder, EndpointConfig } from './types'
import type { IncomingMessage, ServerResponse } from 'http'

function isValidSortOrder(order: unknown): order is SortOrder {
  if (typeof order !== 'string') {
    return false
  }
  return order === 'asc' || order === 'desc'
}

/**
 * Sends a JSON response to the client
 * @param {ServerResponse} res - The server response object
 * @param {number} statusCode - HTTP status code to send
 * @param {unknown} data - The data to be sent as JSON
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = statusCode
  res.end(JSON.stringify(data))
}

/**
 * Sends a response with optional delay, transformation, and caching
 * @param {ServerResponse} res - The server response object
 * @param {number} status - HTTP status code to send
 * @param {any} data - The data to be sent
 * @param {number} [delay] - Optional delay in milliseconds before sending the response
 * @param {(data: any) => any} [transform] - Optional function to transform the data before sending
 */
async function sendResponse(
  res: ServerResponse,
  status: number,
  data: any,
  delay?: number,
  transform?: (data: any) => any,
) {
  if (delay) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  const output = transform ? transform(data) : data
  sendJson(res, status, output)
}

/**
 * Sorts an array of objects based on a specified field and order
 * @param {any[]} data - The array of objects to sort
 * @param {string} sortField - The field to sort by
 * @param {SortOrder} order - Sort order, either 'asc' or 'desc'
 * @returns {any[]} The sorted array
 */
function sortData(data: any[], sortField: string, order: SortOrder) {
  return data.sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]
    if (valA === undefined || valB === undefined) return 0
    if (valA < valB) return order === 'desc' ? 1 : -1
    if (valA > valB) return order === 'desc' ? -1 : 1
    return 0
  })
}

/**
 * Filters an array of objects based on a specified field and value
 * @param {any[]} data - The array of objects to filter
 * @param {string} filterField - The field to filter by
 * @param {string} filterValue - The value to filter for
 * @returns {any[]} The filtered array
 */
function filterData(data: any[], filterField: string, filterValue: string) {
  return data.filter((item) => String(item[filterField]).includes(filterValue))
}

/**
 * Searches an array of objects for a value, either across all fields or in a specific field
 * @param {any[]} data - The array of objects to search
 * @param {string} searchValue - The value to search for
 * @returns {any[]} The array of matching objects
 */
function searchData(data: any[], searchValue: string) {
  const lowercaseSearchValue = searchValue.toLowerCase()
  return data.filter((item) => {
    return Object.values(item).some((val) =>
      String(val).toLowerCase().includes(lowercaseSearchValue),
    )
  })
}

// Cache store for endpoint responses
const cacheStore = new Map<string, any>()

/**
 * Creates a handler function for a mock API endpoint with configurable behavior
 * @param {EndpointConfig} endpoint - Configuration for the endpoint
 * @returns {(req: IncomingMessage, res: ServerResponse) => Promise<void>} An async request handler
 * The handler supports:
 * - Logging requests
 * - Simulating error rates
 * - Static responses
 * - Generating fake data
 * - Pagination
 * - Searching
 * - Filtering
 * - Sorting
 * - Caching
 * - Conditional responses
 * - Response transformation
 * - Restricting methods (GET, POST, etc.)
 */
export function createEndpointHandler(endpoint: EndpointConfig) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const queryParams = url.searchParams.toString()
    const cacheKey = `${endpoint.url}?${queryParams}`

    // abort for invalid method
    if (endpoint.methods && !endpoint.methods.includes(req.method as any)) {
      res.statusCode = 405 // Method Not Allowed
      res.end()
      return
    }

    // simulate error rate is enabled
    if (endpoint.errorRate && Math.random() < endpoint.errorRate) {
      sendJson(res, 500, { error: 'Simulated server error' })
      return
    }

    // Check if caching is enabled and a cached response exists
    if (endpoint.cache && cacheStore.has(cacheKey)) {
      const cachedResponse = cacheStore.get(cacheKey)
      return sendResponse(
        res,
        endpoint.status || 200,
        cachedResponse,
        endpoint.delay,
        endpoint.responseFormat,
      )
    }

    const searchParam = endpoint.queryParams?.search || 'q'
    const sortParam = endpoint.queryParams?.sort || 'sort'
    const orderParam = isValidSortOrder(endpoint.queryParams?.order)
      ? endpoint.queryParams.order
      : 'asc'
    const filterParam = endpoint.queryParams?.filter || 'filter'

    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const perPage = parseInt(
      url.searchParams.get(endpoint.queryParams?.per_page || 'per_page') ||
        `${endpoint.perPage || 10}`,
      10,
    )
    const total = parseInt(
      url.searchParams.get(endpoint.queryParams?.total || 'total') ||
        `${endpoint.total || 100}`,
      10,
    )
    const totalPages = Math.ceil(total / perPage)
    const startId = (page - 1) * perPage + 1

    if (endpoint.logRequests) {
      console.log(`Request: ${req.method} ${req.url}`)
    }

    const condition = endpoint.conditions?.find((cond) => {
      const headersMatch = cond.when.headers
        ? Object.entries(cond.when.headers).every(
            ([key, value]) => req.headers[key] === value,
          )
        : true
      const queryMatch = cond.when.query
        ? Object.entries(cond.when.query).every(
            ([key, value]) => url.searchParams.get(key) === value,
          )
        : true
      return headersMatch && queryMatch
    })

    // Set seed for Faker if provided
    if (endpoint.seed) {
      faker.seed(endpoint.seed)
    }

    if (condition) {
      sendResponse(
        res,
        condition.status || 200,
        condition.staticResponse || {},
        endpoint.delay,
      )
      return
    }

    if (endpoint.staticResponse) {
      sendResponse(
        res,
        endpoint.status || 200,
        endpoint.staticResponse,
        endpoint.delay,
        endpoint.responseFormat,
      )
      return
    }

    // Generate data with resolved properties
    const data = Array.from({
      length: !endpoint.pagination ? total : perPage,
    }).map((_, i) => {
      const resolvedProps = Object.fromEntries(
        Object.entries(endpoint.responseProps || {}).map(([key, value]) => {
          // Handle strings with periods as Faker paths
          if (typeof value === 'string') {
            if (value.includes('.') && !value.includes('..')) {
              return [key, resolveFakerValue(value)]
            }
            // Handle escaped periods
            return [key, value.replace(/\.\./g, '.')]
          }
          // Handle primitives (number, boolean) as-is
          if (typeof value === 'number' || typeof value === 'boolean') {
            return [key, value]
          }
          // Resolve other types using resolveFakerValue
          return [key, resolveFakerValue(value)]
        }),
      )
      return {
        id: startId + i,
        ...resolvedProps,
      }
    })

    // Extract query parameters for search and sorting
    const searchValue =
      url.searchParams.get(searchParam) || url.searchParams.get('q') || ''
    const sortField = url.searchParams.get(sortParam) || 'sort'

    // get the filter field and value
    const filterField = url.searchParams.get(filterParam) ?? ''
    const filterValue = url.searchParams.get(filterField) ?? ''

    // Apply search, filter, and sort
    let filteredData = data?.length ? data : []
    if (searchValue) {
      filteredData = searchData(filteredData, searchValue)
    }
    if (filterField && filterValue) {
      filteredData = filterData(filteredData, filterField, filterValue)
    }
    if (sortParam) {
      filteredData = sortData(filteredData, sortField, orderParam)
    }

    // Prepare the result based on singular or paginated response
    const result = endpoint.singular
      ? filteredData[0] || {}
      : endpoint.pagination
        ? {
            data: filteredData,
            page,
            per_page: perPage,
            total,
            total_pages: totalPages,
          }
        : filteredData // Return full dataset if pagination is false

    // Store the response in the cache if caching is enabled
    if (endpoint.cache) {
      cacheStore.set(cacheKey, result)
    }

    // Send the response
    return sendResponse(
      res,
      endpoint.status || 200,
      result,
      endpoint.delay,
      endpoint.responseFormat,
    )
  }
}
