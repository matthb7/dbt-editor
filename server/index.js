import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDbtCommand, runDbtDebug } from './dbtCli.js';
import { getRuntimeSecretEnv, rememberSessionSecret } from './secretStore.js';
import {
  saveAdapterConfig,
  getSavedAdapterConfig,
  prepareAdapterConfig,
} from './setupManager.js';
import { getAdapterStatus } from './statusManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 4174);

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.get('/api/setup/status', async (_request, response) => {
  response.json(await getAdapterStatus());
});

app.post('/api/setup/save', async (request, response) => {
  try {
    rememberSessionSecret(request.body ?? {});
    const savedConfig = await saveAdapterConfig(request.body ?? {});
    response.json({
      ok: true,
      savedConfig,
      status: await getAdapterStatus(),
    });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to save adapter config.',
    });
  }
});

app.post('/api/setup/test', async (request, response) => {
  try {
    const hasBody = request.body && Object.keys(request.body).length > 0;
    const config = hasBody
      ? await prepareAdapterConfig(request.body)
      : await getSavedAdapterConfig();

    if (!config?.projectPath) {
      response.status(400).json({
        ok: false,
        error: 'A local project path is required to run dbt debug.',
      });
      return;
    }

    if (hasBody) {
      rememberSessionSecret(request.body);
    }

    const result = await runDbtDebug({
      projectPath: config.projectPath,
      profileDir: config.profileDir,
      profileName: config.profileName,
      targetName: config.targetName,
      env: getRuntimeSecretEnv(hasBody ? request.body : config),
    });

    response.status(result.ok ? 200 : 400).json(result);
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'dbt debug failed.',
    });
  }
});

app.post('/api/terminal/execute', async (request, response) => {
  const commandText =
    typeof request.body?.commandText === 'string' ? request.body.commandText : '';
  const projectPath =
    typeof request.body?.projectPath === 'string' ? request.body.projectPath : '';
  const trimmedCommand = commandText.trim();
  const isVersionCommand = trimmedCommand === 'dbt --version' || trimmedCommand === 'dbt -V';

  try {
    const savedConfig = await getSavedAdapterConfig();
    const shouldUseSavedProfile =
      !isVersionCommand && savedConfig?.profileDir && savedConfig?.projectPath;
    const runtimeEnv = shouldUseSavedProfile ? getRuntimeSecretEnv(savedConfig) : {};
    const result = await runDbtCommand({
      commandText:
        shouldUseSavedProfile
          ? `${commandText} --profiles-dir "${savedConfig.profileDir}" --profile "${savedConfig.profileName}" --target "${savedConfig.targetName}"`
          : commandText,
      projectPath: savedConfig?.projectPath || projectPath,
      env: runtimeEnv,
    });
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
