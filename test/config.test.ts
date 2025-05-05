import { describe, it, expect, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { loadConfigFromFile } from '../src/config'

// Setup a mock endpoint config file
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
})

// Cleanup
afterAll(() => fs.unlinkSync(tempFilePath))
