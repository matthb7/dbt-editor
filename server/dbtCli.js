import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ALLOWED_SUBCOMMANDS = new Set([
  'build',
  'compile',
  'run',
  'seed',
  'snapshot',
  'test',
]);

export function parseCommand(commandText) {
  const tokens = [];
  let current = '';
  let quote = null;
  let escaping = false;

  for (const char of commandText.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaping || quote) {
    throw new Error('Command has an unfinished quote or escape sequence.');
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

export function validateCommand(commandText) {
  const tokens = parseCommand(commandText);

  if (tokens.length === 0) {
    throw new Error('Enter a dbt command to run.');
  }

  if (tokens[0] !== 'dbt') {
    throw new Error('Only dbt commands are allowed in this terminal.');
  }

  if (tokens.length === 1) {
    throw new Error('Add a dbt subcommand like run, seed, test, build, or compile.');
  }

  if (tokens[1] === '--version' || tokens[1] === '-V') {
    return {
      executable: resolveDbtExecutable(),
      args: tokens.slice(1),
    };
  }

  if (!ALLOWED_SUBCOMMANDS.has(tokens[1])) {
    throw new Error(
      `Unsupported dbt command "${tokens[1]}". Allowed commands: ${[
        ...ALLOWED_SUBCOMMANDS,
      ].join(', ')}.`,
    );
  }

  return {
    executable: resolveDbtExecutable(),
    args: tokens.slice(1),
  };
}

export async function runDbtCommand({ commandText, projectPath }) {
  const { executable, args } = validateCommand(commandText);
  const cwd = projectPath?.trim() || process.cwd();

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env: process.env,
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(
        new Error(
          error.code === 'ENOENT'
            ? 'dbt is not installed or not available on PATH.'
            : error.message,
        ),
      );
    });

    child.on('close', (exitCode) => {
      resolve({
        commandText,
        cwd,
        exitCode: exitCode ?? 1,
        ok: exitCode === 0,
        stdout,
        stderr,
      });
    });
  });
}

function resolveDbtExecutable() {
  const userInstallCandidates = getUserDbtCandidates();

  for (const candidate of userInstallCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return 'dbt';
}

function getUserDbtCandidates() {
  const home = os.homedir();
  const pythonRoot = path.join(home, 'Library', 'Python');

  if (!existsSync(pythonRoot)) {
    return [];
  }

  return readdirSync(pythonRoot)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
    .map((version) => path.join(pythonRoot, version, 'bin', 'dbt'));
}
