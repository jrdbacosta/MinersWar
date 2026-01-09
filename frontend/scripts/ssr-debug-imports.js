import fs from 'fs';
import path from 'path';
import { createServer } from 'vite';

function extractImports(code) {
  const re = /import\s+(?:[^'"\n]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const imports = new Set();
  let m;
  while ((m = re.exec(code))) imports.add(m[1]);
  return Array.from(imports);
}

async function run() {
  const file = path.resolve(process.cwd(), 'src/App.test.js');
  const code = fs.readFileSync(file, 'utf8');
  const imports = extractImports(code);
  console.log('Found imports:', imports);

  const server = await createServer({ configFile: './vite.config.js', mode: 'test' });
  try {
    for (const spec of imports) {
      try {
        console.log('\nAttempting ssrLoadModule for import:', spec);
        await server.ssrLoadModule(spec);
        console.log('OK:', spec);
      } catch (err) {
        console.error('ERROR for import:', spec);
        console.error('message:', err && err.message);
        if (err.id) console.error('id:', err.id);
        if (err.loc) console.error('loc:', err.loc);
        if (err.frame) console.error('frame:\n', err.frame);
        console.error(err.stack);
        // continue to next import to gather more failures
      }
    }
  } finally {
    await server.close();
  }
}

run();
