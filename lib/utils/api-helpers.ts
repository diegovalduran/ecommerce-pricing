/**
 * Utility functions for API calls
 */

/**
 * Gets the base URL for API calls, dynamically determining the port
 * This helps avoid hardcoded port references that can break when the port changes
 */
export function getApiBaseUrl(): string {
  // In the browser, use the current window location
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  }
  
  // In server-side context, use environment variable or default
  // We default to 3000 but this can be overridden by environment variables
  const port = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3001';
  return `http://127.0.0.1:${port}`;
}

/**
 * Constructs a full API URL from a path
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  // Ensure path starts with /api/
  const apiPath = path.startsWith('/api/') ? path : `/api/${path}`;
  return `${baseUrl}${apiPath}`;
}
