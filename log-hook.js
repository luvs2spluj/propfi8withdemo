// log-hook.js - Captures all Node console.* and errors to logs/dev-server.log
import fs from 'fs';
import path from 'path';

const file = path.resolve('logs/dev-server.log');
fs.mkdirSync('logs', { recursive: true });

const write = (line) => {
  fs.appendFile(file, line + '\n', () => {});
};

// Capture console methods
['log', 'warn', 'error'].forEach(k => {
  const orig = console[k];
  console[k] = (...args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    write(`[${timestamp}] ${k.toUpperCase()} ${message}`);
    orig(...args);
  };
});

// Capture uncaught exceptions
process.on('uncaughtException', e => {
  console.error('uncaughtException', e);
});

// Capture unhandled rejections
process.on('unhandledRejection', e => {
  console.error('unhandledRejection', e);
});

console.log('Log hook installed - writing to logs/dev-server.log');
