export async function executeTerminalCommand({ commandText, projectPath }) {
  const response = await fetch('/api/terminal/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      commandText,
      projectPath,
    }),
  });
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw Object.assign(
      new Error(
        payload?.stderr ||
          'Local backend unavailable. Start the local server to run dbt commands.',
      ),
      {
      payload,
      },
    );
  }

  if (!payload) {
    throw Object.assign(
      new Error(
        'Local backend unavailable. Vercel preview can load the UI, but dbt commands require the local server.',
      ),
      {
        payload: {
          ok: false,
          exitCode: 1,
          stdout: '',
          stderr:
            'Local backend unavailable. Vercel preview can load the UI, but dbt commands require the local server.',
          cwd: projectPath,
          commandText,
        },
      },
    );
  }

  return payload;
}
