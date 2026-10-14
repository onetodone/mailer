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
})
