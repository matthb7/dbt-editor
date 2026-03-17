import { useDispatch, useSelector } from 'react-redux';
import {
  closeSetupPanel,
  loadSavedSetupConfig,
  loadSavedSetupTarget,
  loadSetupStatus,
  saveAdapterSetup,
  testAdapterSetup,
  updateSetupField,
} from '../store/adapterSetupSlice';

function StatusPill({ label, ok }) {
  return <span className={`status-pill ${ok ? 'ok' : 'warn'}`}>{label}</span>;
}

function getConfigOptionValue(config) {
  return `${config.adapterType}::${config.profileName}`;
}

function getConfigOptionLabel(config) {
  return `${config.adapterType} / ${config.profileName}`;
}

export default function AdapterSetupPanel() {
  const dispatch = useDispatch();
  const {
    isOpen,
    isSaving,
    isTesting,
    saveMessage,
    saveStatus,
    status,
    testResult,
    testStatus,
    error,
    form,
  } = useSelector((state) => state.adapterSetup);

  if (!isOpen) {
    return null;
  }

  const adapterReady =
    form.adapterType === 'fabric'
      ? Boolean(status?.fabricReady)
      : Boolean(status?.postgresReady);
  const usingFabricCli =
    form.adapterType === 'fabric' && form.authentication === 'cli';
  const secretRequired =
    form.adapterType === 'postgres' || form.authentication === 'service-principal';
  const secretLoaded =
    !secretRequired ||
    (form.adapterType === 'postgres'
      ? Boolean(form.password)
      : Boolean(form.clientSecret) || Boolean(status?.sessionSecretLoaded));
  const savedConfigs = status?.savedConfigs || [];
  const selectedProfileConfig =
    savedConfigs.find(
      (config) =>
        config.adapterType === form.adapterType &&
        config.profileName === form.profileName,
    ) || null;
  const savedTargets = Object.keys(selectedProfileConfig?.targets || {});
  const selectedConfigValue =
    selectedProfileConfig ? `${form.adapterType}::${form.profileName}` : '';
  const selectedTargetValue = savedTargets.includes(form.targetName)
    ? form.targetName
    : '';

  return (
    <div className="setup-overlay" onClick={() => dispatch(closeSetupPanel())}>
      <section
        className="setup-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="setup-header">
          <div>
            <p className="section-label">Adapter Setup</p>
            <h3>Configure dbt connection</h3>
          </div>
          <button
            type="button"
            className="panel-toggle"
            onClick={() => dispatch(closeSetupPanel())}
            aria-label="Close adapter setup"
          >
            ×
          </button>
        </div>

        <div className="setup-status-row">
          <StatusPill label={status?.dbtInstalled ? 'dbt installed' : 'dbt missing'} ok={status?.dbtInstalled} />
          <StatusPill label={adapterReady ? 'adapter ready' : 'adapter missing'} ok={adapterReady} />
          <StatusPill label={status?.profileExists ? 'profile saved' : 'profile not saved'} ok={status?.profileExists} />
          {usingFabricCli ? (
            <StatusPill
              label={
                status?.azureCliLoggedIn ? 'azure cli logged in' : 'azure cli login needed'
              }
              ok={status?.azureCliInstalled && status?.azureCliLoggedIn}
            />
          ) : null}
          {secretRequired ? (
            <StatusPill label={secretLoaded ? 'secret loaded' : 'secret needed'} ok={secretLoaded} />
          ) : null}
        </div>

        <div className="setup-grid">
          {savedConfigs.length > 0 ? (
            <label className="field-group setup-span-2">
              <span>Saved adapter config</span>
              <select
                className="terminal-input"
                value={selectedConfigValue}
                onChange={(event) =>
                  dispatch(loadSavedSetupConfig(event.target.value))
                }
              >
                <option value="">New or unsaved config</option>
                {savedConfigs.map((config) => (
                  <option
                    key={getConfigOptionValue(config)}
                    value={getConfigOptionValue(config)}
                  >
                    {getConfigOptionLabel(config)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {selectedProfileConfig && savedTargets.length > 0 ? (
            <label className="field-group setup-span-2">
              <span>Saved target</span>
              <select
                className="terminal-input"
                value={selectedTargetValue}
                onChange={(event) =>
                  dispatch(loadSavedSetupTarget(event.target.value))
                }
              >
                <option value="">New target</option>
                {savedTargets.map((targetName) => (
                  <option key={targetName} value={targetName}>
                    {targetName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field-group">
            <span>Adapter</span>
            <select
              className="terminal-input"
              value={form.adapterType}
              onChange={(event) =>
                dispatch(
                  updateSetupField({
                    field: 'adapterType',
                    value: event.target.value,
                  }),
                )
              }
            >
              <option value="fabric">Fabric Warehouse</option>
              <option value="postgres">PostgreSQL</option>
            </select>
          </label>

          <label className="field-group">
            <span>Profile name</span>
            <input
              className="terminal-input"
              value={form.profileName}
              onChange={(event) =>
                dispatch(
                  updateSetupField({
                    field: 'profileName',
                    value: event.target.value,
                  }),
                )
              }
            />
          </label>

          <label className="field-group">
            <span>Target</span>
            <input
              className="terminal-input"
              value={form.targetName}
              onChange={(event) =>
                dispatch(
                  updateSetupField({
                    field: 'targetName',
                    value: event.target.value,
                  }),
                )
              }
            />
          </label>

          <label className="field-group setup-span-2">
            <span>Execution project path</span>
            <input
              className="terminal-input"
              placeholder="/absolute/path/to/project/root"
              value={form.projectPath}
              onChange={(event) =>
                dispatch(
                  updateSetupField({
                    field: 'projectPath',
                    value: event.target.value,
                  }),
                )
              }
            />
          </label>

          <label className="field-group">
            <span>Schema</span>
            <input
              className="terminal-input"
              value={form.schema}
              onChange={(event) =>
                dispatch(
                  updateSetupField({
                    field: 'schema',
                    value: event.target.value,
                  }),
                )
              }
            />
          </label>

          <label className="field-group">
            <span>Threads</span>
            <input
              className="terminal-input"
              type="number"
              min="1"
              value={form.threads}
              onChange={(event) =>
                dispatch(
                  updateSetupField({
                    field: 'threads',
                    value: event.target.value,
                  }),
                )
              }
            />
          </label>

          {form.adapterType === 'fabric' ? (
            <>
              <label className="field-group">
                <span>Authentication</span>
                <select
                  className="terminal-input"
                  value={form.authentication}
                  onChange={(event) =>
                    dispatch(
                      updateSetupField({
                        field: 'authentication',
                        value: event.target.value,
                      }),
                    )
                  }
                >
                  <option value="cli">Azure CLI</option>
                  <option value="service-principal">Service principal</option>
                </select>
              </label>

              <label className="field-group setup-span-2">
                <span>Host / SQL endpoint</span>
                <input
                  className="terminal-input"
                  value={form.server}
                  onChange={(event) =>
                    dispatch(
                      updateSetupField({
                        field: 'server',
                        value: event.target.value,
                      }),
                    )
                  }
                />
              </label>

              <label className="field-group">
                <span>Database</span>
                <input
                  className="terminal-input"
                  value={form.database}
                  onChange={(event) =>
                    dispatch(
                      updateSetupField({
                        field: 'database',
                        value: event.target.value,
                      }),
                    )
                  }
                />
              </label>

              <label className="field-group">
                <span>Driver</span>
                <input
                  className="terminal-input"
                  value={form.driver}
                  onChange={(event) =>
                    dispatch(
                      updateSetupField({
                        field: 'driver',
                        value: event.target.value,
                      }),
                    )
                  }
                />
              </label>

              {form.authentication === 'service-principal' ? (
                <>
                  <label className="field-group">
                    <span>Tenant ID</span>
                    <input
                      className="terminal-input"
                      value={form.tenantId}
                      onChange={(event) =>
                        dispatch(
                          updateSetupField({
                            field: 'tenantId',
                            value: event.target.value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label className="field-group">
                    <span>Client ID</span>
                    <input
                      className="terminal-input"
                      value={form.clientId}
                      onChange={(event) =>
                        dispatch(
                          updateSetupField({
                            field: 'clientId',
                            value: event.target.value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label className="field-group setup-span-2">
                    <span>Client secret</span>
                    <input
                      className="terminal-input"
                      type="password"
                      value={form.clientSecret}
                      onChange={(event) =>
                        dispatch(
                          updateSetupField({
                            field: 'clientSecret',
                            value: event.target.value,
                          }),
                        )
                      }
                    />
                    <small className="field-hint">
                      Session only. Not saved to disk. Used through an env var
                      placeholder in the generated profile.
                    </small>
                  </label>
                </>
              ) : null}
            </>
          ) : (
            <>
              <label className="field-group">
                <span>Host</span>
                <input
                  className="terminal-input"
                  value={form.host}
                  onChange={(event) =>
                    dispatch(
                      updateSetupField({
                        field: 'host',
                        value: event.target.value,
                      }),
                    )
                  }
                />
              </label>

              <label className="field-group">
                <span>Port</span>
                <input
                  className="terminal-input"
                  value={form.port}
                  onChange={(event) =>
                    dispatch(
                      updateSetupField({
                        field: 'port',
                        value: event.target.value,
                      }),
                    )
                  }
                />
              </label>

              <label className="field-group">
                <span>Database</span>
                <input
                  className="terminal-input"
                  value={form.database}
                  onChange={(event) =>
                    dispatch(
                      updateSetupField({
                        field: 'database',
                        value: event.target.value,
                      }),
                    )
                  }
                />
              </label>

              <label className="field-group">
                <span>User</span>
                <input
                  className="terminal-input"
                  value={form.user}
                  onChange={(event) =>
                    dispatch(
                      updateSetupField({
                        field: 'user',
                        value: event.target.value,
                      }),
                    )
                  }
                />
              </label>

              <label className="field-group setup-span-2">
                <span>Password</span>
                <input
                  className="terminal-input"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    dispatch(
                      updateSetupField({
                        field: 'password',
                        value: event.target.value,
                      }),
                    )
                  }
                />
                <small className="field-hint">
                  Session only. Not saved to disk. Used through an env var
                  placeholder in the generated profile.
                </small>
              </label>
            </>
          )}
        </div>

        <p className="setup-help">
          The app writes an app-managed <code>profiles.yml</code> with env var
          placeholders and uses it for terminal commands. Passwords and client
          secrets stay in memory for the current app session only.
        </p>

        {usingFabricCli ? (
          <div className={`setup-feedback ${status?.azureCliLoggedIn ? 'success' : 'warning'}`}>
            <strong>
              {status?.azureCliLoggedIn
                ? 'Azure CLI login detected'
                : status?.azureCliInstalled
                  ? 'Azure CLI login required'
                  : 'Azure CLI not installed'}
            </strong>
            <span>
              {status?.azureCliLoggedIn
                ? status?.azureCliAccountLabel || 'Fabric CLI auth is ready on this machine.'
                : status?.azureCliInstalled
                  ? 'Run `az login` in your normal terminal, then click Refresh status here.'
                  : 'Install Azure CLI on this machine before using Fabric CLI auth.'}
            </span>
          </div>
        ) : null}

        {saveStatus !== 'idle' ? (
          <div className={`setup-feedback ${saveStatus}`}>
            <strong>
              {saveStatus === 'running'
                ? 'Saving setup...'
                : saveStatus === 'success'
                  ? 'Setup saved'
                  : 'Save failed'}
            </strong>
            <span>
              {saveStatus === 'running'
                ? 'Writing the adapter config and generated profile to disk.'
                : saveMessage}
            </span>
          </div>
        ) : null}

        {testStatus !== 'idle' ? (
          <div className={`setup-feedback ${testStatus}`}>
            <strong>
              {testStatus === 'running'
                ? 'Testing connection...'
                : testStatus === 'success'
                  ? 'Connection test passed'
                  : testStatus === 'warning'
                    ? 'Connection test returned warnings'
                    : 'Connection test failed'}
            </strong>
            <span>
              {testStatus === 'success'
                ? 'dbt debug completed successfully with the current settings.'
                : testStatus === 'warning'
                  ? 'dbt debug completed but emitted warnings or non-fatal output.'
                  : testStatus === 'running'
                    ? 'Waiting for dbt debug to complete.'
                    : 'Review the output below and correct the config before saving.'}
            </span>
          </div>
        ) : null}

        {error ? <p className="terminal-note error-text">{error}</p> : null}
        {testResult ? (
          <pre className="setup-output">
            {[testResult.stdout, testResult.stderr].filter(Boolean).join('\n') || 'No output'}
          </pre>
        ) : null}

        <div className="setup-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => dispatch(loadSetupStatus())}
          >
            Refresh status
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => dispatch(closeSetupPanel())}
          >
            Close
          </button>
          <button
            type="button"
            className="secondary-button button-reset"
            onClick={() => dispatch(testAdapterSetup())}
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test connection'}
          </button>
          <button
            type="button"
            className="import-button"
            onClick={() => dispatch(saveAdapterSetup())}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save setup'}
          </button>
        </div>
      </section>
    </div>
  );
}
