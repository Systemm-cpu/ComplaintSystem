/* =============================
   LOCAL AUTH STORAGE HELPERS
   ============================= */

export function getToken() {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem("token");
  return t || null;
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  if (!token) return;
  localStorage.setItem("token", token);
}

/* Clear everything on logout */
export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
}

/* =============================
   AUTH HEADERS
   ============================= */
export function authHeaders() {
  const t = getToken();
  return t ? { Authorization: "Bearer " + t } : {};
}

/* =============================
   USER METADATA
   ============================= */
export function setUserMeta(role, username) {
  if (typeof window === "undefined") return;
  if (role) localStorage.setItem("role", role);
  if (username) localStorage.setItem("username", username);
}

export function getRole() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("role");
}

export function getUsername() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("username");
}

/* =============================
   TOKEN VALIDATION
   (Auto-logout on invalid token)
   ============================= */

export function validateAuth() {
  if (typeof window === "undefined") return;

  const token = getToken();
  if (!token) {
    logoutAndRedirect();
    return false;
  }

  // Basic JWT structure check
  if (!token.includes(".")) {
    logoutAndRedirect();
    return false;
  }

  // Try decode (no verification, just structure check)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload || !payload.exp) {
      return true; // no expiry, assume OK
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      logoutAndRedirect();
      return false;
    }
  } catch {
    logoutAndRedirect();
    return false;
  }

  return true;
}

/* Redirect helper */
function logoutAndRedirect() {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/admin/login";
  }
}
