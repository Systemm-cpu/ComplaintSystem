import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { API_BASE } from "../components/api";

export default function Complaint() {
  const [md, setMd] = useState({
    categories: [],
    companies: [],
    types: [],
  });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    cnic: "",
    email: "",
    address: "",
    city: "",
    province: "",
    homePhone: "",
    officePhone: "",
    complaint: "",
    categoryId: "",
    companyId: "",
    typeId: "",
  });

  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Extra OGRA 1–8 fields
  const [triedDirect, setTriedDirect] = useState("");              // 4 (Yes/No)
  const [triedDirectDetails, setTriedDirectDetails] = useState(""); // 4 details
  const [filedElsewhere, setFiledElsewhere] = useState("");        // 5
  const [filedDetails, setFiledDetails] = useState("");
  const [otherInfo, setOtherInfo] = useState("");                  // 6
  const [attachmentsIncluded, setAttachmentsIncluded] = useState(""); // 7
  const [attachmentList, setAttachmentList] = useState("");
  const [signature, setSignature] = useState("");                  // 8
  const [affirmDate, setAffirmDate] = useState("");
  const [affirm, setAffirm] = useState(false);

  // Summary step
  const [showSummary, setShowSummary] = useState(false);

  // REF for scrolling to top
  const topRef = useRef(null);

  useEffect(() => {
    Promise.all([
      axios.get(API_BASE + "/api/master/categories"),
      axios.get(API_BASE + "/api/master/companies"),
      axios.get(API_BASE + "/api/master/types"),
    ]).then(([c, co, t]) => {
      setMd({ categories: c.data, companies: co.data, types: t.data });
    });
  }, []);

  const onFile = (e) => {
    setError("");
    const fs = e.target.files;
    for (let i = 0; i < fs.length; i++) {
      if (fs[i].size > 5 * 1024 * 1024) {
        setError("Each attachment must be ≤ 5 MB.");
        return;
      }
    }
    setFiles(fs);
  };

  // ---------- VALIDATION ----------
  function validateForm() {
    // Required fields
    if (!form.firstName.trim()) return "First Name is required.";
    if (!form.cnic.trim()) return "CNIC is required.";

    // CNIC validation: 13 digits with or without dashes
    const cnic = form.cnic.trim();
    const cnicPatternDash = /^\d{5}-\d{7}-\d$/;      // 12345-1234567-1
    const cnicPatternPlain = /^\d{13}$/;             // 1234512345671
    if (!cnicPatternDash.test(cnic) && !cnicPatternPlain.test(cnic)) {
      return "CNIC must be 13 digits (e.g. 12345-1234567-1).";
    }

    if (!form.email.trim()) return "Email is required.";
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!form.city.trim()) return "City is required.";
    if (!form.province.trim()) return "Province is required.";
    if (!form.address.trim()) return "Address is required.";

    if (!form.complaint.trim())
      return "Complaint description is required.";

    if (!form.companyId)
      return "Please select a Company (licensee/dealer).";
    if (!form.categoryId)
      return "Please select a Consumer category.";
    if (!form.typeId)
      return "Please select a Complaint Type.";

    return "";
  }

  const submit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    setError("");

    if (!affirm) {
      setError("Please affirm that the information is correct (Point 8).");
      return;
    }

    // FIRST CLICK: validate and show summary only
    if (!showSummary) {
      const msg = validateForm();
      if (msg) {
        setError(msg);
        return;
      }

      setShowSummary(true);

      // SCROLL TO TOP after enabling summary
      if (topRef.current) {
        topRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      return;
    }

    // SECOND CLICK: actually submit to backend
    setLoading(true);

    try {
      // Compose full complaint text including extra details
      const composedComplaint =
        `1) Contact Details:\n` +
        `   City: ${form.city || "N/A"}\n` +
        `   Province: ${form.province || "N/A"}\n` +
        `   Home Telephone: ${form.homePhone || "N/A"}\n` +
        `   Office Telephone: ${form.officePhone || "N/A"}\n\n` +
        `3) Complaint Description:\n${form.complaint}\n\n` +
        `4) Tried to resolve with Licensee: ${triedDirect || "Not specified"}\n` +
        (triedDirect === "Yes" && triedDirectDetails
          ? `   Details: ${triedDirectDetails}\n`
          : "") +
        `5) Filed with any other body: ${filedElsewhere || "Not specified"}\n` +
        (filedElsewhere === "Yes" && filedDetails
          ? `   Details: ${filedDetails}\n`
          : "") +
        `6) Any other information: ${otherInfo || "None"}\n` +
        `7) Attachments included: ${attachmentsIncluded || "Not specified"}\n` +
        (attachmentsIncluded === "Yes" && attachmentList
          ? `   Attachment list: ${attachmentList}\n`
          : "") +
        `8) Affirmation: Signed by "${signature || "N/A"}" on ${
          affirmDate || "N/A"
        }`;

      const fd = new FormData();
      Object.keys(form).forEach((k) => {
        if (k === "complaint") {
          fd.append("complaint", composedComplaint);
        } else {
          fd.append(k, form[k] ?? "");
        }
      });

      fd.append("consumerNo", form.consumerNo || "");


      if (files) Array.from(files).forEach((f) => fd.append("attachments", f));

      const res = await axios.post(API_BASE + "/api/complaints", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit");
    } finally {
      setLoading(false);
      setShowSummary(false);
    }
  };

  // Helpers to get names from master data
  const getNameById = (arr, id) =>
    arr.find((x) => String(x.id) === String(id))?.name || "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F3F4F6",
        padding: "2rem 1rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        ref={topRef}
        style={{
          width: "100%",
          maxWidth: 880,
          background: "white",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            position: "relative",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          {/* Top-right Track button */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
            }}
          >
            <Link href="/track">
              <button
                type="button"
                style={{
                  background: "white",
                  color: "#0C512F",
                  border: "1px solid #0C512F",
                  borderRadius: 6,
                  padding: "0.4rem 0.9rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Track Complaint
              </button>
            </Link>
          </div>

          <img
            src="/ogra-logo.png"
            alt="OGRA Logo"
            style={{
              width: "36px",
              height: "36px",
              objectFit: "contain",
            }}
          />
          <h1 style={{ fontSize: "1.4rem", color: "#0C512F", fontWeight: 700 }}>
            OGRA Complaint Form
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#444" }}>
            Please complete Points 1 to 8. All information should be accurate.
          </p>
        </div>

        {/* SUCCESS */}
        {result && (
          <div
            style={{
              padding: "1rem",
              background: "rgba(58,164,105,0.15)",
              borderLeft: "4px solid #3AA469",
              borderRadius: 6,
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            <p style={{ margin: 0 }}>Your complaint has been submitted.</p>
            <p style={{ margin: 0 }}>
              Tracking ID:{" "}
              <strong style={{ color: "#0C512F" }}>
                {result.trackingId}
              </strong>
            </p>
          </div>
        )}

        {/* FORM */}
        {!result && (
          <form
            onSubmit={submit}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {error && <div style={{ color: "red" }}>{error}</div>}

            {/* SUMMARY PREVIEW */}
            {showSummary && (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "1rem",
                  background: "#F9FAFB",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "0.5rem",
                    color: "#0C512F",
                    fontSize: "1rem",
                  }}
                >
                  Review Your Complaint
                </h3>
                <p style={{ margin: 0 }}>
                  <strong>Name:</strong> {form.firstName} {form.lastName}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>CNIC:</strong> {form.cnic}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Email:</strong> {form.email}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>City / Province:</strong> {form.city}{" "}
                  {form.city && form.province && " / "} {form.province}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Address:</strong> {form.address}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Home Phone:</strong> {form.homePhone || "N/A"} |{" "}
                  <strong>Office Phone:</strong> {form.officePhone || "N/A"}
                </p>
                <p style={{ margin: "0.5rem 0 0" }}>
                  <strong>Company:</strong>{" "}
                  {getNameById(md.companies, form.companyId) || "N/A"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Consumer Category:</strong>{" "}
                  {getNameById(md.categories, form.categoryId) || "N/A"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Complaint Type:</strong>{" "}
                  {getNameById(md.types, form.typeId) || "N/A"}
                </p>
                <p style={{ margin: "0.5rem 0 0" }}>
                  <strong>Complaint:</strong> {form.complaint}
                </p>
                <p style={{ margin: "0.5rem 0 0" }}>
                  <strong>Tried to resolve with licensee:</strong>{" "}
                  {triedDirect || "Not specified"}
                  {triedDirect === "Yes" && triedDirectDetails
                    ? ` — ${triedDirectDetails}`
                    : ""}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Filed elsewhere:</strong>{" "}
                  {filedElsewhere || "Not specified"}
                  {filedElsewhere === "Yes" && filedDetails
                    ? ` — ${filedDetails}`
                    : ""}
                </p>
                <p style={{ margin: "0.5rem 0 0" }}>
                  <strong>Other info:</strong> {otherInfo || "None"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Attachments included:</strong>{" "}
                  {attachmentsIncluded || "Not specified"}
                  {attachmentsIncluded === "Yes" && attachmentList
                    ? ` — ${attachmentList}`
                    : ""}
                </p>
                <p style={{ margin: "0.5rem 0 0" }}>
                  <strong>Affirmation:</strong> Signed as "{signature || "N/A"}"
                  {" on "}
                  {affirmDate || "N/A"}
                </p>

                {/* TOP ACTION BUTTONS: EDIT + CONFIRM & SUBMIT */}
                <div
                  style={{
                    marginTop: "0.75rem",
                    display: "flex",
                    gap: "0.5rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowSummary(false)}
                    style={{
                      padding: "0.4rem 0.9rem",
                      borderRadius: 6,
                      border: "1px solid #9CA3AF",
                      background: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    Edit Information
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={submit}
                    style={{
                      padding: "0.4rem 0.9rem",
                      borderRadius: 6,
                      border: "none",
                      background: "#0C512F",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {loading ? "Submitting..." : "Confirm & Submit"}
                  </button>
                </div>
              </div>
            )}

            {/* 1) Information about Complainant */}
            <section>
              <h2 style={{ color: "#0C512F", marginBottom: "0.5rem" }}>
                1) Information about Complainant
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "1rem",
                }}
              >
                <FormInput
                  label="First Name"
                  required
                  value={form.firstName}
                  onChange={(v) => setForm({ ...form, firstName: v })}
                />
                <FormInput
                  label="Last Name"
                  value={form.lastName}
                  onChange={(v) => setForm({ ...form, lastName: v })}
                />
                <FormInput
                  label="CNIC (e.g. 12345-1234567-1)"
                  required
                  value={form.cnic}
                  onChange={(v) => setForm({ ...form, cnic: v })}
                />
                <FormInput
                  label="Consumer No (optional)"
                  value={form.consumerNo}
                  onChange={(v) => setForm({ ...form, consumerNo: v })}
                />
                <FormInput
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
              </div>

              {/* City / Province / Phones */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "1rem",
                  marginTop: "0.75rem",
                }}
              >
                <FormInput
                  label="City"
                  required
                  value={form.city}
                  onChange={(v) => setForm({ ...form, city: v })}
                />

                {/* Province dropdown */}
                <div>
                  <label
                    style={{ fontWeight: 600, fontSize: "0.9rem" }}
                  >
                    Province
                  </label>
                  <select
                    value={form.province}
                    onChange={(e) =>
                      setForm({ ...form, province: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ccc",
                      borderRadius: 6,
                      marginTop: 6,
                    }}
                  >
                    <option value="">Select Province</option>
                    <option value="Balochistan">Balochistan</option>
                    <option value="Khyber Pakhtunkhwa">
                      Khyber Pakhtunkhwa
                    </option>
                    <option value="Sindh">Sindh</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Federal Capital">Federal Capital</option>
                    <option value="Federally Administered Northern Areas/FANA">
                      Federally Administered Northern Areas/FANA
                    </option>
                    <option value="Federally Administered Tribal Areas/FATA">
                      Federally Administered Tribal Areas/FATA
                    </option>
                    <option value="Azad Kashmir">Azad Kashmir</option>
                    <option value="Gilgit Baltistan">Gilgit Baltistan</option>
                  </select>
                </div>

                <FormInput
                  label="Home Telephone (with country code)"
                  value={form.homePhone}
                  onChange={(v) => setForm({ ...form, homePhone: v })}
                />
                <FormInput
                  label="Office Telephone (with country code)"
                  value={form.officePhone}
                  onChange={(v) => setForm({ ...form, officePhone: v })}
                />
              </div>

              <FormTextarea
                label="Address"
                required
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
                full
              />
            </section>

            {/* 2) Person / company against whom complaint is filed */}
            <section>
              <h2 style={{ color: "#0C512F", marginBottom: "0.5rem" }}>
                2) Person / Company (Licensee / Dealer) against whom complaint is filed
              </h2>
              <div style={{ maxWidth: 400 }}>
                <FormSelect
                  label="Company (if available in list)"
                  options={md.companies}
                  value={form.companyId}
                  onChange={(v) => setForm({ ...form, companyId: v })}
                  required
                />
              </div>
            </section>

            {/* 3) What is the complaint */}
            <section>
              <h2 style={{ color: "#0C512F", marginBottom: "0.5rem" }}>
                3) What is the Complaint (Describe Problem)
              </h2>
              <FormTextarea
                label="Complaint Description"
                required
                value={form.complaint}
                onChange={(v) => setForm({ ...form, complaint: v })}
                full
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "1rem",
                  marginTop: "0.5rem",
                }}
              >
                <FormSelect
                  label="Consumer (Type)"
                  options={md.categories}
                  value={form.categoryId}
                  onChange={(v) => setForm({ ...form, categoryId: v })}
                  required
                />
                <FormSelect
                  label="Complaint Type (internal use)"
                  options={md.types}
                  value={form.typeId}
                  onChange={(v) => setForm({ ...form, typeId: v })}
                  required
                />
              </div>
            </section>

            {/* 4) Tried to resolve with licensee */}
            <section>
              <h2 style={{ color: "#0C512F", marginBottom: "0.5rem" }}>
                4) Has the complainant (in case of natural gas) tried to resolve the
                complaint directly with the licensee(SNGPL,SSGCL,OTHER), and brief their reply.
              </h2>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label>
                  <input
                    type="radio"
                    name="triedDirect"
                    checked={triedDirect === "Yes"}
                    onChange={() => setTriedDirect("Yes")}
                  />{" "}
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    name="triedDirect"
                    checked={triedDirect === "No"}
                    onChange={() => setTriedDirect("No")}
                  />{" "}
                  No
                </label>
              </div>

              {triedDirect === "Yes" && (
                <FormTextarea
                  label="If yes, briefly describe the licensee's reply"
                  value={triedDirectDetails}
                  onChange={setTriedDirectDetails}
                  full
                />
              )}
            </section>

            {/* 5) Filed with any other body */}
            <section>
              <h2 style={{ color: "#0C512F", marginBottom: "0.5rem" }}>
                5) Has complainant filed this complaint with any other body? (e.g., Court) And Current Case status.
              </h2>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label>
                  <input
                    type="radio"
                    name="filedElsewhere"
                    checked={filedElsewhere === "Yes"}
                    onChange={() => setFiledElsewhere("Yes")}
                  />{" "}
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    name="filedElsewhere"
                    checked={filedElsewhere === "No"}
                    onChange={() => setFiledElsewhere("No")}
                  />{" "}
                  No
                </label>
              </div>

              {filedElsewhere === "Yes" && (
                <FormTextarea
                  label="If yes, provide details (body, case number, etc.)"
                  value={filedDetails}
                  onChange={setFiledDetails}
                  full
                />
              )}
            </section>

            {/* 6) Any other information */}
            <section>
              <h2 style={{ color: "#0C512F", marginBottom: "0.5rem" }}>
                6) Any Other Information
              </h2>
              <FormTextarea
                label="Any additional information you wish to provide"
                value={otherInfo}
                onChange={setOtherInfo}
                full
              />
            </section>

            {/* 7) Attachments */}
            <section>
              <h2 style={{ color: "#0C512F", marginBottom: "0.5rem" }}>
                7) Have copies of all relevant documents been attached?
              </h2>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label>
                  <input
                    type="radio"
                    name="attachmentsIncluded"
                    checked={attachmentsIncluded === "Yes"}
                    onChange={() => setAttachmentsIncluded("Yes")}
                  />{" "}
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    name="attachmentsIncluded"
                    checked={attachmentsIncluded === "No"}
                    onChange={() => setAttachmentsIncluded("No")}
                  />{" "}
                  No
                </label>
              </div>

              {attachmentsIncluded === "Yes" && (
                <FormTextarea
                  label="Itemized list of attached documents"
                  value={attachmentList}
                  onChange={setAttachmentList}
                  full
                />
              )}

              <div style={{ marginTop: "0.5rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  File Upload (PDF/JPG/PNG, ≤ 5 MB each)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={onFile}
                  style={{
                    marginTop: 6,
                    padding: "0.4rem",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    width: "100%",
                  }}
                />
              </div>
            </section>

            {/* 8) Affirmation */}
            <section>
              <h2 style={{ color: "#0C512F", marginBottom: "0.5rem" }}>
                8) Affirmation
              </h2>
              <p style={{ fontSize: "0.9rem", color: "#444" }}>
                I hereby affirm that all the facts and information given in this
                application are correct and that no material facts have been concealed
                from the Authority.
              </p>

              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={affirm}
                    onChange={(e) => setAffirm(e.target.checked)}
                  />{" "}
                  I agree with the above statement.
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: "1rem",
                  marginTop: "0.5rem",
                }}
              >
                <FormInput
                  label="Signature of Complainant"
                  value={signature}
                  onChange={setSignature}
                />
                <FormInput
                  label="Date"
                  type="date"
                  value={affirmDate}
                  onChange={setAffirmDate}
                />
              </div>
            </section>

            {/* SUBMIT (BOTTOM BUTTON) */}
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                disabled={loading}
                style={{
                  background: "#0C512F",
                  color: "white",
                  padding: "0.7rem 2rem",
                  border: "none",
                  borderRadius: 6,
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                {loading
                  ? "Submitting..."
                  : showSummary
                  ? "Confirm & Submit"
                  : "Review Summary"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------ INPUT COMPONENTS ------------------ */
function FormInput({ label, value, onChange, required, type = "text" }) {
  return (
    <div>
      <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "0.5rem",
          border: "1px solid #ccc",
          borderRadius: 6,
          marginTop: 6,
        }}
      />
    </div>
  );
}

function FormTextarea({ label, value, onChange, required, full }) {
  return (
    <div style={{ gridColumn: full ? "1/-1" : "auto" }}>
      <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{label}</label>
      <textarea
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "0.5rem",
          border: "1px solid #ccc",
          borderRadius: 6,
          marginTop: 6,
          minHeight: 90,
        }}
      />
    </div>
  );
}

function FormSelect({ label, options, value, onChange, required }) {
  return (
    <div>
      <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{
          width: "100%",
          padding: "0.5rem",
          border: "1px solid #ccc",
          borderRadius: 6,
          marginTop: 6,
        }}
      >
        <option value="">Select</option>
        {options.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
    </div>
  );
}
