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
  return hydrateConfigForUse(getActiveConfigFromStore(store));
}

export async function getSavedAdapterConfigs() {
  const store = await getConfigStore();
  return Object.values(store.configs).map((config) => hydrateConfigForUse(config));
}

export async function saveAdapterConfig(config) {
  const store = await getConfigStore();
  const configKey = getConfigKey(config);
  const existingConfig = store.configs[configKey] || null;
  const prepared = await createPreparedAdapterConfig(config, existingConfig);
  const nextStore = {
    version: 2,
    activeConfigKey: configKey,
    configs: {
      ...store.configs,
      [configKey]: prepared,
    },
  };

  await writeFile(CONFIG_PATH, JSON.stringify(nextStore, null, 2), 'utf8');
  return hydrateConfigForUse(prepared);
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

export async function prepareAdapterConfig(config, existingConfig = null) {
  const prepared = await createPreparedAdapterConfig(config, existingConfig);
  return hydrateConfigForUse(prepared);
}

async function createPreparedAdapterConfig(config, existingConfig = null) {
  const normalized = normalizeConfig(config);
  const existingTargets = normalizeTargets(existingConfig);
  const nextTargets = {
    ...existingTargets,
    [normalized.targetName]: {
      schema: normalized.schema,
    },
  };
  const persisted = stripSecrets({
    ...normalized,
    activeTargetName: normalized.targetName,
    targets: nextTargets,
  });
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
  const targets = normalizeTargets(config);
  const activeTargetName = getActiveTargetName(config, targets);

  return [
    `${config.profileName}:`,
    `  target: ${activeTargetName}`,
    `  outputs:`,
    ...Object.entries(targets).flatMap(([targetName, targetConfig]) => [
      `    ${targetName}:`,
      ...buildOutputConfigLines(config, targetConfig).map((line) => `      ${line}`),
    ]),
    '',
  ].join('\n');
}

export function normalizeConfig(input) {
  const derivedTargetName =
    input.targetName?.trim() ||
    input.activeTargetName?.trim() ||
    Object.keys(normalizeTargets(input))[0] ||
    'dev';
  const derivedSchema =
    input.schema?.trim() ||
    normalizeTargets(input)[derivedTargetName]?.schema ||
    (input.adapterType === 'postgres' ? 'public' : '');
  const base = {
    adapterType: input.adapterType,
    profileName: input.profileName?.trim() || 'default',
    targetName: derivedTargetName,
    projectPath: input.projectPath?.trim() || '',
    threads: Number(input.threads) > 0 ? Number(input.threads) : 4,
    schema: derivedSchema,
  };

  if (base.adapterType === 'fabric') {
    return {
      ...base,
      authentication: input.authentication || 'cli',
      driver: input.driver?.trim() || 'ODBC Driver 18 for SQL Server',
      server: input.server?.trim() || '',
      database: input.database?.trim() || '',
      tenantId: input.tenantId?.trim() || '',
      clientId: input.clientId?.trim() || '',
      clientSecret: input.clientSecret?.trim() || '',
      targets: normalizeTargets(input, derivedSchema),
      activeTargetName: derivedTargetName,
    };
  }

  return {
    ...base,
    host: input.host?.trim() || '',
    port: input.port?.trim() || '5432',
    database: input.database?.trim() || '',
    user: input.user?.trim() || '',
    password: input.password?.trim() || '',
    targets: normalizeTargets(input, derivedSchema),
    activeTargetName: derivedTargetName,
  };
}

export function stripSecrets(config) {
  if (config.adapterType === 'fabric') {
    const { clientSecret: _clientSecret, targetName: _targetName, schema: _schema, ...rest } =
      config;
    return rest;
  }

  const { password: _password, targetName: _targetName, schema: _schema, ...rest } = config;
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
      needsRewrite: Object.values(parsed.configs).some(
        (config) => hasEmbeddedSecret(config) || !config.targets,
      ),
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

function buildOutputConfigLines(config, targetConfig) {
  if (config.adapterType === 'fabric') {
    return buildFabricOutput(config, targetConfig);
  }

  return buildPostgresOutput(config, targetConfig);
}

function buildFabricOutput(config, targetConfig) {
  const lines = [
    `type: fabric`,
    `driver: "${config.driver}"`,
    `host: "${config.server}"`,
    `database: "${config.database}"`,
    `schema: "${targetConfig.schema}"`,
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

function buildPostgresOutput(config, targetConfig) {
  return [
    `type: postgres`,
    `host: "${config.host}"`,
    `port: ${config.port}`,
    `user: "${config.user}"`,
    `password: "{{ env_var('${POSTGRES_SECRET_ENV_VAR}') }}"`,
    `dbname: "${config.database}"`,
    `schema: "${targetConfig.schema}"`,
    `threads: ${config.threads}`,
  ];
}

function getActiveTargetName(config, targets) {
  if (config?.activeTargetName && targets[config.activeTargetName]) {
    return config.activeTargetName;
  }

  return Object.keys(targets)[0] || 'dev';
}

function normalizeTargets(config, fallbackSchema = '') {
  if (config?.targets && Object.keys(config.targets).length > 0) {
    return Object.fromEntries(
      Object.entries(config.targets).map(([targetName, targetConfig]) => [
        targetName,
        {
          schema:
            targetConfig?.schema?.trim?.() ||
            targetConfig?.schema ||
            fallbackSchema ||
            (config.adapterType === 'postgres' ? 'public' : ''),
        },
      ]),
    );
  }

  const targetName = config?.targetName?.trim?.() || config?.activeTargetName || 'dev';
  const schema =
    config?.schema?.trim?.() ||
    config?.schema ||
    fallbackSchema ||
    (config?.adapterType === 'postgres' ? 'public' : '');

  return {
    [targetName]: {
      schema,
    },
  };
}

function hydrateConfigForUse(config) {
  if (!config) {
    return null;
  }

  const targets = normalizeTargets(config);
  const activeTargetName = getActiveTargetName(config, targets);
  const activeTarget = targets[activeTargetName] || { schema: '' };

  return {
    ...config,
    targetName: activeTargetName,
    schema: activeTarget.schema,
    targets,
    activeTargetName,
  };
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
  const normalized = normalizeConfig(config);
  const sanitizedBase = stripSecrets(normalized);
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
