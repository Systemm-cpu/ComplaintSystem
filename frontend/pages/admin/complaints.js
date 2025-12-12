import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import { API_BASE } from "../../components/api";
import { authHeaders } from "../../components/auth";
import Link from "next/link";
import Badge from "../../components/Badge";

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
    const created = new Date(c.createdAt);
    if (created >= startToday) groups.today.push(c);
    else if (created >= startYesterday && created < startToday)
      groups.yesterday.push(c);
    else groups.earlier.push(c);
  });
  return groups;
}

export default function AdminComplaints() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1, page: 1 });
  const [statuses, setStatuses] = useState([]);
  // null = not decided yet; we set to Pending after statuses load
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async (page = 1) => {
    setLoading(true);
    setError("");

    const qs = new URLSearchParams();
    qs.set("page", String(page));

    if (statusFilter) qs.set("statusId", String(statusFilter));

    // IMPORTANT:
    // Table ke liye date filter hum frontend pe laga rahe hain,
    // is liye yahan dates nahi bhej rahe.
    try {
      const res = await axios.get(
        API_BASE + "/api/complaints?" + qs.toString(),
        {
          headers: authHeaders(),
        }
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Error fetching complaint data.");
    } finally {
      setLoading(false);
    }
  };

  // Load statuses and set default to Pending
  useEffect(() => {
    axios.get(API_BASE + "/api/master/statuses").then((r) => {
      const list = r.data || [];
      setStatuses(list);

      const pending = list.find((s) => s.name === "Pending");
      if (pending) {
        setStatusFilter(String(pending.id)); // default to Pending
      } else {
        setStatusFilter(""); // fallback to all
      }
    });
  }, []);

  // Fetch complaints whenever status changes (date filters are frontend only)
  useEffect(() => {
    if (statusFilter === null) return; // wait until default resolved
    fetchData(1);
  }, [statusFilter]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
    setSearchQuery("");

    const pending = statuses.find((s) => s.name === "Pending");
    setStatusFilter(pending ? String(pending.id) : "");

    fetchData(1);
  };

  // FRONTEND date filter helper
  const inDateRange = (complaint) => {
    if (!startDateFilter && !endDateFilter) return true;

    const created = new Date(complaint.createdAt);
    if (Number.isNaN(created.getTime())) return true;

    if (startDateFilter) {
      const start = new Date(startDateFilter + "T00:00:00");
      if (created < start) return false;
    }
    if (endDateFilter) {
      const end = new Date(endDateFilter + "T23:59:59.999");
      if (created > end) return false;
    }
    return true;
  };

  // Search + date filter both on frontend
  const filteredData = (data.items || []).filter((complaint) => {
    const matchesSearch =
      complaint.trackingId
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      `${complaint.firstName} ${complaint.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesSearch && inDateRange(complaint);
  });

  const changeStatus = async (id, statusId) => {
    try {
      await axios.patch(
        API_BASE + "/api/complaints/" + id + "/status",
        { statusId },
        { headers: authHeaders() }
      );
      fetchData(data.page);
    } catch (e) {
      alert(e?.response?.data?.message || "Only Admin can change status");
    }
  };

  const exportFile = async () => {
    const qs = new URLSearchParams();
    qs.set("format", "csv");

    // Export ke liye backend date filtering already sahi chal rahi hai,
    // is liye yahan from/to bhej rahe hain.
    if (startDateFilter) qs.set("from", startDateFilter);
    if (endDateFilter) qs.set("to", endDateFilter);
    if (statusFilter) qs.set("statusId", String(statusFilter));

    const res = await axios.get(
      API_BASE + "/api/complaints/export/file?" + qs.toString(),
      {
        headers: authHeaders(),
        responseType: "blob",
      }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "complaints.csv";
    a.click();
  };

  let items = filteredData || [];
  const buckets = groupByDate(items);

  const renderBucket = (label, arr) => {
    if (!arr.length) return null;

    return (
      <>
        <tr>
          <td
            colSpan={6}
            style={{ paddingTop: "0.8rem", paddingBottom: "0.4rem" }}
          >
            <span
              style={{
                background: "#0C512F",
                color: "white",
                padding: "3px 10px",
                borderRadius: "4px",
                fontSize: "0.75rem",
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
              <Link
                href={`/admin/view/${c.id}`}
                style={{ color: "#0C512F", fontWeight: 600 }}
              >
                {c.trackingId}
              </Link>
            </td>

            <td>
              {c.firstName} {c.lastName || ""}
            </td>

            <td>
              <Badge
                tone={
                  c.status?.name === "Closed"
                    ? "green"
                    : c.status?.name === "In Progress"
                    ? "yellow"
                    : "gray"
                }
              >
                {c.status?.name}
              </Badge>
            </td>

            <td>
              {c.assignedTo?.username === "adminogra"
                ? "SR. REGISTRAR"
                : c.assignedTo?.username || "-"}
            </td>

            <td>
              <select
                className="input"
                style={{ width: 150 }}
                defaultValue=""
                onChange={(e) => changeStatus(c.id, Number(e.target.value))}
              >
                <option value="">Change Status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </td>

            <td>{new Date(c.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              fontSize: "1.3rem",
              fontWeight: 700,
              color: "#0C512F",
            }}
          >
            Complaints
          </h1>

          {/* Export CSV Button */}
          <button
            onClick={exportFile}
            style={{
              background: "#0C512F",
              border: "none",
              padding: "0.45rem 1rem",
              color: "white",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Export CSV
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search by Tracking ID or Name"
            value={searchQuery}
            onChange={handleSearchChange}
            className="input"
            style={{ width: "250px" }}
          />

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

          <input
            type="date"
            className="input"
            style={{ width: 160 }}
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
          />
          <input
            type="date"
            className="input"
            style={{ width: 160 }}
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
          />

          {/* Clear Filters Button */}
          <button
            onClick={handleClearFilters}
            style={{
              background: "#DC2626",
              color: "white",
              padding: "0.45rem 1rem",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: "0.5rem",
              color: "#b91c1c",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* TABLE */}
      <div
        style={{
          background: "white",
          padding: "1rem",
          borderRadius: 8,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
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
                <th style={{ padding: "8px" }} align="left">
                  Tracking
                </th>
                <th style={{ padding: "8px" }} align="left">
                  Name
                </th>
                <th style={{ padding: "8px" }} align="left">
                  Status
                </th>
                <th style={{ padding: "8px" }} align="left">
                  Assigned
                </th>
                <th style={{ padding: "8px" }} align="left">
                  Status Change
                </th>
                <th style={{ padding: "8px" }} align="left">
                  Created
                </th>
              </tr>
            </thead>

            <tbody>
              {groupByDate(items).today.length === 0 &&
              groupByDate(items).yesterday.length === 0 &&
              groupByDate(items).earlier.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "1rem", textAlign: "center" }}>
                    {loading ? "Loading..." : "No complaints found for selected filters."}
                  </td>
                </tr>
              ) : (
                <>
                  {renderBucket("Today", groupByDate(items).today)}
                  {renderBucket("Yesterday", groupByDate(items).yesterday)}
                  {renderBucket("Earlier", groupByDate(items).earlier)}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
