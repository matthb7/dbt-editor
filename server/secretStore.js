import {
  FABRIC_SECRET_ENV_VAR,
  POSTGRES_SECRET_ENV_VAR,
  getConfigKey,
  isSecretRequired,
  normalizeConfig,
} from './setupManager.js';

const sessionSecrets = new Map();

export function rememberSessionSecret(config) {
  const normalized = normalizeConfig(config ?? {});
  const key = getConfigKey(normalized);
  const secrets = extractSecrets(normalized);

  if (Object.keys(secrets).length > 0) {
    sessionSecrets.set(key, secrets);
  }

  return hasSessionSecret(normalized);
}

export function hasSessionSecret(config) {
  if (!isSecretRequired(config)) {
    return true;
  }

  const secret = sessionSecrets.get(getConfigKey(normalizeConfig(config ?? {})));

  if (!secret) {
    return false;
  }

  if (secret[FABRIC_SECRET_ENV_VAR]) {
    return true;
  }

  return Boolean(secret[POSTGRES_SECRET_ENV_VAR]);
}

export function getRuntimeSecretEnv(config) {
  const normalized = normalizeConfig(config ?? {});

  if (!isSecretRequired(normalized)) {
    return {};
  }

  const secret = sessionSecrets.get(getConfigKey(normalized));

  if (!secret) {
    throw new Error(
      'A session secret is required. Re-open Configure adapter and re-enter the password or client secret.',
    );
  }

  return secret;
}

function extractSecrets(config) {
  if (config.adapterType === 'fabric') {
    return config.clientSecret?.trim()
      ? { [FABRIC_SECRET_ENV_VAR]: config.clientSecret.trim() }
      : {};
  }

  return config.password?.trim()
    ? { [POSTGRES_SECRET_ENV_VAR]: config.password.trim() }
    : {};
}
