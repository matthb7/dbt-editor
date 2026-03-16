import { useDispatch, useSelector } from 'react-redux';
import {
  clearTerminalEntries,
  runTerminalCommand,
  setDraftCommand,
} from '../store/terminalSlice';

function TerminalEntry({ entry }) {
  const statusLabel =
    entry.status === 'running'
      ? 'Running'
      : entry.status === 'success'
        ? `Exit ${entry.exitCode}`
        : `Failed ${entry.exitCode ?? ''}`.trim();

  return (
    <article className={`terminal-entry ${entry.status}`}>
      <div className="terminal-entry-header">
        <code>{entry.commandText}</code>
        <span>{statusLabel}</span>
      </div>
      <p className="terminal-cwd">{entry.cwd || 'Using app directory'}</p>
      <pre className="terminal-output">
        {[entry.stdout, entry.stderr].filter(Boolean).join('\n') || 'No output yet.'}
      </pre>
    </article>
  );
}

export default function TerminalPanel() {
  const dispatch = useDispatch();
  const { draftCommand, isRunning, entries } =
    useSelector((state) => state.terminal);
  const { detectedProjectRoot, projectSource } = useSelector(
    (state) => state.project,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    await dispatch(runTerminalCommand());
  };

  return (
    <section className="terminal-panel">
      <div className="panel-header terminal-header">
        <div>
          <p className="section-label">dbt Terminal</p>
          <h3>Run local dbt commands</h3>
        </div>
        <div className="editor-badges">
          <span className="badge">{isRunning ? 'Running' : 'Idle'}</span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => dispatch(clearTerminalEntries())}
            disabled={entries.length === 0}
          >
            Clear log
          </button>
        </div>
      </div>

      <form className="terminal-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <span>Detected dbt root</span>
          <div className="terminal-detected-root">
            <code>
              {detectedProjectRoot === null ? '(none detected)' : detectedProjectRoot || '.'}
            </code>
          </div>
        </div>

        <label className="field-group">
          <span>Prompt</span>
          <div className="terminal-shell">
            <div className="terminal-prompt-row">
              <span className="terminal-prompt" aria-hidden="true">
                $
              </span>
              <input
                className="terminal-command-input"
                type="text"
                value={draftCommand}
                onChange={(event) => dispatch(setDraftCommand(event.target.value))}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <button
                className="import-button run-button"
                type="submit"
                disabled={isRunning}
              >
                {isRunning ? 'Running...' : 'Run'}
              </button>
            </div>
          </div>
        </label>

        <p className="terminal-note">
          Real command runner, limited command surface. `dbt --version`, `run`,
          `seed`, `test`, `snapshot`, `build`, and `compile` are enabled.
        </p>
        {projectSource === 'workspace' && detectedProjectRoot === null ? (
          <p className="terminal-note error-text">
            No `dbt_project.yml` was detected in this workspace yet.
          </p>
        ) : null}
      </form>

      <div className="terminal-log">
        {entries.length > 0 ? (
          entries.map((entry) => <TerminalEntry key={entry.id} entry={entry} />)
        ) : (
          <div className="editor-empty terminal-empty">
            <p>No terminal output yet.</p>
            <span>Type a dbt command and run it against the detected project root.</span>
          </div>
        )}
      </div>
    </section>
  );
}
