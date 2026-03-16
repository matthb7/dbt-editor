export async function fetchSetupStatus() {
  const response = await fetch('/api/setup/status');
  return response.json();
}

export async function saveSetupConfig(config) {
  const response = await fetch('/api/setup/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  const payload = await response.json();

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
  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload.error || payload.stderr || 'dbt debug failed.');
    error.payload = payload;
    throw error;
  }

  return payload;
}
