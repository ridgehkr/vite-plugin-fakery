import fs from 'fs'
import path from 'path'
import type { FakeryPluginOptions } from './types'

/**
 * Validates the plugin configuration object.
 *
 * @param config - The configuration object to validate
 * @throws If the configuration is invalid
 */
export function validateConfig(
  config: any,
): asserts config is FakeryPluginOptions {
  if (!config.endpoints || !Array.isArray(config.endpoints)) {
    throw new Error('"endpoints" are required and must be an array')
  }
}

/**
 * Loads plugin config from a JSON file.
 *
 * @param configPath - Relative or absolute path to a config JSON file
 * @returns Parsed plugin options object
 * @throws If the file is missing or unreadable
 */
export function loadConfigFromFile(configPath: string): FakeryPluginOptions {
  const fullPath = path.resolve(configPath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Fakery config file not found at ${fullPath}`)
  }

  const config = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))

  validateConfig(config)

  return config
}
