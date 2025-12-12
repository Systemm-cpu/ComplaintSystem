import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import { API_BASE } from "../../components/api";
import { authHeaders, getToken } from "../../components/auth";
import { useRouter } from "next/router";
import Link from "next/link";
import Badge from "../../components/Badge";
import Button from "../../components/Button";

/* -------------------- GROUPING -------------------- */
function groupByDate(items) {
  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  const groups = { today: [], yesterday: [], earlier: [] };
  items.forEach((c) => {
    const d = new Date(c.createdAt);
    if (d >= startToday) groups.today.push(c);
    else if (d >= startYesterday && d < startToday)
      groups.yesterday.push(c);
    else groups.earlier.push(c);
  });
  return groups;
}

export default function DoDashboard() {
  const [data, setData] = useState({
    items: [],
    total: 0,
    pages: 1,
    page: 1,
  });
  const [dos, setDos] = useState([]);
  const [assignMap, setAssignMap] = useState({});

  const [statuses, setStatuses] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null); // default null, will become Pending

  const router = useRouter();

  const fetchData = async (page = 1) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));

    if (statusFilter) {
      qs.set("statusId", String(statusFilter));
    }

    const r = await axios.get(API_BASE + "/api/complaints?" + qs.toString(), {
      headers: authHeaders(),
    });
    setData(r.data);
  };

  // Initial load: auth check, load DO users and statuses
  useEffect(() => {
    if (!getToken()) {
      router.push("/admin/login");
      return;
    }

    // Load DO users for forwarding
    axios
      .get(API_BASE + "/api/users?role=DO", { headers: authHeaders() })
      .then((r) => {
        const arr = [{ id: 1, username: "SR. REGISTRAR" }, ...r.data];
        setDos(arr);
      });

    // Load statuses and set default filter to Pending
    axios
      .get(API_BASE + "/api/master/statuses", {
        headers: authHeaders(),
      })
      .then((r) => {
        const list = r.data || [];
        setStatuses(list);

        const pending = list.find((s) => s.name === "Pending");
        if (pending) {
          setStatusFilter(String(pending.id)); // default to Pending
        } else {
          setStatusFilter(""); // fallback = all
        }
      });
  }, []);

  // Fetch data whenever statusFilter changes (after it is initialized)
  useEffect(() => {
    if (statusFilter === null) return; // wait until default decided
    if (!getToken()) return;
    fetchData(1);
  }, [statusFilter]);

  const forward = async (id) => {
    const userId = assignMap[id];
    if (!userId) {
      alert("Select a DO / SR. REGISTRAR to forward to");
      return;
    }

    await axios.patch(
      API_BASE + "/api/complaints/" + id + "/assign",
      { userId },
      { headers: authHeaders() }
    );
    fetchData();
  };

  const tone = (s) =>
    s === "Closed" ? "green" : s === "In Progress" ? "yellow" : "gray";

  const items = data.items || [];
  const buckets = groupByDate(items);

  const renderBucket = (label, arr) => {
    if (!arr.length) return null;

    return (
      <>
        <tr>
          <td
            colSpan={6}
            style={{ paddingTop: "0.9rem", paddingBottom: "0.4rem" }}
          >
            <span
              style={{
                background: "#0C512F",
                color: "white",
                padding: "4px 12px",
                borderRadius: 6,
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {label}
            </span>
          </td>
        </tr>

        {arr.map((c) => (
          <tr key={c.id} style={{ borderTop: "1px solid #e5e7eb" }}>
            <td>
              <Link href={`/admin/view/${c.id}`} style={{ color: "#0C512F" }}>
                {c.trackingId}
              </Link>
            </td>
            <td>
              {c.firstName} {c.lastName || ""}
            </td>
            <td>
              <Badge tone={tone(c.status?.name)}>{c.status?.name}</Badge>
            </td>
            <td>
              {c.assignedTo?.username === "adminogra"
                ? "SR. REGISTRAR"
                : c.assignedTo?.username || "-"}
            </td>

            <td>
              <div
                style={{
                  display: "flex",
                  gap: "0.3rem",
                  alignItems: "center",
                }}
              >
                <select
                  className="input"
                  style={{ width: 150 }}
                  value={assignMap[c.id] || ""}
                  onChange={(e) =>
                    setAssignMap((m) => ({
                      ...m,
                      [c.id]: Number(e.target.value),
                    }))
                  }
                >
                  <option value="">Forward to…</option>
                  {dos.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username === "adminogra"
                        ? "SR. REGISTRAR"
                        : u.username}
                    </option>
                  ))}
                </select>

                <Button variant="ghost" onClick={() => forward(c.id)}>
                  Forward
                </Button>
              </div>
            </td>

            <td>{new Date(c.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <AdminLayout>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h1
          style={{ fontSize: "1.3rem", color: "#0C512F", fontWeight: 700 }}
        >
          DO Dashboard
        </h1>
        <p
          style={{ color: "#555", marginTop: "0.4rem", fontSize: "0.85rem" }}
        >
          Complaints assigned to you. You may forward them to SR. REGISTRAR or
          another DO.
        </p>

        {/* Status Filter Row */}
        <div
          style={{
            marginTop: "0.75rem",
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#374151",
            }}
          >
            Filter by Status:
          </label>

          <select
            className="input"
            style={{ maxWidth: 220 }}
            value={statusFilter || ""}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              fontSize: "0.85rem",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ background: "#0C512F", color: "white" }}>
                <th align="left" style={{ padding: 8 }}>
                  Tracking
                </th>
                <th align="left" style={{ padding: 8 }}>
                  Name
                </th>
                <th align="left" style={{ padding: 8 }}>
                  Status
                </th>
                <th align="left" style={{ padding: 8 }}>
                  Assigned
                </th>
                <th align="left" style={{ padding: 8 }}>
                  Forward
                </th>
                <th align="left" style={{ padding: 8 }}>
                  Created
                </th>
              </tr>
            </thead>

            <tbody>
              {renderBucket("Today", buckets.today)}
              {renderBucket("Yesterday", buckets.yesterday)}
              {renderBucket("Earlier", buckets.earlier)}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
