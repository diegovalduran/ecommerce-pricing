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
  
  // In server-side context, use relative URL
  return '';
}

/**
 * Constructs a full API URL from a path
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  // Ensure path starts with /api/
  const apiPath = path.startsWith('/api/') ? path : `/api/${path}`;
  // For server-side requests, just return the path
  if (typeof window === 'undefined') {
    return apiPath;
  }
  // For client-side requests, include the base URL
  return `${baseUrl}${apiPath}`;
}
