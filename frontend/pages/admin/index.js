import AdminLayout from "../../components/AdminLayout";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../components/api";
import { authHeaders } from "../../components/auth";

export default function AdminHome() {
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    closed: 0,
    overdue: 0,
    avgResolutionDays: null,
  });

  const [doStats, setDoStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const headers = authHeaders();

        // 1) Load DO users
        const usersRes = await axios.get(
          API_BASE + "/api/users?role=DO",
          { headers }
        );
        const dos = usersRes.data || [];

        // 2) Load ALL complaints page by page
        let allComplaints = [];
        let page = 1;
        let pages = 1;

        do {
          const r = await axios.get(
            API_BASE + "/api/complaints?page=" + page,
            { headers }
          );
          const data = r.data || {};
          allComplaints = allComplaints.concat(data.items || []);
          pages = data.pages || 1;
          page += 1;
        } while (page <= pages);

        const now = new Date();

        let total = allComplaints.length;
        let pending = 0;
        let inProgress = 0;
        let closed = 0;
        let overdue = 0;
        let totalResolutionDays = 0;
        let closedCount = 0;

        const perDo = {}; // key = username

        const ensureDoEntry = (username) => {
          if (!username) return null;
          if (!perDo[username]) {
            const u = dos.find((x) => x.username === username) || {};
            perDo[username] = {
              rawUsername: username,
              username: username === "adminogra" ? "SR. REGISTRAR" : username,
              email: u.email || "",
              totalAssigned: 0,
              pending: 0,
              inProgress: 0,
              closed: 0,
              overdue: 0,
              totalResolutionDays: 0,
              closedCount: 0,
            };
          }
          return perDo[username];
        };

        allComplaints.forEach((c) => {
          const statusName = c.status?.name || "";
          const created = c.createdAt ? new Date(c.createdAt) : null;
          const updated = c.updatedAt ? new Date(c.updatedAt) : null;

          if (statusName === "Pending") pending++;
          else if (statusName === "In Progress") inProgress++;
          else if (statusName === "Closed") closed++;

          // 10-day SLA
          if (created && statusName !== "Closed") {
            const due = new Date(created.getTime());
            due.setDate(due.getDate() + 10);
            if (now > due) overdue++;
          }

          // Global average resolution time
          if (statusName === "Closed" && created && updated) {
            const diffMs = updated - created;
            if (!isNaN(diffMs) && diffMs >= 0) {
              totalResolutionDays += diffMs / (1000 * 60 * 60 * 24);
              closedCount++;
            }
          }

          // Per-DO stats
          const assignedUsername = c.assignedTo?.username || null;
          const doEntry = ensureDoEntry(assignedUsername);
          if (!doEntry) return;

          doEntry.totalAssigned++;

          if (statusName === "Pending") doEntry.pending++;
          else if (statusName === "In Progress") doEntry.inProgress++;
          else if (statusName === "Closed") {
            doEntry.closed++;
            if (created && updated) {
              const diffMs = updated - created;
              if (!isNaN(diffMs) && diffMs >= 0) {
                doEntry.totalResolutionDays += diffMs / (1000 * 60 * 60 * 24);
                doEntry.closedCount++;
              }
            }
          }

          if (created && statusName !== "Closed") {
            const due = new Date(created.getTime());
            due.setDate(due.getDate() + 10);
            if (now > due) doEntry.overdue++;
          }
        });

        const avgResolutionDays =
          closedCount > 0 ? totalResolutionDays / closedCount : null;

        const doStatsArr = Object.values(perDo).map((d) => ({
          ...d,
          avgResolutionDays:
            d.closedCount > 0
              ? d.totalResolutionDays / d.closedCount
              : null,
        }));

        setSummary({
          total,
          pending,
          inProgress,
          closed,
          overdue,
          avgResolutionDays,
        });
        setDoStats(doStatsArr);
      } catch (e) {
        console.error(e);
        setError("Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <AdminLayout>
      <div className="card">
        <h1
          className="text-ogra-green"
          style={{ fontSize: "1.5rem", fontWeight: 700 }}
        >
          Dashboard
        </h1>
        <p style={{ fontSize: "1rem", color: "#000000ff", fontWeight: "bold" }}>
          Overview of complaints received, SLA (10 days), and dealing officer
          performance.
        </p>

        {loading && (
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
            Loading metrics…
          </p>
        )}
        {error && (
          <p
            style={{
              fontSize: "0.85rem",
              marginTop: "0.5rem",
              color: "#B91C1C",
            }}
          >
            {error}
          </p>
        )}

        {!loading && (
          <>
            {/* KPI ROW */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1rem",
                marginTop: "0.75rem",
              }}
            >
              <KpiCard
                label="Total Complaints"
                value={summary.total}
                valueColor="#000000ff"
              />
              <KpiCard
                label="Pending"
                value={summary.pending}
                valueColor="#DC2626"
              />
              <KpiCard
                label="In Progress"
                value={summary.inProgress}
                valueColor="#2563EB"
              />
              <KpiCard
                label="Closed"
                value={summary.closed}
                valueColor="#059669"
              />
              <KpiCard
                label="Overdue (10+ days)"
                value={summary.overdue}
                valueColor="#B91C1C"
              />
              <KpiCard
                label="Avg Resolution (days)"
                value={
                  summary.avgResolutionDays != null
                    ? summary.avgResolutionDays.toFixed(1)
                    : "-"
                }
                valueColor="#0C512F"
              />
            </div>

            {/* DO PERFORMANCE TABLE */}
            {doStats.length > 0 && (
              <div
                className="card"
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                  borderRadius: "10px",
                }}
              >
                <h2
                  className="text-ogra-green"
                  style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}
                >
                  Dealing Officer Performance
                </h2>

                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      fontSize: "0.85rem",
                      borderCollapse: "collapse",
                      borderRadius: "10px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#0C512F",
                          color: "white",
                        }}
                      >
                        <th align="left" style={{ padding: 12 }}>
                          DO
                        </th>
                        <th align="left" style={{ padding: 12 }}>
                          Email
                        </th>
                        <th align="right" style={{ padding: 12 }}>
                          Assigned
                        </th>
                        <th align="right" style={{ padding: 12 }}>
                          Pending
                        </th>
                        <th align="right" style={{ padding: 12 }}>
                          In Progress
                        </th>
                        <th align="right" style={{ padding: 12 }}>
                          Closed
                        </th>
                        <th align="right" style={{ padding: 12 }}>
                          Overdue
                        </th>
                        <th align="right" style={{ padding: 12 }}>
                          Avg Days to Close
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {doStats.map((d) => (
                        <tr key={d.rawUsername}>
                          <td style={{ padding: 8 }}>{d.username}</td>
                          <td style={{ padding: 8 }}>{d.email || "-"}</td>
                          <td style={{ padding: 8 }} align="right">
                            {d.totalAssigned}
                          </td>
                          <td style={{ padding: 8 }} align="right">
                            {d.pending}
                          </td>
                          <td style={{ padding: 8 }} align="right">
                            {d.inProgress}
                          </td>
                          <td style={{ padding: 8 }} align="right">
                            {d.closed}
                          </td>
                          <td style={{ padding: 8 }} align="right">
                            {d.overdue}
                          </td>
                          <td style={{ padding: 8 }} align="right">
                            {d.avgResolutionDays != null
                              ? d.avgResolutionDays.toFixed(1)
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: "1rem" }}>
              <h2
                className="text-ogra-green"
                style={{ fontSize: "1.1rem" }}
              >
                Welcome
              </h2>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#4B5563",
                  marginTop: "0.3rem",
                }}
              >
                Use the navigation on the left to manage complaints, DO
                assignments, company dashboard and form settings.
              </p>
            </div>
          </>
        )}
      </div>

      {/* DASHBOARD FOOTER */}
      <footer
        style={{
          marginTop: "1.5rem",
          textAlign: "center",
          fontSize: "1.0rem",
          color: "#000000ff",
        }}
      >
        All copyright reserve @ 2025 Developed BY OGRA IT DEPARTMENT
      </footer>
    </AdminLayout>
  );
}

function KpiCard({ label, value, valueColor }) {
  return (
    <div
      className="kpi-card"
      style={{
        borderRadius: 12,
        padding: "1rem 1.2rem",
        background: "#8ff8a1ff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        border: "1px solid #e5e7eb",
        transition: "all 0.3s",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: "0.85rem",
          color: "#000000ff",
          marginBottom: "0.15rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.4rem",
          color: valueColor,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}
