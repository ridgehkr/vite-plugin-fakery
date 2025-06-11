# vite-plugin-fakery

Define mock API endpoints in your [Vite](https://vite.dev/) dev server that return structured, auto-generated JSON data from [Faker](https://fakerjs.dev). Useful for building and testing UIs without relying on a real backend or wracking your brain trying to make up example content.

This plugin is compatible with Vite 2.x and above.

## Table of Contents

- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration Options](#️-configuration-options)
- [🔗 Related](#-related)
- [🪪 License](#-license)

## 📦 Installation

```bash
# with pnpm
pnpm i -D vite-plugin-fakery

# OR
npm i -D vite-plugin-fakery
```

## 🚀 Quick Start

### Add the plugin and define your endpoints

Import the plugin and add it to your Vite `plugins` config. Each object you add to the `endpoints` array defines a separate endpoint. The following example creates one endpoint at `/api/users` that returns a paginated array of users (`first_name` and `last_name`). An `id` prop will also be automatically generated.

```ts
import { defineConfig } from 'vite'
import vitePluginFakery from 'vite-plugin-fakery'

export default defineConfig({
  // … other Vite options
  plugins: [
    vitePluginFakery({
      endpoints: [
        {
          url: '/api/users',
          responseProps: {
            first_name: 'person.firstName',
            last_name: 'person.lastName',
          },
        },
      ],
    }),
  ],
})
```

### See the Results

Open `http://localhost:<vite-port>/api/users` in your browser to view the results. The output should look something like this:

```ts
{
  "data": [
    {
      "id": 1,
      "first_name": "Noble",
      "last_name": "Auer"
    },
    {
      "id": 2,
      "first_name": "Wilfredo",
      "last_name": "Thompson"
    },
    // 8 more results here…
  ],
  "page": 1,
  "per_page": 10,
  "total": 10,
  "total_pages": 1
}
```

## ⚙️ Configuration Options

Each endpoint can be individually configured with the following:

| Option                                          | Type                                               | Required | Default                            | Description                                                                                                                                                      |
| ----------------------------------------------- | -------------------------------------------------- | -------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`                                           | `string`                                           | Yes      | N/A                                | API path (e.g. `/api/users`)                                                                                                                                     |
| `total`                                         | `number`                                           | No       | `10`                               | Total number of items to return. Can be overridden via `?total=<value>` in the URL. Automatically enables pagination if set.                                     |
| `perPage`                                       | `number`                                           | No       | `10`                               | Number of items per page to return. Can be overridden via `?per_page=<value>` in the URL. Automatically enables pagination if set.                               |
| `pagination`                                    | `boolean`                                          | No       | `false`                            | Whether to split results into pages                                                                                                                              |
| `seed`                                          | `number`                                           | No       | None                               | Seed to make output deterministic. See [Faker seed documentation](https://fakerjs.dev/api/faker#seed) for details.                                               |
| [`singular`](#singular-endpoints)               | `boolean`                                          | No       | `false`                            | Whether the endpoint returns an array of objects as defined by `responseProps` (`false`) or a single, unwrapped object (`true`).                                 |
| [`responseProps`](#understanding-responseprops) | `FakerDefinition`                                  | No       | `{}`                               | Structure of Faker.js values (string paths, functions, nested). [Read more about response props](#understanding-responseprops).                                  |
| `methods`                                       | array of `'GET'`, `'POST'`, `'PUT'`, or `'DELETE'` | No       | `['GET', 'POST', 'PUT', 'DELETE']` | Restricts the endpoint to specific HTTP methods. Defaults to all methods.                                                                                        |
| [`conditions`](#conditional-responses)          | `ConditionalResponse[]`                            | No       | `undefined`                        | Defines conditions for returning different responses based on headers or query parameters.                                                                       |
| `cache`                                         | `boolean`                                          | No       | `false`                            | Enables caching of responses for the endpoint. Entries older than 5 minutes auto-expire, and once 100 items are exceeded, the least-recently-used ones drop off. |
| `responseFormat`                                | `(data: any) => any`                               | No       | `undefined`                        | A function to transform the response data before sending it.                                                                                                     |
| `errorRate`                                     | `number`                                           | No       | `undefined`                        | Probability (0-1) of returning a simulated 500 error.                                                                                                            |
| [`status`](#status-codes)                       | `number`                                           | No       | `undefined`                        | Override the endpoint's HTTP status code                                                                                                                         |
| `delay`                                         | `number`                                           | No       | `undefined`                        | Time in milliseconds to wait before sending response                                                                                                             |
| `staticResponse`                                | `Record<string, any>`                              | No       | `undefined`                        | Fixed object to be returned                                                                                                                                      |
| `logRequests`                                   | `boolean`                                          | No       | `false`                            | Log each incoming request to the terminal                                                                                                                        |
| `queryParams`                                   | `QueryParams`                                      | No       | `{}`                               | Customize the query param names for `search`, `filter`, `sort`, `per_page`, and `total`                                                                          |

### Expanded Example

The following config creates endpoints at:

- `/api/posts`
- `/api/conditional`
- `/api/cached`
- `/api/formatted`

```ts
import { defineConfig } from 'vite'
import vitePluginFakery from 'vite-plugin-fakery'

vitePluginFakery({
  endpoints: [
    {
      url: '/api/posts',
      total: 22,
      perPage: 6,
      pagination: true,
      seed: 1234,
      responseProps: {
        title: 'lorem.sentence',
        date: 'date.past',
        body: 'lorem.paragraph',
        userId: 'number.int',

        // you can also nest response props
        author: {
          first_name: 'person.firstName',
          last_name: 'person.lastName',
          email: 'internet.email',
          avatar: 'image.avatar',
        },

        // pass a function to customize a prop's output
        excerpt: (faker) => {
          const body = faker.lorem.paragraph()
          return body.split(' ').slice(0, 15).join(' ') + '…'
        },
      },
    },
    {
      url: '/api/conditional',
      conditions: [
        {
          when: { headers: { 'x-custom-header': 'value' } },
          status: 200,
          staticResponse: { message: 'Header matched!' },
        },
        {
          when: { query: { key: 'value' } },
          status: 200,
          staticResponse: { message: 'Query matched!' },
        },
      ],
    },
    {
      url: '/api/cached',
      responseProps: {
        name: 'person.fullName',
        email: 'internet.email',
      },
      cache: true, // Enable caching
    },
    {
      url: '/api/formatted',
      responseProps: {
        name: 'person.fullName',
        email: 'internet.email',
      },
      responseFormat: (data) => ({
        customWrapper: {
          data,
          timestamp: new Date().toISOString(),
        },
      }),
    },
  ],
}),
```

#### Singular Endpoints

You can also configure an endpoint to return a single object instead of an array of objects (default) by setting the `singular` prop to `true`. This is useful for endpoints that represent a single resource, such as a user profile or a specific product. _Note that pagination options will not be applied_.

```ts
import { defineConfig } from 'vite'
import vitePluginFakery from 'vite-plugin-fakery'

vitePluginFakery({
  endpoints: [
    {
      url: '/api/user',
      singular: true, // enable singular response
      responseProps: {
        first_name: 'person.firstName',
        last_name: 'person.lastName',
        email: 'internet.email',
        avatar: 'image.avatar',
      },
    },
  ],
}),
```

Open `http://localhost:<vite-port>/api/user` in your browser to view the result. The output should look something like this:

```json
{
  "first_name": "Noble",
  "last_name": "Auer",
  "email": "noble.auer@example.com",
  "avatar": "https://avatars.githubusercontent.com/u/37640416"
}
```

This endpoint does not include pagination or a `data` array, as it is designed to return a single object.

### Understanding `responseProps`

To specify what data will be included for each value in your API response, you can use any of the method paths from the [Faker API](https://fakerjs.dev/api), for example:

- `'internet.email'`
- `'person.firstName'`
- `'image.avatar'`
- `'commerce.price'`

Static values (strings, numbers, booleans) are also accepted.

You can also define nested structures as deep as you want:

```ts
responseProps: {
  name: 'person.fullName',
  contact: {
    email: 'internet.email',
    phone: 'phone.number',
  },
  location: {
    street: 'location.streetAddress',
    city: 'location.city',
    meta: {
      gis: {
        id: 'string.uuid',
        county: 'location.county',
      }
    }
  },
}
```

Or use a function to create a customized property, optionally including Faker content:

```ts
responseProps: {
  // The "faker" param provides complete access to the Faker-JS API
  custom: (faker) => `My dog: ${faker.word.adjective()} ${faker.animal.dog()}`
}
```

#### Escaping periods

If using a static string value that has a period, it must be escaped with a second period (e.g. ".."), or else it will be parsed as Faker content.

```ts
responseProps: {
  myStaticValue: 'Hi.. My name is George!', // 'Hi. My name is George!'
}
```

#### Conditional Responses

You can return different responses from an endpoint based on request headers or query parameters using the conditions option. Each condition specifies a when clause (with headers and/or query), and a custom response or status to return if matched. The first matching condition is used.

```ts
import { defineConfig } from 'vite'
import vitePluginFakery from 'vite-plugin-fakery'

vitePluginFakery({
  endpoints: [
    {
      url: '/api/users',
      // … other endpoint settings
      conditions: [
        {
          when: { headers: { 'x-api-key': 'secret' } },
          status: 200,
          staticResponse: { message: 'You provided the correct API key!' },
        },
        {
          when: { query: { preview: 'true' } },
          status: 200,
          staticResponse: { message: 'Preview mode enabled.' },
        },
      ]
    },
  ],
}),
```

- If a request to this endpoint includes the header `x-api-key: secret`, it will return `{ message: 'You provided the correct API key!' }`.

- If the query string includes `?preview=true`, it will return `{ message: 'Preview mode enabled.' }`.
  If neither condition matches, the normal responseProps will be used.

#### Status Codes

By default, all mock responses are served with an HTTP status code of 200 OK. If you need to simulate error states or other response codes, you can override this on a per-endpoint basis:

```ts
import { defineConfig } from 'vite'
import vitePluginFakery from 'vite-plugin-fakery'

vitePluginFakery({
  endpoints: [
    {
      url: '/teapot',
      total: 0,
      status: 418, // all responses will have the status code of 418
      responseProps: { id: 'number.int' }
    }
  ],
}),
```

### ⚙️ External JSON Config

Instead of directly including your config options in the Vite config file, you can also load them from a separate JSON file:

**Vite config:**

```ts
import { defineConfig } from 'vite'
import vitePluginFakery from 'vite-plugin-fakery'

export default defineConfig({
  // … other Vite options
  plugins: [
    // customize path and file name as necessary
    vitePluginFakery('config/mock.config.json'),
  ],
})
```

**File: `config/mock.config.json`**

```json
{
  "endpoints": [
    {
      "url": "/api/products",
      "responseProps": {
        "name": "commerce.productName",
        "price": "commerce.price"
      }
    }
  ]
}
```

### 🛠️ Why This Is a Vite-Only Plugin

**vite-plugin-fakery** is designed specifically for use with [Vite](https://vite.dev/) and is not compatible with other build tools or dev servers (such as Webpack, Rollup, or Parcel). This is because it relies on Vite-specific plugin hooks and middleware APIs to inject mock endpoints directly into the Vite development server.

Key Vite-only compatibility distinguishments:

- **Vite Plugin API:** The plugin uses Vite's plugin system (`configureServer`, `handleHotUpdate`, etc.) to register and manage mock endpoints.
- **Dev Server Middleware:** It injects custom middleware into the Vite dev server pipeline, which is not available in other tools.
- **Hot Reload Integration:** The plugin leverages Vite's hot module replacement (HMR) and config reload features for instant updates to mock data and endpoints.

## ✨ Contributing

Contributions are welcome! To get started, please follow these guidelines:

### Reporting Issues

If you encounter a bug or have a feature request, please [open an issue](https://github.com/ridgehkr/vite-plugin-fakery/issues). Provide as much detail as possible, including steps to reproduce the issue or a clear description of the feature you'd like to see.

### Submitting Pull Requests

1. **Fork the Repository**: Create a fork of the repository to work on your changes.
2. **Create a Branch**: Use a descriptive branch name (e.g., `fix-bug-123` or `add-new-feature`).
3. **Follow Coding Standards**: Ensure your changes adhere to the [Coding Standards](CODING_STANDARDS.md).
4. **Write Tests**: Add or update the unit tests (`/test`) to cover your changes, if applicable.
5. **Run Tests**: Ensure all tests (new and existing) pass locally before submitting your pull request.
6. **Submit a Pull Request**: Open a [pull request](https://github.com/ridgehkr/vite-plugin-fakery/pulls), providing a clear description of your changes and referencing any related issues.

## 🔗 Related

- [Faker API Docs](https://fakerjs.dev/api)
- [Vite config](https://vite.dev/config/)

## 🪪 License

© [Caleb Pierce](https://calebpierce.dev). MIT License applies.
