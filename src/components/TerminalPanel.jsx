import { useDispatch, useSelector } from 'react-redux';
import {
  clearTerminalEntries,
  runTerminalCommand,
  setDraftCommand,
  setProjectPath,
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
  const { projectPath, draftCommand, isRunning, entries, examples } =
    useSelector((state) => state.terminal);

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
        <label className="field-group">
          <span>dbt project path</span>
          <input
            className="terminal-input"
            type="text"
            placeholder="/absolute/path/to/dbt-project"
            value={projectPath}
            onChange={(event) => dispatch(setProjectPath(event.target.value))}
          />
        </label>

        <label className="field-group">
          <span>Command</span>
          <div className="command-row">
            <input
              className="terminal-input command-input"
              type="text"
              value={draftCommand}
              onChange={(event) => dispatch(setDraftCommand(event.target.value))}
            />
            <button className="import-button run-button" type="submit" disabled={isRunning}>
              {isRunning ? 'Running...' : 'Run'}
            </button>
          </div>
        </label>

        <div className="command-examples">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              className="example-chip"
              onClick={() => dispatch(setDraftCommand(example))}
            >
              {example}
            </button>
          ))}
        </div>

        <p className="terminal-note">
          Only `dbt run`, `seed`, `test`, `snapshot`, `build`, and `compile`
          are enabled here. This terminal expects a local dbt CLI install on the
          same machine.
        </p>
      </form>

      <div className="terminal-log">
        {entries.length > 0 ? (
          entries.map((entry) => <TerminalEntry key={entry.id} entry={entry} />)
        ) : (
          <div className="editor-empty terminal-empty">
            <p>No commands run yet.</p>
            <span>Use the prompt above to execute a dbt command against a local project path.</span>
          </div>
        )}
      </div>
    </section>
  );
}
