require("dotenv").config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure folders exist
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));

const db = new sqlite3.Database(path.join(__dirname, 'data', 'db.sqlite'));

/* ==========================
   SCHEMA + SEED
   ========================== */
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT,
    passwordHash TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trackingId TEXT UNIQUE,
    firstName TEXT,
    lastName TEXT,
    cnic TEXT,
    email TEXT,
    address TEXT,
    complaint TEXT,
    categoryId INTEGER,
    companyId INTEGER,
    typeId INTEGER,
    statusId INTEGER,
    assignedTo INTEGER,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS complaint_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER,
    path TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS complaint_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER,
    userId INTEGER,
    comments TEXT,
    createdAt TEXT
  )`);

  // NEW: IOM tables
  db.run(`CREATE TABLE IF NOT EXISTS complaint_ioms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER,
    fromUserId INTEGER,
    toUserId INTEGER,
    subject TEXT,
    bodyHtml TEXT,
    createdAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS complaint_iom_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iomId INTEGER,
    path TEXT
  )`);

  // NEW: Disposal / final decision
  db.run(`CREATE TABLE IF NOT EXISTS complaint_disposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER,
    filePath TEXT,
    note TEXT,
    createdAt TEXT,
    userId INTEGER
  )`);

  // seed statuses
  db.get("SELECT COUNT(*) as c FROM statuses", (err, row) => {
    if (row && row.c === 0) {
      const stmt = db.prepare("INSERT INTO statuses (name) VALUES (?)");
      ['Pending', 'In Progress', 'Closed'].forEach(s => stmt.run(s));
      stmt.finalize();
    }
  });

  // seed admin user
  db.get("SELECT COUNT(*) as c FROM users WHERE username = 'adminogra'", async (err, row) => {
    if (row && row.c === 0) {
      const hash = await bcrypt.hash('Ogra2025', 10);
      db.run(
        "INSERT INTO users (username,email,passwordHash,role) VALUES (?,?,?,?)",
        ['adminogra', 'admin@ogra.local', hash, 'ADMIN']
      );
      console.log('Seeded admin user: adminogra / Ogra2025');
    }
  });
});

/* ==========================
   AUTH HELPERS
   ========================== */
function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { sub, role, username }
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

/* ==========================
   NODEMAILER
   ========================== */
let transporter = null;
if (process.env.SMTP_HOST) {
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;

  console.log(
    "[SMTP] Initializing transporter",
    "host=" + process.env.SMTP_HOST,
    "port=" + port,
    "user=" + (user || "(no user)")
  );

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 → SSL (secure), 587/others → STARTTLS (secure: false)
    secure: port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASS } : undefined,
  });

  transporter.verify((err, success) => {
    if (err) {
      console.error("[SMTP] verify() failed:", err.message || err);
    } else {
      console.log("[SMTP] Ready to send emails:", success);
    }
  });
} else {
  console.log("[SMTP] SMTP_HOST not set, email sending is DISABLED");
}

// Helper: email to complainant based on complaintId
function sendComplaintEmail(complaintId, subject, text) {
  if (!transporter) {
    console.log("[SMTP] Skipping email (no transporter) for complaint", complaintId);
    return;
  }
  db.get(
    "SELECT email, trackingId FROM complaints WHERE id = ?",
    [complaintId],
    (err, row) => {
      if (err) {
        console.error("[SMTP] DB error while fetching complaint email:", err.message || err);
        return;
      }
      if (!row || !row.email) {
        console.log("[SMTP] No email for complaint", complaintId);
        return;
      }
      const trackingId = row.trackingId || '';
      const body = (text || '').replace(/\{trackingId\}/g, trackingId);

      transporter.sendMail(
        {
          from: process.env.SMTP_FROM || 'no-reply@ogra.local',
          to: row.email,
          subject,
          text: body,
        },
        (err2, info) => {
          if (err2) {
            console.error(
              "[SMTP] Error sending email for complaint",
              complaintId,
              ":",
              err2.message || err2
            );
          } else {
            console.log(
              "[SMTP] Email sent for complaint",
              complaintId,
              "messageId=",
              info && info.messageId
            );
          }
        }
      );
    }
  );
}

// NEW: notify all SR_REGISTRAR users when a new complaint is submitted
function notifySrRegistrarsNewComplaint(complaintId) {
  if (!transporter) {
    console.log("[SMTP] Skipping SR Registrar notification (no transporter)");
    return;
  }

  db.get(
    "SELECT id, trackingId, firstName, lastName, email FROM complaints WHERE id = ?",
    [complaintId],
    (err, complaint) => {
      if (err) {
        console.error("[SMTP] Error loading complaint for SR Registrar email:", err.message || err);
        return;
      }
      if (!complaint) {
        console.log("[SMTP] Complaint not found for SR Registrar email:", complaintId);
        return;
      }

      const fullName = `${complaint.firstName || ""} ${complaint.lastName || ""}`.trim();
      const subject = `New complaint submitted: ${complaint.trackingId}`;
      const text =
        `A new complaint has been submitted in the OGRA Complaint Portal.\n\n` +
        `Tracking ID: ${complaint.trackingId}\n` +
        `Complainant: ${fullName || "-"}\n` +
        `Complainant Email: ${complaint.email || "-"}\n\n` +
        `Please log in to the portal to review and process this complaint.`;

      db.all(
        "SELECT email FROM users WHERE role = 'SR_REGISTRAR' AND email IS NOT NULL AND email <> ''",
        [],
        (err2, rows) => {
          if (err2) {
            console.error("[SMTP] Error loading SR Registrar users:", err2.message || err2);
            return;
          }
          if (!rows || !rows.length) {
            console.log("[SMTP] No SR_REGISTRAR users with email configured.");
            return;
          }

          rows.forEach((u) => {
            transporter.sendMail(
              {
                from: process.env.SMTP_FROM || "no-reply@ogra.local",
                to: u.email,
                subject,
                text,
              },
              (errMail, info) => {
                if (errMail) {
                  console.error(
                    "[SMTP] Error sending SR Registrar new-complaint email to",
                    u.email,
                    ":",
                    errMail.message || errMail
                  );
                } else {
                  console.log(
                    "[SMTP] SR Registrar new-complaint email sent to",
                    u.email,
                    "messageId=",
                    info && info.messageId
                  );
                }
              }
            );
          });
        }
      );
    }
  );
}

// NEW: notify the user (typically DO) when a complaint is assigned/forwarded to them
function notifyAssignedUser(complaintId, userId) {
  if (!transporter) {
    console.log("[SMTP] Skipping assignment email (no transporter)");
    return;
  }

  db.get(
    "SELECT id, trackingId, firstName, lastName FROM complaints WHERE id = ?",
    [complaintId],
    (err, complaint) => {
      if (err) {
        console.error("[SMTP] Error loading complaint for assignment email:", err.message || err);
        return;
      }
      if (!complaint) {
        console.log("[SMTP] Complaint not found for assignment email:", complaintId);
        return;
      }

      db.get(
        "SELECT id, username, email, role FROM users WHERE id = ?",
        [userId],
        (err2, user) => {
          if (err2) {
            console.error("[SMTP] Error loading assigned user:", err2.message || err2);
            return;
          }
          if (!user || !user.email) {
            console.log(
              "[SMTP] Assigned user has no email configured. userId=",
              userId
            );
            return;
          }

          const fullName = `${complaint.firstName || ""} ${complaint.lastName || ""}`.trim();
          const subject = `Complaint assigned: ${complaint.trackingId}`;
          const text =
            `A complaint has been assigned/forwarded to you in the OGRA Complaint Portal.\n\n` +
            `Tracking ID: ${complaint.trackingId}\n` +
            `Complainant: ${fullName || "-"}\n\n` +
            `Please log in to the portal to review and take further action.`;

          transporter.sendMail(
            {
              from: process.env.SMTP_FROM || "no-reply@ogra.local",
              to: user.email,
              subject,
              text,
            },
            (errMail, info) => {
              if (errMail) {
                console.error(
                  "[SMTP] Error sending assignment email to",
                  user.email,
                  ":",
                  errMail.message || errMail
                );
              } else {
                console.log(
                  "[SMTP] Assignment email sent to",
                  user.email,
                  "messageId=",
                  info && info.messageId
                );
              }
            }
          );
        }
      );
    }
  );
}


/* ==========================
   MULTER (UPLOADS)
   ========================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

// Public complaint attachments
const publicUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Invalid file type'));
    cb(null, true);
  }
});

// IOM attachments – PDF + Word + images
const iomUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});

// Disposal decision file – PDF + Word only
const decisionUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Decision file must be PDF/Word'));
    }
    cb(null, true);
  }
});

/* ==========================
   AUTH ROUTES
   ========================== */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { sub: user.id, role: user.role, username: user.username },
      JWT_SECRET
    );
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, email: user.email }
    });
  });
});

/* ==========================
   MASTER DATA ROUTES
   ========================== */
function masterRoutes(table) {
  app.get(`/api/master/${table}`, (req, res) => {
    db.all(`SELECT * FROM ${table} ORDER BY name`, [], (err, rows) => res.json(rows || []));
  });
  app.post(`/api/master/${table}`, authMiddleware, requireRole('ADMIN'), (req, res) => {
    const { name } = req.body;
    db.run(`INSERT INTO ${table} (name) VALUES (?)`, [name], function (err) {
      if (err) return res.status(400).json({ message: 'Error' });
      res.json({ id: this.lastID, name });
    });
  });
  app.delete(`/api/master/${table}/:id`, authMiddleware, requireRole('ADMIN'), (req, res) => {
    db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id], function (err) {
      res.json({ deleted: this.changes });
    });
  });
}

['categories', 'companies', 'types'].forEach(masterRoutes);

// statuses for filters
app.get('/api/master/statuses', (req, res) => {
  db.all("SELECT * FROM statuses ORDER BY id", [], (err, rows) => res.json(rows || []));
});

/* ==========================
   PUBLIC: SUBMIT COMPLAINT
   ========================== */
app.post('/api/complaints', publicUpload.array('attachments', 5), (req, res) => {
  const body = req.body;
  const now = new Date().toISOString();
  const trackingId = 'CMP-' + Date.now().toString(36).toUpperCase();
  const statusId = 1; // Pending

  db.run(
    `INSERT INTO complaints (
      trackingId, firstName, lastName, cnic, email, address, consumerNo, complaint,
      categoryId, companyId, typeId, statusId, assignedTo, createdAt, updatedAt
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      trackingId,
      body.firstName || '',
      body.lastName || '',
      body.cnic || '',
      body.email || '',
      body.address || '',
      body.consumerNo || '',
      body.complaint || '',
      body.categoryId || null,
      body.companyId || null,
      body.typeId || null,
      statusId,
      null,
      now,
      now
    ],
    function (err) {
      if (err) return res.status(500).json({ message: 'DB error' });

      const complaintId = this.lastID;

      // Save attachments
      const files = req.files || [];
      const stmt = db.prepare(
        "INSERT INTO complaint_attachments (complaintId, path) VALUES (?,?)"
      );
      files.forEach(f =>
        stmt.run(complaintId, '/uploads/' + path.basename(f.path))
      );
      stmt.finalize();

      // Log
      db.run(
        "INSERT INTO complaint_logs (complaintId, userId, comments, createdAt) VALUES (?,?,?,?)",
        [complaintId, null, 'Complaint submitted', now]
      );

      // -----------------------------
      // EMAILS (complainant + SR REG)
      // -----------------------------
      if (transporter) {
        // 1) Email to complainant (if email provided)
        if (body.email) {
          transporter.sendMail(
            {
              from: process.env.SMTP_FROM || 'no-reply@ogra.local',
              to: body.email,
              subject: 'OGRA Complaint Submitted',
              text: `Your complaint has been submitted. Tracking ID: ${trackingId}`,
            },
            (errMail, info) => {
              if (errMail) {
                console.error(
                  "[SMTP] Error sending 'submitted' email to",
                  body.email,
                  ":",
                  errMail.message || errMail
                );
              } else {
                console.log(
                  "[SMTP] 'submitted' email sent to",
                  body.email,
                  'messageId=',
                  info && info.messageId
                );
              }
            }
          );
        } else {
          console.log(
            "[SMTP] No complainant email in request, skip 'submitted' email"
          );
        }

        // 2) Email to all SR_REGISTRAR users
        db.all(
          "SELECT email FROM users WHERE role = 'SR_REGISTRAR' AND email IS NOT NULL AND email <> ''",
          [],
          (err2, rows) => {
            if (err2) {
              console.error(
                '[SMTP] Error loading SR_REGISTRAR users:',
                err2.message || err2
              );
              return;
            }
            if (!rows || !rows.length) {
              console.log(
                '[SMTP] No SR_REGISTRAR users with email configured. Skipping SR notification.'
              );
              return;
            }

            const fullName =
              `${body.firstName || ''} ${body.lastName || ''}`.trim() || '-';
            const srSubject = `New complaint submitted: ${trackingId}`;
            const srText =
              `A new complaint has been submitted in the OGRA Complaint Portal.\n\n` +
              `Tracking ID: ${trackingId}\n` +
              `Complainant: ${fullName}\n` +
              `Complainant Email: ${body.email || '-'}\n\n` +
              `Please log in to the portal to review and process this complaint.`;

            rows.forEach((u) => {
              transporter.sendMail(
                {
                  from: process.env.SMTP_FROM || 'no-reply@ogra.local',
                  to: u.email,
                  subject: srSubject,
                  text: srText,
                },
                (errMail, info) => {
                  if (errMail) {
                    console.error(
                      '[SMTP] Error sending SR_REGISTRAR new-complaint email to',
                      u.email,
                      ':',
                      errMail.message || errMail
                    );
                  } else {
                    console.log(
                      '[SMTP] SR_REGISTRAR new-complaint email sent to',
                      u.email,
                      'messageId=',
                      info && info.messageId
                    );
                  }
                }
              );
            });
          }
        );
      } else {
        console.log(
          "[SMTP] No transporter, skip complainant + SR_REGISTRAR emails for complaint",
          complaintId
        );
      }

      // Response back to frontend
      res.json({ id: complaintId, trackingId });
    }
  );
});

/* ==========================
   PUBLIC: TRACK COMPLAINT
   ========================== */
app.get('/api/complaints/track/:trackingId', (req, res) => {
  const id = req.params.trackingId;

  db.get(
    `SELECT c.*, s.name as statusName
     FROM complaints c
     LEFT JOIN statuses s ON c.statusId = s.id
     WHERE c.trackingId = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      if (!row) return res.json(null);

      const complaintId = row.id;

      db.all(
        "SELECT * FROM complaint_attachments WHERE complaintId = ?",
        [complaintId],
        (e2, atts) => {
          if (e2) return res.status(500).json({ message: 'DB error' });

          db.all(
            `SELECT l.*, u.username, u.role
             FROM complaint_logs l
             LEFT JOIN users u ON l.userId = u.id
             WHERE l.complaintId = ?
             ORDER BY l.createdAt DESC`,
            [complaintId],
            (e3, logs) => {
              if (e3) return res.status(500).json({ message: 'DB error' });

              // Latest disposal (if any)
              db.get(
                `SELECT d.*, u.username as userName
                 FROM complaint_disposals d
                 LEFT JOIN users u ON d.userId = u.id
                 WHERE d.complaintId = ?
                 ORDER BY d.createdAt DESC
                 LIMIT 1`,
                [complaintId],
                (e4, disp) => {
                  if (e4) return res.status(500).json({ message: 'DB error' });

                  const disposal = disp
                    ? {
                        id: disp.id,
                        note: disp.note || '',
                        createdAt: disp.createdAt,
                        user: { username: disp.userName || null },
                        filePath:
                          disp.filePath && disp.filePath.startsWith('/')
                            ? disp.filePath
                            : '/' + (disp.filePath || '').replace(/^\/?/, ''),
                      }
                    : null;

                  res.json({
                    id: row.id,
                    trackingId: row.trackingId,
                    status: { id: row.statusId, name: row.statusName },
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    attachments: (atts || []).map(a => ({
                      id: a.id,
                      path:
                        a.path && a.path.startsWith("/")
                          ? a.path
                          : "/" + (a.path || "").replace(/^\/?/, ""),
                    })),
                    logs: (logs || []).map(l => ({
                      id: l.id,
                      comments: l.comments,
                      createdAt: l.createdAt,
                      user: { username: l.username, role: l.role },
                    })),
                    disposal,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

/* ==========================
   AUTH: LIST COMPLAINTS
   ========================== */
app.get('/api/complaints', authMiddleware, (req, res) => {
  const page = Number(req.query.page || 1);
  const statusId = req.query.statusId ? Number(req.query.statusId) : null;
  const companyId = req.query.companyId ? Number(req.query.companyId) : null;
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  let where = "1=1";
  const params = [];
  if (statusId) { where += " AND c.statusId = ?"; params.push(statusId); }
  if (companyId) { where += " AND c.companyId = ?"; params.push(companyId); }
  if (req.user.role === 'DO') {
    where += " AND c.assignedTo = ?";
    params.push(req.user.sub);
  }

  db.all(
    `SELECT c.*, s.name as statusName, u.username as assignedUsername
     FROM complaints c
     LEFT JOIN statuses s ON c.statusId = s.id
     LEFT JOIN users u ON c.assignedTo = u.id
     WHERE ${where}
     ORDER BY c.createdAt DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      db.get(
        `SELECT COUNT(*) as cnt FROM complaints c WHERE ${where}`,
        params,
        (err2, row) => {
          const total = row ? row.cnt : 0;
          const pages = Math.max(1, Math.ceil(total / pageSize));
          res.json({
            items: rows.map(r => ({
              id: r.id,
              trackingId: r.trackingId,
              firstName: r.firstName,
              lastName: r.lastName,
              status: { id: r.statusId, name: r.statusName },
              statusId: r.statusId,
              assignedTo: r.assignedUsername ? { username: r.assignedUsername } : null,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt
            })),
            total,
            page,
            pages
          });
        }
      );
    }
  );
});

/* ==========================
   AUTH: COMPLAINT DETAIL
   ========================== */
app.get('/api/complaints/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  db.get(
    `SELECT c.*, s.name as statusName, u.username as assignedUsername
     FROM complaints c
     LEFT JOIN statuses s ON c.statusId = s.id
     LEFT JOIN users u ON c.assignedTo = u.id
     WHERE c.id = ?`,
    [id],
    (err, cRow) => {
      if (!cRow) return res.status(404).json({ message: 'Not found' });
      if (req.user.role === 'DO' && cRow.assignedTo !== req.user.sub) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      db.all(
        "SELECT * FROM complaint_attachments WHERE complaintId = ?",
        [id],
        (e2, atts) => {
          db.all(
            `SELECT l.*, u.username, u.role
             FROM complaint_logs l
             LEFT JOIN users u ON l.userId = u.id
             WHERE l.complaintId = ?
             ORDER BY l.createdAt DESC`,
            [id],
            (e3, logs) => {
              if (e3) return res.status(500).json({ message: 'DB error' });

              // Latest disposal
              db.get(
                `SELECT d.*, u.username as userName
                 FROM complaint_disposals d
                 LEFT JOIN users u ON d.userId = u.id
                 WHERE d.complaintId = ?
                 ORDER BY d.createdAt DESC
                 LIMIT 1`,
                [id],
                (e4, disp) => {
                  if (e4) return res.status(500).json({ message: 'DB error' });

                  const disposal = disp
                    ? {
                        id: disp.id,
                        note: disp.note || '',
                        createdAt: disp.createdAt,
                        user: { username: disp.userName || null },
                        filePath:
                          disp.filePath && disp.filePath.startsWith('/')
                            ? disp.filePath
                            : '/' + (disp.filePath || '').replace(/^\/?/, ''),
                      }
                    : null;

                  res.json({
                    id: cRow.id,
                    trackingId: cRow.trackingId,
                    firstName: cRow.firstName,
                    lastName: cRow.lastName,
                    cnic: cRow.cnic,
                    email: cRow.email,
                    address: cRow.address,
                    consumerNo: cRow.consumerNo,
                    complaint: cRow.complaint,
                    status: { id: cRow.statusId, name: cRow.statusName },
                    assignedTo: cRow.assignedUsername ? { username: cRow.assignedUsername } : null,
                    createdAt: cRow.createdAt,
                    updatedAt: cRow.updatedAt,
                    attachments: (atts || []).map(a => ({
                      id: a.id,
                      path:
                        a.path && a.path.startsWith("/")
                          ? a.path
                          : "/" + (a.path || "").replace(/^\/?/, ""),
                    })),
                    logs: (logs || []).map(l => ({
                      id: l.id,
                      comments: l.comments,
                      createdAt: l.createdAt,
                      user: { username: l.username, role: l.role }
                    })),
                    disposal,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

/* ==========================
   ASSIGN / FORWARD (used by IOM + normal forward)
   ========================== */
app.patch(
  '/api/complaints/:id/assign',
  authMiddleware,
  requireRole('ADMIN', 'SR_REGISTRAR', 'DO'),
  (req, res) => {
    const complaintId = Number(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const now = new Date().toISOString();
    const portalUrl = process.env.BASE_URL || 'http://complaint.ogra.org.pk';

    // 1) Update assignment
    db.run(
      "UPDATE complaints SET assignedTo = ?, updatedAt = ? WHERE id = ?",
      [userId, now, complaintId],
      function (err) {
        if (err) return res.status(500).json({ message: 'DB error' });

        const changes = this.changes;
        if (!changes) {
          return res.status(404).json({ message: 'Complaint not found' });
        }

        // 2) Load complaint details
        db.get(
          "SELECT trackingId, firstName, lastName, email FROM complaints WHERE id = ?",
          [complaintId],
          (errC, complaintRow) => {
            if (errC) {
              return res.status(500).json({ message: 'DB error' });
            }
            if (!complaintRow) {
              return res.status(404).json({ message: 'Complaint not found' });
            }

            // 3) Load receiving user (DO / SR_REGISTRAR)
            db.get(
              "SELECT username, email FROM users WHERE id = ?",
              [userId],
              (err2, userRow) => {
                if (err2) {
                  return res.status(500).json({ message: 'DB error' });
                }

                const targetName = userRow?.username || `user ${userId}`;
                const targetEmail = userRow?.email || null;

                // 4) Log forward
                db.run(
                  "INSERT INTO complaint_logs (complaintId, userId, comments, createdAt) VALUES (?,?,?,?)",
                  [complaintId, req.user.sub, `Forwarded to ${targetName}`, now],
                  (err3) => {
                    if (err3) {
                      return res.status(500).json({ message: 'DB error' });
                    }

                    // 5) Email complainant about forward (existing behaviour)
                    sendComplaintEmail(
                      complaintId,
                      'OGRA Complaint Forwarded',
                      `Your complaint {trackingId} has been forwarded internally for further processing.Please visit URL:${portalUrl}/track`
                    );

                    // 6) Email receiving DO / SR Registrar
                    if (transporter && targetEmail) {
                      const complainantName =
                        `${complaintRow.firstName || ''} ${complaintRow.lastName || ''}`
                          .trim() || '-';

                      const subject = `New complaint assigned: ${complaintRow.trackingId}`;
                      const text =
                        `A complaint has been assigned/forwarded to you in the OGRA Complaint Portal.\n\n` +
                        `Tracking ID: ${complaintRow.trackingId}\n` +
                        `Complainant: ${complainantName}\n` +
                        `Complainant Email: ${complaintRow.email || '-'}\n\n` +
                        `Please log in to the portal to review and process this complaint.`;

                      transporter.sendMail(
                        {
                          from: process.env.SMTP_FROM || 'no-reply@ogra.local',
                          to: targetEmail,
                          subject,
                          text,
                        },
                        (errMail, info) => {
                          if (errMail) {
                            console.error(
                              "[SMTP] Error sending DO assignment email to",
                              targetEmail,
                              ":",
                              errMail.message || errMail
                            );
                          } else {
                            console.log(
                              "[SMTP] DO assignment email sent to",
                              targetEmail,
                              "messageId=",
                              info && info.messageId
                            );
                          }
                        }
                      );
                    } else {
                      if (!transporter) {
                        console.log(
                          "[SMTP] No transporter, skipping DO assignment email"
                        );
                      } else if (!targetEmail) {
                        console.log(
                          "[SMTP] Target user has no email, skipping DO assignment email"
                        );
                      }
                    }

                    // 7) Final response
                    res.json({ updated: changes });
                  }
                );
              }
            );
          }
        );
      }
    );
  }
);


/* ==========================
   STATUS CHANGE
   ========================== */
app.patch(
  '/api/complaints/:id/status',
  authMiddleware,
  requireRole('ADMIN', 'SR_REGISTRAR'),
  (req, res) => {
    const id = Number(req.params.id);
    const { statusId } = req.body;
    const now = new Date().toISOString();

    db.run(
      "UPDATE complaints SET statusId = ?, updatedAt = ? WHERE id = ?",
      [statusId, now, id],
      function (err) {
        if (err) return res.status(500).json({ message: 'DB error' });

        const changes = this.changes;

        db.get(
          "SELECT name FROM statuses WHERE id = ?",
          [statusId],
          (err2, row) => {
            if (err2) return res.status(500).json({ message: 'DB error' });

            const statusName = row?.name || String(statusId);

            db.run(
              "INSERT INTO complaint_logs (complaintId, userId, comments, createdAt) VALUES (?,?,?,?)",
              [id, req.user.sub, `Status changed to ${statusName}`, now],
              (err3) => {
                if (err3) return res.status(500).json({ message: 'DB error' });

                // Email: status updated
                sendComplaintEmail(
                  id,
                  'OGRA Complaint Status Updated',
                  `Your complaint {trackingId} status has been updated to ${statusName}.Please visit URL:http://complaint.ogra.org.pk/track`
                );

                res.json({ updated: changes });
              }
            );
          }
        );
      }
    );
  }
);

/* ==========================
   REMARKS (ADMIN + DO)
   ========================== */
app.post(
  '/api/complaints/:id/remark',
  authMiddleware,
  requireRole('ADMIN', 'SR_REGISTRAR', 'DO'),
  (req, res) => {
    const complaintId = Number(req.params.id);
    const { comments } = req.body;
    if (!comments || !comments.trim()) {
      return res.status(400).json({ message: 'comments required' });
    }
    const now = new Date().toISOString();

    db.run(
      "INSERT INTO complaint_logs (complaintId, userId, comments, createdAt) VALUES (?,?,?,?)",
      [complaintId, req.user.sub, comments.trim(), now],
      function (err) {
        if (err) return res.status(500).json({ message: 'DB error' });

        // Email: new remark added
        sendComplaintEmail(
          complaintId,
          'OGRA Complaint Remark Added',
          'A new remark has been added on your complaint {trackingId}.Please visit URL:http://complaint.ogra.org.pk/track'
        );

        res.json({ id: this.lastID });
      }
    );
  }
);

/* ==========================
   IOM ROUTES
   ========================== */

// Create IOM
app.post(
  '/api/complaints/:id/ioms',
  authMiddleware,
  requireRole('ADMIN', 'SR_REGISTRAR', 'DO'),
  iomUpload.array('iomFiles', 10),
  (req, res) => {
    const complaintId = Number(req.params.id);
    const { toUserId, subject, bodyHtml, senderRole, senderUsername } = req.body;

    const fromUserId = req.user.sub;
    const now = new Date().toISOString();

    if (!toUserId) {
      return res.status(400).json({ message: 'toUserId is required' });
    }

    // Validate complaint exists
    db.get(
      'SELECT id FROM complaints WHERE id = ?',
      [complaintId],
      (err, complaintRow) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        if (!complaintRow) return res.status(404).json({ message: 'Complaint not found' });

        // INSERT IOM
        db.run(
          `INSERT INTO complaint_ioms 
            (complaintId, fromUserId, toUserId, subject, bodyHtml, senderRole, senderUsername, createdAt)
           VALUES (?,?,?,?,?,?,?,?)`,
          [
            complaintId,
            fromUserId,
            Number(toUserId),
            subject || '',
            bodyHtml || '',
            senderRole || req.user.role || 'UNKNOWN',
            senderUsername || req.user.username || 'UNKNOWN',
            now,
          ],
          function (err2) {
            if (err2) {
              console.error(err2);
              return res.status(500).json({ message: 'DB error' });
            }

            const iomId = this.lastID;
            const files = req.files || [];

            // Save attachments
            if (files.length) {
              const stmt = db.prepare(
                'INSERT INTO complaint_iom_attachments (iomId, path) VALUES (?,?)'
              );
              files.forEach((f) => {
                stmt.run(iomId, '/uploads/' + path.basename(f.path));
              });
              stmt.finalize();
            }

            // Update assignment — complaint now assigned to this DO
            db.run(
              "UPDATE complaints SET assignedTo = ?, updatedAt = ? WHERE id = ?",
              [Number(toUserId), now, complaintId]
            );

            // Fetch recipient user info
            db.get(
              'SELECT username, email FROM users WHERE id = ?',
              [Number(toUserId)],
              (err3, userRow) => {
                const targetName =
                  userRow?.username || `user ${toUserId}`;

                // Add system log
                db.run(
                  `INSERT INTO complaint_logs 
                   (complaintId, userId, comments, createdAt)
                   VALUES (?,?,?,?)`,
                  [
                    complaintId,
                    fromUserId,
                    `IOM sent to ${targetName}: ${subject || ''}`,
                    now,
                  ]
                );

                // Notify complainant (existing logic)
                sendComplaintEmail(
                  complaintId,
                  'OGRA Complaint Forwarded',
                  'Your complaint {trackingId} has been forwarded internally for further processing. Visit: http://complaint.ogra.org.pk/track'
                );

                // Notify receiving DO
                if (transporter && userRow?.email) {
                  transporter.sendMail(
                    {
                      from: process.env.SMTP_FROM || 'no-reply@ogra.local',
                      to: userRow.email,
                      subject: 'New IOM Assigned - OGRA Complaint',
                      text: `An IOM has been assigned to you.\n\nSubject: ${subject || ''}`,
                    },
                    (errMail) => {
                      if (errMail) {
                        console.error("[SMTP] Error sending IOM email:", errMail);
                      }
                    }
                  );
                }

                // SEND RESPONSE
                res.json({
                  id: iomId,
                  message: 'IOM created',
                  senderRole: senderRole || req.user.role,
                  senderUsername: senderUsername || req.user.username,
                  createdAt: now,
                  files: files.map((f) => '/uploads/' + path.basename(f.path)),
                });
              }
            );
          }
        );
      }
    );
  }
);


// List IOMs
app.get(
  '/api/complaints/:id/ioms',
  authMiddleware,
  requireRole('ADMIN', 'SR_REGISTRAR', 'DO'),
  (req, res) => {
    const complaintId = Number(req.params.id);

    db.get(
      'SELECT assignedTo FROM complaints WHERE id = ?',
      [complaintId],
      (err, complaintRow) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        if (!complaintRow) return res.status(404).json({ message: 'Complaint not found' });

        if (req.user.role === 'DO' && complaintRow.assignedTo !== req.user.sub) {
          return res.status(403).json({ message: 'Forbidden' });
        }

        db.all(
          `SELECT iom.*, uFrom.username AS fromUsername, uTo.username AS toUsername
           FROM complaint_ioms iom
           LEFT JOIN users uFrom ON iom.fromUserId = uFrom.id
           LEFT JOIN users uTo   ON iom.toUserId   = uTo.id
           WHERE iom.complaintId = ?
           ORDER BY iom.createdAt DESC`,
          [complaintId],
          (err2, ioms) => {
            if (err2) return res.status(500).json({ message: 'DB error' });
            if (!ioms || !ioms.length) return res.json([]);

            const iomIds = ioms.map((i) => i.id);
            const placeholders = iomIds.map(() => '?').join(',');

            db.all(
              `SELECT * FROM complaint_iom_attachments WHERE iomId IN (${placeholders})`,
              iomIds,
              (err3, attRows) => {
                if (err3) return res.status(500).json({ message: 'DB error' });

                const byIom = {};
                (attRows || []).forEach((a) => {
                  if (!byIom[a.iomId]) byIom[a.iomId] = [];
                  byIom[a.iomId].push({
                    id: a.id,
                    path:
                      a.path && a.path.startsWith('/')
                        ? a.path
                        : '/' + (a.path || '').replace(/^\/?/, ''),
                  });
                });

                const result = ioms.map((iom) => ({
                  id: iom.id,
                  complaintId: iom.complaintId,
                  subject: iom.subject,
                  bodyHtml: iom.bodyHtml,
                  createdAt: iom.createdAt,
                  from: {
                    id: iom.fromUserId,
                    username: iom.fromUsername,
                  },
                  to: {
                    id: iom.toUserId,
                    username: iom.toUsername,
                  },
                  attachments: byIom[iom.id] || [],
                }));

                res.json(result);
              }
            );
          }
        );
      }
    );
  }
);

/* ==========================
   DISPOSAL / FINAL DECISION
   ========================== */

app.post(
  '/api/complaints/:id/dispose',
  authMiddleware,
  requireRole('ADMIN', 'SR_REGISTRAR'),
  decisionUpload.single('decisionFile'),
  (req, res) => {
    const complaintId = Number(req.params.id);
    const note = (req.body.note || '').trim();
    const now = new Date().toISOString();
    const file = req.file || null;

    // At least note OR file should be present
    if (!file && !note) {
      return res.status(400).json({
        message: 'Either decision note or decision file is required',
      });
    }

    // File is OPTIONAL now
    const filePath = file ? '/uploads/' + path.basename(file.path) : '';

    db.get(
      'SELECT id FROM complaints WHERE id = ?',
      [complaintId],
      (err, row) => {
        if (err) return res.status(500).json({ message: 'DB error' });
        if (!row) return res.status(404).json({ message: 'Complaint not found' });

        // Insert into disposal table
        db.run(
          `INSERT INTO complaint_disposals (complaintId, filePath, note, createdAt, userId)
           VALUES (?,?,?,?,?)`,
          [complaintId, filePath, note, now, req.user.sub],
          function (err2) {
            if (err2) return res.status(500).json({ message: 'DB error' });

            const disposalId = this.lastID;

            // Close complaint
            db.run(
              'UPDATE complaints SET statusId = ?, updatedAt = ? WHERE id = ?',
              [3, now, complaintId],
              (err3) => {
                if (err3) return res.status(500).json({ message: 'DB error' });

                // Log
                db.run(
                  'INSERT INTO complaint_logs (complaintId, userId, comments, createdAt) VALUES (?,?,?,?)',
                  [
                    complaintId,
                    req.user.sub,
                    note ? `Disposed of: ${note}` : 'Disposed of',
                    now,
                  ],
                  (err4) => {
                    if (err4) return res.status(500).json({ message: 'DB error' });

                    // Email to complainant
                    const baseUrl = process.env.BASE_URL || 'http://complaint.ogra.org.pk';
                    const emailText = file
                      ? 'Your complaint {trackingId} has been disposed of. The final decision document is now available on the tracking portal. Please visit URL:' +
                        baseUrl +
                        '/track'
                      : 'Your complaint {trackingId} has been disposed of. Please visit URL:' +
                        baseUrl +
                        '/track';

                    sendComplaintEmail(
                      complaintId,
                      'OGRA Complaint Disposed Of',
                      emailText
                    );

                    res.json({
                      id: disposalId,
                      message: file
                        ? 'Complaint disposed of with decision document (attachment optional)'
                        : 'Complaint disposed of without attachment',
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  }
);


/* ==========================
   EXPORT CSV
   ========================== */
app.get(
  '/api/complaints/export/file',
  authMiddleware,
  requireRole('ADMIN', 'SR_REGISTRAR'),
  (req, res) => {
  const { format = 'csv', from, to } = req.query;

  let where = '1=1';
  const params = [];

  if (from) {
    where += ' AND date(c.createdAt) >= date(?)';
    params.push(from);
  }
  if (to) {
    where += ' AND date(c.createdAt) <= date(?)';
    params.push(to);
  }

  const sql = `
    SELECT
      c.trackingId,
      c.firstName,
      c.lastName,
      c.email,
      c.cnic,
      c.address,
      c.complaint,
      s.name AS statusName,
      c.createdAt
    FROM complaints c
    LEFT JOIN statuses s ON c.statusId = s.id
    WHERE ${where}
    ORDER BY c.createdAt DESC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'DB error' });
    }

    if (format !== 'csv') {
      return res.json(rows);
    }

    let csv =
      'Tracking ID,First Name,Last Name,Email,CNIC,Address,Complaint,Status,Created At\n';

    for (const r of rows) {
      const line = [
        r.trackingId,
        r.firstName,
        r.lastName,
        r.email,
        r.cnic,
        (r.address || '').replace(/\r?\n/g, ' '),
        (r.complaint || '').replace(/\r?\n/g, ' '),
        r.statusName,
        r.createdAt,
      ]
        .map((v) => `"${(v || '').toString().replace(/"/g, '""')}"`)
        .join(',');
      csv += line + '\n';
    }

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="complaints.csv"'
    );
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  });
});

/* ==========================
   USERS
   ========================== */
/* ==========================
   USERS
   ========================== */
app.get(
  '/api/users',
  authMiddleware,
  requireRole('ADMIN', 'SR_REGISTRAR', 'DO'),
  (req, res) => {
  const role = req.query.role;
  let sql = "SELECT id, username, email, role FROM users";
  const params = [];
  if (role) { sql += " WHERE role = ?"; params.push(role); }
  db.all(sql, params, (err, rows) => res.json(rows || []));
});

app.post('/api/users', authMiddleware, requireRole('ADMIN'), (req, res) => {
  const { username, email, password, role } = req.body;
  const r = role || 'DO';
  bcrypt.hash(password || 'password123', 10).then(hash => {
    db.run(
      "INSERT INTO users (username,email,passwordHash,role) VALUES (?,?,?,?)",
      [username, email, hash, r],
      function (err) {
        if (err) return res.status(400).json({ message: 'Error creating user' });
        res.json({ id: this.lastID, username, email, role: r });
      }
    );
  });
});

// Reset user password (Admin only)
app.post(
  '/api/users/:id/reset-password',
  authMiddleware,
  requireRole('ADMIN'),
  (req, res) => {
    const userId = Number(req.params.id);
    const { password } = req.body;

    if (!password || !password.trim()) {
      return res.status(400).json({ message: 'New password is required' });
    }

    // First check user exists (for cleaner message, esp. SR Registrar etc.)
    db.get(
      'SELECT id, username FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) {
          return res.status(500).json({ message: 'DB error' });
        }
        if (!row) {
          return res.status(404).json({ message: 'User not found' });
        }

        bcrypt
          .hash(password.trim(), 10)
          .then((hash) => {
            db.run(
              'UPDATE users SET passwordHash = ? WHERE id = ?',
              [hash, userId],
              function (err2) {
                if (err2) {
                  return res.status(500).json({ message: 'DB error' });
                }
                if (!this.changes) {
                  return res.status(404).json({ message: 'User not found' });
                }
                res.json({
                  updated: this.changes,
                  message: `Password reset successfully for "${row.username}"`,
                });
              }
            );
          })
          .catch(() => {
            res.status(500).json({ message: 'Error hashing password' });
          });
      }
    );
  }
);

// Update user (Admin can update ANY user, including SR Registrar)
app.patch(
  '/api/users/:id',
  authMiddleware,
  requireRole('ADMIN'),
  (req, res) => {
    const userId = Number(req.params.id);
    const { username, email, role } = req.body;

    // At least one field must be provided
    if (
      (username === undefined || username === null) &&
      (email === undefined || email === null) &&
      (role === undefined || role === null)
    ) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    // Optional: empty username not allowed
    if (username !== undefined && !String(username).trim()) {
      return res.status(400).json({ message: 'Username cannot be empty' });
    }

    // Get existing user
    db.get(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [userId],
      (err, existing) => {
        if (err) {
          console.error('[USER UPDATE] DB error loading user:', err);
          return res.status(500).json({ message: 'DB error' });
        }
        if (!existing) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Final values (if field send nahi hua to purana hi rakho)
        const newUsername =
          username !== undefined && username !== null
            ? String(username).trim()
            : existing.username;
        const newEmail =
          email !== undefined && email !== null
            ? String(email).trim()
            : existing.email;
        const newRole =
          role !== undefined && role !== null
            ? String(role).trim()
            : existing.role;

        // If nothing changed at all
        if (
          newUsername === existing.username &&
          newEmail === existing.email &&
          newRole === existing.role
        ) {
          return res.json({
            updated: 0,
            user: existing,
            message: 'No changes detected for this user',
          });
        }

        // --- Manual uniqueness check for username (IGNORE current user) ---
        db.get(
          'SELECT id FROM users WHERE username = ? AND id != ?',
          [newUsername, userId],
          (err2, conflict) => {
            if (err2) {
              console.error('[USER UPDATE] DB error checking username:', err2);
              return res.status(500).json({ message: 'DB error' });
            }
            if (conflict) {
              // kisi aur user ka same username hai
              return res.status(400).json({
                message:
                  'Username already exists. Please choose a different username.',
              });
            }

            // No conflict → safe to update
            db.run(
              `
                UPDATE users
                SET username = ?, email = ?, role = ?
                WHERE id = ?
              `,
              [newUsername, newEmail, newRole, userId],
              function (err3) {
                if (err3) {
                  console.error('[USER UPDATE] DB error on UPDATE:', err3);
                  return res.status(500).json({ message: 'DB error' });
                }

                if (!this.changes) {
                  return res
                    .status(404)
                    .json({ message: 'User not found during update' });
                }

                return res.json({
                  updated: this.changes,
                  user: {
                    id: userId,
                    username: newUsername,
                    email: newEmail,
                    role: newRole,
                  },
                  message: `User "${existing.username}" updated successfully`,
                });
              }
            );
          }
        );
      }
    );
  }
);


// DELETE /api/users/:id  (Admin can delete ANY user, including SR Registrar)
app.delete(
  '/api/users/:id',
  authMiddleware,
  requireRole('ADMIN'),
  (req, res) => {
    const id = Number(req.params.id);

    db.get(
      'SELECT id, username, role FROM users WHERE id = ?',
      [id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ message: 'DB error' });
        }
        if (!row) {
          return res.status(404).json({ message: 'User not found' });
        }

        db.run(
          'DELETE FROM users WHERE id = ?',
          [id],
          function (err2) {
            if (err2) {
              return res.status(500).json({ message: 'DB error' });
            }
            return res.json({
              deleted: this.changes,
              message: `User "${row.username}" deleted`,
            });
          }
        );
      }
    );
  }
);



/* ==========================
   ROOT + START
   ========================== */
app.get('/', (req, res) => {
  res.json({ ok: true, name: 'OGRA Complaint Backend v2' });
});

app.listen(PORT, () => {
  console.log('Backend running on port', PORT);
});
