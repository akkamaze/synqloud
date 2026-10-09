# Synqloud

A static homepage with a centered wordmark, full-screen procedural cosmic fog
and subtle stars. The background evolves autonomously with randomized cloud
density. It uses no images, external scripts, dependencies or build step.

## Preview

Serve this directory with any static HTTP server. For example:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`. Use HTTP rather than opening the HTML directly,
because the page loads local JavaScript modules.

## Deploy

Publish the repository root as the static directory. `index.html` is the entry
point. Keep the CSS and JavaScript files beside it; no build command is needed.

Motion respects the system's reduced-motion preference and pauses when the
document is hidden. WebGL renders the fog, with a generated canvas fallback.
