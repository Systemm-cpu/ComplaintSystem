import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../components/api';

export default function Track() {
  const [id, setId] = useState('');
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setRes(null);
    try {
      const r = await axios.get(API_BASE + '/api/complaints/track/' + id.trim());
      setRes(r.data);
      if (!r.data) setError('No complaint found for this Tracking ID');
    } catch {
      setError('Failed to fetch status');
    }
  };

  const formatWho = (log) => {
    if (!log.user) return 'System';
    if (log.user.role === 'ADMIN') return 'Admin';
    if (log.user.role === 'DO') return log.user.username || 'DO';
    return log.user.username || 'System';
  };

  // SAME LOG VISIBILITY PARSER AS ADMIN PAGE
  function parseLogVisibility(raw) {
    const txt = (raw || '').trim();
    if (/^\[PUBLIC\]/i.test(txt)) {
      return {
        visibility: 'PUBLIC',
        text: txt.replace(/^\[PUBLIC\]\s*/i, ''),
      };
    }
    if (/^\[INTERNAL\]/i.test(txt)) {
      return {
        visibility: 'INTERNAL',
        text: txt.replace(/^\[INTERNAL\]\s*/i, ''),
      };
    }
    return { visibility: 'DEFAULT', text: txt };
  }

  // Only keep last PUBLIC / DEFAULT remark – skip system + INTERNAL
  const getLastRemark = (logs = []) => {
    // logs are already ORDER BY createdAt DESC from backend
    return (
      logs.find((l) => {
        const raw = (l.comments || '').trim();
        if (!raw) return false;

        // skip system-type logs
        if (/^Status changed to/i.test(raw)) return false;
        if (/^Forwarded to/i.test(raw)) return false;

        // skip INTERNAL remarks
        const { visibility, text } = parseLogVisibility(raw);
        if (visibility === 'INTERNAL') return false;

        // need some visible text
        return !!text;
      }) || null
    );
  };

  const lastRemark = res && res.logs ? getLastRemark(res.logs) : null;

  // Clean text for display (without [PUBLIC]/[INTERNAL])
  const getRemarkText = (log) => {
    if (!log) return '';
    const { text } = parseLogVisibility(log.comments || '');
    return text;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #0f172a, #020617)',
        padding: '1rem',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 520 }}>
        <h1
          className="text-ogra-green"
          style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}
        >
          Track Complaint
        </h1>

        <form
          onSubmit={submit}
          style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}
        >
          <input
            className="input"
            placeholder="Enter Tracking ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <button className="btn btn-primary">Check</button>
        </form>

        {error && (
          <div
            style={{
              color: '#fecaca',
              fontSize: '0.8rem',
              marginBottom: '0.25rem',
            }}
          >
            {error}
          </div>
        )}

        {res && (
          <>
            {/* STATUS CARD */}
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '0.75rem',
                background: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.5)',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            >
              <p>
                <strong>Tracking:</strong> {res.trackingId}
              </p>
              <p>
                <strong>Status:</strong> {res.status?.name}
              </p>
              <p>
                <strong>Created:</strong>{' '}
                {res.createdAt
                  ? new Date(res.createdAt).toLocaleString()
                  : '-'}
              </p>
              <p>
                <strong>Last Update:</strong>{' '}
                {res.updatedAt
                  ? new Date(res.updatedAt).toLocaleString()
                  : '-'}
              </p>
            </div>

            {/* DISPOSED / FINAL DECISION (TEXT + ATTACHMENT) */}
            {res.disposal && (
              <div
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(220,38,38,0.5)',
                  fontSize: '0.85rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '0.95rem',
                    color: '#fca5a5',
                    marginBottom: '0.4rem',
                  }}
                >
                  Final OGRA Decision / Disposed Of
                </h2>

                {res.disposal.createdAt && (
                  <p>
                    <strong>Date:</strong>{' '}
                    {new Date(res.disposal.createdAt).toLocaleString()}
                  </p>
                )}

                {res.disposal.note && (
                  <p>
                    <strong>Note:</strong> {res.disposal.note}
                  </p>
                )}

                {res.disposal.filePath && (
                  <p>
                    <strong>Decision File: </strong>
                    <a
                      href={API_BASE + res.disposal.filePath}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#0C512F' }}
                    >
                      Download Decision
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* LAST PUBLIC / DEFAULT REMARK ONLY */}
            {lastRemark && (
              <div
                style={{
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #1f2937',
                  marginTop: '0.5rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '0.95rem',
                    color: '#bfdbfe',
                    marginBottom: '0.4rem',
                  }}
                >
                  Latest Remark
                </h2>

                <div
                  style={{
                    borderRadius: 8,
                    padding: '0.6rem 0.7rem',
                    background: 'rgba(15,23,42,0.7)',
                    border: '1px solid rgba(148,163,184,0.5)',
                    fontSize: '0.8rem',
                    color: '#e5e7eb',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#9ca3af',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {lastRemark.createdAt
                      ? new Date(lastRemark.createdAt).toLocaleString()
                      : ''}
                    {'  —  '}
                    <strong style={{ color: '#bfdbfe' }}>
                      {formatWho(lastRemark)}
                    </strong>
                  </div>
                  <div>{getRemarkText(lastRemark)}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
