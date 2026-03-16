import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDbtCommand } from './dbtCli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 4174);

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.post('/api/terminal/execute', async (request, response) => {
  const commandText =
    typeof request.body?.commandText === 'string' ? request.body.commandText : '';
  const projectPath =
    typeof request.body?.projectPath === 'string' ? request.body.projectPath : '';

  try {
    const result = await runDbtCommand({ commandText, projectPath });
    response.status(result.ok ? 200 : 400).json(result);
  } catch (error) {
    response.status(400).json({
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown command error.',
      cwd: projectPath?.trim() || process.cwd(),
      commandText,
    });
  }
});

const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`dbt-editor server listening on http://127.0.0.1:${PORT}`);
});
