# Coding Standards

Thank you for contributing to vite-plugin-fakery! We're excited you'd like to help make this project better. To ensure consistency and maintainability across the codebase, please follow these coding standards when contributing:

---

## General Guidelines

- **Code Style**: Use [Prettier](https://prettier.io/) for code formatting. The project includes a `.prettierrc` file with the required configuration.
- **Linting**: Ensure your code passes all linting checks before submitting a pull request. (Husky will run a linting check on every commit)
- **TypeScript**: Use TypeScript for all new files and ensure type safety throughout the codebase.
- **Comments**: Write clear and concise comments for complex logic or non-obvious code. Use JSDoc-style comments for functions and methods.

---

## File Structure

- Organize files logically within the `src/` and `test/` directories.
- Use descriptive file names that reflect their purpose (e.g., `handlers.ts` for HTTP request handlers).

---

## Naming Conventions

- **Variables and Functions**: Use `camelCase` for variables and functions (e.g., `resolveFakerValue`).
- **Classes and Interfaces**: Use `PascalCase` for classes and interfaces (e.g., `EndpointConfig`).
- **Constants**: Use `UPPER_CASE` for constants (e.g., `DEFAULT_PAGE_SIZE`).

---

## Testing

- Write unit tests for all new features and bug fixes.
- Use [Vitest](https://vitest.dev/) for testing. Test files should be placed in the `test/` directory and named with the `.test.ts` suffix (e.g., `handlers.test.ts`).
- Ensure all tests pass before submitting a pull request.

---

## Example

Here is an example of a well-documented function:

```typescript
/**
 * Resolves a value from the Faker.js library.
 *
 * @param definition - A string path, function, object, or array representing faker values
 * @returns Fully resolved fake value
 */
export function resolveFakerValue(definition: FakerDefinition): any {
  // Implementation here...
}
```
