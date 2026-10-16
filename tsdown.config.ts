import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'smtp/index': 'src/smtp/index.ts',
    'resend/index': 'src/resend/index.ts',
    'nestjs/index': 'src/nestjs/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  outputOptions: ({ chunkFileNames = '[name]-[hash].js', ...options }) => ({
    ...options,
    chunkFileNames: (chunk) => {
      const name = typeof chunkFileNames === 'function' ? chunkFileNames(chunk) : chunkFileNames
      return chunk.facadeModuleId?.includes('/src/i18n/') === true ? `locales/${name}` : name
    },
  }),
})
