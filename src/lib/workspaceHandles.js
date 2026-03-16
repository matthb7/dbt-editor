let activeWorkspaceHandle = null;
const DB_NAME = 'dbt-editor';
const STORE_NAME = 'workspace-handles';
const ACTIVE_WORKSPACE_KEY = 'active-workspace';

export function setActiveWorkspaceHandle(handle) {
  activeWorkspaceHandle = handle;
}

export function getActiveWorkspaceHandle() {
  return activeWorkspaceHandle;
}

export function clearActiveWorkspaceHandle() {
  activeWorkspaceHandle = null;
}

export async function pickWorkspaceHandle() {
  if (
    typeof window === 'undefined' ||
    typeof window.showDirectoryPicker !== 'function'
  ) {
    throw new Error('This browser does not support local folder access.');
  }

  const handle = await window.showDirectoryPicker();
  setActiveWorkspaceHandle(handle);
  await persistWorkspaceHandle(handle);
  return handle;
}

export async function restoreWorkspaceHandle() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null;
  }

  const handle = await readPersistedWorkspaceHandle();

  if (!handle) {
    return null;
  }

  const permission =
    (await handle.queryPermission?.({ mode: 'read' })) ||
    (await handle.requestPermission?.({ mode: 'read' }));

  if (permission !== 'granted') {
    return null;
  }

  setActiveWorkspaceHandle(handle);
  return handle;
}

export async function clearPersistedWorkspaceHandle() {
  clearActiveWorkspaceHandle();

  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return;
  }

  const db = await openWorkspaceDb();

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).delete(ACTIVE_WORKSPACE_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function persistWorkspaceHandle(handle) {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return;
  }

  const db = await openWorkspaceDb();

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).put(handle, ACTIVE_WORKSPACE_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function readPersistedWorkspaceHandle() {
  const db = await openWorkspaceDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(ACTIVE_WORKSPACE_KEY);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function openWorkspaceDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
