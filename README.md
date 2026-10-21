# Synqloud

A static homepage with a centered wordmark, full-screen procedural cosmic fog
and subtle stars. The background evolves autonomously with randomized cloud
density. Built with [Astro](https://astro.build) and strict TypeScript; the
output is plain HTML, CSS and JavaScript with no runtime dependencies, images
or external scripts.

## Requirements

Node.js 22.23.4 or later (see `.node-version`) and npm.

## Develop

```sh
npm ci
npm run dev
```

Open the URL the dev server prints. The Content-Security-Policy meta tag is
added only to production builds, because the dev server injects inline styles
and scripts.

## Check and build

```sh
npm run check
npm run build
npm run preview
```

`npm run check` runs `astro check` and Biome. `npm run format` applies
Biome's formatting and safe lint fixes. `npm install` points Git at
`.githooks/`, whose pre-commit hook checks staged files.

`npm run build` writes the static site to `dist/`. Serve that directory as
the web root.

Motion respects the system's reduced-motion preference and pauses when the
document is hidden. WebGL renders the fog, with a generated canvas fallback.
