import type { Faker } from '@faker-js/faker'

export type FakerDefinition =
  | string
  | ((faker: Faker) => unknown)
  | FakerDefinition[]
  | { [key: string]: FakerDefinition }

export interface EndpointConfig {
  url: string
  seed?: number
  singular?: boolean
  pagination?: boolean
  perPage?: number
  total?: number
  responseProps: FakerDefinition
}

export interface FakeryPluginOptions {
  endpoints: EndpointConfig[]
}
