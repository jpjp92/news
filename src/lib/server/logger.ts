import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'news_dash.log');

async function writeLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const details = meta === undefined ? '' : ` ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
  const line = `[${timestamp}] [${level}] ${message}${details}`;

  const consoleMethod = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  consoleMethod(line);

  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_FILE, `${line}\n`);
  } catch {
    // File logging is best-effort only; console output remains authoritative.
  }
}

export const logger = {
  info(message: string, meta?: unknown) {
    void writeLog('INFO', message, meta);
  },
  warn(message: string, meta?: unknown) {
    void writeLog('WARN', message, meta);
  },
  error(message: string, meta?: unknown) {
    void writeLog('ERROR', message, meta);
  },
};
