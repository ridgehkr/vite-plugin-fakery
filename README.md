# vite-plugin-fakery

Define mock API endpoints in your Vite dev server that return structured, randomized JSON data. Useful for building and testing UIs without relying on a real backend.

Data is generated using [Faker.js](https://fakerjs.dev) and can be nested, paginated, and optionally seeded for repeatability.

This plugin is compatible with Vite 4.x, 5.x, and 6.x.

---

## Table of Contents

- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Plugin Options](#️-plugin-options)
- [🔗 Related](#-related)
- [🪪 License](#-license)

---

## 📦 Installation

```bash
npm install vite-plugin-fakery @faker-js/faker --save-dev
```

_Note:_ `@faker-js/faker` is a peer dependency. It must be installed alongside this plugin.

---

## 🚀 Quick Start

### 1. Add the plugin in your `vite.config.ts`

Import the plugin and add it to your Vite `plugins` array:

```ts
import vitePluginFakery from 'vite-plugin-fakery'

export default defineConfig({
  // … other Vite options
  plugins: [
    vitePluginFakery({
      endpoints: [
        // endpoints defined here. See step 2.
      ],
    }),
  ],
})
```

### 2. Add endpoint configuration

Each object you add to the `endpoints` array defines a separate endpoint. The following example creates one endpoint at `/api/users` that returns a paginated array of users (`first_name` and `last_name`. An `id` will also automatically be included.):

```ts
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
```

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

#### Advanced Options

```ts
vitePluginFakery({
  endpoints: [
    {
      url: '/api/posts',
      perPage: 6,
      total: 22,
      pagination: true,
      seed: 1234, // Optional. Seed the faker data to get consistent results
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
  ],
}),
```

You can override the default `total` and `perPage` values by passing them as query parameters in the URL. For example:

```http
GET /api/posts?per_page=5&total=50&page=2
```

The above request will return the second page of results, with 5 items per page and a total of 50 items.

---

#### Example Response

```json
{
  "total": 50,
  "per_page": 5,
  "page": 2,
  "total_pages": 10,
  "data": [
    {
      "id": 6,
      "title": "Quod crustulum correptius adeptio dedecor astrum.",
      "date": "2024-11-15T08:06:05.929Z",
      "body": "Denego ambulo vorago verbera. Non abundans velociter verus dapifer. Aeternus consequuntur caelestis quod subiungo contabesco desidero benevolentia desparatus.",
      "userId": 2011480696291328,
      "author": {
        "first_name": "Nayeli",
        "last_name": "Terry",
        "email": "Dallas93@gmail.com",
        "avatar": "https://avatars.githubusercontent.com/u/37640416"
      },
      "excerpt": "Clibanus copiose corrigo. Tres cultura venia adduco curso assentator abbas. Adhuc termes ara curso patrocinor…"
    },
    {
      "id": 7,
      "title": "Aliquid asperiores voluptas.",
      "date": "2024-11-16T08:06:05.929Z",
      "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "userId": 2011480696291329,
      "author": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "avatar": "https://avatars.githubusercontent.com/u/37640417"
      },
      "excerpt": "Lorem ipsum dolor sit amet, consectetur adipiscing elit…"
    }
  ]
}
```

---

#### Singular Endpoint

You can configure an endpoint to return a single object instead of an array by using the `singular` option. This is useful for endpoints that represent a single resource, such as a user profile or a specific product.

```ts
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

**Note:** The `perPage` and `total` options are not applicable for `singular` endpoints.

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

To specify what data will be included in your API response, you can use any of the method paths from the [Faker.js API](https://fakerjs.dev/api), for example:

- `'internet.email'`
- `'person.firstName'`
- `'image.avatar'`
- `'commerce.price'`

You can also define nested structures:

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
  },
}
```

Or use a function:

```ts
responseProps: {
  // The "faker" param provides complete access to the Faker-JS API
  custom: (faker) => `${faker.word.adjective()} ${faker.animal.dog()}`
}
```

**Note:** The `responseProps` object is resolved recursively, allowing you to use deeply nested structures or custom functions for dynamic values.

---

### ⚙️ External JSON Config

Instead of directly including your config options in the Vite config file, you can also load them from a separate JSON file:

**File: `vite.config.ts`**

```ts
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

---

### ⚙️ Plugin Options

| Option          | Type         | Description                                                                                                 |
| --------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `url`           | `string`     | API path (e.g. `/api/users`)                                                                                |
| `total`         | `number`     | Total number of items to return. Defaults to `100`. Can be overridden via `?total=<value>` in the URL.      |
| `perPage`       | `number`     | Number of items per page to return. Defaults to `10`. Can be overridden via `?per_page=<value>` in the URL. |
| `pagination`    | `boolean`    | Whether to split results into pages                                                                         |
| `responseProps` | `FakerValue` | Structure of faker values (string paths, functions, nested)                                                 |
| `seed`          | `number`     | _Optional_. Seed to make output deterministic                                                               |
| `singular`      | `boolean`    | _Optional_. Whether the endpoint returns a single object                                                    |

---

## 🔗 Related

- [Faker.js API Docs](https://fakerjs.dev/api)
- [Vite Plugin Guide](https://vitejs.dev/guide/using-plugins.html)

---

## 🪪 License

MIT © Caleb Pierce
