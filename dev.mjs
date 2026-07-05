import net from 'node:net';
import { spawn } from 'node:child_process';

const preferredPort = Number(process.env.PORT || 3000);
const maxPortAttempts = 20;

function checkPort(value) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.once('listening', () => {
      server.close(() => resolve());
    });
    server.listen(value, '0.0.0.0');
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + maxPortAttempts; port += 1) {
    try {
      await checkPort(port);
      return port;
    } catch {
      if (process.env.PORT) {
        throw new Error(`Port ${port} is already in use. Stop the existing process or choose another PORT.`);
      }
    }
  }

  throw new Error(`No available port found from ${startPort} to ${startPort + maxPortAttempts - 1}.`);
}

let port;
try {
  port = await findAvailablePort(preferredPort);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (port !== preferredPort) {
  console.log(`Port ${preferredPort} is already in use. Using ${port} instead.`);
}

const child = spawn('npm', ['exec', '--', 'next', 'dev', '-p', String(port), '-H', '0.0.0.0'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', code => {
  process.exit(code ?? 0);
});
