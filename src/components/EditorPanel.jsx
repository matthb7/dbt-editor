import Editor from 'react-simple-code-editor';
import { highlightContent } from '../lib/highlight';

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

  return (
    <Editor
      className="editor-textarea code-editor"
      textareaClassName="editor-input"
      preClassName="editor-highlight"
      value={file.content}
      onValueChange={onContentChange}
      highlight={(code) => highlightContent(code, file.path)}
      padding={0}
      spellCheck={false}
      insertSpaces
      tabSize={2}
    />
  );
}
