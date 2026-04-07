import { convertFileSrc } from '@tauri-apps/api/core';

/** Global data directory set at startup from Tauri's get_data_dir command. */
let _dataDir = '';

/**
 * Set the data directory (called once at startup from Tauri's get_data_dir command).
 */
export function setDataDir(dir: string): void {
  _dataDir = dir;
}

/**
 * Resolve a relative media path to an asset:// URL via convertFileSrc().
 */
export function mediaUrl(relativePath: string): string {
  if (!relativePath || !_dataDir) return '';
  const absPath = `${_dataDir}/${relativePath}`.replace(/\\/g, '/');
  return convertFileSrc(absPath);
}
