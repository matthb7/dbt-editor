let activeWorkspaceHandle = null;

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
  return handle;
}
