import { describe, it, expect } from 'vitest'
import { resolveFakerValue } from '../src/fakerResolver'

describe('resolveFakerValue', () => {
  it('resolves string path like "internet.email"', () => {
    const value = resolveFakerValue('internet.email')
    expect(typeof value).toBe('string')
    expect(value).toContain('@')
  })

  it('resolves function that returns value', () => {
    const value = resolveFakerValue((faker) => faker.internet.userName())
    expect(typeof value).toBe('string')
  })

  it('resolves nested object structure', () => {
    const result = resolveFakerValue({
      id: 'string.uuid',
      user: {
        name: 'person.fullName',
        email: 'internet.email',
      },
    })
    expect(result).toHaveProperty('id')
    expect(result.user).toHaveProperty('name')
    expect(result.user).toHaveProperty('email')
  })

  it('resolves arrays', () => {
    const values = resolveFakerValue(['internet.email', 'person.firstName'])
    expect(Array.isArray(values)).toBe(true)
    expect(values.length).toBe(2)
  })
})
