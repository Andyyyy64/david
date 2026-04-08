import { getRuntime } from './runtime';

export function mediaUrl(relativePath: string): string {
  return getRuntime().mediaUrl(relativePath);
}
