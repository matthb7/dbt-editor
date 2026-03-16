import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { hasSessionSecret } from './secretStore.js';
import { getSavedAdapterConfig, getSavedAdapterConfigs } from './setupManager.js';
import { resolveDbtExecutable, runDbtProcess } from './dbtCli.js';
import { isSecretRequired } from './setupManager.js';

export async function getAdapterStatus() {
  const savedConfig = await getSavedAdapterConfig();
  const savedConfigs = await getSavedAdapterConfigs();
  const dbtExecutable = resolveDbtExecutable();
  const dbtInstalled = existsSync(dbtExecutable) || dbtExecutable === 'dbt';
  const azureCliStatus = await getAzureCliStatus();

  let versionOutput = '';
  let dbtVersion = '';
  let installedAdapters = [];

  try {
    const result = await runDbtProcess({
      args: ['--version'],
      cwd: process.cwd(),
    });
    versionOutput = `${result.stdout}\n${result.stderr}`.trim();
    dbtVersion = parseDbtVersion(versionOutput);
    installedAdapters = parseInstalledAdapters(versionOutput);
  } catch {
    versionOutput = '';
  }

  return {
    dbtInstalled,
    dbtExecutable,
    dbtVersion,
    versionOutput,
    installedAdapters,
    savedConfig,
    savedConfigs,
    profileExists: Boolean(savedConfig?.profilePath && existsSync(savedConfig.profilePath)),
    fabricReady: installedAdapters.includes('fabric'),
    postgresReady: installedAdapters.includes('postgres'),
    secretRequired: isSecretRequired(savedConfig),
    sessionSecretLoaded: hasSessionSecret(savedConfig),
    azureCliInstalled: azureCliStatus.installed,
    azureCliLoggedIn: azureCliStatus.loggedIn,
    azureCliAccountLabel: azureCliStatus.accountLabel,
    azureCliError: azureCliStatus.error,
  };
}

function parseDbtVersion(output) {
  const match = output.match(/installed:\s*([0-9.]+)/i);
  return match ? match[1] : '';
}

function parseInstalledAdapters(output) {
  const adapters = [];

  if (/fabric:/i.test(output)) {
    adapters.push('fabric');
  }

  if (/postgres:/i.test(output)) {
    adapters.push('postgres');
  }

  return adapters;
}

async function getAzureCliStatus() {
  const executable = resolveAzureCliExecutable();

  if (!executable) {
    return {
      installed: false,
      loggedIn: false,
      accountLabel: '',
      error: 'Azure CLI not found.',
    };
  }

  try {
    const result = await runProcess(executable, [
      'account',
      'show',
      '--output',
      'json',
    ]);

    if (result.exitCode !== 0) {
      return {
        installed: true,
        loggedIn: false,
        accountLabel: '',
        error: result.stderr || result.stdout || 'Azure CLI login required.',
      };
    }

    const payload = JSON.parse(result.stdout || '{}');
    const accountLabel = [payload.name, payload.user?.name].filter(Boolean).join(' / ');

    return {
      installed: true,
      loggedIn: true,
      accountLabel,
      error: '',
    };
  } catch (error) {
    return {
      installed: error?.code === 'ENOENT' ? false : true,
      loggedIn: false,
      accountLabel: '',
      error:
        error?.code === 'ENOENT'
          ? 'Azure CLI not found.'
          : error instanceof Error
            ? error.message
            : 'Azure CLI login required.',
    };
  }
}

function resolveAzureCliExecutable() {
  const homebrewPath = path.join('/opt', 'homebrew', 'bin', 'az');
  const intelBrewPath = path.join('/usr', 'local', 'bin', 'az');
  const home = os.homedir();
  const userInstallPath = path.join(home, '.azure-cli', 'bin', 'az');

  if (existsSync(homebrewPath)) {
    return homebrewPath;
  }

  if (existsSync(intelBrewPath)) {
    return intelBrewPath;
  }

  if (existsSync(userInstallPath)) {
    return userInstallPath;
  }

  return 'az';
}

function runProcess(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: process.cwd(),
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
      reject(error);
    });

    child.on('close', (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
      });
    });
  });
}
