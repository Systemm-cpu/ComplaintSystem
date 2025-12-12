import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import AdminLayout from "../../../components/AdminLayout";
import { API_BASE } from "../../../components/api";
import { authHeaders } from "../../../components/auth";
import Badge from "../../../components/Badge";
import { getRole, getUsername } from "../../../components/auth";


/* ---------- IOM TEMPLATES ---------- */

const IOM_TEMPLATES = [
  {
    id: "ogra_standard",
    label: "OGRA – Lahore IOM (Registrar)",
    subject: "LOW/ ZERO GAS PRESSURE",
    bodyHtml:
      "<p><strong>TO: DO LAHORE</strong></p>"+
      "<b></b>"+
      "<b></b>"+
      "<p><strong>From: Senior REGISTRAR</strong></p>"+
      "<p>This office has received an application/complaint from <strong>{complainantName}</strong>, on the above subject. The complaint has been assessed under Regulation-6 of CRPR, 2003 and is hereby accepted and forwarded to Designated Officer (D.O) for further necessary action, please.</p>" +
      "<p>(ABDUL BASIT QURESHI)<br/> SR. REGISTRAR<br/></p>" +
      "<p><strong>Copy to:</strong><br/>{complainantName}<br/>{complainantAddress}</p>",
  },
   {
    id: "ogra_standard1",
    label: "OGRA – Karachi IOM (Registrar)",
    subject: "LOW/ ZERO GAS PRESSURE",
    bodyHtml:
      "<p><strong>TO: DO KARACHI</strong></p>"+
      "<b></b>"+
      "<b></b>"+
      "<p><strong>From: Senior REGISTRAR</strong></p>"+
      "<p>This office has received an application/complaint from <strong>{complainantName}</strong>, on the above subject. The complaint has been assessed under Regulation-6 of CRPR, 2003 and is hereby accepted and forwarded to Designated Officer (D.O) for further necessary action, please.</p>" +
      "<p>(ABDUL BASIT QURESHI)<br/> SR. REGISTRAR<br/></p>" +
      "<p><strong>Copy to:</strong><br/>{complainantName}<br/>{complainantAddress}</p>",
  },
  {
    id: "ogra_standard3",
    label: "OGRA – Peshawar IOM (Registrar)",
    subject: "LOW/ ZERO GAS PRESSURE",
    bodyHtml:
      "<p><strong>TO: DO PESHAWAR</strong></p>"+
      "<b></b>"+
      "<b></b>"+
      "<p><strong>From: Senior REGISTRAR</strong></p>"+
      "<p>This office has received an application/complaint from <strong>{complainantName}</strong>, on the above subject. The complaint has been assessed under Regulation-6 of CRPR, 2003 and is hereby accepted and forwarded to Designated Officer (D.O) for further necessary action, please.</p>" +
      "<p>(ABDUL BASIT QURESHI)<br/> SR. REGISTRAR<br/></p>" +
      "<p><strong>Copy to:</strong><br/>{complainantName}<br/>{complainantAddress}</p>",
  },
   {
    id: "ogra_standard4",
    label: "OGRA – Multan IOM (Registrar)",
    subject: "LOW/ ZERO GAS PRESSURE",
    bodyHtml:
      "<p><strong>TO: DO MULTAN</strong></p>"+
      "<b></b>"+
      "<b></b>"+
      "<p><strong>From: Senior REGISTRAR</strong></p>"+
      "<p>This office has received an application/complaint from <strong>{complainantName}</strong>, on the above subject. The complaint has been assessed under Regulation-6 of CRPR, 2003 and is hereby accepted and forwarded to Designated Officer (D.O) for further necessary action, please.</p>" +
      "<p>(ABDUL BASIT QURESHI)<br/> SR. REGISTRAR<br/></p>" +
      "<p><strong>Copy to:</strong><br/>{complainantName}<br/>{complainantAddress}</p>",
  },
  {
    id: "ogra_standard5",
    label: "OGRA – Quetta IOM (Registrar)",
    subject: "LOW/ ZERO GAS PRESSURE",
    bodyHtml:
      "<p><strong>TO: DO Quetta</strong></p>"+
      "<b></b>"+
      "<b></b>"+
      "<p><strong>From: Senior REGISTRAR</strong></p>"+
      "<p>This office has received an application/complaint from <strong>{complainantName}</strong>, on the above subject. The complaint has been assessed under Regulation-6 of CRPR, 2003 and is hereby accepted and forwarded to Designated Officer (D.O) for further necessary action, please.</p>" +
      "<p>(ABDUL BASIT QURESHI)<br/> SR. REGISTRAR<br/></p>" +
      "<p><strong>Copy to:</strong><br/>{complainantName}<br/>{complainantAddress}</p>",
  },
  {
    id: "ogra_standard6",
    label: "OGRA – Sukkhur IOM (Registrar)",
    subject: "LOW/ ZERO GAS PRESSURE",
    bodyHtml:
      "<p><strong>TO: DO SUKKHAR</strong></p>"+
      "<b></b>"+
      "<b></b>"+
      "<p><strong>From: Senior REGISTRAR</strong></p>"+
      "<p>This office has received an application/complaint from <strong>{complainantName}</strong>, on the above subject. The complaint has been assessed under Regulation-6 of CRPR, 2003 and is hereby accepted and forwarded to Designated Officer (D.O) for further necessary action, please.</p>" +
      "<p>(ABDUL BASIT QURESHI)<br/> SR. REGISTRAR<br/></p>" +
      "<p><strong>Copy to:</strong><br/>{complainantName}<br/>{complainantAddress}</p>",
  },
  {
    id: "ogra_standard7",
    label: "OGRA – Islamabad IOM (Registrar)",
    subject: "LOW/ ZERO GAS PRESSURE",
    bodyHtml:
      "<p><strong>TO: DO Islamabad</strong></p>"+
      "<b></b>"+
      "<b></b>"+
      "<p><strong>From: Senior REGISTRAR</strong></p>"+
      "<p>This office has received an application/complaint from <strong>{complainantName}</strong>, on the above subject. The complaint has been assessed under Regulation-6 of CRPR, 2003 and is hereby accepted and forwarded to Designated Officer (D.O) for further necessary action, please.</p>" +
      "<p>(ABDUL BASIT QURESHI)<br/> SR. REGISTRAR<br/></p>" +
      "<p><strong>Copy to:</strong><br/>{complainantName}<br/>{complainantAddress}</p>",
  },
   {
    id: "ogra_standard8",
    label: "OGRA – Rawalpindi IOM (Registrar)",
    subject: "LOW/ ZERO GAS PRESSURE",
    bodyHtml:
      "<p><strong>TO: DO Rawalpindi</strong></p>"+
      "<b></b>"+
      "<b></b>"+
      "<p><strong>From: Senior REGISTRAR</strong></p>"+
      "<p>This office has received an application/complaint from <strong>{complainantName}</strong>, on the above subject. The complaint has been assessed under Regulation-6 of CRPR, 2003 and is hereby accepted and forwarded to Designated Officer (D.O) for further necessary action, please.</p>" +
      "<p>(ABDUL BASIT QURESHI)<br/> SR. REGISTRAR<br/></p>" +
      "<p><strong>Copy to:</strong><br/>{complainantName}<br/>{complainantAddress}</p>",
  },
  {
    id: "reminder",
    label: "Reminder to DO",
    subject: "Reminder – complaint {trackingId}",
    bodyHtml:
      "<p>Dear Sir/Madam,</p>" +
      "<p>This is a reminder regarding the complaint bearing Tracking ID {trackingId} which is still pending.</p>" +
      "<p>You are requested to expedite the matter and furnish your report at the earliest.</p>" +
      "<p>Regards,<br/>SR. REGISTRAR</p>",
  },
];

export default function ComplaintDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [c, setC] = useState(null);
  const [comment, setComment] = useState("");
  const [loadError, setLoadError] = useState("");

  // Remark visibility
  const [remarkType, setRemarkType] = useState("PUBLIC"); // PUBLIC | INTERNAL

  // IOM state
  const [ioms, setIoms] = useState([]);
  const [iomLoading, setIomLoading] = useState(false);
  const [iomError, setIomError] = useState("");
  const [iomSuccess, setIomSuccess] = useState("");
  const [iomSubject, setIomSubject] = useState("");
  const [iomToUserId, setIomToUserId] = useState("");
  const [iomFiles, setIomFiles] = useState([]);
  const [iomSubmitting, setIomSubmitting] = useState(false);
  const [doUsers, setDoUsers] = useState([]);
  const [iomTemplate, setIomTemplate] = useState("");

  // Disposal state
  const [showDispose, setShowDispose] = useState(false);
  const [disposeFile, setDisposeFile] = useState(null);
  const [disposeNote, setDisposeNote] = useState("");
  const [disposeError, setDisposeError] = useState("");
  const [disposeSuccess, setDisposeSuccess] = useState("");
  const [disposeSubmitting, setDisposeSubmitting] = useState(false);

  const editorRef = useRef(null);

  const load = async () => {
    try {
      setLoadError("");
      const r = await axios.get(API_BASE + "/api/complaints/" + id, {
        headers: authHeaders(),
      });

      // Fix bad attachment paths
      const fixedAttachments = (r.data.attachments || []).map((a) => ({
        ...a,
        path:
          a.path && a.path.startsWith("/")
            ? a.path
            : "/" + (a.path || "").replace(/^\/?/, ""),
      }));

      // Ensure logs have user + role info
      const fixedLogs = (r.data.logs || []).map((l) => ({
        ...l,
        user: {
          username: l.user?.username || "System",
          role: l.user?.role || "",
        },
      }));

      const disposal = r.data.disposal || null;

      setC({
        ...r.data,
        attachments: fixedAttachments,
        logs: fixedLogs,
        disposal,
      });
    } catch (err) {
      console.error("Error loading complaint", err);
      setLoadError(
        "Could not connect to backend. Please make sure the API is running and API_BASE is correct."
      );
    }
  };

  const loadIoms = async () => {
    if (!id) return;
    setIomLoading(true);
    setIomError("");
    try {
      const r = await axios.get(
        API_BASE + "/api/complaints/" + id + "/ioms",
        { headers: authHeaders() }
      );
      setIoms(r.data || []);
    } catch (e) {
      console.error("Error loading IOMs", e);
      setIomError("Failed to load IOMs");
    } finally {
      setIomLoading(false);
    }
  };

  const loadDoUsers = async () => {
    try {
      const r = await axios.get(API_BASE + "/api/users?role=DO", {
        headers: authHeaders(),
      });
      setDoUsers(r.data || []);
    } catch (e) {
      console.error("Error loading DO users", e);
    }
  };

  useEffect(() => {
    if (!id) return;
    load();
    loadIoms();
    loadDoUsers();
  }, [id]);

  const addRemark = async () => {
    if (!comment.trim()) return;

    let text = comment.trim();
    if (remarkType === "PUBLIC") {
      text = `[PUBLIC] ${text}`;
    } else if (remarkType === "INTERNAL") {
      text = `[INTERNAL] ${text}`;
    }

    await axios.post(
      API_BASE + "/api/complaints/" + id + "/remark",
      { comments: text },
      { headers: authHeaders() }
    );
    setComment("");
    setRemarkType("PUBLIC");
    load();
  };

  const tone = (s) =>
    s === "Closed" ? "green" : s === "In Progress" ? "yellow" : "gray";

  const handlePrint = () => window.print();

  // IOM handlers
  const handleIomFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setIomFiles(files);
  };

  const handleFormat = (command) => {
    if (typeof document === "undefined") return;
    document.execCommand(command, false, null);
  };

  const handleAlign = (align) => {
    if (typeof document === "undefined") return;
    document.execCommand("justify" + align, false, null);
  };

  const submitIom = async () => {
    setIomError("");
    setIomSuccess("");

    if (!iomToUserId) {
      setIomError("Please select a DO to send the IOM to.");
      return;
    }

    const html = editorRef.current ? editorRef.current.innerHTML : "";
    const plainText = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (!plainText) {
      setIomError("IOM body cannot be empty.");
      return;
    }

    try {
      setIomSubmitting(true);
      const fd = new FormData();
        fd.append("toUserId", iomToUserId);
        fd.append("subject", iomSubject || "");
        fd.append("bodyHtml", html);

        // NEW FIELDS FOR ROLE-BASED IOM TRACKING
        fd.append("senderRole", getRole());
        fd.append("senderUsername", getUsername());

      iomFiles.forEach((file) => {
        fd.append("iomFiles", file);
      });

      await axios.post(API_BASE + "/api/complaints/" + id + "/ioms", fd, {
        headers: {
          ...authHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      setIomSuccess("IOM sent successfully.");
      setIomError("");
      setIomSubject("");
      setIomToUserId("");
      setIomFiles([]);
      setIomTemplate("");
      if (editorRef.current) editorRef.current.innerHTML = "";

      // reload IOMs and complaint (to refresh logs & assignedTo)
      loadIoms();
      load();
    } catch (e) {
      console.error("Error sending IOM", e);
      setIomError(
        e?.response?.data?.message || e?.message || "Failed to send IOM"
      );
    } finally {
      setIomSubmitting(false);
    }
  };

    // Disposal handlers
  const handleDisposeFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setDisposeFile(file);
  };

  const submitDispose = async () => {
    setDisposeError("");
    setDisposeSuccess("");

    try {
      setDisposeSubmitting(true);

      // At least one of note or file must be provided
      if (!disposeNote.trim() && !disposeFile) {
        setDisposeError("Please add a decision note or attach a decision file.");
        setDisposeSubmitting(false);
        return;
      }

      const fd = new FormData();
      fd.append("note", disposeNote || "");

      if (disposeFile) {
        fd.append("decisionFile", disposeFile);
      }

      await axios.post(
        API_BASE + "/api/complaints/" + id + "/dispose",
        fd,
        {
          headers: {
            ...authHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setDisposeSuccess("Complaint marked as disposed of successfully.");
      setDisposeError("");
      setDisposeFile(null);
      setDisposeNote("");
      setShowDispose(false);
      load(); // refresh complaint to see disposal + status=Closed
    } catch (e) {
      console.error("Error disposing complaint", e);
      setDisposeError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to mark complaint as disposed."
      );
    } finally {
      setDisposeSubmitting(false);
    }
  };

  const latestIom = ioms && ioms.length ? ioms[0] : null;


  if (!c)
    return (
      <AdminLayout>
        <div className="card">
          {loadError ? (
            <div style={{ color: "red" }}>{loadError}</div>
          ) : (
            "Loading..."
          )}
        </div>
      </AdminLayout>
    );

  // Values for IOM print page (page 1)
  const iomToName =
    latestIom?.to?.username || latestIom?.toUserId || "Dealing Officer";
  const iomFromName =
    latestIom?.from?.username || c.assignedTo?.username || "SR. REGISTRAR";
  const iomDate = latestIom?.createdAt
    ? new Date(latestIom.createdAt).toLocaleDateString()
    : new Date(c.createdAt).toLocaleDateString();
  const iomRef = c.trackingId ? `Complaint Ref: ${c.trackingId}` : "";

  const disposal = c.disposal || null;

  // SLA calculation (10 days)
  const createdDate = c.createdAt ? new Date(c.createdAt) : null;
  let dueDateStr = "-";
  let slaStatus = "-";
  if (createdDate) {
    const due = new Date(createdDate.getTime());
    due.setDate(due.getDate() + 10);
    dueDateStr = due.toLocaleDateString();
    if (c.status?.name === "Closed") {
      slaStatus = "Closed";
    } else {
      const now = new Date();
      slaStatus = now > due ? "Overdue" : "On Time";
    }
  }

  // Helper: placeholder replacement for templates
  const applyTemplate = (tpl) => {
    const tracking = c?.trackingId || "";
    const complainantName =
      `${c?.firstName || ""} ${c?.lastName || ""}`.trim() || "the complainant";
    const complainantAddress = c?.address || "";

    const replaceAll = (str) =>
      (str || "")
        .replace(/\{trackingId\}/g, tracking)
        .replace(/\{complainantName\}/g, complainantName)
        .replace(/\{complainantAddress\}/g, complainantAddress);

    setIomSubject(replaceAll(tpl.subject));
    if (editorRef.current) {
      editorRef.current.innerHTML = replaceAll(tpl.bodyHtml);
    }
  };

  return (
    <AdminLayout>
      <style>
        {`
          .iom-print-page {
            display: none;
          }

          @media print {
            body {
              background: white !important;
            }
            .print-header {
              display: flex !important;
            }
            .print-hidden {
              display: none !important;
            }
            .card {
              box-shadow: none !important;
              border: none !important;
            }
            .iom-print-page {
              display: block !important;
              page-break-after: always;
            }
          }
        `}
      </style>

      {/* PAGE 1: IOM LETTER FOR DO (PRINT ONLY) */}
      {latestIom && (
        <div
          className="iom-print-page"
          style={{
            background: "white",
            padding: "2.5cm 2cm",
            fontSize: "0.9rem",
            lineHeight: 1.5,
          }}
        >
          {/* Header / Logo */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "1rem",
            }}
          >
             <img
              src="/ogra-logo.png"
              alt="OGRA Logo"
              style={{
                width: "36px",
                height: "36px",
                objectFit: "contain",
              }} />
            <div
              style={{
                fontWeight: 700,
                fontSize: "1.05rem",
                color: "#0C512F",
                textTransform: "uppercase",
              }}
            >
              Oil & Gas Regulatory Authority (OGRA)
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.85rem",
                marginTop: 4,
              }}
            >
              (OFFICE OF THE REGISTRAR)
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.95rem",
                marginTop: 6,
                textTransform: "uppercase",
              }}
            >
              INTER OFFICE MEMO
            </div>
          </div>

          {/* Meta info: Date, Ref */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.8rem",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <strong>Ref:</strong> {iomRef || "-"}
            </div>
            <div>
              <strong>Date:</strong> {iomDate}
            </div>
          </div>

          {/* To / From / Subject / Complaint No */}
          <div style={{ marginBottom: "0.8rem", fontSize: "0.9rem" }}>
            <div style={{ marginBottom: "0.2rem" }}>
              <strong>To:</strong> {iomToName}
            </div>
            <div style={{ marginBottom: "0.2rem" }}>
              <strong>From:</strong> {iomFromName}
            </div>
            <div style={{ marginBottom: "0.2rem" }}>
              <strong>Subject:</strong> {latestIom.subject || "-"}
            </div>
            <div style={{ marginBottom: "0.2rem" }}>
              <strong>Complaint No.:</strong> {c.trackingId || "-"}
            </div>
          </div>

          {/* Body (includes signature and Copy to: from template) */}
          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              paddingTop: "0.8rem",
              marginTop: "0.4rem",
              fontSize: "0.9rem",
            }}
            dangerouslySetInnerHTML={{ __html: latestIom.bodyHtml || "" }}
          />
        </div>
      )}

      {/* PRINT HEADER (FOR COMPLAINT REPORT PAGES) */}
      <div
        className="print-header"
        style={{
          display: "none",
          justifyContent: "center",
          marginBottom: "1rem",
          textAlign: "center",
        }}
      >
        <div>
          <img
              src="/ogra-logo.png"
              alt="OGRA Logo"
              style={{
                width: "36px",
                height: "36px",
                objectFit: "contain",
              }} />
          <h2 style={{ fontSize: "1.4rem", margin: 0, color: "#0C512F" }}>
            Oil & Gas Regulatory Authority (OGRA)
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            Complaint Report – Tracking ID: {c.trackingId}
          </p>
        </div>
      </div>

      {/* OTHER PAGES: COMPLAINT DETAIL, IOM LIST, LOGS */}
      <div
        className="card"
        style={{
          background: "white",
          padding: "1.5rem",
          borderRadius: 10,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {/* HEADER BAR */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.3rem",
                color: "#0C512F",
                fontWeight: 700,
              }}
            >
              Complaint Details
            </h1>
            <div
              style={{
                fontSize: "0.85rem",
                color: "#4B5563",
                marginTop: "0.15rem",
              }}
            >
              <strong>Tracking ID:&nbsp;</strong>
              <span
                style={{
                  fontFamily: "monospace",
                  background: "#F3F4F6",
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: "1px solid #E5E7EB",
                }}
              >
                {c.trackingId || "-"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <Badge tone={tone(c.status?.name)}>{c.status?.name}</Badge>

            <button
              className="btn btn-primary print-hidden"
              onClick={handlePrint}
              style={{
                background: "#0C512F",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "0.5rem 1rem",
              }}
            >
              Print / PDF
            </button>

            {/* NEW: Disposed of button */}
            <button
              className="btn print-hidden"
              onClick={() => setShowDispose((v) => !v)}
              style={{
                background: "#b91c1c",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "0.5rem 1rem",
              }}
            >
              Disposed of
            </button>
          </div>
        </div>

        {loadError && (
          <div
            style={{
              background: "#fee2e2",
              borderRadius: 6,
              padding: "0.5rem 0.75rem",
              color: "#b91c1c",
              marginBottom: "0.8rem",
              fontSize: "0.85rem",
            }}
          >
            {loadError}
          </div>
        )}

        {/* BASIC INFO GRID + SLA */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.5rem 1.5rem",
            fontSize: "0.9rem",
            marginBottom: "1.25rem",
          }}
        >
          <Info label="Name" value={`${c.firstName} ${c.lastName || ""}`} />
          <Info label="CNIC" value={c.cnic} />
          <Info label="Email" value={c.email} />
          <Info
            label="Assigned To"
            value={
              c.assignedTo?.username === "adminogra"
                ? "SR. REGISTRAR"
                : c.assignedTo?.username || "-"
            }
          />
          <Info
            label="Created"
            value={new Date(c.createdAt).toLocaleString()}
          />
          <Info label="Due Date (10-day SLA)" value={dueDateStr} />
          <Info label="SLA Status" value={slaStatus} />
          <FullInfo label="Address" value={c.address} />
        </div>

        {/* COMPLAINT 1–8 STRUCTURED VIEW */}
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", color: "#0C512F", marginBottom: 8 }}>
            Complaint Details (Points 1 to 8)
          </h2>
          <ComplaintBreakdown complaint={c.complaint} />
        </div>

        {/* ATTACHMENTS */}
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", color: "#0C512F", marginBottom: 8 }}>
            Attachments
          </h2>
          <ul style={{ paddingLeft: "1rem", fontSize: "0.9rem" }}>
            {c.attachments.length ? (
              c.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={API_BASE + a.path}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#0C512F" }}
                  >
                    {a.path.split("/").pop()}
                  </a>
                </li>
              ))
            ) : (
              <li>None</li>
            )}
          </ul>
        </div>

        {/* FINAL DECISION / DISPOSAL (read-only) */}
        {disposal && (
          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              paddingTop: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <h2 style={{ fontSize: "1rem", color: "#b91c1c", marginBottom: 8 }}>
              Final OGRA Decision / Disposed Of
            </h2>
            <div style={{ fontSize: "0.9rem", marginBottom: 4 }}>
              <strong>Date:</strong>{" "}
              {disposal.createdAt
                ? new Date(disposal.createdAt).toLocaleString()
                : "-"}
            </div>
            {disposal.note && (
              <div
                style={{
                  fontSize: "0.9rem",
                  marginBottom: 4,
                }}
              >
                <strong>Note:</strong> {disposal.note}
              </div>
            )}
            {disposal.filePath && (
              <div style={{ fontSize: "0.9rem" }}>
                <strong>Decision File: </strong>
                <a
                  href={API_BASE + disposal.filePath}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#0C512F" }}
                >
                  Download Decision
                </a>
              </div>
            )}
          </div>
        )}

        {/* DISPOSAL FORM (Admin) */}
{showDispose && (
  <div
    className="print-hidden"
    style={{
      borderTop: "1px solid #fee2e2",
      paddingTop: "1rem",
      marginBottom: "1.25rem",
    }}
  >
    <h2 style={{ fontSize: "1rem", color: "#b91c1c", marginBottom: 8 }}>
      Mark Complaint as Disposed Of
    </h2>

    <div style={{ marginBottom: "0.6rem" }}>
      <label
        style={{
          display: "block",
          fontSize: "0.85rem",
          marginBottom: 4,
        }}
      >
        Decision Note (optional)
      </label>
      <textarea
        className="input"
        rows={3}
        value={disposeNote}
        onChange={(e) => setDisposeNote(e.target.value)}
        placeholder="Short note about the decision (optional)..."
      />
    </div>

    <div style={{ marginBottom: "0.6rem" }}>
      <label
        style={{
          display: "block",
          fontSize: "0.85rem",
          marginBottom: 4,
        }}
      >
        Decision File (PDF / Word) – optional
      </label>
      <input
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleDisposeFileChange}
      />
      {disposeFile && (
        <div
          style={{ fontSize: "0.8rem", color: "#555", marginTop: 4 }}
        >
          Selected: {disposeFile.name}
        </div>
      )}
    </div>

    {disposeError && (
      <div
        style={{
          background: "#fee2e2",
          borderRadius: 4,
          padding: "0.4rem 0.6rem",
          color: "#b91c1c",
          fontSize: "0.8rem",
          marginBottom: "0.4rem",
        }}
      >
        {disposeError}
      </div>
    )}

    {disposeSuccess && (
      <div
        style={{
          background: "#dcfce7",
          borderRadius: 4,
          padding: "0.4rem 0.6rem",
          color: "#166534",
          fontSize: "0.8rem",
          marginBottom: "0.4rem",
        }}
      >
        {disposeSuccess}
      </div>
    )}

    <button
      className="btn btn-primary"
      onClick={submitDispose}
      disabled={disposeSubmitting}
      style={{
        background: "#b91c1c",
        border: "none",
        color: "white",
        padding: "0.45rem 1rem",
        borderRadius: 6,
      }}
    >
      {disposeSubmitting
        ? "Marking as Disposed..."
        : "Mark Disposed"}
    </button>
  </div>
)}


        {/* IOM SECTION (compose + history) */}
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", color: "#0C512F", marginBottom: 8 }}>
            Internal Office Memo (IOM)
          </h2>

          {/* Compose IOM */}
          <div
            className="print-hidden"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "0.8rem",
              marginBottom: "0.8rem",
              background: "#f9fafb",
            }}
          >
            <div style={{ marginBottom: "0.6rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  marginBottom: 4,
                  color: "#0C512F",
                }}
              >
                Forward To (DO)
              </label>
              <select
                className="input"
                value={iomToUserId}
                onChange={(e) => setIomToUserId(e.target.value)}
              >
                <option value="">Select Dealing Officer</option>
                {doUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.email})
                  </option>
                ))}
              </select>
              <small style={{ color: "#666", fontSize: "0.75rem" }}>
                Complaint will also be considered forwarded to this DO.
              </small>
            </div>

            <div style={{ marginBottom: "0.6rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                  gap: "0.5rem",
                }}
              >
                <label
                  style={{
                    fontSize: "0.85rem",
                    color: "#0C512F",
                  }}
                >
                  Subject
                </label>
                <select
                  className="input"
                  style={{ maxWidth: 260, fontSize: "0.8rem" }}
                  value={iomTemplate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIomTemplate(val);
                    const tpl = IOM_TEMPLATES.find((t) => t.id === val);
                    if (!tpl) return;
                    applyTemplate(tpl);
                  }}
                >
                  <option value="">IOM Templates…</option>
                  {IOM_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className="input"
                value={iomSubject}
                onChange={(e) => setIomSubject(e.target.value)}
                placeholder="Enter IOM subject"
              />
            </div>

            {/* Toolbar */}
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: 4,
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                marginBottom: 4,
                background: "#f3f4f6",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => handleFormat("bold")}
                style={{ padding: "0.15rem 0.5rem" }}
              >
                B
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleFormat("italic")}
                style={{ padding: "0.15rem 0.5rem", fontStyle: "italic" }}
              >
                I
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleFormat("underline")}
                style={{ padding: "0.15rem 0.5rem", textDecoration: "underline" }}
              >
                U
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleFormat("insertUnorderedList")}
                style={{ padding: "0.15rem 0.5rem" }}
              >
                • List
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleFormat("insertOrderedList")}
                style={{ padding: "0.15rem 0.5rem" }}
              >
                1. List
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleAlign("Left")}
                style={{ padding: "0.15rem 0.5rem" }}
              >
                ⬅
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleAlign("Center")}
                style={{ padding: "0.15rem 0.5rem" }}
              >
                ⬌
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleAlign("Right")}
                style={{ padding: "0.15rem 0.5rem" }}
              >
                ➡
              </button>
            </div>

            {/* Editor */}
            <div
              ref={editorRef}
              contentEditable
              style={{
                minHeight: 140,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: 8,
                background: "white",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
              }}
            />

            {/* Files */}
            <div style={{ marginBottom: "0.6rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  marginBottom: 4,
                  color: "#0C512F",
                }}
              >
                Attach IOM file(s) (PDF / Word / Images)
              </label>
              <input type="file" multiple onChange={handleIomFilesChange} />
              {iomFiles.length > 0 && (
                <div style={{ fontSize: "0.8rem", color: "#555", marginTop: 4 }}>
                  {iomFiles.length} file(s) selected
                </div>
              )}
            </div>

            {iomError && (
              <div
                style={{
                  background: "#fee2e2",
                  borderRadius: 4,
                  padding: "0.4rem 0.6rem",
                  color: "#b91c1c",
                  fontSize: "0.8rem",
                  marginBottom: "0.4rem",
                }}
              >
                {iomError}
              </div>
            )}

            {iomSuccess && (
              <div
                style={{
                  background: "#dcfce7",
                  borderRadius: 4,
                  padding: "0.4rem 0.6rem",
                  color: "#166534",
                  fontSize: "0.8rem",
                  marginBottom: "0.4rem",
                }}
              >
                {iomSuccess}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={submitIom}
              disabled={iomSubmitting}
              style={{
                background: "#0C512F",
                border: "none",
                color: "white",
                padding: "0.45rem 1rem",
                borderRadius: 6,
              }}
            >
              {iomSubmitting ? "Sending IOM..." : "Send IOM"}
            </button>
          </div>

          {/* IOM history */}
          <div>
            <h3
              style={{
                fontSize: "0.95rem",
                color: "#0C512F",
                marginBottom: "0.4rem",
              }}
            >
              IOM History
            </h3>

            {iomLoading ? (
              <div>Loading IOMs...</div>
            ) : !ioms.length ? (
              <div style={{ fontSize: "0.85rem", color: "#555" }}>
                No IOMs yet for this complaint.
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {ioms.map((iom) => (
                  <li
                    key={iom.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "0.6rem",
                      marginBottom: "0.5rem",
                      background: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <strong>{iom.subject || "IOM"}</strong>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "#6b7280",
                          marginLeft: 8,
                        }}
                      >
                        {iom.createdAt
                          ? new Date(iom.createdAt).toLocaleString()
                          : ""}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#555",
                        marginBottom: 4,
                      }}
                    >
                      From:{" "}
                      <strong style={{ color: "#0C512F" }}>
                        {iom.from?.username || iom.fromUserId || "Unknown"}
                      </strong>{" "}
                      {iom.to && (
                        <>
                          &nbsp;→ To:{" "}
                          <strong style={{ color: "#0C512F" }}>
                            {iom.to?.username || iom.toUserId || "Unknown"}
                          </strong>
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        padding: 6,
                        background: "white",
                        fontSize: "0.9rem",
                        marginBottom: 4,
                      }}
                      dangerouslySetInnerHTML={{ __html: iom.bodyHtml || "" }}
                    />
                    {iom.attachments && iom.attachments.length > 0 && (
                      <div style={{ fontSize: "0.8rem" }}>
                        <strong>Attachments: </strong>
                        {iom.attachments.map((a) => (
                          <a
                            key={a.id}
                            href={API_BASE + a.path}
                            target="_blank"
                            rel="noreferrer"
                            style={{ marginRight: 8, color: "#0C512F" }}
                          >
                            File #{a.id}
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* LOGS */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
          <h2 style={{ fontSize: "1rem", color: "#0C512F", marginBottom: 8 }}>
            Logs / Remarks
          </h2>

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {c.logs.length ? (
              c.logs.map((l) => {
                // Display name preference: DO username, otherwise Admin/System
                let displayName = l.user.username;
                if (l.user.role === "DO") {
                  displayName = l.user.username;
                } else if (l.user.username === "System") {
                  displayName = "System";
                } else if (l.user.role === "ADMIN") {
                  displayName = "Admin";
                }

                const { visibility, text } = parseLogVisibility(l.comments);
                const formatted = formatLogComment(text);

                return (
                  <li
                    key={l.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "0.6rem",
                      marginBottom: "0.5rem",
                      background: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#555",
                        marginBottom: "0.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span>
                        {new Date(l.createdAt).toLocaleString()} —{" "}
                        <strong style={{ color: "#0C512F" }}>{displayName}</strong>
                      </span>

                      {visibility === "INTERNAL" && (
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 999,
                            fontSize: "0.65rem",
                            background: "#FEE2E2",
                            color: "#B91C1C",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Internal
                        </span>
                      )}
                      {visibility === "PUBLIC" && (
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 999,
                            fontSize: "0.65rem",
                            background: "#DBEAFE",
                            color: "#1D4ED8",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Public
                        </span>
                      )}
                    </div>

                    <div style={{ color: "#333", fontSize: "0.85rem" }}>
                      {formatted}
                    </div>
                  </li>
                );
              })
            ) : (
              <li>No remarks yet</li>
            )}
          </ul>

          {/* ADD REMARK */}
          <div
            className="print-hidden"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.4rem",
              marginTop: "0.6rem",
              alignItems: "center",
            }}
          >
            <input
              className="input"
              placeholder="Add remark..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />

            <select
              className="input"
              value={remarkType}
              onChange={(e) => setRemarkType(e.target.value)}
              style={{ width: 150, fontSize: "0.8rem" }}
            >
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
            </select>

            <button
              className="btn btn-primary"
              onClick={addRemark}
              style={{
                background: "#0C512F",
                border: "none",
                color: "white",
                padding: "0.45rem 1rem",
                borderRadius: 6,
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ---------- SMALL DISPLAY HELPERS ---------- */

function Info({ label, value }) {
  return (
    <div>
      <strong style={{ color: "#0C512F" }}>{label}:</strong> {value || "-"}
    </div>
  );
}

function FullInfo({ label, value }) {
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <strong style={{ color: "#0C512F" }}>{label}:</strong> {value || "-"}
    </div>
  );
}

/* ---------- COMPLAINT BREAKDOWN (POINTS 1–8) ---------- */

function ComplaintBreakdown({ complaint }) {
  if (!complaint) return <div>-</div>;

  const lines = complaint.split(/\r?\n/).filter((l) => l.trim() !== "");

  // Simple parser that bolds "1) ...:" part and leaves the rest normal
  return (
    <div style={{ fontSize: "0.9rem" }}>
      {lines.map((line, idx) => {
        const colonIdx = line.indexOf(":");
        let label = "";
        let rest = line;

        if (colonIdx !== -1) {
          label = line.slice(0, colonIdx + 1);
          rest = line.slice(colonIdx + 1).trim();
        }

        return (
          <div key={idx} style={{ marginBottom: "0.25rem" }}>
            {label ? (
              <>
                <strong>{label}</strong> {rest}
              </>
            ) : (
              line
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- LOG VISIBILITY + FORMATTER ---------- */

function parseLogVisibility(raw) {
  const txt = (raw || "").trim();
  if (/^\[PUBLIC\]/i.test(txt)) {
    return {
      visibility: "PUBLIC",
      text: txt.replace(/^\[PUBLIC\]\s*/i, ""),
    };
  }
  if (/^\[INTERNAL\]/i.test(txt)) {
    return {
      visibility: "INTERNAL",
      text: txt.replace(/^\[INTERNAL\]\s*/i, ""),
    };
  }
  return { visibility: "DEFAULT", text: txt };
}

function formatLogComment(text) {
  if (!text) return "";

  // Convert "Status changed to 1/2/3" → names (for older logs)
  const match = /^Status changed to\s+(\d+)/i.exec(text);
  if (!match) return text;

  const code = match[1];
  const map = {
    "1": "Pending",
    "2": "In Progress",
    "3": "Closed",
  };
  const name = map[code] || code;
  return `Status changed to ${name}`;
}
