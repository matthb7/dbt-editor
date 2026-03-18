import MonacoEditor from '@monaco-editor/react';

const ANSI_ESCAPE_PATTERN = /\u001b\[[0-9;]*m/g;

function isLogFile(path) {
  return path.endsWith('dbt.log') || path.split('.').pop()?.toLowerCase() === 'log';
}

function stripAnsiSequences(content) {
  return content.replace(ANSI_ESCAPE_PATTERN, '');
}

function getEditorLanguage(path) {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';

  if (isLogFile(path)) {
    return 'dbt-log';
  }

  if (extension === 'yaml' || extension === 'yml') {
    return 'yaml';
  }

  if (extension === 'json') {
    return 'json';
  }

  if (extension === 'md') {
    return 'markdown';
  }

  if (extension === 'py') {
    return 'python';
  }

  if (extension === 'sql' || extension === 'jinja' || extension === 'jinja2') {
    return 'dbt-sql';
  }

  return 'plaintext';
}

function configureMonaco(monaco) {
  monaco.languages.register({ id: 'dbt-sql' });
  monaco.languages.setMonarchTokensProvider('dbt-sql', {
    ignoreCase: true,
    defaultToken: '',
    keywords: [
      'select', 'from', 'where', 'group', 'by', 'order', 'having', 'limit',
      'join', 'left', 'right', 'inner', 'outer', 'full', 'cross', 'on',
      'and', 'or', 'not', 'as', 'with', 'union', 'all', 'case', 'when',
      'then', 'else', 'end', 'distinct', 'over', 'partition', 'create',
      'replace', 'view', 'table', 'insert', 'into', 'update', 'delete',
      'values', 'null', 'is', 'in', 'exists', 'between', 'like', 'cast',
      'coalesce', 'sum', 'count', 'avg', 'min', 'max',
    ],
    operators: [
      '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '<>', '+',
      '-', '*', '/', '%',
    ],
    tokenizer: {
      root: [
        [/\{#/, { token: 'jinja.comment', next: '@jinjaComment' }],
        [/\{\{/, { token: 'jinja.expression', next: '@jinjaExpression' }],
        [/\{%/, { token: 'jinja.statement', next: '@jinjaStatement' }],
        [/--.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [/'/, { token: 'string', next: '@stringSingle' }],
        [/"/, { token: 'string', next: '@stringDouble' }],
        [/\b\d+(\.\d+)?\b/, 'number'],
        [/[;,.()]/, 'delimiter'],
        [/[+\-*/%=<>!]+/, 'operator'],
        [/[a-zA-Z_][\w$]*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier',
          },
        }],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/./, 'comment'],
      ],
      stringSingle: [
        [/[^']+/, 'string'],
        [/''/, 'string.escape'],
        [/'/, { token: 'string', next: '@pop' }],
      ],
      stringDouble: [
        [/[^"]+/, 'string'],
        [/""/, 'string.escape'],
        [/"/, { token: 'string', next: '@pop' }],
      ],
      jinjaComment: [
        [/.*?#\}/, { token: 'jinja.comment', next: '@pop' }],
        [/./, 'jinja.comment'],
      ],
      jinjaExpression: [
        [/\}\}/, { token: 'jinja.expression', next: '@pop' }],
        [/".*?"/, 'jinja.expression'],
        [/'.*?'/, 'jinja.expression'],
        [/[a-zA-Z_][\w.]*/, 'jinja.expression'],
        [/[|()[\],.=:+\-/*]+/, 'jinja.operator'],
        [/\s+/, 'white'],
      ],
      jinjaStatement: [
        [/%\}/, { token: 'jinja.statement', next: '@pop' }],
        [/\b(if|else|elif|for|in|set|macro|endmacro|endif|endfor|do|call|filter|endfilter)\b/, 'jinja.keyword'],
        [/".*?"/, 'jinja.statement'],
        [/'.*?'/, 'jinja.statement'],
        [/[a-zA-Z_][\w.]*/, 'jinja.statement'],
        [/[|()[\],.=:+\-/*]+/, 'jinja.operator'],
        [/\s+/, 'white'],
      ],
    },
  });

  monaco.languages.register({ id: 'dbt-log' });
  monaco.languages.setMonarchTokensProvider('dbt-log', {
    tokenizer: {
      root: [
        [/\u001b\[[0-9;]*m/, 'log.ansi'],
        [/\b\d{2}:\d{2}:\d{2}\b/, 'log.timestamp'],
        [/\b(ERROR|FAIL|FAILED)\b/, 'log.error'],
        [/\b(WARN|WARNING|SKIP|SKIPPED)\b/, 'log.warning'],
        [/\b(INFO|OK|PASS|SUCCESS)\b/, 'log.info'],
        [/\b(DEBUG|TRACE)\b/, 'log.debug'],
        [/^.*Database Error.*$/, 'log.error'],
        [/^.*Compilation Error.*$/, 'log.error'],
        [/^.*Runtime Error.*$/, 'log.error'],
      ],
    },
  });

  monaco.editor.defineTheme('dbt-editor-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ff9a76' },
      { token: 'string', foreground: 'b8f7d4' },
      { token: 'number', foreground: 'ffd27d' },
      { token: 'comment', foreground: '6f7b91', fontStyle: 'italic' },
      { token: 'operator', foreground: '94a3b8' },
      { token: 'jinja.comment', foreground: '7d8797', fontStyle: 'italic' },
      { token: 'jinja.expression', foreground: 'f6c177' },
      { token: 'jinja.statement', foreground: 'c4a7e7' },
      { token: 'jinja.keyword', foreground: 'ff9a76' },
      { token: 'jinja.operator', foreground: '94a3b8' },
      { token: 'log.timestamp', foreground: '73c9ff' },
      { token: 'log.error', foreground: 'ff8f8f', fontStyle: 'bold' },
      { token: 'log.warning', foreground: 'ffd27d', fontStyle: 'bold' },
      { token: 'log.info', foreground: '9ae6b4' },
      { token: 'log.debug', foreground: 'c4b5fd' },
      { token: 'log.ansi', foreground: '6f7b91' },
    ],
    colors: {
      'editor.background': '#0e131b',
      'editor.foreground': '#e6edf8',
      'editorLineNumber.foreground': '#55657d',
      'editorLineNumber.activeForeground': '#f4a261',
      'editorCursor.foreground': '#f4a261',
      'editor.selectionBackground': '#24405f88',
      'editor.inactiveSelectionBackground': '#21364f55',
      'editor.lineHighlightBackground': '#ffffff08',
      'editorIndentGuide.background1': '#ffffff10',
      'editorIndentGuide.activeBackground1': '#ffffff1e',
      'editorWhitespace.foreground': '#ffffff14',
      'editorGutter.background': '#0e131b',
    },
  });
}

export default function EditorPanel({ file, onContentChange }) {
  if (!file) {
    return (
      <div className="editor-empty">
        <p>Select a file from the explorer.</p>
        <span>SQL and YAML files open in an editable text surface. Images get a preview.</span>
      </div>
    );
  }

  if (file.fileType === 'image') {
    return (
      <div className="editor-preview">
        <img className="image-preview" src={file.blobUrl} alt={file.path} />
      </div>
    );
  }

  if (file.fileType === 'binary') {
    return (
      <div className="editor-empty">
        <p>Binary preview not supported yet.</p>
        <span>This file is imported and listed, but the first editor version only handles text and images.</span>
      </div>
    );
  }

  const isLog = isLogFile(file.path);
  const editorValue = isLog ? stripAnsiSequences(file.content) : file.content;

  return (
    <div className="monaco-shell">
      <MonacoEditor
        path={file.path}
        language={getEditorLanguage(file.path)}
        theme="dbt-editor-theme"
        value={editorValue}
        beforeMount={configureMonaco}
        // TODO: Move live editor content out of Redux and save from Monaco models
        // via monaco.editor.getModel(...).getValue() so typing does not dispatch globally.
        onChange={(nextValue) => {
          if (isLog) {
            return;
          }

          onContentChange(nextValue ?? '');
        }}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 14,
          lineHeight: 26,
          padding: {
            top: 18,
            bottom: 18,
          },
          fontFamily: '"IBM Plex Mono", "SFMono-Regular", monospace',
          tabSize: 2,
          insertSpaces: true,
          renderLineHighlight: 'all',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          bracketPairColorization: { enabled: true },
          readOnly: isLog,
        }}
      />
    </div>
  );
}
