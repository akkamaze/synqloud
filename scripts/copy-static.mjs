import { copyFile } from 'node:fs/promises';

await copyFile(new URL('../index.html', import.meta.url), new URL('../dist/index.html', import.meta.url));
await copyFile(new URL('../synqloud.css', import.meta.url), new URL('../dist/synqloud.css', import.meta.url));
for (const module of ['main.js', 'procedural-dust.js', 'atmosphere-weather.js']) {
  await copyFile(new URL(`../dist/${module}`, import.meta.url), new URL(`../${module}`, import.meta.url));
}
