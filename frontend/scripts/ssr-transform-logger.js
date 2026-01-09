import { createServer } from 'vite';

async function run() {
  const server = await createServer({
    configFile: './vite.config.js',
    mode: 'test',
    plugins: [
      {
        name: 'ssr-transform-logger',
        async transform(code, id) {
          // log every transform id briefly
          console.log('TRANSFORM id=', id);
          return null;
        }
      }
    ]
  });

  try {
    console.log('Starting ssrLoadModule for /src/App.test.js');
    await server.ssrLoadModule('/src/App.test.js');
    console.log('ssrLoadModule completed');
  } catch (err) {
    console.error('SSR load error: ', err && err.message);
    console.error(err && err.stack);
  } finally {
    await server.close();
  }
}

run();
