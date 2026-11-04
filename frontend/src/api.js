export const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const TOKEN_KEY = "employee_app_token";

function getEndpointUrl(path) {
  const endpoint = path.replace(/^\/+/, "");
  return new URL(endpoint, `${API_URL}/`).toString();
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function downloadFile(path) {
  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(getEndpointUrl(path), { headers });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Make sure FastAPI is running at " +
        API_URL,
    );
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const detail = errorData?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(", ")
      : typeof detail === "string"
        ? detail
        : `Failed to download document (${response.status})`;
    throw Object.assign(new Error(message), { status: response.status });
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
}

export async function api(path, options = {}) {
  const headers = {
    ...options.headers,
  };

  const token = getToken();
  const endpoint = path.replace(/^\/+/, "");
  const isPublicRequest =
    endpoint.startsWith("employee-invites/") ||
    endpoint === "auth/login" ||
    endpoint === "auth/signup";

  if (token && !isPublicRequest) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(getEndpointUrl(path), {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Make sure FastAPI is running at " +
        API_URL,
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail;

    if (response.status === 401 && token && !isPublicRequest) {
      clearToken();
      window.dispatchEvent(new Event("employee-app:auth-expired"));
    }

    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(", ")
      : typeof detail === "string"
        ? detail === "Invalid or expired login token"
          ? "Your session expired. Sign in again, then resend the invitation."
          : detail
        : `Request failed with status ${response.status}`;

    throw Object.assign(new Error(message), { status: response.status });
  }

  return data;
}
