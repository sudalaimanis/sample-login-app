const base =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export async function api(path, options = {}) {
  const url = `${base}${path}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
