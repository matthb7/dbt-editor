import Prism from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup-templating';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function getLanguage(path) {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';

  if (extension === 'yaml' || extension === 'yml') {
    return 'yaml';
  }

  if (extension === 'json') {
    return 'json';
  }

  return 'sql';
}

function highlightJinjaSegment(segment) {
  if (segment.startsWith('{#')) {
    return `<span class="token jinja-comment">${escapeHtml(segment)}</span>`;
  }

  if (segment.startsWith('{{')) {
    return `<span class="token jinja-expression">${escapeHtml(segment)}</span>`;
  }

  return `<span class="token jinja-statement">${escapeHtml(segment)}</span>`;
}

export function highlightContent(code, path) {
  const language = getLanguage(path);

  if (language !== 'sql') {
    return Prism.highlight(code, Prism.languages[language], language);
  }

  const jinjaPattern = /(\{#[\s\S]*?#\}|\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\})/g;
  const segments = code.split(jinjaPattern);

  return segments
    .map((segment) => {
      if (!segment) {
        return '';
      }

      if (jinjaPattern.test(segment)) {
        jinjaPattern.lastIndex = 0;
        return highlightJinjaSegment(segment);
      }

      return Prism.highlight(segment, Prism.languages.sql, 'sql');
    })
    .join('');
}
