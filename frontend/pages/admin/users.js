import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import { API_BASE } from "../../components/api";
import { authHeaders, getRole } from "../../components/auth";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create / Edit form state
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "DO", // creation ke liye default DO
  });
  const [editingUser, setEditingUser] = useState(null); // null => create mode

  // Reset password state
  const [resetUser, setResetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  const role = typeof window !== "undefined" ? getRole() : null;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // Ab yahan role filter nahi: saare users (ADMIN, SR_REGISTRAR, DO)
      const r = await axios.get(API_BASE + "/api/users", {
        headers: authHeaders(),
      });
      setUsers(r.data || []);
    } catch (e) {
      console.error(e);
      setError("Failed to load users. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  // ---------------- CREATE (NEW DO) ----------------
  const create = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!form.username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!form.password.trim()) {
      setError("Password is required.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        API_BASE + "/api/users",
        {
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          role: "DO", // is screen se sirf DO create hota hai
        },
        { headers: authHeaders() }
      );
      setSuccess("Dealing Officer (DO) user created successfully.");
      setForm({ username: "", email: "", password: "", role: "DO" });
      setEditingUser(null);
      load();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          "Could not save user. Username may already exist."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- UPDATE (ANY USER) ----------------
  const update = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    clearMessages();

    if (!form.username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.patch(
        `${API_BASE}/api/users/${editingUser.id}`,
        {
          username: form.username.trim(),
          email: form.email.trim(),
          role: form.role, // ADMIN SR_REGISTRAR DO sab update ho sakta
        },
        { headers: authHeaders() }
      );

      // Agar password bhi change karna ho to separate reset endpoint use hoga
      if (form.password && form.password.trim()) {
        await axios.post(
          `${API_BASE}/api/users/${editingUser.id}/reset-password`,
          { password: form.password.trim() },
          { headers: authHeaders() }
        );
      }

      setSuccess(`User "${editingUser.username}" updated successfully.`);
      setForm({ username: "", email: "", password: "", role: "DO" });
      setEditingUser(null);
      load();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          "Could not save user. Username may already exist."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- FORM SUBMIT HANDLER ----------------
  const handleSubmit = (e) => {
    if (editingUser) return update(e);
    return create(e);
  };

  // ---------------- GENERATORS ----------------
  const generatePassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    setForm((f) => ({ ...f, password: pwd }));
    setSuccess(
      "Random password generated. Please share it securely with the user."
    );
    setError("");
  };

  const generateResetPassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    setResetPassword(pwd);
  };

  // ---------------- RESET PASSWORD (ADMIN) ----------------
  const submitResetPassword = async () => {
    if (!resetUser) return;
    clearMessages();

    if (!resetPassword.trim()) {
      setError("New password is required for reset.");
      return;
    }

    try {
      setResetSubmitting(true);
      await axios.post(
        `${API_BASE}/api/users/${resetUser.id}/reset-password`,
        { password: resetPassword.trim() },
        { headers: authHeaders() }
      );
      setSuccess(`Password reset for user "${resetUser.username}" successfully.`);
      setResetUser(null);
      setResetPassword("");
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || "Failed to reset password. Please try again."
      );
    } finally {
      setResetSubmitting(false);
    }
  };

  // ---------------- DELETE (ANY USER) ----------------
  const deleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete "${user.username}"?`)) {
      return;
    }
    clearMessages();
    setDeletingId(user.id);
    try {
      await axios.delete(`${API_BASE}/api/users/${user.id}`, {
        headers: authHeaders(),
      });
      setSuccess(`User "${user.username}" deleted successfully.`);
      if (resetUser && resetUser.id === user.id) {
        setResetUser(null);
        setResetPassword("");
      }
      if (editingUser && editingUser.id === user.id) {
        setEditingUser(null);
        setForm({ username: "", email: "", password: "", role: "DO" });
      }
      load();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || "Failed to delete user. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ---------------- ACCESS CONTROL ----------------
  if (role !== "ADMIN") {
    return (
      <AdminLayout>
        <div className="card">
          <h1 style={{ fontSize: "1.2rem", color: "#DC2626" }}>Access Denied</h1>
          <p style={{ color: "#666" }}>
            Only Main Admin can manage users.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div
        className="card"
        style={{ background: "white", borderRadius: 10, padding: "1.4rem" }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1rem",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.3rem",
                color: "#0C512F",
                marginBottom: "0.2rem",
              }}
            >
              Manage Users
            </h1>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", margin: 0 }}>
              Create DO users and edit Admin / SR. Registrar / DO accounts.
            </p>
          </div>

          <div
            style={{
              fontSize: "0.8rem",
              padding: "0.25rem 0.6rem",
              borderRadius: 999,
              background: "#ECFDF3",
              color: "#166534",
              border: "1px solid #BBF7D0",
              whiteSpace: "nowrap",
            }}
          >
            Total Users: <strong>{users.length}</strong>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div
            style={{
              background: "#FEE2E2",
              borderRadius: 6,
              padding: "0.5rem 0.75rem",
              color: "#B91C1C",
              fontSize: "0.85rem",
              marginBottom: "0.6rem",
              border: "1px solid #FCA5A5",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "#DCFCE7",
              borderRadius: 6,
              padding: "0.5rem 0.75rem",
              color: "#166534",
              fontSize: "0.85rem",
              marginBottom: "0.6rem",
              border: "1px solid #86EFAC",
            }}
          >
            {success}
          </div>
        )}

        {/* CREATE / EDIT FORM */}
        <div
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            padding: "0.9rem",
            marginBottom: "1.1rem",
            background: "#F9FAFB",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              color: "#0C512F",
              marginBottom: "0.6rem",
            }}
          >
            {editingUser ? "Edit User" : "Create New DO User"}
          </h2>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "0.6rem 0.8rem",
              alignItems: "flex-end",
            }}
          >
            {/* Username */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: 4,
                  color: "#4B5563",
                }}
              >
                Username
              </label>
              <input
                className="input"
                placeholder="eg. do_lahore"
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
              />
              <small style={{ fontSize: "0.7rem", color: "#6B7280" }}>
                Used to login. Must be unique.
              </small>
            </div>

            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: 4,
                  color: "#4B5563",
                }}
              >
                Official Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="eg. do.lhr@ogra.org.pk"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              <small style={{ fontSize: "0.7rem", color: "#6B7280" }}>
                Used for email notifications.
              </small>
            </div>

            {/* Password + generator */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: 4,
                  color: "#4B5563",
                }}
              >
                {editingUser ? "New Password (optional)" : "Password"}
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.35rem",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  className="input"
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current password"
                      : "Set or generate password"
                  }
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="btn"
                  onClick={generatePassword}
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: "0.75rem",
                    padding: "0.35rem 0.6rem",
                    borderRadius: 6,
                    border: "1px solid #D1D5DB",
                    background: "white",
                  }}
                >
                  Generate
                </button>
              </div>
              <small style={{ fontSize: "0.7rem", color: "#6B7280" }}>
                {editingUser
                  ? "If you set a new password here, it will overwrite the old one."
                  : "Share password securely with the user."}
              </small>
            </div>

            {/* Role (only visible in edit; create is fixed DO) */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  marginBottom: 4,
                  color: "#4B5563",
                }}
              >
                Role
              </label>
              <select
                className="input"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
              >
                <option value="DO">DO</option>
                <option value="SR_REGISTRAR">SR_REGISTRAR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <small style={{ fontSize: "0.7rem", color: "#6B7280" }}>
                For new users this screen is intended for DO accounts.
              </small>
            </div>

            {/* Submit + Cancel Edit */}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.5rem" }}>
              <button
                className="btn-primary"
                style={{
                  border: "none",
                  padding: "0.55rem 0.9rem",
                  borderRadius: 6,
                  background: "#0C512F",
                  color: "white",
                  fontSize: "0.85rem",
                }}
                disabled={submitting}
                type="submit"
              >
                {submitting
                  ? editingUser
                    ? "Updating..."
                    : "Creating..."
                  : editingUser
                  ? "Update User"
                  : "Create DO User"}
              </button>

              {editingUser && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditingUser(null);
                    setForm({ username: "", email: "", password: "", role: "DO" });
                    clearMessages();
                  }}
                  style={{
                    padding: "0.55rem 0.9rem",
                    borderRadius: 6,
                    border: "1px solid #D1D5DB",
                    background: "white",
                    fontSize: "0.8rem",
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* USERS LIST */}
        <div>
          <h2
            style={{
              fontSize: "1rem",
              color: "#0C512F",
              marginBottom: "0.5rem",
            }}
          >
            Existing Users
          </h2>

          {loading ? (
            <div style={{ fontSize: "0.9rem", color: "#4B5563" }}>
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div style={{ fontSize: "0.85rem", color: "#6B7280" }}>
              No users created yet.
            </div>
          ) : (
            <>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                  marginTop: "0.4rem",
                }}
              >
                <thead>
                  <tr style={{ background: "#0C512F", color: "white" }}>
                    <th align="left" style={{ padding: "8px" }}>
                      Username
                    </th>
                    <th align="left" style={{ padding: "8px" }}>
                      Email
                    </th>
                    <th align="left" style={{ padding: "8px" }}>
                      Role
                    </th>
                    <th align="left" style={{ padding: "8px" }}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((u, idx) => (
                    <tr
                      key={u.id}
                      style={{
                        borderTop: "1px solid #E5E7EB",
                        background:
                          idx % 2 === 0
                            ? "white"
                            : "rgba(249, 250, 251, 0.9)",
                      }}
                    >
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{ fontWeight: 500 }}>{u.username}</span>
                      </td>
                      <td style={{ padding: "6px 8px", color: "#374151" }}>
                        {u.email || "-"}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: "0.7rem",
                            background: "#EFF6FF",
                            color: "#1D4ED8",
                            border: "1px solid #BFDBFE",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          display: "flex",
                          gap: "0.4rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setEditingUser(u);
                            setForm({
                              username: u.username || "",
                              email: u.email || "",
                              password: "",
                              role: u.role || "DO",
                            });
                            clearMessages();
                          }}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.6rem",
                            borderRadius: 6,
                            border: "1px solid #D1D5DB",
                            background: "white",
                            color: "#0C512F",
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setResetUser(u);
                            setResetPassword("");
                            clearMessages();
                          }}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.6rem",
                            borderRadius: 6,
                            border: "1px solid #D1D5DB",
                            background: "white",
                            color: "#0C512F",
                          }}
                        >
                          Reset Password
                        </button>

                        <button
                          type="button"
                          className="btn"
                          onClick={() => deleteUser(u)}
                          disabled={deletingId === u.id}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.6rem",
                            borderRadius: 6,
                            border: "1px solid #FCA5A5",
                            background: "#FEF2F2",
                            color: "#B91C1C",
                          }}
                        >
                          {deletingId === u.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* RESET PASSWORD PANEL */}
              {resetUser && (
                <div
                  style={{
                    marginTop: "0.9rem",
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                    padding: "0.9rem",
                    background: "#F9FAFB",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "0.95rem",
                        color: "#0C512F",
                        margin: 0,
                      }}
                    >
                      Reset Password for:{" "}
                      <span style={{ fontWeight: 600 }}>
                        {resetUser.username}
                      </span>
                    </h3>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setResetUser(null);
                        setResetPassword("");
                      }}
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.25rem 0.5rem",
                        borderRadius: 6,
                        border: "1px solid #D1D5DB",
                        background: "white",
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.6rem",
                      alignItems: "flex-end",
                    }}
                  >
                    <div style={{ flex: "1 1 220px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          marginBottom: 4,
                          color: "#4B5563",
                        }}
                      >
                        New Password
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Enter or generate new password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                      />
                      <small
                        style={{ fontSize: "0.7rem", color: "#6B7280" }}
                      >
                        Share this new password securely with the user.
                      </small>
                    </div>

                    <div>
                      <button
                        type="button"
                        className="btn"
                        onClick={generateResetPassword}
                        style={{
                          whiteSpace: "nowrap",
                          fontSize: "0.75rem",
                          padding: "0.4rem 0.7rem",
                          borderRadius: 6,
                          border: "1px solid #D1D5DB",
                          background: "white",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Generate Password
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={submitResetPassword}
                        disabled={resetSubmitting}
                        style={{
                          display: "block",
                          marginTop: "0.25rem",
                          border: "none",
                          padding: "0.45rem 0.8rem",
                          borderRadius: 6,
                          background: "#0C512F",
                          color: "white",
                          fontSize: "0.8rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {resetSubmitting ? "Saving..." : "Save New Password"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
