import net from 'node:net';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 3000);

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

try {
  await checkPort(port);
} catch {
  console.error(`Port ${port} is already in use. Stop the existing process before running npm run dev.`);
  process.exit(1);
}

const child = spawn('npm', ['exec', '--', 'next', 'dev', '-p', String(port), '-H', '0.0.0.0'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', code => {
  process.exit(code ?? 0);
});
