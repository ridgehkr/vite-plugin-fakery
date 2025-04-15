// vite-plugin-fakery.ts
import type { Plugin } from 'vite'
import { faker } from '@faker-js/faker'
import path from 'path'
import fs from 'fs'

/**
 * Configuration for a single mock API endpoint.
 */
interface EndpointConfig {
  url: string
  perPage: number
  pagination?: boolean
  responseProps: FakerValue
  seed?: number // Make seed endpoint-specific
  total?: number // Make total endpoint-specific
  singular?: boolean // Add singular endpoint-specific flag
}

/**
 * Plugin-wide configuration for vite-plugin-fakery.
 */
interface FakeryOptions {
  endpoints: EndpointConfig[]
}

/**
 * A value can either be a direct faker method path (e.g., 'internet.email'),
 * a custom function, or a nested object/array of faker values.
 * Refer to the Faker API: https://fakerjs.dev/api
 */
type FakerInstance = typeof import('@faker-js/faker').faker
type FakerFunction = (faker: FakerInstance) => any
type FakerLeaf = string | FakerFunction
type FakerValue = FakerLeaf | { [key: string]: FakerValue } | FakerValue[]

/**
 * Resolves a faker value recursively. Can handle string paths, functions, objects, and arrays.
 * See: https://fakerjs.dev/api
 * @param definition - The value to resolve.
 * @returns A fully resolved mock value or object.
 */
function resolveFakerValue(definition: FakerValue): any {
  if (typeof definition === 'function') {
    return definition(faker)
  }

  if (typeof definition === 'string') {
    const pathParts = definition.split('.')
    let result: any = faker
    for (const part of pathParts) {
      result = result[part]
    }
    return typeof result === 'function' ? result() : result
  }

  if (Array.isArray(definition)) {
    return definition.map((def) => resolveFakerValue(def))
  }

  if (typeof definition === 'object' && definition !== null) {
    const nested: Record<string, any> = {}
    for (const [key, value] of Object.entries(definition)) {
      nested[key] = resolveFakerValue(value)
    }
    return nested
  }

  return null
}

/**
 * Loads the plugin configuration from a JSON file.
 * @param configPath - Path to the JSON config file.
 * @returns Parsed plugin options.
 */
function loadConfigFromFile(configPath: string): FakeryOptions {
  const fullPath = path.resolve(configPath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Fakery config file not found at ${fullPath}`)
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
}

/**
 * Main Vite plugin entry point for vite-plugin-fakery.
 * @param optionsOrPath - Configuration object or path to a JSON config file.
 * @returns A Vite plugin that registers mock API endpoints.
 */
export default function vitePluginFakery(
  optionsOrPath: FakeryOptions | string,
): Plugin {
  const options: FakeryOptions =
    typeof optionsOrPath === 'string'
      ? loadConfigFromFile(optionsOrPath)
      : optionsOrPath

  if (!Array.isArray(options?.endpoints)) {
    throw new Error(
      'vite-plugin-fakery: Invalid configuration. The "endpoints" param must be specified.',
    )
  }

  return {
    name: 'vite-plugin-fakery',
    configureServer(server) {
      for (const endpoint of options.endpoints) {
        // Seed the faker generator for this endpoint (if specified)
        if (endpoint.seed) {
          faker.seed(endpoint.seed)
        }

        server.middlewares.use(endpoint.url, (req, res) => {
          const url = new URL(req.url || '', `http://${req.headers.host}`)
          const page = parseInt(url.searchParams.get('page') || '1', 10)
          const perPage = endpoint.perPage || 10
          const total = endpoint.total || 100 // Default total to 100 if not provided
          const totalPages = endpoint.pagination
            ? Math.ceil(total / perPage)
            : 1
          const startId = endpoint.pagination ? (page - 1) * perPage + 1 : 1
          const length = Math.min(perPage, total - startId + 1) // Ensure we don't exceed the total

          // Check if the requested page is out of bounds
          if (endpoint.pagination && (page < 1 || page > totalPages)) {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 400
            res.end(
              JSON.stringify({
                error: 'Invalid page number',
                message: `Page ${page} is out of bounds. Total pages: ${totalPages}.`,
              }),
            )
            return
          }

          let result: any

          if (endpoint.singular) {
            // Generate a singular result object
            const generated = resolveFakerValue(endpoint.responseProps)
            result = {
              ...generated,
            }
          } else {
            // Generate fake data for each item in the response
            const data = Array.from({ length }).map((_, i) => {
              const item: Record<string, any> = { id: startId + i }
              const generated = resolveFakerValue(endpoint.responseProps)
              return { ...item, ...generated }
            })

            // Construct the consistent response structure
            result = {
              total, // Total number of results
              per_page: perPage, // Number of results per page
              ...(endpoint.pagination && {
                // Include pagination-specific props if enabled
                page,
                total_pages: totalPages,
              }),
              data, // Always include the generated data in a "data" array as the last property
            }
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        })
      }
    },
  }
}
