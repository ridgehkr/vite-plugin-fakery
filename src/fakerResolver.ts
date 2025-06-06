import { faker } from '@faker-js/faker'
import type { FakerDefinition } from './types'

/**
 * Recursively resolves a value from the faker library.
 * Accepts Fakery data type strings (e.g., "internet.email"), functions, nested objects, and arrays.
 *
 * @param definition - A string path, function, object, or array representing faker values
 * @returns Fully resolved fake value
 */
export function resolveFakerValue(definition: FakerDefinition): any {
  if (typeof definition === 'undefined') {
    throw new Error(`Invalid Faker path: ${definition}`)
  }

  if (typeof definition === 'function') {
    return definition(faker)
  }

  // handle path strings
  if (typeof definition === 'string') {
    const pathParts = definition.split('.')
    let result: any = faker
    for (const part of pathParts) {
      result = result?.[part]
    }
    if (typeof result === 'undefined') {
      throw new Error(`Invalid Faker path: ${definition}`)
    }
    return typeof result === 'function' ? result() : result
  }

  // arrays of faker values
  if (Array.isArray(definition)) {
    return definition.map((def) => resolveFakerValue(def))
  }

  // objects of faker values
  if (typeof definition === 'object' && definition !== null) {
    return Object.fromEntries(
      Object.entries(definition).map(([key, val]) => [
        key,
        resolveFakerValue(val),
      ]),
    )
  }

  // handle null and primitives
  return definition
}
