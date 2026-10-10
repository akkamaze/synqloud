# Synqloud

A static homepage with a centered wordmark, full-screen procedural cosmic fog
and subtle stars. The background evolves autonomously with randomized cloud
density. Application code is written in strict TypeScript, compiled to local
JavaScript modules with no runtime dependencies, images or external scripts.

## Preview

Install the pinned compiler and build the static output with Node.js and npm:

```sh
npm ci
npm run build
```

Serve the compiled directory with any static HTTP server. For example:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Use HTTP rather than opening the HTML directly,
because the page loads local JavaScript modules.

## Deploy

Run `npm ci` and `npm run build`, then publish `dist` as the static directory.
The generated `dist/index.html` loads the compiled `main.js` entry point.
The build also refreshes the three compiled JavaScript files in the repository
root, so existing branch-based GitHub Pages hosting can continue serving the root
without changing its settings. Commit those generated files with source changes.
Edit application code in `src/*.ts`, then run `npm run build`; browsers execute
the generated JavaScript. The root `index.html` always loads `main.js`.

Motion respects the system's reduced-motion preference and pauses when the
document is hidden. WebGL renders the fog, with a generated canvas fallback.
