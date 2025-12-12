export default function Home() {
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at top, #0f172a, #020617)',
    padding: '20px',
  };

  const cardStyle = {
    maxWidth: '600px',
    width: '100%',
    padding: '2rem',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    textAlign: 'center',
  };

  const buttonStyle = {
    display: 'inline-block',
    width: '100%',
    maxWidth: '300px',
    height: '60px',
    margin: '1rem',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    color: '#fff',
    textAlign: 'center',
    lineHeight: '60px',
    cursor: 'pointer',
    fontSize: '1.2rem',
    boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle}>
      <div className="card" style={cardStyle}>
        <h1 className="text-ogra-green" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          OGRA Complaint Portal
        </h1>
        <p style={{ fontSize: '1rem', color: '#000000ff', marginBottom: '2rem' }}>
          Welcome to the OGRA Complaint Portal. Use the links below to access the Complaint Form and Track your complaints easily
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div
            style={buttonStyle}
            onClick={() => window.location.href = 'https://comlpaint.ogra.org.pk/admin/login'}
          >
            ADMIN/DO LOGIN
          </div>
          <div
            style={buttonStyle}
            onClick={() => window.location.href = 'https://complaint.ogra.org.pk/complaint'}
          >
            COMPLAINT
          </div>
          <div
            style={buttonStyle}
            onClick={() => window.location.href = 'https://complaint.ogra.org.pk/track'}
          >
            TRACK
          </div>
        </div>
      </div>
    </div>
  );
}
