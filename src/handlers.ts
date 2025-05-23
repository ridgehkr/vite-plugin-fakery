import { resolveFakerValue } from './fakerResolver.js'
import { faker } from '@faker-js/faker'
import type { SortOrder, EndpointConfig, ResponseTransformation } from './types'
import type { IncomingMessage, ServerResponse } from 'http'
import QuickLRU from 'quick-lru'

// default total number of items to generate (may or may not be paginated)
const DEFAULT_TOTAL_ITEMS = 10

// default number of items per page (if pagination is enabled)
const DEFAULT_PER_PAGE = 10

// store the last 100 cached responses (caching is optional)
const cacheStore = new QuickLRU<string, any>({
  maxSize: 100,
  maxAge: 5 * 60 * 1000, // 5 minutes
})

/**
 * Determines if the provided order is a valid sort order ('asc' or 'desc').
 * @param {unknown} order - The order to validate
 * @returns {boolean} True if the order is valid, false otherwise
 */
function isValidSortOrder(order: unknown): order is SortOrder {
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

    return [key, value.replace(/\.\./g, '.')]
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [key, value]
  }

  return [key, resolveFakerValue(value)]
}

/**
 * Sends JSON response after optional delay, applying optional transformFn.
 * @param {ServerResponse} res - The HTTP response object
 * @param {number} status - HTTP status code
 * @param {any} data - The response data
 * @param {number} [delay] - Optional delay in milliseconds
 * @param {ResponseTransformation} [transformFn] - Optional transformation function
 * @returns {void}
 */
function sendResponse(
  res: ServerResponse,
  status: number,
  data: any,
  delay?: number,
  transformFn?: ResponseTransformation,
): void {
  const dispatch = () => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    const payload = transformFn ? transformFn(data) : data
    res.end(JSON.stringify(payload))
  }
  delay ? setTimeout(dispatch, delay) : dispatch()
}

/**
 * Sends JSON error response immediately.
 * @param {ServerResponse} res - The HTTP response object
 * @param {number} status - HTTP status code
 * @param {any} body - The error response body
 * @returns {void}
 */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/**
 * Searches array of objects for term in any string field.
 * @param {T[]} data - Array of objects to search
 * @param {string} term - Search term
 * @returns {T[]} Filtered array of objects containing the search term
 */
function searchData<T extends Record<string, unknown>>(
  data: T[],
  term: string,
): T[] {
  const lower = term.toLowerCase()
  return data.filter((item) =>
    Object.values(item).some(
      (v) => typeof v === 'string' && v.toLowerCase().includes(lower),
    ),
  )
}

/**
 * Filters array of objects by exact match on field.
 * @param {T[]} data - Array of objects to filter
 * @param {string} field - Field name to filter by
 * @param {string} value - Value to match
 * @returns {T[]} Filtered array of objects matching the field and value
 */
function filterData<T extends Record<string, unknown>>(
  data: T[],
  field: string,
  value: string,
): T[] {
  return data.filter((item) => String(item[field]) === value)
}

/**
 * Sorts array of objects by field and order.
 * @param {T[]} data - Array of objects to sort
 * @param {string} field - Field name to sort by
 * @param {SortOrder} order - Sort order ('asc' or 'desc')
 * @returns {T[]} Sorted array of objects
 */
function sortData<T extends Record<string, unknown>>(
  data: T[],
  field: string,
  order: SortOrder = 'asc',
): T[] {
  return [...data].sort((a, b) => {
    const av = a[field]
    const bv = b[field]
    if (av == null || bv == null) return 0
    if (av < bv) return order === 'asc' ? -1 : 1
    if (av > bv) return order === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Parses request URL and constructs cacheKey.
 * @param {IncomingMessage} req - The HTTP request object
 * @param {EndpointConfig} endpoint - The endpoint configuration
 * @returns {{ url: URL; cacheKey: string }} Parsed URL and cache key
 */
function parseRequest(
  req: IncomingMessage,
  endpoint: EndpointConfig,
): { url: URL; cacheKey: string } {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const qs = url.searchParams.toString()
  return { url, cacheKey: `${endpoint.url}${qs ? `?${qs}` : ''}` }
}

/**
 * Validates HTTP method.
 * @param {IncomingMessage} req - The HTTP request object
 * @param {EndpointConfig} endpoint - The endpoint configuration
 * @returns {boolean} True if method is valid, false otherwise
 */
function validateMethod(
  req: IncomingMessage,
  endpoint: EndpointConfig,
): boolean {
  return !endpoint.methods || endpoint.methods.includes(req.method as any)
}

/**
 * Simulates random error based on errorRate.
 * @param {EndpointConfig} endpoint - The endpoint configuration
 * @returns {boolean} True if error should be simulated, false otherwise
 */
function shouldSimulateError(endpoint: EndpointConfig): boolean {
  return (
    typeof endpoint.errorRate === 'number' && Math.random() < endpoint.errorRate
  )
}

/**
 * Retrieves cached response if enabled.
 * @param {string} cacheKey - The cache key
 * @param {EndpointConfig} endpoint - The endpoint configuration
 * @returns {T | undefined} Cached response or undefined
 */
function getCachedResponse<T>(
  cacheKey: string,
  endpoint: EndpointConfig,
): T | undefined {
  return endpoint.cache && cacheStore.has(cacheKey)
    ? (cacheStore.get(cacheKey) as T)
    : undefined
}

/**
 * Extracts and normalizes query params and pagination info.
 * @param {URL} url - The parsed URL object
 * @param {EndpointConfig} endpoint - The endpoint configuration
 * @returns {object} Object containing search, filter, sort, pagination, and total info
 */
function buildParams(url: URL, endpoint: EndpointConfig) {
  const qp = endpoint.queryParams ?? {}
  const searchKey = qp.search ?? 'q'
  const filterKey = qp.filter ?? 'filter'
  const sortKey = qp.sort ?? 'sort'
  const order = isValidSortOrder(qp.order) ? qp.order : 'asc'

  const searchValue = url.searchParams.get(searchKey) ?? ''
  const filterField = url.searchParams.get(filterKey) ?? ''
  const filterValue = filterField
    ? (url.searchParams.get(filterField) ?? '')
    : ''

  // only set sortField if the sort param was provided
  const sortField = url.searchParams.has(sortKey)
    ? url.searchParams.get(sortKey)!
    : undefined

  const perPageRaw = parseInt(
    url.searchParams.get(qp.per_page ?? 'per_page') ?? String(endpoint.perPage),
    10,
  )

  const parsedRawTotal = parseInt(
    url.searchParams.get(qp.total ?? 'total') ?? String(endpoint.total),
    10,
  )
  const totalRaw = isNaN(parsedRawTotal) ? DEFAULT_TOTAL_ITEMS : parsedRawTotal

  // determine if pagination is enabled either directly or implied by perPage and total
  const paginationEnabled =
    endpoint.pagination ||
    (Number.isInteger(perPageRaw) &&
      perPageRaw > 0 &&
      endpoint.pagination !== false)

  const perPage = paginationEnabled
    ? (perPageRaw ?? DEFAULT_PER_PAGE)
    : totalRaw

  const total = totalRaw
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(
    Math.max(parseInt(url.searchParams.get('page') ?? '1', 10), 1),
    totalPages,
  )

  return {
    searchValue,
    filterField,
    filterValue,
    sortField,
    order,
    page,
    perPage,
    total,
    totalPages,
  }
}

/**
 * Calculates start/end range IDs for pagination.
 */
function pageRange(page: number, perPage: number, total: number) {
  const startId = (page - 1) * perPage + 1
  return { startId, endId: Math.min(startId + perPage - 1, total) }
}

/**
 * Finds matching conditional response based on headers/query.
 */
function matchCondition(
  req: IncomingMessage,
  url: URL,
  endpoint: EndpointConfig,
) {
  return endpoint.conditions?.find((cond) => {
    const hdrOk = cond.when.headers
      ? Object.entries(cond.when.headers).every(
          ([k, v]) => req.headers[k] === v,
        )
      : true
    const qryOk = cond.when.query
      ? Object.entries(cond.when.query).every(
          ([k, v]) => url.searchParams.get(k) === v,
        )
      : true
    return hdrOk && qryOk
  })
}

/**
 * Generates fake data array based on responseProps.
 */
/**
 * Generates fake data array for given ID range, ignoring global pagination flag.
 * @param endpoint - Endpoint configuration (used for responseProps)
 * @param range - Object containing startId and endId
 * @returns Array of data items with IDs from startId to endId inclusive
 */
function generateData(
  endpoint: EndpointConfig,
  range: { startId: number; endId: number },
): Record<string, unknown>[] {
  const count = Math.max(0, range.endId - range.startId + 1)
  const responseProps = endpoint.responseProps ?? {}
  return Array.from({ length: count }).map((_, i) => {
    const id = range.startId + i
    const props = Object.fromEntries(
      Object.entries(responseProps).map(([k, v]) =>
        resolveResponsePropValue(k, v),
      ),
    )
    return { id, ...props }
  })
}

/**
 * Applies search, filter, and sort transforms in sequence.
 */
function applyTransforms<T extends Record<string, unknown>>(
  data: T[],
  params: ReturnType<typeof buildParams>,
): T[] {
  let result = data
  if (params.searchValue) result = searchData(result, params.searchValue)
  if (params.filterField)
    result = filterData(result, params.filterField, params.filterValue)
  if (params.sortField)
    result = sortData(result, params.sortField, params.order)
  return result
}

/**
 * Builds final payload: single object or paginated collection.
 */
function buildPayload<T extends Record<string, unknown>>(
  data: T[],
  params: ReturnType<typeof buildParams>,
  endpoint: EndpointConfig,
):
  | T
  | {
      data: T[]
      page: number
      per_page: number
      total: number
      total_pages: number
    } {
  return endpoint.singular
    ? (data[0] ?? {})
    : {
        data,
        page: params.page,
        per_page: params.perPage,
        total: params.total,
        total_pages: params.totalPages,
      }
}

/**
 * Creates an HTTP handler function for given endpoint configuration.
 */
export function createEndpointHandler(endpoint: EndpointConfig) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    // Parse URL and cache key
    const { url, cacheKey } = parseRequest(req, endpoint)

    // Method check
    if (!validateMethod(req, endpoint)) {
      res.statusCode = 405
      return res.end()
    }

    // Simulate error
    if (shouldSimulateError(endpoint)) {
      return sendJson(res, 500, { error: 'Simulated server error' })
    }

    // Cache lookup
    const cached = getCachedResponse(cacheKey, endpoint)
    if (cached !== undefined) {
      return sendResponse(
        res,
        endpoint.status ?? 200,
        cached,
        endpoint.delay,
        endpoint.responseFormat,
      )
    }

    // Build params
    const params = buildParams(url, endpoint)
    if (endpoint.logRequests) console.log(`Request: ${req.method} ${req.url}`)

    // Seed faker
    if (endpoint.seed !== undefined) faker.seed(endpoint.seed)

    // Conditional static response
    const condition = matchCondition(req, url, endpoint)
    if (condition) {
      return sendResponse(
        res,
        condition.status ?? 200,
        condition.staticResponse ?? {},
        endpoint.delay,
        endpoint.responseFormat,
      )
    }

    // Global static response
    if (endpoint.staticResponse) {
      return sendResponse(
        res,
        endpoint.status ?? 200,
        endpoint.staticResponse,
        endpoint.delay,
        endpoint.responseFormat,
      )
    }

    // Handle singular endpoint: ignore pagination settings
    if (endpoint.singular) {
      // Generate full dataset ignoring pagination
      const rawData = generateData(
        { ...endpoint, pagination: false },
        { startId: 1, endId: 1 },
      )
      // Apply search, filter, sort but ignore page/perPage
      const finalData = applyTransforms(rawData, params)
      const result = finalData[0] ?? {}

      if (endpoint.cache) cacheStore.set(cacheKey, result)
      return sendResponse(
        res,
        endpoint.status ?? 200,
        result,
        endpoint.delay,
        endpoint.responseFormat,
      )
    }

    // Data generation & transform for list endpoints
    const { startId, endId } = pageRange(
      params.page,
      params.perPage,
      params.total,
    )
    const rawData = generateData(endpoint, { startId, endId })
    const finalData = applyTransforms(rawData, params)
    const payload = buildPayload(finalData, params, endpoint)

    // Cache store
    if (endpoint.cache) cacheStore.set(cacheKey, payload)

    // Send result
    return sendResponse(
      res,
      endpoint.status ?? 200,
      payload,
      endpoint.delay,
      endpoint.responseFormat,
    )
  }
}
