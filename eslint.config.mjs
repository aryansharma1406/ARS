import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
const compat = new FlatCompat({baseDirectory:fileURLToPath(new URL('.',import.meta.url))});
const config = [
  { ignores:['apps/staff-scanner/**', '.next/**', '.next-dev/**','node_modules/**','noxpass/**','next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals','next/typescript'),
  { rules: { '@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':['warn',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}] } },
  { files: ['next.config.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
];
export default config;
