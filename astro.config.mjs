import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://synqloud.com',
  build: {
    // The CSP allows only same-origin stylesheets, so never inline them.
    inlineStylesheets: 'never',
  },
});
