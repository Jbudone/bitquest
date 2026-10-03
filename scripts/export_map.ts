import { spawn } from 'child_process';

console.log('[ExportMap] Starting map receiver on port 3002...');

let resolveDone: () => void;
const donePromise = new Promise<void>((res) => {
  resolveDone = res;
});

const server = Bun.serve({
  port: 3002,
  async fetch(req) {
    if (req.method === 'POST') {
      const arrayBuffer = await req.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await Bun.write('bitquest_map_2k.png', buffer);
      console.log(`[ExportMap] Successfully saved bitquest_map_2k.png (${buffer.length} bytes)`);
      setTimeout(() => resolveDone(), 500);
      return new Response('OK', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }
    return new Response('Ready');
  }
});

console.log('[ExportMap] Launching Chromium to render the 2K canvas...');

const chromium = spawn('chromium', [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=2048,1792',
  'http://localhost:5174/render_map.html'
]);

chromium.stdout.on('data', (d) => console.log(`[Chromium stdout] ${d.toString()}`));
chromium.stderr.on('data', (d) => {
  const str = d.toString();
  if (!str.includes('libva') && !str.includes('GLX')) {
    console.log(`[Chromium] ${str}`);
  }
});

const timeout = setTimeout(() => {
  console.log('[ExportMap] Timed out waiting for POST, checking fallback...');
  resolveDone();
}, 12000);

await donePromise;
clearTimeout(timeout);
chromium.kill();
server.stop();
console.log('[ExportMap] Done!');
