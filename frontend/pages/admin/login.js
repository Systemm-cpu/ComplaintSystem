import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../components/api';
import { setToken, setUserMeta } from '../../components/auth';
import { useRouter } from 'next/router';

export default function Login() {
  const [form, setForm] = useState({ username:'', password:'' });
  const [error, setError] = useState('');
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(API_BASE + '/api/auth/login', form);
      setToken(res.data.token);
      setUserMeta(res.data.user.role, res.data.user.username);
      if (res.data?.user?.role === 'DO') router.push('/admin/do');
      else router.push('/admin');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'radial-gradient(circle at top, #0f172a, #020617)' }}>
      <div className="card" style={{ width:'100%', maxWidth:360 }}>
        <h1 className="text-ogra-green" style={{ fontSize:'1.3rem', marginBottom:'0.4rem' }}>Admin / DO Login</h1>
        <form onSubmit={submit} style={{ display:'grid', gap:'0.5rem' }}>
          {error && <div style={{ color:'#fecaca', fontSize:'0.8rem' }}>{error}</div>}
          <div>
            <label className="label">Username</label>
            <input className="input" value={form.username} onChange={e=>setForm({...form, username:e.target.value})} />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
          </div>
          <button className="btn btn-primary" style={{ marginTop:'0.25rem' }}>Login</button>
        </form>
      </div>
    </div>
  );
}
