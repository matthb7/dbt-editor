export const ROOT_ID = '__root__';

const TEXT_EXTENSIONS = new Set([
  'csv',
  'jinja',
  'jinja2',
  'json',
  'log',
  'md',
  'py',
  'sql',
  'toml',
  'txt',
  'yaml',
  'yml',
]);

const IMAGE_EXTENSIONS = new Set([
  'avif',
  'gif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
]);

export function getExtension(path) {
  const parts = path.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export function getFileType(path) {
  const extension = getExtension(path);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return 'text';
  }

  return 'binary';
}

export function getLanguageLabel(path) {
  const extension = getExtension(path);

  if (extension === 'yml' || extension === 'yaml') {
    return 'YAML';
  }

  if (extension === 'sql') {
    return 'SQL';
  }

  if (extension === 'json') {
    return 'JSON';
  }

  if (extension === 'txt' || extension === 'md' || extension === 'log') {
    return 'Text';
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return extension.toUpperCase();
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return extension.toUpperCase();
  }

  return 'Binary';
}

export function formatSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function countDirtyFiles(filesByPath) {
  return Object.values(filesByPath).filter(
    (file) =>
      file.fileType === 'text' && file.content !== file.originalContent,
  ).length;
}

export async function hydrateFileEntry({ path, size = 0, readText, readBlob }) {
  const fileType = getFileType(path);

  if (fileType === 'text') {
    const content = await readText();
    return {
      path,
      size: size || new Blob([content]).size,
      fileType,
      content,
      originalContent: content,
    };
  }

  if (fileType === 'image') {
    const blob = await readBlob();
    return {
      path,
      size: size || blob.size,
      fileType,
      blobUrl: URL.createObjectURL(blob),
    };
  }

  return {
    path,
    size,
    fileType,
  };
}

export async function collectFiles(zip) {
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  return Promise.all(
    entries.map((entry) =>
      hydrateFileEntry({
        path: entry.name,
        size: entry._data?.uncompressedSize ?? 0,
        readText: () => entry.async('string'),
        readBlob: () => entry.async('blob'),
      }),
    ),
  );
}

export function revokeBlobUrls(filesByPath) {
  Object.values(filesByPath).forEach((file) => {
    if (file?.blobUrl) {
      URL.revokeObjectURL(file.blobUrl);
    }
  });
}
