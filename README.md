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

```ts
import { defineConfig } from 'vite'
import vitePluginFakery from 'vite-plugin-fakery'

export default defineConfig({
  plugins: [
    vitePluginFakery({
      endpoints: [
        // basic "users" endpoint with 4 props returned per result
        {
          url: '/api/users',
          perPage: 10,
          total: 120,
          pagination: true,
          responseProps: {
            email: 'internet.email',
            first_name: 'person.firstName',
            last_name: 'person.lastName',
            avatar: 'image.avatar',
          },
        },

        // advanced "posts" endpoint with nested and customized props
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
  ],
})
```

Now open [http://localhost:5173/api/users?page=1](`http://localhost:5173/api/users?page=1`) in your browser.

---

### ⚙️ External JSON Config

Alternatively, you can also load your config from a JSON file:

**File: `vite.config.ts`**

```ts
vitePluginFakery('mock/mock.config.json')
```

**File: `mock/mock.config.json`**

```json
{
  "seed": 42,
  "endpoints": [
    {
      "url": "/api/products",
      "perPage": 5,
      "pagination": true,
      "responseProps": {
        "name": "commerce.productName",
        "price": "commerce.price",
        "department": "commerce.department"
      }
    }
  ]
}
```

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
  custom: (faker) => `${faker.word.adjective()} ${faker.animal.dog()}`
}
```

---

## 🧪 Sample Response (paginated)

```json
{
  "page": 1,
  "per_page": 10,
  "total": 100,
  "total_pages": 10,
  "data": [
    {
      "id": 1,
      "email": "helen.schmidt@example.com",
      "first_name": "Helen",
      "last_name": "Schmidt",
      "avatar": "https://randomuser.me/api/portraits/women/1.jpg"
    }
  ]
}
```

---

## ⚙️ Plugin Options

| Option      | Type               | Description                                 |
| ----------- | ------------------ | ------------------------------------------- |
| `endpoints` | `EndpointConfig[]` | Array of API endpoints to mock              |
| `seed`      | `number`           | Optional. Seed to make output deterministic |

### `EndpointConfig`

| Field           | Type         | Description                                              |
| --------------- | ------------ | -------------------------------------------------------- |
| `url`           | `string`     | API path (e.g. `/api/users`)                             |
| `perPage`       | `number`     | Number of items to return                                |
| `pagination`    | `boolean`    | Whether to wrap in paginated format                      |
| `responseProps` | `FakerValue` | Object of faker values (string paths, functions, nested) |

---

## 🔗 Related

- [Faker.js API Docs](https://fakerjs.dev/api)
- [Vite Plugin Guide](https://vitejs.dev/guide/using-plugins.html)

---

## 🪪 License

MIT © Caleb Pierce
