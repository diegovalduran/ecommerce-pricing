/**
 * Utility functions for API calls
 */

/**
 * Gets the base URL for API calls, dynamically determining the port
 * This helps avoid hardcoded port references that can break when the port changes
 */
export function getApiBaseUrl(request?: Request): string {
  // In the browser, use the current window location
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  }
  
  // In server-side context, use the request's URL
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  
  // Fallback for server-side without request context
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Development fallback
  const port = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3001';
  return `http://127.0.0.1:${port}`;
}

/**
 * Constructs a full API URL from a path
 */
export function getApiUrl(path: string, request?: Request): string {
  const baseUrl = getApiBaseUrl(request);
  // Ensure path starts with /api/
  const apiPath = path.startsWith('/api/') ? path : `/api/${path}`;
  return `${baseUrl}${apiPath}`;
}
