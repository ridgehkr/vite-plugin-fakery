import fs from 'fs'
import path from 'path'
import type { FakeryPluginOptions } from './types'

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
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
}
