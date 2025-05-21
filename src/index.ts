import type { Plugin } from 'vite'
import type { FakeryPluginOptions } from './types'
import { loadConfigFromFile } from './config.js'
import { createEndpointHandler } from './handlers.js'

/**
 * Vite plugin to register mock API endpoints using data from Faker.js.
 *
 * @param optionsOrPath - Either an object with plugin options or a path to a JSON file
 * @returns A configured Vite plugin
 * @throws If the configuration is invalid or missing required fields
 */
const vitePluginFakery = (
  optionsOrPath: string | FakeryPluginOptions,
): Plugin => {
  const options: FakeryPluginOptions =
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
        console.log(
          `Mock endpoint registered: ${endpoint.url} ${
            endpoint.singular ? '(singular)' : '(paginated)'
          }`,
        )
        server.middlewares.use(endpoint.url, createEndpointHandler(endpoint))
      }
    },
  }
}

export default vitePluginFakery
