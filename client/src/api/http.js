const API_BASE = 'http://localhost:4000';

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request(path, options = {}) {
  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

  let res = await doFetch();

  // If we got a 401, try refreshing the access token
  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshRes = await refreshAccessToken();
    if (refreshRes.ok) {
      res = await doFetch();
    }
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Only ever surface the server's intentional `error` field — never raw
    // response bodies (e.g. HTML error pages) that could hint at internals.
    const fallback = res.status >= 500
      ? 'Something went wrong on our end. Please try again in a moment.'
      : 'Something went wrong. Please try again.';
    throw new Error(typeof data?.error === 'string' ? data.error : fallback);
  }
  return data;
}

export const http = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
