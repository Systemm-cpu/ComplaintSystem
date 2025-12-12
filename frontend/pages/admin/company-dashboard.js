import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import { API_BASE } from '../../components/api';
import { authHeaders } from '../../components/auth';
import Link from 'next/link';
import Badge from '../../components/Badge';

export default function CompanyDashboard() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [data, setData] = useState({ items: [], total: 0, pages: 1, page: 1 });

  useEffect(() => {
    axios.get(API_BASE + '/api/master/companies').then(r => setCompanies(r.data));
  }, []);

  const load = async (page=1, cid) => {
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    if (cid) qs.set('companyId', String(cid));
    const r = await axios.get(API_BASE + '/api/complaints?' + qs.toString(), { headers: authHeaders() });
    setData(r.data);
  };

  useEffect(() => {
    if (companyId) load(1, Number(companyId));
  }, [companyId]);

  const tone = (s) => s==='Closed' ? 'green' : s==='In Progress' ? 'yellow' : 'gray';

  return (
    <AdminLayout>
      <div className="card">
        <h1 className="text-ogra-green" style={{ fontSize:'1.1rem', marginBottom:'0.4rem' }}>Company Dashboard</h1>
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.5rem' }}>
          <select className="input" style={{ maxWidth:260 }} value={companyId} onChange={e=>setCompanyId(e.target.value)}>
            <option value="">Select Company</option>
            {companies.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          {companyId && <button className="btn" onClick={()=>load(1, Number(companyId))}>Refresh</button>}
        </div>
        {companyId ? (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:'0.8rem', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th align="left">Tracking</th>
                  <th align="left">Name</th>
                  <th align="left">Status</th>
                  <th align="left">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(c => (
                  <tr key={c.id} style={{ borderTop:'1px solid rgba(31,41,55,0.8)' }}>
                    <td><Link href={`/admin/view/${c.id}`}>{c.trackingId}</Link></td>
                    <td>{c.firstName} {c.lastName||''}</td>
                    <td><Badge tone={tone(c.status?.name)}>{c.status?.name || c.statusId}</Badge></td>
                    <td>{new Date(c.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize:'0.85rem', color:'#9ca3af' }}>Select a company to see its complaints.</p>
        )}
      </div>
    </AdminLayout>
  );
}
