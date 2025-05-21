# vite-plugin-fakery

Define mock API endpoints in your [Vite](https://vite.dev/) dev server that return structured, auto-generated JSON data from [Faker](https://fakerjs.dev). Useful for building and testing UIs without relying on a real backend or wracking your brain trying to make up example content.

This plugin is compatible with Vite 4.x+.

---

## Table of Contents

- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration Options](#️-configuration-options)
- [🔗 Related](#-related)
- [🪪 License](#-license)

---

## 📦 Installation

```bash
# with pnpm
pnpm i -D vite-plugin-fakery @faker-js/faker

# OR
npm i -D vite-plugin-fakery @faker-js/faker
```

_Note:_ `@faker-js/faker` is a peer dependency. It must be installed alongside this plugin.

---

## 🚀 Quick Start

### Add the plugin to your Vite config and define your endpoints

Import the plugin and add it to your Vite `plugins` config. Each object you add to the `endpoints` array defines a separate endpoint. The following example creates one endpoint at `/api/users` that returns a paginated array of users (`first_name` and `last_name`). An `id` will also by automatically generated.

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

```json
{
  "total": 100,
  "per_page": 10,
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
    }
  ]
}
```

---

## ⚙️ Configuration Options

Each endpoint can be individually configured with the following:

| Option           | Type                                               | Required | Description                                                                                                                                                                                     |
| ---------------- | -------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`            | `string`                                           | Yes      | API path (e.g. `/api/users`)                                                                                                                                                                    |
| `total`          | `number`                                           | No       | Total number of items to return. Defaults to `100`. Can be overridden via `?total=<value>` in the URL.                                                                                          |
| `perPage`        | `number`                                           | No       | Number of items per page to return. Defaults to `10`. Can be overridden via `?per_page=<value>` in the URL.                                                                                     |
| `pagination`     | `boolean`                                          | No       | Whether to split results into pages                                                                                                                                                             |
| `seed`           | `number`                                           | No       | Seed to make output deterministic. See [Faker seed documentation](https://fakerjs.dev/api/faker#seed) for details.                                                                              |
| `singular`       | `boolean`                                          | No       | Whether the endpoint returns an array of object as defined by `responseProps` (`false`, default) or a single, unwrapped object (`true`). [Read more on singular endpoints](#singular-endpoint). |
| `responseProps`  | `FakerValue`                                       | No       | Structure of Faker.js values (string paths, functions, nested). [Read more about response props](#understanding-responseprops).                                                                 |
| `methods`        | array of `'GET'`, `'POST'`, `'PUT'`, or `'DELETE'` | No       | Restricts the endpoint to specific HTTP methods. Defaults to all methods.                                                                                                                       |
| `conditions`     | `ConditionalResponse[]`                            | No       | Defines conditions for returning different responses based on headers or query parameters.                                                                                                      |
| `cache`          | `boolean`                                          | No       | Enables caching of responses for the endpoint. Defaults to `false`.                                                                                                                             |
| `responseFormat` | `(data: any) => any`                               | No       | A function to transform the response data before sending it.                                                                                                                                    |

### Example

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
      singular: false,
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
    {
      url: '/api/example',
      responseProps: {
        name: 'person.fullName',
        email: 'internet.email',
      },
      cache: true,
      conditions: [
        {
          when: { query: { key: 'value' } },
          staticResponse: { message: 'Condition met!' },
        },
      ],
      responseFormat: (data) => ({
        customWrapper: {
          data,
          timestamp: new Date().toISOString(),
        },
      }),
    },
    // … more endpoints
  ],
}),
```

#### Singular Endpoint

You can configure an endpoint to return a single object instead of an array of objects (default) by using the `singular` option. This is useful for endpoints that represent a single resource, such as a user profile or a specific product. Note that `perPage` and `total` options are not applicable for `singular` endpoints.

```ts
import { defineConfig } from 'vite'
import vitePluginFakery from 'vite-plugin-fakery'

vitePluginFakery({
  endpoints: [
    {
      url: '/api/user',
      singular: true, // Enable singular response
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

---

### Understanding `responseProps`

To specify what data will be included in your API response, you can use any of the method paths from the [Faker API](https://fakerjs.dev/api), for example:

- `'internet.email'`
- `'person.firstName'`
- `'image.avatar'`
- `'commerce.price'`

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

Static values (strings, numbers, booleans) are also accepted. _Important: If using a static string value that has a period, it must be escaped with a second period (".."), or else it will be parsed as Faker content._

Example:

```ts
responseProps: {
  myStaticValue: 'Hi.. My name is George!', // 'Hi. My name is George!'
}
```

---

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

---

## 🪪 License

© [Caleb Pierce](https://calebpierce.dev). MIT License applies.
