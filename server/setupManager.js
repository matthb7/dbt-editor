import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const APP_SUPPORT_DIR = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'dbt-editor',
);
const CONFIG_PATH = path.join(APP_SUPPORT_DIR, 'adapter-config.json');
export const FABRIC_SECRET_ENV_VAR = 'DBT_FABRIC_CLIENT_SECRET';
export const POSTGRES_SECRET_ENV_VAR = 'DBT_POSTGRES_PASSWORD';

export async function getSavedAdapterConfig() {
  const store = await getConfigStore();
  return getActiveConfigFromStore(store);
}

export async function getSavedAdapterConfigs() {
  const store = await getConfigStore();
  return Object.values(store.configs);
}

export async function saveAdapterConfig(config) {
  const prepared = await prepareAdapterConfig(config);
  const store = await getConfigStore();
  const configKey = getConfigKey(prepared);
  const nextStore = {
    version: 2,
    activeConfigKey: configKey,
    configs: {
      ...store.configs,
      [configKey]: prepared,
    },
  };

  await writeFile(CONFIG_PATH, JSON.stringify(nextStore, null, 2), 'utf8');
  return prepared;
}

export async function getConfigStore() {
  if (!existsSync(CONFIG_PATH)) {
    return {
      version: 2,
      activeConfigKey: '',
      configs: {},
    };
  }

  const raw = await readFile(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const store = normalizeConfigStore(parsed);

  if (store.needsRewrite) {
    await writeFile(
      CONFIG_PATH,
      JSON.stringify(
        {
          version: 2,
          activeConfigKey: store.activeConfigKey,
          configs: store.configs,
        },
        null,
        2,
      ),
      'utf8',
    );
  }

  return {
    version: 2,
    activeConfigKey: store.activeConfigKey,
    configs: store.configs,
  };
}

function normalizeConfigStore(parsed) {
  if (parsed?.version === 2 && parsed?.configs) {
    const entries = Object.entries(parsed.configs).map(([key, value]) => [
      key,
      sanitizePersistedConfig(value),
    ]);
    const configs = Object.fromEntries(entries);
    const activeConfigKey =
      parsed.activeConfigKey && configs[parsed.activeConfigKey]
        ? parsed.activeConfigKey
        : Object.keys(configs)[0] || '';

    return {
      activeConfigKey,
      configs,
      needsRewrite: Object.values(parsed.configs).some(hasEmbeddedSecret),
    };
  }

  if (!parsed) {
    return {
      activeConfigKey: '',
      configs: {},
      needsRewrite: false,
    };
  }

  const sanitized = sanitizePersistedConfig(parsed);
  const configKey = getConfigKey(sanitized);

  return {
    activeConfigKey: configKey,
    configs: {
      [configKey]: sanitized,
    },
    needsRewrite: true,
  };
}

export async function prepareAdapterConfig(config) {
  const normalized = normalizeConfig(config);
  const persisted = stripSecrets(normalized);
  const profileDir = getProfileDir(persisted);
  const profilePath = path.join(profileDir, 'profiles.yml');

  await mkdir(profileDir, { recursive: true });
  await writeFile(profilePath, buildProfilesYml(persisted), 'utf8');

  return {
    ...persisted,
    profileDir,
    profilePath,
  };
}

export function getConfigKey(config) {
  const normalized = normalizeConfig(config);
  return [normalized.adapterType, normalized.profileName].join('::');
}

export function getProfileDir(config) {
  return path.join(APP_SUPPORT_DIR, 'profiles', sanitizePathSegment(config.profileName));
}

export function buildProfilesYml(config) {
  const outputConfig =
    config.adapterType === 'fabric'
      ? buildFabricOutput(config)
      : buildPostgresOutput(config);

  return [
    `${config.profileName}:`,
    `  target: ${config.targetName}`,
    `  outputs:`,
    `    ${config.targetName}:`,
    ...outputConfig.map((line) => `      ${line}`),
    '',
  ].join('\n');
}

export function normalizeConfig(input) {
  const base = {
    adapterType: input.adapterType,
    profileName: input.profileName?.trim() || 'default',
    targetName: input.targetName?.trim() || 'dev',
    projectPath: input.projectPath?.trim() || '',
    threads: Number(input.threads) > 0 ? Number(input.threads) : 4,
  };

  if (base.adapterType === 'fabric') {
    return {
      ...base,
      authentication: input.authentication || 'cli',
      driver: input.driver?.trim() || 'ODBC Driver 18 for SQL Server',
      server: input.server?.trim() || '',
      database: input.database?.trim() || '',
      schema: input.schema?.trim() || '',
      tenantId: input.tenantId?.trim() || '',
      clientId: input.clientId?.trim() || '',
      clientSecret: input.clientSecret?.trim() || '',
    };
  }

  return {
    ...base,
    host: input.host?.trim() || '',
    port: input.port?.trim() || '5432',
    database: input.database?.trim() || '',
    schema: input.schema?.trim() || 'public',
    user: input.user?.trim() || '',
    password: input.password?.trim() || '',
  };
}

export function stripSecrets(config) {
  if (config.adapterType === 'fabric') {
    const { clientSecret: _clientSecret, ...rest } = config;
    return rest;
  }

  const { password: _password, ...rest } = config;
  return rest;
}

export function isSecretRequired(config) {
  if (!config) {
    return false;
  }

  if (config.adapterType === 'fabric') {
    return config.authentication === 'service-principal';
  }

  return config.adapterType === 'postgres';
}

function buildFabricOutput(config) {
  const lines = [
    `type: fabric`,
    `driver: "${config.driver}"`,
    `host: "${config.server}"`,
    `database: "${config.database}"`,
    `schema: "${config.schema}"`,
    `threads: ${config.threads}`,
  ];

  if (config.authentication === 'service-principal') {
    lines.push(`authentication: ServicePrincipal`);
    lines.push(`tenant_id: "${config.tenantId}"`);
    lines.push(`client_id: "${config.clientId}"`);
    lines.push(`client_secret: "{{ env_var('${FABRIC_SECRET_ENV_VAR}') }}"`);
  } else {
    lines.push(`authentication: CLI`);
  }

  return lines;
}

function buildPostgresOutput(config) {
  return [
    `type: postgres`,
    `host: "${config.host}"`,
    `port: ${config.port}`,
    `user: "${config.user}"`,
    `password: "{{ env_var('${POSTGRES_SECRET_ENV_VAR}') }}"`,
    `dbname: "${config.database}"`,
    `schema: "${config.schema}"`,
    `threads: ${config.threads}`,
  ];
}

function sanitizePathSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function hasEmbeddedSecret(config) {
  return Boolean(config?.password || config?.clientSecret);
}

function getActiveConfigFromStore(store) {
  if (!store.activeConfigKey) {
    return null;
  }

  return store.configs[store.activeConfigKey] || null;
}

function sanitizePersistedConfig(config) {
  const sanitizedBase = stripSecrets(normalizeConfig(config));
  const profileDir = config.profileDir || getProfileDir(sanitizedBase);
  const profilePath = config.profilePath || path.join(profileDir, 'profiles.yml');
  const sanitized = {
    ...sanitizedBase,
    profileDir,
    profilePath,
  };

  void ensureProfileFile(sanitized);
  return sanitized;
}

async function ensureProfileFile(config) {
  await mkdir(config.profileDir, { recursive: true });
  await writeFile(config.profilePath, buildProfilesYml(config), 'utf8');
}
