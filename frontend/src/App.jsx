import { useEffect, useState, useMemo } from "react";
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

function CopyIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
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

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      const token = localStorage.getItem("employee_app_token");

      if (!token) {
        if (active) setCheckingAuth(false);
        return;
      }

      try {
        const account = await api("/auth/me");
        if (active) setUser(account);
      } catch {
        clearToken();
        if (active) setUser(null);
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    checkLogin();

    return () => {
      active = false;
    };
  }, []);

  function handleLogin(account) {
    setUser(account);
    showToast(`Welcome back, ${account.name || account.email}!`, "success");
  }

  function handleLogout() {
    clearToken();
    setUser(null);
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

  return (
    <>
      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : user.role === "admin" ? (
        <AdminDashboard user={user} onLogout={handleLogout} showToast={showToast} />
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

// ==========================================================================
// 5. LOGIN PAGE (MODERN ENTERPRISE SPLIT SCREEN)
// ==========================================================================

function LoginPage({ onLogin }) {
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (result.role !== role) {
        throw new Error(
          `This account has the role "${result.role}". Please switch to ${result.role === "admin" ? "Admin" : "Employee"} Login.`
        );
      }

      saveToken(result.access_token);

      const account = await api("/auth/me");
      onLogin(account);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split-wrapper">
      {/* Left Column: Brand Hero Banner */}
      <section className="auth-hero-panel">
        <div className="auth-brand">
          <div className="brand-icon-box">
            <UsersIcon size={24} />
          </div>
          <div>
            <div className="brand-text-title">Employee Management System</div>
            <div className="brand-text-subtitle">Enterprise Suite</div>
          </div>
        </div>

        <div className="auth-hero-content">
          <div className="auth-hero-badge">
            <ShieldIcon size={14} />
            <span>Secure Enterprise Workspace</span>
          </div>
          <h1 className="auth-hero-title">
            Employee <span>Management System.</span>
          </h1>
          <p className="auth-hero-desc">
            Empower your HR administration with real-time employee tracking, instant credentials generation, role-based controls, and seamless department management.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-check"><CheckIcon size={14} /></div>
              <span>Role-Based Access Control (Admin & Employee)</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-check"><CheckIcon size={14} /></div>
              <span>Automatic Temporary Credential Provisioning</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-check"><CheckIcon size={14} /></div>
              <span>JWT Authentication & MongoDB Atlas Backend</span>
            </div>
          </div>
        </div>

        <div className="auth-hero-footer">
          <span>&copy; {new Date().getFullYear()} Employee Management System</span>
          <span>Enterprise Portal</span>
        </div>
      </section>

      {/* Right Column: Clean Login Form */}
      <section className="auth-form-panel">
        <div className="auth-card-inner">
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p className="subtext">Please select your role and sign in to your portal.</p>
          </div>

          {/* Role Tabs */}
          <div className="role-tab-group">
            <button
              type="button"
              className={`role-tab-btn ${role === "admin" ? "active" : ""}`}
              onClick={() => {
                setRole("admin");
                setError("");
              }}
            >
              <ShieldIcon size={16} />
              <span>Admin Login</span>
            </button>
            <button
              type="button"
              className={`role-tab-btn ${role === "employee" ? "active" : ""}`}
              onClick={() => {
                setRole("employee");
                setError("");
              }}
            >
              <UsersIcon size={16} />
              <span>Employee Login</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="toast-item error" style={{ minWidth: "auto", marginBottom: "1.25rem" }}>
              <AlertCircleIcon size={18} />
              <span style={{ fontSize: "0.825rem" }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Work Email Address
              </label>
              <div className="input-container">
                <MailIcon size={18} className="input-icon-left" />
                <input
                  id="login-email"
                  type="email"
                  className="input-field"
                  placeholder={role === "admin" ? "admin@company.com" : "employee@company.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <div className="input-container">
                <KeyIcon size={18} className="input-icon-left" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="input-field"
                  placeholder="Enter your secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCwIcon size={16} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In as {role === "admin" ? "Administrator" : "Employee"}</span>
              )}
            </button>
          </form>

          <div className="auth-hint-box">
            <ShieldIcon size={18} style={{ color: "#4f46e5", flexShrink: 0 }} />
            <span>
              {role === "admin"
                ? "Admin accounts have full oversight to provision, update, and manage company records."
                : "Employees should use the registered email and temporary password provided by your company admin."}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

// ==========================================================================
// 6. ADMIN DASHBOARD & EMPLOYEE MANAGEMENT
// ==========================================================================

function AdminDashboard({ user, onLogout, showToast }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'employees'

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [tempPasswordModal, setTempPasswordModal] = useState(null); // { name, email, password }
  const [resetPasswordModal, setResetPasswordModal] = useState(null); // employee object
  const [deleteModal, setDeleteModal] = useState(null); // employee object

  async function loadEmployees() {
    setLoading(true);
    try {
      const data = await api("/employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const departments = useMemo(() => {
    return [...new Set(employees.map((emp) => emp.department).filter(Boolean))].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const term = search.toLowerCase();
      const matchesSearch =
        (emp.name || "").toLowerCase().includes(term) ||
        (emp.email || "").toLowerCase().includes(term) ||
        (emp.department || "").toLowerCase().includes(term);

      const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
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
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="sidebar-nav-container">
            <div className="sidebar-section-title">Navigation</div>

            <button
              className={`sidebar-nav-link ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("dashboard");
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
                setActiveTab("employees");
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-nav-item-left">
                <UsersIcon size={18} />
                <span>Employees</span>
              </div>
              <span className="sidebar-pill">{employees.length}</span>
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
                {getInitials(user.name || user.email)}
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
            >
              <MenuIcon size={22} />
            </button>
            <div className="topbar-breadcrumbs">
              <span className="topbar-breadcrumb-parent">Admin Portal</span>
              <span style={{ color: "#cbd5e1" }}>/</span>
              <span className="topbar-breadcrumb-current">
                {activeTab === "dashboard" ? "Dashboard Overview" : "Employee Records"}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-status-chip">
              <span className="status-dot"></span>
              <span>FastAPI & Mongo Connected</span>
            </div>

            <div className="topbar-profile">
              <div
                className="avatar-chip"
                style={{ background: "#e0e7ff", color: "#4338ca", width: 34, height: 34 }}
              >
                {getInitials(user.name || user.email)}
              </div>
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
          {/* Stat Cards */}
          <section className="stats-grid">
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
                <div className="stat-info-title">Security & Role System</div>
                <div className="stat-info-value" style={{ fontSize: "1.45rem", color: "#059669" }}>
                  Active & Enforced
                </div>
                <div className="stat-info-desc">JWT Auth & Argon2/PasswordHash</div>
              </div>
              <div className="stat-icon-wrapper stat-icon-amber">
                <ShieldIcon size={24} />
              </div>
            </div>
          </section>

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
                    <span className="badge badge-emerald">Operational</span>
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
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        justifyContent: "flex-start",
                        gap: "0.75rem",
                      }}
                      onClick={handleOpenAdd}
                    >
                      <PlusIcon size={18} />
                      <span>Add New Employee</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        justifyContent: "flex-start",
                        gap: "0.75rem",
                      }}
                      onClick={() => setActiveTab("employees")}
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
                        <strong>System Health:</strong> Connected to MongoDB Atlas. Role-based JWT
                        authentication active.
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
                  <button className="btn btn-secondary" onClick={() => setActiveTab("employees")}>
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
                          <th>Employee</th>
                          <th>Department</th>
                          <th>Contact</th>
                          <th>Address</th>
                          <th>Resume</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees
                          .slice(-5)
                          .reverse()
                          .map((emp) => {
                            const id = getEmployeeId(emp);
                            const color = getAvatarColor(emp.name || emp.email);

                            return (
                              <tr key={id}>
                                <td>
                                  <div className="table-employee-cell">
                                    <div
                                      className="avatar-chip"
                                      style={{ backgroundColor: color.bg, color: color.text }}
                                    >
                                      {getInitials(emp.name)}
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
                                  <div
                                    className="table-actions-cell"
                                    style={{ justifyContent: "flex-end" }}
                                  >
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
                    placeholder="Search by name, email, or department..."
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
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Contact Number</th>
                        <th>Address</th>
                        <th>Resume</th>
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
                              <div className="table-employee-cell">
                                <div
                                  className="avatar-chip"
                                  style={{ backgroundColor: color.bg, color: color.text }}
                                >
                                  {getInitials(emp.name)}
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
                              <div
                                className="table-actions-cell"
                                style={{ justifyContent: "flex-end" }}
                              >
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
          onClose={() => setFormModalOpen(false)}
          onSuccess={(result, isEdit) => {
            setFormModalOpen(false);
            loadEmployees();
            if (isEdit) {
              showToast("Employee details updated successfully.", "success");
            } else {
              showToast("Employee record created successfully!", "success");
              // Open temporary password dialog for newly created employee
              if (result?.temporary_password) {
                setTempPasswordModal({
                  name: result.name,
                  email: result.email,
                  password: result.temporary_password,
                });
              }
            }
          }}
          showToast={showToast}
        />
      )}

      {/* ====================================================================
          MODAL: TEMPORARY PASSWORD CREDENTIALS DIALOG (CRITICAL REQUIREMENT)
          ==================================================================== */}
      {tempPasswordModal && (
        <TemporaryPasswordModal
          data={tempPasswordModal}
          onClose={() => setTempPasswordModal(null)}
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
            loadEmployees();
            showToast("Employee and linked account deleted safely.", "success");
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ==========================================================================
// 7. ADD / EDIT EMPLOYEE MODAL
// ==========================================================================

function EmployeeFormModal({ employee, onClose, onSuccess, showToast }) {
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
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim(),
        contact_number: form.contact_number.trim(),
        address: form.address.trim(),
      };

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
                ? "Update organizational details for this employee."
                : "Creates employee record and automatically generates temporary login credentials."}
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
                required
              />
            </div>

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
              />
            </div>

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
                      onClick={() => downloadFile(`/employees/${getEmployeeId(employee)}/resume`)}
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
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <RefreshCwIcon size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEdit ? "Save Changes" : "Create Employee"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================================================
// 8. TEMPORARY PASSWORD MODAL (CRITICAL ENTERPRISE FEATURE)
// ==========================================================================

function TemporaryPasswordModal({ data, onClose, showToast }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!data?.password) return;
    navigator.clipboard.writeText(data.password);
    setCopied(true);
    showToast("Temporary password copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#ecfdf5", color: "#059669", display: "grid", placeItems: "center" }}>
              <CheckCircleIcon size={20} />
            </div>
            <div>
              <h3>Employee Account Provisioned</h3>
              <p className="subtext">Share these credentials with the new employee</p>
            </div>
          </div>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: "0.875rem", color: "#475569", lineHeight: 1.6, marginBottom: "1rem" }}>
            A user account for <strong>{data.name}</strong> (<code>{data.email}</code>) has been generated with role <strong>Employee</strong>.
          </p>

          <div className="credential-box">
            <div className="credential-field-label">One-Time Temporary Password</div>
            <div className="credential-value-display">
              <span>{data.password}</span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", background: copied ? "#059669" : "#4f46e5" }}
                onClick={handleCopy}
              >
                {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="auth-hint-box" style={{ marginTop: "1rem" }}>
            <AlertCircleIcon size={18} style={{ color: "#d97706", flexShrink: 0 }} />
            <span>
              <strong>Important:</strong> For security reasons, this plaintext password will not be displayed again. The employee will use this password to sign in via Employee Login.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: "100%" }}>
            I have securely saved/shared this password
          </button>
        </div>
      </div>
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

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await api("/employee/me");
      setProfile({
        name: data.name || "",
        email: data.email || "",
        department: data.department || "",
        contact_number: data.contact_number || "",
        address: data.address || "",
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
        const result = await api("/employee/me/resume", {
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
      await downloadFile("/employee/me/resume");
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
      await api("/employee/me/resume", { method: "DELETE" });
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
      const updated = await api("/employee/me", {
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
      await api("/employee/me/password", {
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
            <div
              className="avatar-chip"
              style={{ background: "#e0e7ff", color: "#4338ca", width: 34, height: 34 }}
            >
              {getInitials(profile.name || user.email)}
            </div>
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
            <div className="employee-big-avatar">
              {getInitials(profile.name || user.email)}
            </div>
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
                  <label className="form-label" htmlFor="prof-name">Full Name</label>
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
                  <label className="form-label" htmlFor="prof-address">Address</label>
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