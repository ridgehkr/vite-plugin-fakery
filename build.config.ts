import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  externals: ['vite'],
  clean: true,
  declaration: true,
  outDir: 'dist',
  rollup: {
    emitCJS: false,
    inlineDependencies: true,
  },
})
