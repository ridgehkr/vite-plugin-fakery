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

  it('resolves deeply nested structures', () => {
    const nested = {
      user: {
        profile: {
          id: 'string.uuid',
          info: {
            name: 'person.fullName',
            contact: {
              email: 'internet.email',
              phones: ['phone.number', 'phone.number'],
            },
          },
        },
        tags: ['word.noun', 'word.verb'],
      },
    }
    const result = resolveFakerValue(nested)
    expect(result.user.profile).toHaveProperty('id')
    expect(result.user.profile.info.contact).toHaveProperty('email')
    expect(Array.isArray(result.user.profile.info.contact.phones)).toBe(true)
    expect(result.user.tags.length).toBe(2)
  })
})
