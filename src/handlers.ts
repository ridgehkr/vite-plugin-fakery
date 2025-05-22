import { resolveFakerValue } from './fakerResolver.js'
import { faker } from '@faker-js/faker'
import type { SortOrder, EndpointConfig } from './types'
import type { IncomingMessage, ServerResponse } from 'http'

// default total number of items to generate (may or may not be paginated)
const DEFAULT_TOTAL_ITEMS = 10

// Cache store for endpoint responses
const cacheStore = new Map<string, any>()

/**
 * Determines if the provided order is a valid sort order ('asc' or 'desc').
 * @param order - The order to validate
 * @returns {boolean} - True if the order is valid, false otherwise
 */
function isValidSortOrder(order: unknown): order is SortOrder {
  if (typeof order !== 'string') {
    return false
  }
  return order === 'asc' || order === 'desc'
}

/**
 * Resolves a response property value, handling Faker paths, escaped periods, and primitives.
 * @param {string} key - The property key
 * @param {any} value - The property value
 * @returns {[string, any]} A tuple containing the resolved key and value
 */
function resolveResponsePropValue(key: string, value: any): [string, any] {
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
  // Faker values (functions, etc.)
  return [key, resolveFakerValue(value)]
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

    // simulate error rate if enabled
    if (endpoint.errorRate && Math.random() < endpoint.errorRate) {
      sendJson(res, 500, { error: 'Simulated server error' })
      return
    }

    // check if caching is enabled and a cached response exists
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

    // Extract query parameters for search and sorting
    const searchValue =
      url.searchParams.get(searchParam) || url.searchParams.get('q') || ''
    const sortField = url.searchParams.get(sortParam) || 'sort'

    // get the filter field and value
    const filterField = url.searchParams.get(filterParam) ?? ''
    const filterValue = url.searchParams.get(filterField) ?? ''

    // determine items per page of results
    const perPage: number | typeof NaN = parseInt(
      url.searchParams.get(endpoint.queryParams?.per_page || 'per_page') ||
        `${endpoint.perPage}`,
      10,
    )

    // determine total number of items
    const total =
      parseInt(
        url.searchParams.get(endpoint.queryParams?.total || 'total') ||
          `${endpoint.total}`,
        10,
      ) || DEFAULT_TOTAL_ITEMS

    // automatically enable pagination if perPage is set
    const isPaginationEnabled =
      endpoint.pagination || (Number.isInteger(perPage) && perPage > 0)

    // total pages of results (defaults to 1)
    const totalPages = Math.max(1, Math.ceil(total / (perPage || total)))

    // get requested page (defaults to first page)
    let page = Math.max(parseInt(url.searchParams.get('page') ?? '1', 10) || 1)

    // prevent page numbers beyond upper limit
    page = Math.min(page, totalPages)

    // start and end IDs for the current page
    const startId = isPaginationEnabled ? (page - 1) * perPage + 1 : 1
    const endId = isPaginationEnabled
      ? Math.min(startId + perPage - 1, total)
      : total

    if (endpoint.logRequests) {
      console.log(`Request: ${req.method} ${req.url}`)
    }

    // check for endpoint conditions
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

    // generate the data
    const data = Array.from({
      length: isPaginationEnabled ? Math.max(0, endId - startId + 1) : total,
    }).map((_, i) => {
      const resolvedProps = Object.fromEntries(
        Object.entries(endpoint.responseProps || {}).map(([key, value]) =>
          resolveResponsePropValue(key, value),
        ),
      )
      return {
        id: isPaginationEnabled ? startId + i : i + 1,
        ...resolvedProps,
      }
    })

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

    // prepare the response
    let result: any

    if (endpoint.singular) {
      result = filteredData[0] || {}
    } else {
      result = {
        data: filteredData,
        page,
        per_page: isPaginationEnabled ? perPage : total,
        total,
        total_pages: totalPages,
      }
    }

    // cache the response if enabled
    if (endpoint.cache) {
      cacheStore.set(cacheKey, result)
    }

    return sendResponse(
      res,
      endpoint.status || 200,
      result,
      endpoint.delay,
      endpoint.responseFormat,
    )
  }
}
