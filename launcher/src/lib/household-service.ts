import { standaloneFetch } from './static-backend';

// Settings and weather are handled in the browser; there is no server component.
export async function householdFetch(path: string, init?: RequestInit) {
  return standaloneFetch(path, init);
}
export async function householdUrl(path: string) {
  return path;
}
