#!/usr/bin/env node

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

const directories = [
  { name: 'backend', path: join(rootDir, 'packages', 'backend') },
  { name: 'client', path: join(rootDir, 'packages', 'frontend') },
  { name: 'iso', path: join(rootDir, 'packages', 'iso') }
];

function colorize(text, color) {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  };
  return `${colors[color]}${text}${colors.reset}`;
}

function prefixLines(text, prefix) {
  return text.split('\n')
    .filter(line => line.trim() !== '')
    .map(line => `${prefix} ${line}`)
    .join('\n');
}

console.log(colorize('Starting TypeScript watch mode for all packages...', 'cyan'));

const processes = directories.map(({ name, path }, index) => {
  const colors = ['blue', 'green', 'magenta'];
  const color = colors[index % colors.length];
  const prefix = colorize(`[${name}]`, color);

  console.log(`${prefix} Starting tsc --watch in ${path}`);

  const process = spawn('npx', ['tsc', '--noEmit', '--watch'], {
    cwd: path,
    stdio: 'pipe'
  });

  process.stdout.on('data', (data) => {
    const output = prefixLines(data.toString(), prefix);
    if (output) console.log(output);
  });

  process.stderr.on('data', (data) => {
    const output = prefixLines(data.toString(), colorize(`[${name}]`, 'red'));
    if (output) console.error(output);
  });

  process.on('close', (code) => {
    console.log(`${prefix} Process exited with code ${code}`);
  });

  process.on('error', (err) => {
    console.error(`${colorize(`[${name}]`, 'red')} Failed to start: ${err.message}`);
  });

  return process;
});

// Handle cleanup on Ctrl+C
process.on('SIGINT', () => {
  console.log(colorize('\nShutting down TypeScript watchers...', 'yellow'));
  processes.forEach(proc => proc.kill('SIGINT'));
  process.exit(0);
});

// Keep the main process alive
process.stdin.resume();
