# vite-plugin-fakery

Mock API plugin for Vite using Faker.js

## Usage

```ts
import fakery from 'vite-plugin-fakery'

export default defineConfig({
  plugins: [
    fakery({
      endpoints: [
        /* ... */
      ],
    }),
  ],
})
```
