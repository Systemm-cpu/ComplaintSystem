// NEW OGRA THEME ADMIN LAYOUT
// ------------------------------------------------------------
// Sidebar: OGRA Green Dark (#0C512F)
// Hover / Active: OGRA Green (#3AA469)
// Text: White
// Animation: Smooth collapse on hover
// ------------------------------------------------------------

import Link from "next/link";
import { clearToken, getRole, getUsername } from "./auth";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }) {
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  // Load role + username only on client to avoid hydration issues
  useEffect(() => {
    setRole(getRole());
    setUsername(getUsername());
  }, []);

  const handleLogout = () => {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
  };

  const isAdmin = role === "ADMIN";
  const isRegistrar = role === "SR_REGISTRAR";
  const isDO = role === "DO";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f6f6f6",
        fontFamily: "sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        className="print-hidden"
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        style={{
          width: collapsed ? "70px" : "240px",
          background: "#0C512F",
          color: "white",
          transition: "width 0.25s ease",
          overflow: "hidden",
          boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
        }}
      >
        {/* LOGO AREA */}
        <div
          style={{
            padding: "1rem",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <img
            src="/ogra-logo.png" // image from /public
            alt="OGRA Logo"
            style={{
              width: "36px",
              height: "36px",
              objectFit: "contain",
            }}
          />

          {!collapsed && (
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  lineHeight: "1.2",
                }}
              >
                OGRA Dashboard
              </div>
              <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                {role === "ADMIN"
                  ? "REGISTRAR"
                  : `${username || "DO User"} (${role || "No Role"})`}
              </div>
            </div>
          )}
        </div>

        {/* NAVIGATION */}
        <nav style={{ padding: "0.75rem 0.5rem" }}>
          {/* Dashboard - visible to all */}
          <SidebarLink href="/admin" label="Dashboard" collapsed={collapsed} />

          {/* Complaints - visible to all roles once role known */}
          {(isAdmin || isRegistrar || isDO) && (
            <SidebarLink
              href="/admin/complaints"
              label="Complaints"
              collapsed={collapsed}
            />
          )}

          {/* DO Dashboard - visible to DO + ADMIN (Option A) */}
          {(isDO || isAdmin) && (
            <SidebarLink
              href="/admin/do"
              label="DO Dashboard"
              collapsed={collapsed}
            />
          )}

          {/* Company Dashboard - visible to ADMIN + SR_REGISTRAR */}
          {(isAdmin || isRegistrar) && (
            <SidebarLink
              href="/admin/company-dashboard"
              label="Company Dashboard"
              collapsed={collapsed}
            />
          )}

          {/* Manage Users + Form Settings - ADMIN ONLY */}
          {isAdmin && (
            <>
              <SidebarLink
                href="/admin/users"
                label="Manage Users"
                collapsed={collapsed}
              />
              <SidebarLink
                href="/admin/master-data"
                label="Form Settings"
                collapsed={collapsed}
              />
            </>
          )}
        </nav>

        {/* LOGOUT BUTTON */}
        <div
          style={{
            marginTop: "auto",
            padding: "1rem",
            borderTop: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "#3AA469",
              border: "none",
              borderRadius: "4px",
              color: "white",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {collapsed ? "⎋" : "Logout"}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          flex: 1,
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}

// Sidebar link component (clean + collapsible)
function SidebarLink({ href, label, collapsed }) {
  return (
    <div style={{ marginBottom: "0.3rem" }}>
      <Link
        href={href}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.45rem 0.6rem",
          borderRadius: "6px",
          textDecoration: "none",
          color: "white",
          fontSize: "0.85rem",
          transition: "background 0.2s, transform 0.1s",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            background: "#3AA469",
            borderRadius: "50%",
          }}
        ></span>

        {!collapsed && <span style={{ fontSize: "0.85rem" }}>{label}</span>}
      </Link>
    </div>
  );
}
