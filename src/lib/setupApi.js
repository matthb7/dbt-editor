function buildBackendUnavailableStatus() {
  return {
    backendAvailable: false,
    dbtInstalled: false,
    fabricReady: false,
    postgresReady: false,
    profileExists: false,
    azureCliInstalled: false,
    azureCliLoggedIn: false,
    secretRequired: false,
    sessionSecretLoaded: false,
    savedConfigs: [],
    savedConfig: null,
  };
}

async function parseApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  if (!payload) {
    throw new Error(fallbackMessage);
  }

  return payload;
}

export async function fetchSetupStatus() {
  try {
    const response = await fetch('/api/setup/status');
    return await parseApiResponse(
      response,
      'Local backend unavailable. Vercel preview can load the UI, but dbt and adapter features require the local server.',
    );
  } catch {
    return buildBackendUnavailableStatus();
  }
}

export async function saveSetupConfig(config) {
  const response = await fetch('/api/setup/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  const payload = await parseApiResponse(
    response,
    'Local backend unavailable. Start the local server to save adapter setup.',
  );

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || 'Unable to save adapter setup.');
  }

  return payload;
}

export async function testSetupConfig(config) {
  const response = await fetch('/api/setup/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  const payload = await parseApiResponse(
    response,
    'Local backend unavailable. Start the local server to test dbt setup.',
  );

  if (!response.ok) {
    const error = new Error(payload.error || payload.stderr || 'dbt debug failed.');
    error.payload = payload;
    throw error;
  }

  return payload;
}
