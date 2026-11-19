// Builds the launcher into ../tv (the folder GitHub Pages serves) and shares the brand logos
// with the phone remote in ../logos.
import { spawnSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, '../tv');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run('npx', ['tsc', '-b']);
run('npx', ['vite', 'build', '--outDir', `"${out}"`, '--emptyOutDir']);
cpSync(resolve(root, 'public/logos'), resolve(out, '../logos'), { recursive: true });
