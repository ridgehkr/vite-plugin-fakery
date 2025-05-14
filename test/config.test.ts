import { describe, it, expect, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { loadConfigFromFile, validateConfig } from '../src/config'

// write a simple mock endpoint config file
const mockConfig = {
  endpoints: [
    {
      url: '/mock',
      responseProps: { name: 'person.fullName' },
    },
  ],
}
const tempFilePath = path.resolve(__dirname, './tempConfig.json')
fs.writeFileSync(tempFilePath, JSON.stringify(mockConfig))

// test loadConfigFromFile with ./tempConfig.json
describe('loadConfigFromFile', () => {
  it('loads config from valid JSON file', () => {
    const config = loadConfigFromFile(tempFilePath)
    expect(config).toHaveProperty('endpoints')
    expect(config.endpoints.length).toBe(1)
  })

  it('throws on missing file', () => {
    expect(() => loadConfigFromFile('./nonexistent.json')).toThrowError(
      /not found/,
    )
  })

  it('throws an error if endpoints are missing in config', () => {
    const invalidConfig = {}
    expect(() => validateConfig(invalidConfig)).toThrowError(
      /"endpoints" are required/,
    )
  })
})

afterAll(() => fs.unlinkSync(tempFilePath))
