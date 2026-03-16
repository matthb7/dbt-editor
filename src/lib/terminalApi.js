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

  const payload = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(payload.stderr || 'Command execution failed.'), {
      payload,
    });
  }

  return payload;
}
