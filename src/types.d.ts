import type { Faker } from '@faker-js/faker'

/**
 * Options for acceptable values to be parsed by the Faker library.
 */
export type FakerDefinition =
  | string
  | ((faker: Faker) => unknown)
  | FakerDefinition[]
  | { [key: string]: FakerDefinition }

/**
 *
 */
export interface ConditionalResponse {
  when: { headers?: Record<string, string>; query?: Record<string, string> }
  status?: number
  responseProps?: FakerDefinition
  staticResponse?: Record<string, any>
}

/**
 * Function to transform the response data before sending it back to the client.
 */
export interface ResponseTransformation {
  (data: any): any
}

/**
 * Ascending or descending order for sorting.
 */
export type SortOrder = 'asc' | 'desc'

/**
 * Customizable query parameters for an endpoint.
 */
export type QueryParams = {
  search?: string
  sort?: string
  order?: SortOrder
  filter?: string
  per_page?: string
  total?: string
}

/**
 * Configuration options for a single endpoint.
 */
export interface EndpointConfig {
  url: string
  seed?: number
  singular?: boolean
  pagination?: boolean
  perPage?: number
  total?: number
  responseProps: FakerDefinition
  status?: number
  delay?: number
  staticResponse?: Record<string, any>
  errorRate?: number
  responseFormat?: (data: any) => any
  conditions?: ConditionalResponse[]
  cache?: boolean
  methods?: ('GET' | 'POST' | 'PUT' | 'DELETE')[]
  logRequests?: boolean
  queryParams?: QueryParams
}

/**
 * Options for the Vite plugin.
 */
export interface FakeryPluginOptions {
  endpoints: EndpointConfig[]
}
