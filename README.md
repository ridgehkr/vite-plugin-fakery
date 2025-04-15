# vite-plugin-fakery

Define mock API endpoints in your Vite dev server that return structured, randomized JSON data. Useful for building and testing UIs without relying on a real backend.

Data is generated using [Faker.js](https://fakerjs.dev) and can be nested, paginated, and optionally seeded for repeatability.

This plugin is compatible with Vite 4.x, 5.x, and 6.x.

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

Open [http://localhost:5173/api/users](`http://localhost:5173/api/users`) in your browser to view the results. The output should look something like this:

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
    // … more results
  ]
}
```

#### Advanced Options

You can enable pagination,

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

Open [http://localhost:5173/api/posts](`http://localhost:5173/api/posts`) in your browser. The output should look something like this:

```json
{
  "total": 22,
  "per_page": 6,
  "page": 1,
  "total_pages": 4,
  "data": [
    {
      "id": 1,
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
    }
    // … more results
  ]
}
```

You can also test pagination by adding the `page` parameter: [http://localhost:5173/api/posts?**page=2**](`http://localhost:5173/api/posts?page=2`). This will return the 2nd page of results.

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

## ⚙️ Plugin Options

| Option      | Type               | Description                    |
| ----------- | ------------------ | ------------------------------ |
| `endpoints` | `EndpointConfig[]` | Array of API endpoints to mock |

### `EndpointConfig`

| Field           | Type         | Description                                                 |
| --------------- | ------------ | ----------------------------------------------------------- |
| `url`           | `string`     | API path (e.g. `/api/users`)                                |
| `total`         | `number`     | Total number of items to return                             |
| `pagination`    | `boolean`    | Whether to split results into pages                         |
| `perPage`       | `number`     | Number of items per page to return                          |
| `responseProps` | `FakerValue` | Structure of faker values (string paths, functions, nested) |
| `seed`          | `number`     | _Optional_. Seed to make output deterministic               |

---

## 🔗 Related

- [Faker.js API Docs](https://fakerjs.dev/api)
- [Vite Plugin Guide](https://vitejs.dev/guide/using-plugins.html)

---

## 🪪 License

MIT © Caleb Pierce
