import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import { API_BASE } from "../../components/api";
import { authHeaders, getRole } from "../../components/auth";

function Section({ title, subtitle, items, onCreate, onDelete, busy }) {
  const [name, setName] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: "0.9rem",
        background: "white",
        borderRadius: 10,
        padding: "0.9rem 1rem",
        boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "0.7rem",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "0.95rem",
              color: "#0C512F",
              margin: 0,
              marginBottom: 2,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#6B7280",
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div
          style={{
            fontSize: "0.75rem",
            padding: "0.15rem 0.55rem",
            borderRadius: 999,
            background: "#F3F4F6",
            color: "#374151",
            border: "1px solid #E5E7EB",
            whiteSpace: "nowrap",
          }}
        >
          Total: <strong>{items.length}</strong>
        </div>
      </div>

      {/* Add form */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          alignItems: "center",
          marginBottom: "0.6rem",
        }}
      >
        <input
          className="input"
          placeholder="Enter new name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: "1 1 220px", minWidth: 0 }}
        />
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleAdd}
          disabled={!name.trim() || busy}
          style={{
            background: "#0C512F",
            border: "none",
            color: "white",
            padding: "0.4rem 0.9rem",
            borderRadius: 6,
            fontSize: "0.8rem",
            whiteSpace: "nowrap",
          }}
        >
          {busy ? "Saving…" : "Add"}
        </button>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div
          style={{
            fontSize: "0.8rem",
            color: "#6B7280",
            padding: "0.4rem 0.2rem",
          }}
        >
          No items added yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              fontSize: "0.8rem",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ background: "#0C512F", color: "white" }}>
                <th
                  align="left"
                  style={{ padding: "6px 8px", fontWeight: 500 }}
                >
                  ID
                </th>
                <th
                  align="left"
                  style={{ padding: "6px 8px", fontWeight: 500 }}
                >
                  Name
                </th>
                <th
                  align="left"
                  style={{ padding: "6px 8px", fontWeight: 500 }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr
                  key={i.id}
                  style={{
                    borderTop: "1px solid #E5E7EB",
                    background:
                      idx % 2 === 0 ? "white" : "rgba(249,250,251,0.9)",
                  }}
                >
                  <td style={{ padding: "6px 8px", color: "#4B5563" }}>
                    {i.id}
                  </td>
                  <td style={{ padding: "6px 8px", color: "#111827" }}>
                    {i.name}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => onDelete(i.id, i.name)}
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.25rem 0.6rem",
                        borderRadius: 6,
                        border: "1px solid #FCA5A5",
                        background: "#FEF2F2",
                        color: "#B91C1C",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MasterData() {
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [types, setTypes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [busyEntity, setBusyEntity] = useState(""); // "categories" | "companies" | "types" | ""
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const role = typeof window !== "undefined" ? getRole() : null;

  const load = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [a, b, c] = await Promise.all([
        axios.get(API_BASE + "/api/master/categories"),
        axios.get(API_BASE + "/api/master/companies"),
        axios.get(API_BASE + "/api/master/types"),
      ]);
      setCategories(a.data || []);
      setCompanies(b.data || []);
      setTypes(c.data || []);
    } catch (e) {
      console.error(e);
      setError(
        "Failed to load form settings. Please ensure backend API is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (entity, name) => {
    if (!name.trim()) return;
    setError("");
    setSuccess("");
    setBusyEntity(entity);
    try {
      await axios.post(
        API_BASE + "/api/master/" + entity,
        { name: name.trim() },
        { headers: authHeaders() }
      );
      setSuccess("Added successfully.");
      await load();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || "Could not add. Please try again."
      );
    } finally {
      setBusyEntity("");
    }
  };

  const remove = async (entity, id, label) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${label}" from ${entity}?`
      )
    ) {
      return;
    }
    setError("");
    setSuccess("");
    setBusyEntity(entity);
    try {
      await axios.delete(API_BASE + "/api/master/" + entity + "/" + id, {
        headers: authHeaders(),
      });
      setSuccess("Deleted successfully.");
      await load();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || "Could not delete. It may be in use."
      );
    } finally {
      setBusyEntity("");
    }
  };

  if (role !== "ADMIN") {
    return (
      <AdminLayout>
        <div className="card">
          <h1 style={{ fontSize: "1rem", color: "#DC2626" }}>Access denied</h1>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#6B7280",
              marginTop: "0.25rem",
            }}
          >
            Only main admin (SR. REGISTRAR) can change form settings.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div
        className="card"
        style={{
          background: "white",
          borderRadius: 10,
          padding: "1.3rem 1.4rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "0.8rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.2rem",
                color: "#0C512F",
                marginBottom: "0.2rem",
              }}
            >
              Form Settings
            </h1>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#4B5563",
                margin: 0,
              }}
            >
              Manage master data used in the public complaint form.
            </p>
          </div>

          <div
            style={{
              fontSize: "0.75rem",
              padding: "0.25rem 0.7rem",
              borderRadius: 999,
              background: "#F3F4F6",
              color: "#374151",
              border: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? (
              <span>Refreshing…</span>
            ) : (
              <>
                <span>Categories: {categories.length}</span>
                <span>• Companies: {companies.length}</span>
                <span>• Types: {types.length}</span>
              </>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              background: "#FEE2E2",
              borderRadius: 6,
              padding: "0.5rem 0.75rem",
              color: "#B91C1C",
              fontSize: "0.85rem",
              marginBottom: "0.7rem",
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
              marginBottom: "0.7rem",
              border: "1px solid #86EFAC",
            }}
          >
            {success}
          </div>
        )}

        {/* Sections */}
        <Section
          title="Categories"
          subtitle="Complaint categories shown on the public form."
          items={categories}
          onCreate={(n) => create("categories", n)}
          onDelete={(id, name) => remove("categories", id, name)}
          busy={busyEntity === "categories"}
        />
        <Section
          title="Companies"
          subtitle="Gas / oil company names visible to complainant."
          items={companies}
          onCreate={(n) => create("companies", n)}
          onDelete={(id, name) => remove("companies", id, name)}
          busy={busyEntity === "companies"}
        />
        <Section
          title="Complaint Types"
          subtitle="Types such as ‘Billing Issue’, ‘Safety’, ‘Connection’, etc."
          items={types}
          onCreate={(n) => create("types", n)}
          onDelete={(id, name) => remove("types", id, name)}
          busy={busyEntity === "types"}
        />
      </div>
    </AdminLayout>
  );
}
