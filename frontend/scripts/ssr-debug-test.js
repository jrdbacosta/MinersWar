import { createServer } from 'vite';

async function run() {
  const server = await createServer({ configFile: './vite.config.js', mode: 'test' });
  try {
    console.log('Attempting ssrLoadModule /src/App.test.js');
    await server.ssrLoadModule('/src/App.test.js');
    console.log('ssrLoadModule succeeded for test file');
  } catch (err) {
    console.error('SSR test-file load error:');
    console.error('message:', err && err.message);
    if (err.id) console.error('id:', err.id);
    if (err.loc) console.error('loc:', err.loc);
    if (err.frame) console.error('frame:\n', err.frame);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await server.close();
  }
}

run();
