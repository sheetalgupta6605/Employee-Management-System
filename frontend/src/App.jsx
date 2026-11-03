import { useEffect, useState, useMemo, useRef } from "react";
import { api, clearToken, saveToken, downloadFile } from "./api";
import "./App.css";

// ==========================================================================
// 1. REUSABLE INLINE SVG ICONS (LUCIDE-STYLE)
// ==========================================================================

function UsersIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BuildingIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function SearchIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PlusIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function RefreshCwIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function EditIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function KeyIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

function TrashIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function LogOutIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function ShieldIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function EyeIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function CheckCircleIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function XIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function LayoutDashboardIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function MailIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function BellIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function MenuIcon({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function FileTextIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}

function UploadCloudIcon({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}


// ==========================================================================
// 2. HELPERS & UTILITIES
// ==========================================================================

const emptyEmployee = {
  name: "",
  email: "",
  department: "",
  contact_number: "",
  address: "",
};

const getEmployeeId = (employee) => employee?.id || employee?._id;
const compareEmployeeIds = (first, second) =>
  String(first.employee_id || "").localeCompare(
    String(second.employee_id || ""),
    undefined,
    { numeric: true },
  );

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getInitials(name = "") {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "EM";
}

function getAvatarColor(name = "") {
  const colors = [
    { bg: "#e0e7ff", text: "#4338ca" }, // indigo
    { bg: "#d1fae5", text: "#047857" }, // emerald
    { bg: "#e0f2fe", text: "#0369a1" }, // sky
    { bg: "#fef3c7", text: "#b45309" }, // amber
    { bg: "#fae8ff", text: "#a21caf" }, // fuchsia
    { bg: "#fee2e2", text: "#b91c1c" }, // rose
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function ProfilePhotoControl({
  image,
  initials,
  uploading,
  onUpload,
  onRemove,
  large = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef(null);
  const controlRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function dismissMenu(event) {
      if (!controlRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function dismissOnEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", dismissMenu);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissMenu);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [menuOpen]);

  return (
    <div className="photo-upload-control" ref={controlRef}>
      <button
        type="button"
        className="photo-upload-avatar"
        title="Manage profile photo"
        aria-label="Manage profile photo"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span
          className={large ? "employee-big-avatar" : "avatar-chip"}
          style={{
            ...(large
              ? { overflow: "hidden", padding: 0 }
              : { background: "#e0e7ff", color: "#4338ca", width: 34, height: 34 }),
          }}
        >
          {image ? (
            <img
              src={image}
              alt=""
              style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
          {uploading && <span className="photo-upload-indicator">...</span>}
        </span>
      </button>
      {menuOpen && (
        <div className="photo-upload-menu" role="group" aria-label="Profile photo options">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              inputRef.current?.click();
            }}
            disabled={uploading}
          >
            <UploadCloudIcon size={15} />
            <span>{image ? "Change image" : "Add image"}</span>
          </button>
          {image && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onRemove();
              }}
              disabled={uploading}
            >
              <TrashIcon size={15} />
              <span>Remove image</span>
            </button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="photo-upload-input"
        onChange={(event) => {
          setMenuOpen(false);
          onUpload(event);
        }}
        disabled={uploading}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

// ==========================================================================
// 3. TOAST NOTIFICATION COMPONENT
// ==========================================================================

function ToastNotification({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="toast-container">
      <div className={`toast-item ${toast.type || "info"}`}>
        {toast.type === "success" && <CheckCircleIcon size={20} className="text-emerald-500" />}
        {toast.type === "error" && <AlertCircleIcon size={20} className="text-rose-500" />}
        {toast.type === "info" && <ShieldIcon size={20} className="text-indigo-400" />}
        <span style={{ flex: 1 }}>{toast.message}</span>
        <button onClick={onClose} className="btn-icon" style={{ color: "#94a3b8" }}>
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
}

// ==========================================================================
// 4. MAIN APP CONTAINER (ROUTING & AUTH CHECK)
// ==========================================================================

function navigate(path, replace = false) {
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function getInvitationToken(pathname) {
  return pathname.match(/^\/accept-invite\/([A-Za-z0-9_-]+)$/)?.[1] || null;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState(null);
  const [pathname, setPathname] = useState(() => window.location.pathname);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    function updatePathname() {
      setPathname(window.location.pathname);
    }

    window.addEventListener("popstate", updatePathname);
    return () => window.removeEventListener("popstate", updatePathname);
  }, []);

  useEffect(() => {
    function handleExpiredAuth() {
      setUser(null);
      setToast({ message: "Your session expired. Please sign in again.", type: "info" });
      if (!getInvitationToken(window.location.pathname)) {
        navigate("/login", true);
      }
    }

    window.addEventListener("employee-app:auth-expired", handleExpiredAuth);
    return () => window.removeEventListener("employee-app:auth-expired", handleExpiredAuth);
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname;

    if (!getInvitationToken(currentPath)) {
      clearToken();
      if (currentPath !== "/login") navigate("/login", true);
    }

    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (checkingAuth) return;

    if (getInvitationToken(pathname)) return;

    if (!user) {
      if (pathname !== "/login") navigate("/login", true);
      return;
    }

    if (!["admin", "employee"].includes(user.role)) {
      clearToken();
      setUser(null);
      navigate("/login", true);
      return;
    }

    if (pathname === "/login") {
      clearToken();
      setUser(null);
      return;
    }

    const requestedRole = pathname.startsWith("/admin")
      ? "admin"
      : pathname.startsWith("/employee")
        ? "employee"
        : null;

    if (requestedRole && requestedRole !== user.role) {
      clearToken();
      setUser(null);
      navigate("/login", true);
      return;
    }

    const homePath = user.role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
    const isAdminEmployeeDetailPath = /^\/admin\/employees\/[^/]+$/.test(pathname);
    const allowedPaths = user.role === "admin"
      ? ["/admin", "/admin/dashboard", "/admin/employees", "/admin/requests"]
      : ["/employee", "/employee/dashboard"];

    if (!allowedPaths.includes(pathname) && !(user.role === "admin" && isAdminEmployeeDetailPath)) {
      navigate(homePath, true);
    } else if (pathname === "/admin" || pathname === "/employee") {
      navigate(homePath, true);
    }
  }, [checkingAuth, pathname, user]);

  function handleLogin(account) {
    setUser(account);
    navigate(account.role === "admin" ? "/admin/dashboard" : "/employee/dashboard", true);
    showToast(`Welcome back, ${account.name || account.email}!`, "success");
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    navigate("/login", true);
    showToast("You have been signed out safely.", "info");
  }

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div className="brand-icon-box" style={{ margin: "0 auto 1.25rem", width: 52, height: 52 }}>
            <UsersIcon size={28} />
          </div>
          <p style={{ fontWeight: 600, color: "#475569" }}>Verifying session...</p>
        </div>
      </div>
    );
  }

  const invitationToken = getInvitationToken(pathname);

  return (
    <>
      {invitationToken ? (
        <AcceptEmployeeInvite
          token={invitationToken}
          onLogin={handleLogin}
        />
      ) : pathname === "/login" || !user ? (
        <LoginPage onLogin={handleLogin} />
      ) : user.role === "admin" ? (
        <AdminDashboard
          user={user}
          pathname={pathname}
          onUserUpdate={setUser}
          onLogout={handleLogout}
          showToast={showToast}
        />
      ) : user.role === "employee" && user.must_change_password ? (
        <TemporaryPasswordChange
          onComplete={() =>
            setUser((current) => ({ ...current, must_change_password: false }))
          }
          onLogout={handleLogout}
          showToast={showToast}
        />
      ) : user.role === "employee" ? (
        <EmployeeDashboard user={user} onLogout={handleLogout} showToast={showToast} />
      ) : (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <div className="panel-card" style={{ padding: "2.5rem", maxWidth: 440, textAlign: "center" }}>
            <AlertCircleIcon size={36} style={{ color: "#e11d48", margin: "0 auto 1rem" }} />
            <h2 className="h2" style={{ marginBottom: "0.5rem" }}>Role Not Recognized</h2>
            <p className="subtext" style={{ marginBottom: "1.5rem" }}>
              Your account has an unassigned role. Please contact system administration.
            </p>
            <button className="btn btn-primary" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      )}

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

function TemporaryPasswordChange({ onComplete, onLogout, showToast }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New password and confirmation do not match.", "error");
      return;
    }

    setSaving(true);
    try {
      await api("/employees/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      showToast("Password changed. Your account is ready.", "success");
      onComplete();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-single-wrapper">
      <section className="auth-single-card">
        <div className="auth-header">
          <h2>Set a new password</h2>
          <p className="subtext">
            Your administrator provided a temporary password. Change it to continue.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="temporary-current-password">Temporary password</label>
            <input
              id="temporary-current-password"
              type="password"
              className="input-field no-icon"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="temporary-new-password">New password</label>
            <input
              id="temporary-new-password"
              type="password"
              className="input-field no-icon"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="temporary-confirm-password">Confirm new password</label>
            <input
              id="temporary-confirm-password"
              type="password"
              className="input-field no-icon"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Updating password..." : "Change password"}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onLogout}
            style={{ marginLeft: "0.5rem" }}
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}

// ==========================================================================
// 5. SHARED SIGN-IN AND SIGN-UP PAGE
// ==========================================================================

function LoginPage({ onLogin }) {
  const [requestingAccount, setRequestingAccount] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function finishLogin(result, fallbackEmail) {
    if (!result.access_token || !["admin", "employee"].includes(result.role)) {
      throw new Error("The server returned an invalid login response. Please try again.");
    }

    saveToken(result.access_token);
    onLogin({
      name: result.name || "",
      email: result.email || fallbackEmail,
      role: result.role,
      profile_image: result.profile_image || "",
      must_change_password: Boolean(result.must_change_password),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (requestingAccount) {
        const result = await api("/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: normalizedEmail,
            department: department.trim(),
            password,
          }),
        });

        setRequestingAccount(false);
        setName("");
        setDepartment("");
        setPassword("");
        setNotice(result.message);
        return;
      }

      const result = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      finishLogin(result, normalizedEmail);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-single-wrapper">
      <section className="auth-single-card">
        <div className="auth-single-brand">
          <div className="brand-icon-box">
            <UsersIcon size={24} />
          </div>
          <div>
            <div className="auth-single-brand-title">Employee Management</div>
            <div className="auth-single-brand-caption">Your people workspace</div>
          </div>
        </div>

        <div className="auth-header">
          <h2>{requestingAccount ? "Request an account" : "Welcome back"}</h2>
          <p className="subtext">
            {requestingAccount
              ? "Send an account request to your administrator for approval."
              : "Sign in with your work email and password."}
          </p>
        </div>

        {error && (
          <div className="auth-form-message error" role="alert">
            <AlertCircleIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="auth-form-message success" role="status">
            <CheckCircleIcon size={18} />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {requestingAccount && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-name">Full name</label>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  className="input-field no-icon"
                  placeholder="Your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-department">Department</label>
                <input
                  id="signup-department"
                  name="department"
                  type="text"
                  className="input-field no-icon"
                  placeholder="e.g. Engineering"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  maxLength={100}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Work email</label>
            <div className="input-container">
              <MailIcon size={18} className="input-icon-left" />
              <input
                id="auth-email"
                name="email"
                type="email"
                className="input-field"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              {requestingAccount ? "Create password" : "Password"}
            </label>
            <div className="input-container">
              <KeyIcon size={18} className="input-icon-left" />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="input-field"
                placeholder={requestingAccount ? "At least 8 characters" : "Enter your password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={requestingAccount ? "new-password" : "current-password"}
                minLength={requestingAccount ? 8 : undefined}
                maxLength={128}
                required
              />
              <button
                type="button"
                className="input-icon-right"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCwIcon size={16} className="animate-spin" />
                <span>{requestingAccount ? "Submitting request..." : "Signing in..."}</span>
              </>
            ) : (
              <span>{requestingAccount ? "Submit account request" : "Sign in"}</span>
            )}
          </button>
        </form>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => {
              setRequestingAccount((requesting) => !requesting);
              setError("");
              setNotice("");
            }}
          >
            {requestingAccount ? "Back to sign in" : "Request account"}
          </button>
        </div>

        <div className="auth-hint-box auth-single-hint">
          <ShieldIcon size={18} style={{ color: "#4f46e5", flexShrink: 0 }} />
          <span>
            {requestingAccount
              ? "An administrator will review your details. You can sign in after your account request is approved."
              : "Your account type is detected automatically when you sign in."}
          </span>
        </div>
      </section>
    </main>
  );
}

function AcceptEmployeeInvite({ token, onLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    contact_number: "",
    address: "",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api(`/employee-invites/${encodeURIComponent(token)}`)
      .then((invite) => {
        if (active) setForm(invite);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const result = await api(`/employee-invites/${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          department: form.department.trim(),
          contact_number: form.contact_number.trim(),
          address: form.address.trim(),
          password,
        }),
      });
      if (!result.access_token || result.role !== "employee") {
        throw new Error("The server returned an invalid account response. Please try again.");
      }
      saveToken(result.access_token);
      onLogin({
        name: result.name || "",
        email: result.email || form.email,
        role: result.role,
        profile_image: result.profile_image || "",
        must_change_password: Boolean(result.must_change_password),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-single-wrapper">
      <section className="auth-single-card">
        <div className="auth-single-brand">
          <div className="brand-icon-box"><UsersIcon size={24} /></div>
          <div>
            <div className="auth-single-brand-title">Employee Management</div>
            <div className="auth-single-brand-caption">Complete your employee account</div>
          </div>
        </div>

        <div className="auth-header">
          <h2>Accept your invitation</h2>
          <p className="subtext">Review your details and choose a password to create your account.</p>
        </div>

        {error && (
          <div className="auth-form-message error" role="alert">
            <AlertCircleIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <p className="subtext" role="status">Checking your invitation...</p>
        ) : !error || form.email ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="invite-name">Full Name *</label>
              <input
                id="invite-name"
                name="name"
                type="text"
                className="input-field no-icon"
                placeholder="e.g. Sarah Jenkins"
                value={form.name}
                onChange={handleChange}
                maxLength={100}
                autoComplete="name"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="invite-email">Work Email *</label>
              <input
                id="invite-email"
                type="email"
                className="input-field no-icon"
                value={form.email}
                readOnly
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="invite-department">Department *</label>
              <input
                id="invite-department"
                name="department"
                type="text"
                className="input-field no-icon"
                placeholder="e.g. Engineering, Human Resources, Finance"
                value={form.department}
                onChange={handleChange}
                maxLength={100}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="invite-contact">Contact number</label>
              <input
                id="invite-contact"
                name="contact_number"
                type="tel"
                className="input-field no-icon"
                placeholder="e.g. +1 (555) 234-5678"
                value={form.contact_number}
                onChange={handleChange}
                maxLength={50}
                autoComplete="tel"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="invite-address">Address / location</label>
              <textarea
                id="invite-address"
                name="address"
                rows={2}
                className="input-field no-icon"
                placeholder="e.g. 742 Evergreen Terrace, Springfield"
                value={form.address}
                onChange={handleChange}
                maxLength={500}
                autoComplete="street-address"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="invite-password">Create password</label>
              <input
                id="invite-password"
                type="password"
                className="input-field no-icon"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="invite-confirm-password">Confirm password</label>
              <input
                id="invite-confirm-password"
                type="password"
                className="input-field no-icon"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary auth-submit-button" disabled={saving}>
              {saving ? "Creating account..." : "Create account"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

// ==========================================================================
// 6. ADMIN DASHBOARD & EMPLOYEE MANAGEMENT
// ==========================================================================

function AdminDashboard({ user, pathname, onUserUpdate, onLogout, showToast }) {
  const [employees, setEmployees] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestLoadStatus, setRequestLoadStatus] = useState("loading");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() =>
    window.location.pathname.startsWith("/admin/employees")
      ? "employees"
      : window.location.pathname === "/admin/requests"
        ? "requests"
        : "dashboard",
  );
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [resetPasswordModal, setResetPasswordModal] = useState(null); // employee object
  const [deleteModal, setDeleteModal] = useState(null); // employee object
  const [accessModal, setAccessModal] = useState(null);
  const [reviewRequest, setReviewRequest] = useState(null);

  async function loadEmployees() {
    setLoading(true);
    setConnectionStatus("checking");
    try {
      const data = await api("/employees");
      setEmployees(Array.isArray(data) ? data : []);
      setConnectionStatus("connected");
    } catch (err) {
      setConnectionStatus("unavailable");
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfilePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      showToast("Choose a PNG, JPEG, or WebP image.", "error");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Profile image must be smaller than 2MB.", "error");
      event.target.value = "";
      return;
    }

    setUploadingProfilePhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await api("/auth/me/photo", {
          method: "PUT",
          body: JSON.stringify({ file_data: reader.result }),
        });
        onUserUpdate((current) => ({ ...current, profile_image: result.profile_image }));
        showToast("Profile photo updated.", "success");
      } catch (err) {
        showToast(getErrorMessage(err), "error");
      } finally {
        setUploadingProfilePhoto(false);
        event.target.value = "";
      }
    };
    reader.onerror = () => {
      showToast("Could not read the selected image.", "error");
      setUploadingProfilePhoto(false);
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveProfilePhoto() {
    try {
      await api("/auth/me/photo", { method: "DELETE" });
      onUserUpdate((current) => ({ ...current, profile_image: "" }));
      showToast("Profile photo removed.", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  async function loadAccountRequests() {
    try {
      const data = await api("/admin/account-requests");
      setPendingRequests(Array.isArray(data) ? data : []);
      setRequestLoadStatus("loaded");
    } catch {
      setRequestLoadStatus("error");
    }
  }

  async function approveAccount(employee) {
    try {
      const requestId = employee.account_request_id || getEmployeeId(employee);
      const result = await api(`/admin/account-requests/${requestId}/approve`, {
        method: "POST",
      });
      showToast(result.message || "Employee account approved.", "success");
      setReviewRequest(null);
      await Promise.all([loadEmployees(), loadAccountRequests()]);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  async function declineAccount(employee) {
    try {
      const requestId = employee.account_request_id || getEmployeeId(employee);
      const result = await api(`/admin/account-requests/${requestId}/decline`, {
        method: "POST",
      });
      showToast(result.message || "Account request declined.", "info");
      setReviewRequest(null);
      await Promise.all([loadEmployees(), loadAccountRequests()]);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  useEffect(() => {
    function syncTabFromPath() {
      setActiveTab(
        window.location.pathname.startsWith("/admin/employees")
          ? "employees"
          : window.location.pathname === "/admin/requests"
            ? "requests"
            : "dashboard",
      );
    }

    window.addEventListener("popstate", syncTabFromPath);
    return () => window.removeEventListener("popstate", syncTabFromPath);
  }, []);

  useEffect(() => {
    const detailRoute = pathname.match(/^\/admin\/employees\/([^/]+)$/);
    if (!detailRoute) {
      setFormModalOpen(false);
      return;
    }

    if (loading) return;
    if (connectionStatus !== "connected") {
      navigate("/admin/employees", true);
      return;
    }

    let requestedId;
    try {
      requestedId = decodeURIComponent(detailRoute[1]).toUpperCase();
    } catch {
      showToast("Invalid employee ID.", "error");
      navigate("/admin/employees", true);
      return;
    }
    const employee = employees.find(
      (item) =>
        item.employee_id?.toUpperCase() === requestedId ||
        getEmployeeId(item)?.toUpperCase() === requestedId,
    );

    if (!employee) {
      showToast(`No employee found with ID ${requestedId}.`, "error");
      navigate("/admin/employees", true);
      return;
    }

    setEditingEmployee(employee);
    setFormModalOpen(true);
  }, [pathname, employees, loading, connectionStatus, showToast]);

  function navigateToTab(tab) {
    setActiveTab(tab);
    const targetPath = {
      employees: "/admin/employees",
      requests: "/admin/requests",
      dashboard: "/admin/dashboard",
    }[tab];
    navigate(targetPath);
  }

  function openRequestReview(request) {
    setReviewRequest(request);
    setNotificationsOpen(false);
  }

  useEffect(() => {
    loadEmployees();
    loadAccountRequests();
    const refreshTimer = window.setInterval(loadAccountRequests, 10000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const departments = useMemo(() => {
    return [...new Set(employees.map((emp) => emp.department).filter(Boolean))].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const term = search.toLowerCase();
      const matchesSearch =
        (emp.employee_id || "").toLowerCase().includes(term) ||
        (emp.name || "").toLowerCase().includes(term) ||
        (emp.email || "").toLowerCase().includes(term) ||
        (emp.department || "").toLowerCase().includes(term);

      const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
      return matchesSearch && matchesDept;
    }).sort(compareEmployeeIds);
  }, [employees, search, departmentFilter]);

  // Open Form for Adding New
  function handleOpenAdd() {
    setEditingEmployee(null);
    setFormModalOpen(true);
  }

  // Open Form for Editing
  function handleOpenEdit(emp) {
    setEditingEmployee(emp);
    setFormModalOpen(true);
  }

  function handleAccessStatusChange(employee, result) {
    const employeeId = getEmployeeId(employee);
    const updatedEmployee = {
      ...employee,
      account_status: result.account_status,
      deactivated_until: result.deactivated_until,
    };
    setEmployees((current) =>
      current.map((item) =>
        getEmployeeId(item) === employeeId ? updatedEmployee : item,
      ),
    );
    setEditingEmployee((current) =>
      current && getEmployeeId(current) === employeeId
        ? updatedEmployee
        : current,
    );
    setAccessModal(null);
    showToast(result.message, "success");
  }

  async function handleViewEmployeeResume(employeeId) {
    try {
      await downloadFile(`/employees/${employeeId}/resume`);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`ems-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">
                <BuildingIcon size={20} />
              </div>
              <span className="sidebar-brand-name" style={{ fontSize: "0.95rem" }}>
                Employee Management System
              </span>
            </div>
            {/* Close button for mobile */}
            <button
              className="btn-icon"
              style={{ color: "#94a3b8" }}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="sidebar-nav-container">
            <div className="sidebar-section-title">Navigation</div>

            <button
              className={`sidebar-nav-link ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => {
                navigateToTab("dashboard");
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-nav-item-left">
                <LayoutDashboardIcon size={18} />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-link ${activeTab === "employees" ? "active" : ""}`}
              onClick={() => {
                navigateToTab("employees");
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-nav-item-left">
                <UsersIcon size={18} />
                <span>Employees</span>
              </div>
              <span className="sidebar-pill">{employees.length}</span>
            </button>

            <button
              className={`sidebar-nav-link ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => {
                navigateToTab("requests");
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-nav-item-left">
                <BellIcon size={18} />
                <span>Account Requests</span>
              </div>
              <span className="sidebar-pill">{pendingRequests.length}</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-info">
              <div
                className="avatar-chip"
                style={{ background: "#4f46e5", color: "#fff", width: 34, height: 34 }}
              >
                {user.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt=""
                    style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
                  />
                ) : (
                  getInitials(user.name || user.email)
                )}
              </div>
              <div>
                <div className="sidebar-user-name">{user.name || "Administrator"}</div>
                <div className="sidebar-user-role">System Admin</div>
              </div>
            </div>
            <button
              className="btn-icon"
              onClick={onLogout}
              title="Sign Out"
              style={{ color: "#cbd5e1" }}
            >
              <LogOutIcon size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="ems-main-canvas">
        {/* Topbar Header */}
        <header className="ems-topbar">
          <div className="topbar-left">
            <button
              className="topbar-mobile-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
            >
              <MenuIcon size={22} />
            </button>
            <div className="topbar-breadcrumbs">
              <span className="topbar-breadcrumb-parent">Admin Portal</span>
              <span style={{ color: "#cbd5e1" }}>/</span>
              <span className="topbar-breadcrumb-current">
                {activeTab === "dashboard"
                  ? "Dashboard Overview"
                  : activeTab === "requests"
                    ? "Account Requests"
                    : "Employee Records"}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="account-notification-wrap">
              <button
                className="account-notification-trigger"
                type="button"
                aria-label={`Account requests: ${pendingRequests.length} pending`}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <BellIcon size={19} />
                {pendingRequests.length > 0 && (
                  <span className="account-notification-count">
                    {pendingRequests.length > 9 ? "9+" : pendingRequests.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <section className="account-notification-popover" aria-label="Pending account requests">
                  <div className="account-notification-heading">
                    <div>
                      <strong>Account requests</strong>
                      <span>{pendingRequests.length} waiting for review</span>
                    </div>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close account requests"
                    >
                      <XIcon size={16} />
                    </button>
                  </div>

                  {pendingRequests.length === 0 ? (
                    <div className="account-notification-empty">
                      <CheckCircleIcon size={20} />
                      <span>No pending account requests.</span>
                    </div>
                  ) : (
                    <div className="account-notification-list">
                      {pendingRequests.map((request) => (
                        <article className="account-notification-item" key={request.id}>
                          <div className="account-notification-person">
                            <button
                              type="button"
                              className="account-request-name"
                              onClick={() => openRequestReview(request)}
                            >
                              {request.name}
                            </button>
                            <span>{request.email}</span>
                            <small>{request.department || "General"}</small>
                          </div>
                          <div className="account-notification-actions">
                            <button
                              className="btn btn-primary"
                              type="button"
                              onClick={() => approveAccount(request)}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-danger"
                              type="button"
                              onClick={() => declineAccount(request)}
                            >
                              Decline
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <div className={`topbar-status-chip ${connectionStatus}`}>
              <span className="status-dot"></span>
              <span>
                {connectionStatus === "connected"
                  ? "API connected"
                  : connectionStatus === "unavailable"
                    ? "API unavailable"
                    : "Checking API"}
              </span>
            </div>

            <div className="topbar-profile">
              <ProfilePhotoControl
                image={user.profile_image}
                initials={getInitials(user.name || user.email)}
                uploading={uploadingProfilePhoto}
                onUpload={handleProfilePhotoUpload}
                onRemove={handleRemoveProfilePhoto}
              />
              <button
                className="btn btn-secondary"
                style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                onClick={onLogout}
              >
                <LogOutIcon size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="ems-content-area">
          <section className="page-intro">
            <div>
              <p className="page-eyebrow">PEOPLE OPERATIONS</p>
              <h1>
                {activeTab === "dashboard"
                  ? `Welcome back, ${(user.name || "there").split(" ")[0]}.`
                  : activeTab === "requests"
                    ? "Account requests"
                    : "Employee directory"}
              </h1>
              <p className="page-description">
                {activeTab === "dashboard"
                  ? "A clear overview of your people, departments, and workspace."
                  : activeTab === "requests"
                    ? "Review employee account requests and choose whether to approve them."
                    : "Search, review, and manage your employee records in one place."}
              </p>
            </div>
          </section>

          {/* Stat Cards */}
          {activeTab === "dashboard" && <section className="stats-grid">
            <div className="stat-card">
              <div>
                <div className="stat-info-title">Total Employees</div>
                <div className="stat-info-value">{employees.length}</div>
                <div className="stat-info-desc">Registered personnel in database</div>
              </div>
              <div className="stat-icon-wrapper stat-icon-indigo">
                <UsersIcon size={24} />
              </div>
            </div>

            <div className="stat-card">
              <div>
                <div className="stat-info-title">Total Departments</div>
                <div className="stat-info-value">{departments.length}</div>
                <div className="stat-info-desc">Active organizational units</div>
              </div>
              <div className="stat-icon-wrapper stat-icon-emerald">
                <BuildingIcon size={24} />
              </div>
            </div>

            <div className="stat-card">
              <div>
                <div className="stat-info-title">Resumes on file</div>
                <div className="stat-info-value">
                  {employees.filter((employee) => employee.resume_original_name).length}
                </div>
                <div className="stat-info-desc">Employee documents uploaded</div>
              </div>
              <div className="stat-icon-wrapper stat-icon-sky">
                <FileTextIcon size={22} />
              </div>
            </div>
            <button
              type="button"
              className="stat-card pending-request-stat"
              onClick={() => navigateToTab("requests")}
            >
              <div>
                <div className="stat-info-title">Pending requests</div>
                <div className="stat-info-value">
                  {requestLoadStatus === "loading" ? "…" : pendingRequests.length}
                </div>
                <div className="stat-info-desc">
                  {requestLoadStatus === "error"
                    ? "Could not load requests; click to retry"
                    : requestLoadStatus === "loaded" && pendingRequests.length === 0
                      ? "No requests pending"
                      : "Click to review account requests"}
                </div>
              </div>
              <div className="stat-icon-wrapper stat-icon-amber">
                <BellIcon size={22} />
              </div>
            </button>
          </section>}

          {/* ================================================================
              VIEW 1: DASHBOARD OVERVIEW (activeTab === "dashboard")
              ================================================================ */}
          {activeTab === "dashboard" && (
            <>
              {/* 2-Column Overview Grid: Department Distribution & Quick Actions */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                {/* Department Distribution Card */}
                <section className="panel-card">
                  <div className="panel-card-header">
                    <div className="panel-title-group">
                      <h2>Department Distribution</h2>
                      <p>Workforce representation across organizational units</p>
                    </div>
                    <span className="badge badge-indigo">
                      {departments.length} {departments.length === 1 ? "Unit" : "Units"}
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "1.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.15rem",
                    }}
                  >
                    {departments.length === 0 ? (
                      <p className="subtext">No departments recorded in the system yet.</p>
                    ) : (
                      departments.map((dept) => {
                        const count = employees.filter((e) => e.department === dept).length;
                        const percent =
                          employees.length > 0
                            ? Math.round((count / employees.length) * 100)
                            : 0;
                        return (
                          <div key={dept}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "0.35rem",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                              }}
                            >
                              <span style={{ color: "#0f172a" }}>{dept}</span>
                              <span style={{ color: "#4f46e5" }}>
                                {count} {count === 1 ? "Employee" : "Employees"} ({percent}%)
                              </span>
                            </div>
                            <div
                              style={{
                                height: "8px",
                                background: "#f1f5f9",
                                borderRadius: "999px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${percent}%`,
                                  background: "linear-gradient(90deg, #4f46e5, #818cf8)",
                                  borderRadius: "999px",
                                  transition: "width 0.4s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                {/* Quick Actions & System Health Card */}
                <section className="panel-card">
                  <div className="panel-card-header">
                    <div className="panel-title-group">
                      <h2>Quick Actions & Health</h2>
                      <p>Operational shortcuts and environment status</p>
                    </div>
                    <span
                      className={`badge ${
                        connectionStatus === "connected"
                          ? "badge-emerald"
                          : connectionStatus === "unavailable"
                            ? "badge-amber"
                            : "badge-gray"
                      }`}
                    >
                      {connectionStatus === "connected"
                        ? "API connected"
                        : connectionStatus === "unavailable"
                          ? "API unavailable"
                          : "Checking API"}
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "1.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                    }}
                  >
                    <button
                      className="btn btn-secondary"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        justifyContent: "flex-start",
                        gap: "0.75rem",
                      }}
                      onClick={() => navigateToTab("employees")}
                    >
                      <UsersIcon size={18} />
                      <span>Open Full Employee Records ({employees.length})</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        justifyContent: "flex-start",
                        gap: "0.75rem",
                      }}
                      onClick={loadEmployees}
                    >
                      <RefreshCwIcon size={18} className={loading ? "animate-spin" : ""} />
                      <span>Refresh All Records</span>
                    </button>

                    <div className="auth-hint-box" style={{ marginTop: "0.5rem" }}>
                      <ShieldIcon size={18} style={{ color: "#4f46e5", flexShrink: 0 }} />
                      <span>
                        <strong>System status:</strong>{" "}
                        {connectionStatus === "connected"
                          ? "The employee service responded successfully."
                          : connectionStatus === "unavailable"
                            ? "The employee service did not respond. Check the backend and try refreshing."
                            : "Checking employee service availability."}
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Recent Employees Overview Snapshot */}
              <section className="panel-card">
                <div className="panel-card-header">
                  <div className="panel-title-group">
                    <h2>Recent Employee Records</h2>
                    <p>Latest personnel registered in the database</p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => navigateToTab("employees")}>
                    <span>Manage All Records &rarr;</span>
                  </button>
                </div>

                {employees.length === 0 ? (
                  <div className="table-empty-state">
                    <p className="subtext">No employee records in the system yet.</p>
                  </div>
                ) : (
                  <div className="table-responsive-wrapper">
                    <table className="ems-table">
                      <thead>
                        <tr>
                          <th>Employee ID</th>
                          <th>Employee</th>
                          <th>Department</th>
                          <th>Contact</th>
                          <th>Address</th>
                          <th>Resume</th>
                          <th>Account</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees
                          .slice()
                          .sort(compareEmployeeIds)
                          .slice(-5)
                          .map((emp) => {
                            const id = getEmployeeId(emp);
                            const color = getAvatarColor(emp.name || emp.email);

                            return (
                              <tr key={id}>
                                <td>
                                  <span className="badge badge-gray">{emp.employee_id || "—"}</span>
                                </td>

                                <td>
                                  <div className="table-employee-cell">
                                    <div
                                      className="avatar-chip"
                                      style={{ backgroundColor: color.bg, color: color.text }}
                                    >
                                      {emp.profile_image ? (
                                        <img
                                          src={emp.profile_image}
                                          alt=""
                                          style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
                                        />
                                      ) : (
                                        getInitials(emp.name)
                                      )}
                                    </div>
                                    <div>
                                      <div className="employee-cell-name">{emp.name}</div>
                                      <div className="employee-cell-email">{emp.email}</div>
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <span className="badge badge-indigo">
                                    {emp.department || "General"}
                                  </span>
                                </td>

                                <td>{emp.contact_number || <span style={{ color: "#94a3b8" }}>—</span>}</td>

                                <td
                                  style={{
                                    maxWidth: 220,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {emp.address || <span style={{ color: "#94a3b8" }}>—</span>}
                                </td>

                                <td>
                                  {emp.resume_original_name ? (
                                    <button
                                      type="button"
                                      className="action-btn"
                                      style={{
                                        color: "#4338ca",
                                        borderColor: "#c7d2fe",
                                        background: "#eef2ff",
                                        fontWeight: 600,
                                      }}
                                      onClick={() => handleViewEmployeeResume(id)}
                                      title={`View/Download ${emp.resume_original_name}`}
                                    >
                                      <FileTextIcon size={14} />
                                      <span>PDF</span>
                                    </button>
                                  ) : (
                                    <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                                  )}
                                </td>

                                <td>
                                  <span className={`badge ${emp.account_status === "pending" ? "badge-amber" : emp.account_status === "approved" ? "badge-emerald" : "badge-gray"}`}>
                                    {emp.account_status === "pending"
                                      ? "Pending approval"
                                      : emp.account_status === "approved"
                                        ? "Approved"
                                        : "No account"}
                                  </span>
                                </td>

                                <td>
                                  <div
                                    className="table-actions-cell"
                                    style={{ justifyContent: "flex-end" }}
                                  >
                                    {emp.account_status === "pending" && (
                                      <button
                                        className="action-btn edit"
                                        onClick={() => approveAccount(emp)}
                                        title="Approve this account request"
                                      >
                                        <CheckCircleIcon size={14} />
                                        <span>Approve</span>
                                      </button>
                                    )}
                                    <button
                                      className="action-btn edit"
                                      onClick={() => handleOpenEdit(emp)}
                                      title="Edit employee details"
                                    >
                                      <EditIcon size={14} />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      className="action-btn key"
                                      onClick={() => setResetPasswordModal(emp)}
                                      title="Set or reset login password"
                                    >
                                      <KeyIcon size={14} />
                                      <span>Set Login</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "requests" && (
            <section className="panel-card">
              <div className="panel-card-header">
                <div className="panel-title-group">
                  <h2>Pending account requests</h2>
                  <p>Review submitted details before approving or declining access.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadAccountRequests}
                >
                  <RefreshCwIcon size={16} />
                  <span>Refresh</span>
                </button>
              </div>
              {requestLoadStatus === "error" ? (
                <div className="table-empty-state">
                  <p className="subtext">Account requests could not be loaded. Check the connection and try again.</p>
                  <button type="button" className="btn btn-secondary" onClick={loadAccountRequests}>
                    Try again
                  </button>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="table-empty-state">
                  <div className="empty-state-icon-box">
                    <CheckCircleIcon size={26} />
                  </div>
                  <div className="empty-state-title">
                    {requestLoadStatus === "loading" ? "Loading requests..." : "No pending requests"}
                  </div>
                  <div className="empty-state-desc">
                    {requestLoadStatus === "loading"
                      ? "Checking for new employee account requests."
                      : "New employee account requests will appear here and in notifications."}
                  </div>
                </div>
              ) : (
                <div className="account-request-review-list">
                  {pendingRequests.map((request) => (
                    <article className="account-request-review-item" key={request.id}>
                      <div className="account-notification-person">
                        <button
                          type="button"
                          className="account-request-name"
                          onClick={() => openRequestReview(request)}
                        >
                          {request.name}
                        </button>
                        <span>{request.email}</span>
                        <small>{request.department || "General"}</small>
                      </div>
                      <div className="account-notification-actions">
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => openRequestReview(request)}
                        >
                          Review
                        </button>
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => approveAccount(request)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger"
                          type="button"
                          onClick={() => declineAccount(request)}
                        >
                          Decline
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ================================================================
              VIEW 2: FULL EMPLOYEE RECORDS DIRECTORY (activeTab === "employees")
              ================================================================ */}
          {activeTab === "employees" && (
            <section className="panel-card">
              <div className="panel-card-header">
                <div className="panel-title-group">
                  <h2>Employee Records Directory</h2>
                  <p>Search, filter, edit, and manage all employee records and credentials.</p>
                </div>

                <div style={{ display: "flex", gap: "0.65rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={loadEmployees}
                    title="Refresh directory"
                  >
                    <RefreshCwIcon size={16} className={loading ? "animate-spin" : ""} />
                    <span>Refresh</span>
                  </button>
                  <button className="btn btn-primary" onClick={handleOpenAdd}>
                    <PlusIcon size={16} />
                    <span>Add Employee</span>
                  </button>
                </div>
              </div>

              {/* Toolbar Filters */}
              <div className="table-toolbar">
                <div className="toolbar-search-box">
                  <SearchIcon size={18} className="input-icon-left" />
                  <input
                    type="text"
                    className="toolbar-search-input"
                    placeholder="Search by employee ID, name, email, or department..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <select
                    className="toolbar-select"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <option value="all">All Departments ({departments.length})</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>

                  <span
                    className="badge badge-gray"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.65rem" }}
                  >
                    {filteredEmployees.length}{" "}
                    {filteredEmployees.length === 1 ? "Record" : "Records"}
                  </span>
                </div>
              </div>

              {/* Data Table */}
              {loading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                  <RefreshCwIcon
                    size={24}
                    className="animate-spin"
                    style={{ margin: "0 auto 0.75rem" }}
                  />
                  <p>Loading employee directory from database...</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="table-empty-state">
                  <div className="empty-state-icon-box">
                    <UsersIcon size={28} />
                  </div>
                  <div className="empty-state-title">No employees found</div>
                  <div className="empty-state-desc">
                    {search || departmentFilter !== "all"
                      ? "No records match your active search or department filter criteria."
                      : "Your directory has no employees yet. Start by adding your first employee."}
                  </div>
                  {search || departmentFilter !== "all" ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setSearch("");
                        setDepartmentFilter("all");
                      }}
                    >
                      Reset Filters
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={handleOpenAdd}>
                      <PlusIcon size={16} />
                      <span>Add New Employee</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="ems-table">
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Contact Number</th>
                        <th>Address</th>
                        <th>Resume</th>
                        <th>Account</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp) => {
                        const id = getEmployeeId(emp);
                        const color = getAvatarColor(emp.name || emp.email);

                        return (
                          <tr key={id}>
                            <td>
                              <span className="badge badge-gray">{emp.employee_id || "—"}</span>
                            </td>

                            <td>
                              <div className="table-employee-cell">
                                <div
                                  className="avatar-chip"
                                  style={{ backgroundColor: color.bg, color: color.text }}
                                >
                                  {emp.profile_image ? (
                                    <img
                                      src={emp.profile_image}
                                      alt=""
                                      style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
                                    />
                                  ) : (
                                    getInitials(emp.name)
                                  )}
                                </div>
                                <div>
                                  <div className="employee-cell-name">{emp.name}</div>
                                  <div className="employee-cell-email">{emp.email}</div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="badge badge-indigo">
                                {emp.department || "General"}
                              </span>
                            </td>

                            <td>
                              {emp.contact_number || (
                                <span style={{ color: "#94a3b8" }}>—</span>
                              )}
                            </td>

                            <td
                              style={{
                                maxWidth: 220,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {emp.address || <span style={{ color: "#94a3b8" }}>—</span>}
                            </td>

                            <td>
                              {emp.resume_original_name ? (
                                <button
                                  type="button"
                                  className="action-btn"
                                  style={{
                                    color: "#4338ca",
                                    borderColor: "#c7d2fe",
                                    background: "#eef2ff",
                                    fontWeight: 600,
                                  }}
                                  onClick={() => handleViewEmployeeResume(id)}
                                  title={`View/Download ${emp.resume_original_name}`}
                                >
                                  <FileTextIcon size={14} />
                                  <span>View PDF</span>
                                </button>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No Resume</span>
                              )}
                            </td>

                            <td>
                              <span className={`badge ${["pending", "deactivated"].includes(emp.account_status) ? "badge-amber" : emp.account_status === "approved" ? "badge-emerald" : "badge-gray"}`}>
                                {emp.account_status === "deactivated"
                                  ? "Temporarily deactivated"
                                  : emp.account_status === "pending"
                                  ? "Pending approval"
                                  : emp.account_status === "approved"
                                    ? "Approved"
                                    : "No account"}
                              </span>
                              {emp.account_status === "deactivated" && emp.deactivated_until && (
                                <div className="employee-cell-email" style={{ marginTop: "0.25rem" }}>
                                  Until {new Date(emp.deactivated_until).toLocaleDateString()}
                                </div>
                              )}
                            </td>

                            <td>
                              <div
                                className="table-actions-cell"
                                style={{ justifyContent: "flex-end" }}
                              >
                                {emp.account_status === "pending" && (
                                  <button
                                    className="action-btn edit"
                                    onClick={() => approveAccount(emp)}
                                    title="Approve this account request"
                                  >
                                    <CheckCircleIcon size={14} />
                                    <span>Approve</span>
                                  </button>
                                )}
                                <button
                                  className="action-btn edit"
                                  onClick={() => handleOpenEdit(emp)}
                                  title="Edit employee details"
                                >
                                  <EditIcon size={14} />
                                  <span>Edit</span>
                                </button>

                                {["approved", "deactivated"].includes(emp.account_status) && (
                                  <button
                                    className={emp.account_status === "deactivated" ? "action-btn edit" : "action-btn"}
                                    onClick={() => setAccessModal(emp)}
                                    title={emp.account_status === "deactivated" ? "Reactivate employee access" : "Temporarily deactivate employee access"}
                                  >
                                    <ShieldIcon size={14} />
                                    <span>{emp.account_status === "deactivated" ? "Reactivate" : "Deactivate"}</span>
                                  </button>
                                )}

                                <button
                                  className="action-btn key"
                                  onClick={() => setResetPasswordModal(emp)}
                                  title="Set or reset login password"
                                >
                                  <KeyIcon size={14} />
                                  <span>Set Login</span>
                                </button>

                                <button
                                  className="action-btn delete"
                                  onClick={() => setDeleteModal(emp)}
                                  title="Delete employee"
                                >
                                  <TrashIcon size={14} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* ====================================================================
          MODAL: ADD / EDIT EMPLOYEE FORM
          ==================================================================== */}
      {formModalOpen && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => {
            setFormModalOpen(false);
            if (/^\/admin\/employees\/[^/]+$/.test(pathname)) {
              navigate("/admin/employees", true);
            }
          }}
          onDelete={() => {
            setFormModalOpen(false);
            setDeleteModal(editingEmployee);
          }}
          onManageAccess={() => setAccessModal(editingEmployee)}
          onSuccess={(result, isEdit) => {
            setFormModalOpen(false);
            if (/^\/admin\/employees\/[^/]+$/.test(pathname)) {
              navigate("/admin/employees", true);
            }
            loadEmployees();
            if (isEdit) {
              showToast("Employee details updated successfully.", "success");
            } else {
              showToast(
                result.message || "Employee record created successfully!",
                "success",
              );
            }
          }}
          showToast={showToast}
        />
      )}

      {/* ====================================================================
          MODAL: SET / RESET EMPLOYEE LOGIN PASSWORD (ADMIN ACTION)
          ==================================================================== */}
      {resetPasswordModal && (
        <SetPasswordModal
          employee={resetPasswordModal}
          onClose={() => setResetPasswordModal(null)}
          onSuccess={(msg) => {
            setResetPasswordModal(null);
            showToast(msg, "success");
          }}
          showToast={showToast}
        />
      )}

      {/* ====================================================================
          MODAL: DELETE CONFIRMATION DIALOG
          ==================================================================== */}
      {deleteModal && (
        <DeleteConfirmModal
          employee={deleteModal}
          onClose={() => setDeleteModal(null)}
          onSuccess={() => {
            setDeleteModal(null);
            if (/^\/admin\/employees\/[^/]+$/.test(pathname)) {
              navigate("/admin/employees", true);
            }
            loadEmployees();
            showToast("Employee and linked account deleted safely.", "success");
          }}
          showToast={showToast}
        />
      )}
      {accessModal && (
        <EmployeeAccessModal
          employee={accessModal}
          onClose={() => setAccessModal(null)}
          onSuccess={(result) => handleAccessStatusChange(accessModal, result)}
          showToast={showToast}
        />
      )}
      {reviewRequest && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setReviewRequest(null);
          }}
        >
          <section
            className="modal-card account-request-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-request-review-title"
          >
            <div className="modal-header">
              <div>
                <h3 id="account-request-review-title">Review account request</h3>
                <p className="subtext">Submitted employee details</p>
              </div>
              <button
                type="button"
                className="btn-icon"
                aria-label="Close request review"
                onClick={() => setReviewRequest(null)}
              >
                <XIcon size={18} />
              </button>
            </div>
            <dl className="account-request-details">
              <div><dt>Name</dt><dd>{reviewRequest.name || "—"}</dd></div>
              <div><dt>Email</dt><dd>{reviewRequest.email || "—"}</dd></div>
              <div><dt>Department</dt><dd>{reviewRequest.department || "General"}</dd></div>
              <div><dt>Request ID</dt><dd>{reviewRequest.id}</dd></div>
              {reviewRequest.created_at && (
                <div>
                  <dt>Submitted</dt>
                  <dd>
                    {Number.isNaN(Date.parse(reviewRequest.created_at))
                      ? reviewRequest.created_at
                      : new Date(reviewRequest.created_at).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
            <div className="account-request-review-actions">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => declineAccount(reviewRequest)}
              >
                Decline request
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => approveAccount(reviewRequest)}
              >
                Approve request
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// 7. ADD / EDIT EMPLOYEE MODAL
// ==========================================================================

function EmployeeFormModal({ employee, onClose, onDelete, onManageAccess, onSuccess, showToast }) {
  const isEdit = Boolean(employee);
  const [form, setForm] = useState({
    name: employee?.name || "",
    email: employee?.email || "",
    department: employee?.department || "",
    contact_number: employee?.contact_number || "",
    address: employee?.address || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload = isEdit
        ? {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            department: form.department.trim(),
            contact_number: form.contact_number.trim(),
            address: form.address.trim(),
          }
        : { email: form.email.trim().toLowerCase() };

      let result;
      if (isEdit) {
        const id = getEmployeeId(employee);
        result = await api(`/employees/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        result = await api("/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      onSuccess(result, isEdit);
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3>{isEdit ? "Edit Employee Details" : "Add New Employee"}</h3>
            <p className="subtext">
              {isEdit
                ? `Employee ID: ${employee.employee_id || getEmployeeId(employee)}`
                : "Enter the employee's email to send a one-time account invitation."}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="toast-item error" style={{ minWidth: "auto", marginBottom: "1rem" }}>
                <AlertCircleIcon size={18} />
                <span>{error}</span>
              </div>
            )}

            {isEdit && (
              <div className="form-group">
                <label className="form-label">Login access</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span className={`badge ${employee.account_status === "deactivated" ? "badge-amber" : employee.account_status === "approved" ? "badge-emerald" : "badge-gray"}`}>
                    {employee.account_status === "deactivated"
                      ? "Temporarily deactivated"
                      : employee.account_status === "approved"
                        ? "Approved"
                        : employee.account_status === "pending"
                          ? "Pending approval"
                          : "No account"}
                  </span>
                  {["approved", "deactivated"].includes(employee.account_status) ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onManageAccess}
                      disabled={saving}
                    >
                      <ShieldIcon size={14} />
                      <span>{employee.account_status === "deactivated" ? "Reactivate access" : "Deactivate temporarily"}</span>
                    </button>
                  ) : (
                    <span className="subtext">Temporary deactivation is available after approval.</span>
                  )}
                  {employee.account_status === "deactivated" && employee.deactivated_until && (
                    <span className="subtext">
                      Access returns {new Date(employee.deactivated_until).toLocaleString()}.
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="emp-email">Work Email *</label>
              <input
                id="emp-email"
                name="email"
                type="email"
                className="input-field no-icon"
                placeholder="e.g. s.jenkins@company.com"
                value={form.email}
                onChange={handleChange}
                maxLength={254}
                required
              />
            </div>

            {isEdit && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="emp-name">Full Name *</label>
                  <input
                    id="emp-name"
                    name="name"
                    type="text"
                    className="input-field no-icon"
                    placeholder="e.g. Sarah Jenkins"
                    value={form.name}
                    onChange={handleChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="emp-dept">Department *</label>
                  <input
                    id="emp-dept"
                    name="department"
                    type="text"
                    className="input-field no-icon"
                    placeholder="e.g. Engineering, Human Resources, Finance"
                    value={form.department}
                    onChange={handleChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="emp-contact">Contact Number</label>
                  <input
                    id="emp-contact"
                    name="contact_number"
                    type="tel"
                    className="input-field no-icon"
                    placeholder="e.g. +1 (555) 234-5678"
                    value={form.contact_number}
                    onChange={handleChange}
                    maxLength={50}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="emp-address">Physical Address</label>
                  <textarea
                    id="emp-address"
                    name="address"
                    rows={2}
                    className="input-field no-icon"
                    placeholder="e.g. 742 Evergreen Terrace, Springfield"
                    value={form.address}
                    onChange={handleChange}
                    maxLength={500}
                  />
                </div>
              </>
            )}

            {isEdit && (
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label className="form-label">Attached Resume PDF</label>
                {employee?.resume_original_name ? (
                  <div
                    className="resume-file-card"
                    style={{ padding: "0.75rem 1rem", marginTop: "0.25rem" }}
                  >
                    <div className="resume-file-info">
                      <div className="resume-pdf-badge" style={{ width: 34, height: 34 }}>
                        <FileTextIcon size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0f172a" }}>
                          {employee.resume_original_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {employee.resume_size_bytes
                            ? `${Math.round(employee.resume_size_bytes / 1024)} KB`
                            : "PDF Document"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
                      onClick={async () => {
                        try {
                          await downloadFile(`/employees/${getEmployeeId(employee)}/resume`);
                        } catch (err) {
                          showToast(getErrorMessage(err), "error");
                        }
                      }}
                    >
                      <FileTextIcon size={14} />
                      <span>View PDF</span>
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px dashed #cbd5e1",
                      fontSize: "0.82rem",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FileTextIcon size={16} />
                    <span>No resume uploaded by this employee yet.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {isEdit && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onDelete}
                disabled={saving}
              >
                <TrashIcon size={14} />
                <span>Delete Employee</span>
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <RefreshCwIcon size={16} className="animate-spin" />
                  <span>{isEdit ? "Saving..." : "Sending invitation..."}</span>
                </>
              ) : (
                <span>{isEdit ? "Save Changes" : "Send Invitation"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeAccessModal({ employee, onClose, onSuccess, showToast }) {
  const [durationDays, setDurationDays] = useState("7");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isDeactivated = employee.account_status === "deactivated";

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const id = getEmployeeId(employee);
      const result = await api(
        isDeactivated
          ? `/employees/${id}/reactivate`
          : `/employees/${id}/deactivate`,
        {
          method: "POST",
          ...(isDeactivated
            ? {}
            : {
                body: JSON.stringify({
                  duration_days: Number(durationDays),
                }),
              }),
        },
      );
      onSuccess(result);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="access-modal-title">
        <div className="modal-header">
          <div>
            <h3 id="access-modal-title">
              {isDeactivated ? "Reactivate employee access" : "Temporarily deactivate access"}
            </h3>
            <p className="subtext">
              {employee.name} · {employee.employee_id}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="toast-item error" style={{ minWidth: "auto", marginBottom: "1rem" }}>
                <AlertCircleIcon size={18} />
                <span>{error}</span>
              </div>
            )}
            {isDeactivated ? (
              <p>
                Restore sign-in access now? The scheduled reactivation date is{" "}
                {employee.deactivated_until
                  ? new Date(employee.deactivated_until).toLocaleString()
                  : "in the future"}.
              </p>
            ) : (
              <>
                <p>
                  This blocks the employee from signing in and using protected features.
                  Access will automatically return after the selected period.
                </p>
                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label className="form-label" htmlFor="deactivation-duration">
                    Deactivate for
                  </label>
                  <select
                    id="deactivation-duration"
                    className="toolbar-select"
                    value={durationDays}
                    onChange={(event) => setDurationDays(event.target.value)}
                  >
                    <option value="1">1 day</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className={isDeactivated ? "btn btn-primary" : "btn btn-danger"}
              disabled={saving}
            >
              {saving ? "Saving..." : isDeactivated ? "Reactivate access" : "Deactivate access"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

// ==========================================================================
// 9. SET / RESET EMPLOYEE PASSWORD MODAL (ADMIN ACTION)
// ==========================================================================

function SetPasswordModal({ employee, onClose, onSuccess, showToast }) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const id = getEmployeeId(employee);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const res = await api(`/employees/${id}/account`, {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });

      onSuccess(res?.message || `Login password set successfully for ${employee.name}.`);
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <h3>Set / Reset Employee Password</h3>
            <p className="subtext">Update login credentials for {employee.name}</p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="toast-item error" style={{ minWidth: "auto", marginBottom: "1rem" }}>
                <AlertCircleIcon size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Employee Email</label>
              <input
                type="text"
                className="input-field no-icon"
                value={employee.email}
                disabled
                style={{ background: "#f1f5f9", color: "#64748b" }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reset-new-password">
                New Password (minimum 8 characters)
              </label>
              <div className="input-container">
                <KeyIcon size={18} className="input-icon-left" />
                <input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  className="input-field"
                  placeholder="Enter new secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            <p className="caption" style={{ marginTop: "0.5rem" }}>
              This will overwrite the employee's existing password and allow them to log in immediately.
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================================================
// 10. DELETE CONFIRMATION MODAL
// ==========================================================================

function DeleteConfirmModal({ employee, onClose, onSuccess, showToast }) {
  const [deleting, setDeleting] = useState(false);
  const id = getEmployeeId(employee);

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await api(`/employees/${id}`, {
        method: "DELETE",
      });
      onSuccess();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#fee2e2", color: "#e11d48", display: "grid", placeItems: "center" }}>
              <TrashIcon size={18} />
            </div>
            <div>
              <h3>Delete Employee Record</h3>
              <p className="subtext">This action cannot be undone</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.6 }}>
            Are you sure you want to permanently delete <strong>{employee.name}</strong> (<code>{employee.email}</code>)?
          </p>
          <p className="subtext" style={{ marginTop: "0.65rem" }}>
            This will remove their employee record and delete their linked login account from MongoDB.
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Yes, Delete Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// 11. EMPLOYEE SELF-SERVICE DASHBOARD
// ==========================================================================

function EmployeeDashboard({ user, onLogout, showToast }) {
  const [profile, setProfile] = useState({
    name: user.name || "",
    email: user.email || "",
    department: "",
    contact_number: "",
    address: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await api("/employees/me");
      setProfile({
        name: data.name || "",
        email: data.email || "",
        department: data.department || "",
        contact_number: data.contact_number || "",
        address: data.address || "",
        employee_id: data.employee_id || "",
        profile_image: data.profile_image || "",
        resume_original_name: data.resume_original_name || null,
        resume_uploaded_at: data.resume_uploaded_at || null,
        resume_size_bytes: data.resume_size_bytes || null,
      });
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleProfilePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Choose a PNG, JPEG, or WebP image.", "error");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Profile image must be smaller than 2MB.", "error");
      event.target.value = "";
      return;
    }

    setUploadingProfilePhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await api("/employees/me/photo", {
          method: "PUT",
          body: JSON.stringify({ file_data: reader.result }),
        });
        setProfile((current) => ({
          ...current,
          profile_image: result.profile_image,
        }));
        showToast("Profile photo updated.", "success");
      } catch (err) {
        showToast(getErrorMessage(err), "error");
      } finally {
        setUploadingProfilePhoto(false);
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      showToast("Could not read the selected image.", "error");
      setUploadingProfilePhoto(false);
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  }

  async function handleRemoveProfilePhoto() {
    try {
      await api("/employees/me/photo", { method: "DELETE" });
      setProfile((current) => ({ ...current, profile_image: "" }));
      showToast("Profile photo removed.", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  async function handleResumeUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showToast("Only PDF documents (.pdf) are accepted for resumes.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Resume must be smaller than 5MB.", "error");
      return;
    }

    setUploadingResume(true);
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const result = await api("/employees/me/resume", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            file_data: reader.result,
          }),
        });

        setProfile((prev) => ({
          ...prev,
          resume_original_name: result.resume_original_name,
          resume_uploaded_at: result.resume_uploaded_at,
          resume_size_bytes: result.resume_size_bytes,
        }));

        showToast("Resume PDF uploaded successfully!", "success");
      } catch (err) {
        showToast(getErrorMessage(err), "error");
      } finally {
        setUploadingResume(false);
        // Reset file input value
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      showToast("Failed to read the selected file.", "error");
      setUploadingResume(false);
    };

    reader.readAsDataURL(file);
  }

  async function handleViewResume() {
    try {
      await downloadFile("/employees/me/resume");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  async function handleDeleteResume() {
    const confirmed = window.confirm(
      "Are you sure you want to remove your uploaded resume?"
    );
    if (!confirmed) return;

    try {
      await api("/employees/me/resume", { method: "DELETE" });
      setProfile((prev) => ({
        ...prev,
        resume_original_name: null,
        resume_uploaded_at: null,
        resume_size_bytes: null,
      }));
      showToast("Resume removed successfully.", "info");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }


  function handleProfileChange(e) {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  }

  function handlePasswordChange(e) {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const updated = await api("/employees/me", {
        method: "PUT",
        body: JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim().toLowerCase(),
          department: profile.department.trim(),
          contact_number: profile.contact_number.trim(),
          address: profile.address.trim(),
        }),
      });

      setProfile((prev) => ({ ...prev, ...updated }));
      showToast("Your profile details were updated successfully.", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (passwordForm.new_password.length < 8) {
      showToast("New password must be at least 8 characters.", "error");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast("New password and confirmation do not match.", "error");
      return;
    }

    setSavingPassword(true);

    try {
      await api("/employees/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      showToast("Password updated successfully!", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Top Navbar */}
      <header className="ems-topbar">
        <div className="topbar-left">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon" style={{ width: 34, height: 34 }}>
              <UsersIcon size={18} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
              Employee Management System — Employee Portal
            </span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="topbar-profile">
            <ProfilePhotoControl
              image={profile.profile_image}
              initials={getInitials(profile.name || user.email)}
              uploading={uploadingProfilePhoto}
              onUpload={handleProfilePhotoUpload}
              onRemove={handleRemoveProfilePhoto}
            />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
              {profile.name || user.email}
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", marginLeft: "0.5rem" }}
              onClick={onLogout}
            >
              <LogOutIcon size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="ems-content-area">
        {/* Welcome Hero Banner */}
        <section className="employee-hero-card">
          <div className="employee-hero-left">
            <ProfilePhotoControl
              image={profile.profile_image}
              initials={getInitials(profile.name || user.email)}
              uploading={uploadingProfilePhoto}
              onUpload={handleProfilePhotoUpload}
              onRemove={handleRemoveProfilePhoto}
              large
            />
            <div>
              <div className="employee-hero-title">
                Welcome back, {profile.name || "Employee"}!
              </div>
              <div className="employee-hero-meta">
                <span>{profile.email}</span>
                <span>&bull;</span>
                <span className="badge badge-indigo">
                  {profile.department || "Employee"}
                </span>
              </div>
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <span className="badge badge-gray">
                  Employee ID: {loading ? "Loading..." : profile.employee_id || "Not assigned"}
                </span>
              </div>
            </div>
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
            Last Session: {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </section>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#64748b" }}>
            <RefreshCwIcon size={24} className="animate-spin" style={{ margin: "0 auto 0.75rem" }} />
            <p>Loading your personal profile...</p>
          </div>
        ) : (
          <>
            <div className="employee-grid-layout">
            {/* Left Card: Edit Profile */}
            <div className="panel-card">
              <div className="panel-card-header">
                <div className="panel-title-group">
                  <h2>Personal Information</h2>
                  <p>View and update your registered contact details.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} style={{ padding: "1.5rem" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="prof-name">Name / Username</label>
                  <input
                    id="prof-name"
                    name="name"
                    className="input-field no-icon"
                    value={profile.name}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="prof-email">Email Address</label>
                  <input
                    id="prof-email"
                    name="email"
                    type="email"
                    className="input-field no-icon"
                    value={profile.email}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="prof-dept">Department</label>
                  <input
                    id="prof-dept"
                    name="department"
                    className="input-field no-icon"
                    value={profile.department}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="prof-contact">Contact Number</label>
                  <input
                    id="prof-contact"
                    name="contact_number"
                    className="input-field no-icon"
                    value={profile.contact_number}
                    onChange={handleProfileChange}
                    placeholder="Add phone number"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="prof-address">Location</label>
                  <textarea
                    id="prof-address"
                    name="address"
                    rows={2}
                    className="input-field no-icon"
                    value={profile.address}
                    onChange={handleProfileChange}
                    placeholder="Add address"
                  />
                </div>

                <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                    {savingProfile ? "Saving Details..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Card: Change Password */}
            <div className="panel-card">
              <div className="panel-card-header">
                <div className="panel-title-group">
                  <h2>Account Security</h2>
                  <p>Update your portal access password.</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} style={{ padding: "1.5rem" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="curr-pass">Current Password</label>
                  <div className="input-container">
                    <KeyIcon size={18} className="input-icon-left" />
                    <input
                      id="curr-pass"
                      name="current_password"
                      type="password"
                      className="input-field"
                      placeholder="Enter current password"
                      value={passwordForm.current_password}
                      onChange={handlePasswordChange}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="new-pass">New Password (min 8 chars)</label>
                  <div className="input-container">
                    <KeyIcon size={18} className="input-icon-left" />
                    <input
                      id="new-pass"
                      name="new_password"
                      type="password"
                      className="input-field"
                      placeholder="Enter new password"
                      value={passwordForm.new_password}
                      onChange={handlePasswordChange}
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="conf-pass">Confirm New Password</label>
                  <div className="input-container">
                    <KeyIcon size={18} className="input-icon-left" />
                    <input
                      id="conf-pass"
                      name="confirm_password"
                      type="password"
                      className="input-field"
                      placeholder="Re-enter new password"
                      value={passwordForm.confirm_password}
                      onChange={handlePasswordChange}
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div className="auth-hint-box" style={{ marginTop: "1.5rem" }}>
                  <ShieldIcon size={18} style={{ color: "#4f46e5", flexShrink: 0 }} />
                  <span>
                    Your password should be at least 8 characters long and kept confidential.
                  </span>
                </div>

                <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                    {savingPassword ? "Updating Password..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Full-Width Card: Resume PDF Upload & Storage */}
          <div className="panel-card" style={{ marginTop: "1.75rem" }}>
            <div className="panel-card-header">
              <div className="panel-title-group">
                <h2>Resume & Professional Documents</h2>
                <p>Upload and store your CV or resume in PDF format (maximum 5MB).</p>
              </div>
              {profile.resume_original_name && (
                <span className="badge badge-emerald">Resume Active</span>
              )}
            </div>

            <div style={{ padding: "1.5rem" }}>
              {profile.resume_original_name ? (
                <div className="resume-file-card">
                  <div className="resume-file-info">
                    <div className="resume-pdf-badge">
                      <FileTextIcon size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                        {profile.resume_original_name}
                      </div>
                      <div style={{ fontSize: "0.775rem", color: "#64748b", marginTop: "0.25rem" }}>
                        {profile.resume_size_bytes
                          ? `${Math.round(profile.resume_size_bytes / 1024)} KB`
                          : "PDF Document"}{" "}
                        &bull; Uploaded on{" "}
                        {new Date(profile.resume_uploaded_at || Date.now()).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleViewResume}
                    >
                      <FileTextIcon size={16} />
                      <span>View / Download Resume</span>
                    </button>

                    <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
                      <UploadCloudIcon size={16} />
                      <span>{uploadingResume ? "Uploading..." : "Replace Resume"}</span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        style={{ display: "none" }}
                        onChange={handleResumeUpload}
                        disabled={uploadingResume}
                      />
                    </label>

                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleDeleteResume}
                      title="Delete uploaded resume"
                    >
                      <TrashIcon size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="resume-dropzone">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    style={{ display: "none" }}
                    onChange={handleResumeUpload}
                    disabled={uploadingResume}
                  />
                  <div
                    className="stat-icon-wrapper stat-icon-indigo"
                    style={{ width: 54, height: 54, margin: "0 auto 1rem", borderRadius: "50%" }}
                  >
                    {uploadingResume ? (
                      <RefreshCwIcon size={24} className="animate-spin" />
                    ) : (
                      <UploadCloudIcon size={26} />
                    )}
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0f172a",
                      fontSize: "1.05rem",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {uploadingResume
                      ? "Uploading and storing resume..."
                      : "Click to select and upload your resume PDF"}
                  </div>
                  <p className="subtext">
                    Supported format: <strong>.PDF</strong> (up to 5MB). Stored securely with your
                    employee profile.
                  </p>
                </label>
              )}
            </div>
          </div>
          </>
        )}
      </main>
    </div>
  );
}
