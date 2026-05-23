import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Inventory from './pages/Inventory';
import Requisition from './pages/Requisition';
import Fulfillment from './pages/Fulfillment';
import StockTake from './pages/StockTake';
import Report from './pages/Report';
import { Package, User, ShieldAlert, ArrowLeft } from 'lucide-react';
import './App.css';

function App() {
  const [isAdminAuth, setIsAdminAuth] = useState(false);

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Landing />} />
        
        {/* สำหรับผู้เบิก */}
        <Route path="/requester/*" element={
          <>
            <RequesterHeader />
            <main className="main-content animate-fade-in">
              <Requisition />
            </main>
          </>
        } />

        {/* สำหรับ Admin */}
        <Route path="/admin/*" element={
          isAdminAuth ? (
            <>
              <Navbar onLogout={() => setIsAdminAuth(false)} />
              <main className="main-content animate-fade-in">
                <Routes>
                  <Route path="/" element={<Inventory />} />
                  <Route path="/fulfillment" element={<Fulfillment />} />
                  <Route path="/stocktake" element={<StockTake />} />
                  <Route path="/report" element={<Report />} />
                  <Route path="*" element={<Navigate to="/admin" />} />
                </Routes>
              </main>
            </>
          ) : (
            <AdminLogin onLogin={() => setIsAdminAuth(true)} />
          )
        } />
      </Routes>
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  return (
    <div className="landing-page flex items-center justify-center min-h-screen">
      <div className="glass-panel text-center p-8 animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto', marginTop: '10vh' }}>
        <Package size={64} className="text-primary mx-auto mb-4" />
        <h1 className="page-title" style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>ระบบพัสดุโรงเรียนไชยาวิทยา</h1>
        <p className="text-muted mb-6">กรุณาเลือกรูปแบบการเข้าใช้งาน</p>
        
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button className="btn btn-primary" style={{ padding: '2rem 1rem', flexDirection: 'column' }} onClick={() => navigate('/requester')}>
            <User size={32} className="mb-2" />
            <span style={{ fontSize: '1.1rem' }}>บุคลากร<br/><small style={{fontWeight: 'normal', opacity: 0.8}}>เข้าสู่ระบบเพื่อเบิกพัสดุ</small></span>
          </button>
          
          <button className="btn btn-secondary" style={{ padding: '2rem 1rem', flexDirection: 'column' }} onClick={() => navigate('/admin')}>
            <ShieldAlert size={32} className="mb-2" />
            <span style={{ fontSize: '1.1rem' }}>ผู้ดูแลระบบ<br/><small style={{fontWeight: 'normal', opacity: 0.8}}>จัดการคลังพัสดุ</small></span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RequesterHeader() {
  const navigate = useNavigate();
  return (
    <nav className="navbar" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
      <button className="btn btn-ghost" onClick={() => navigate('/')}><ArrowLeft size={20}/> กลับ</button>
      <div className="nav-brand" style={{ marginLeft: '1rem' }}>
        <Package className="text-primary" size={24} />
        <span>เบิกพัสดุ - โรงเรียนไชยาวิทยา</span>
      </div>
    </nav>
  );
}

function AdminLogin({ onLogin }) {
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === '1234') { // รหัสผ่าน Admin ค่าเริ่มต้น
      onLogin();
    } else {
      alert('รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้นคือ 1234)');
    }
  };

  return (
    <div className="landing-page flex items-center justify-center min-h-screen">
      <div className="glass-panel text-center p-8 animate-fade-in" style={{ maxWidth: '400px', margin: '0 auto', marginTop: '15vh' }}>
        <ShieldAlert size={48} className="text-secondary mx-auto mb-4" />
        <h2 className="mb-4">เข้าสู่ระบบผู้ดูแล</h2>
        <form onSubmit={handleLogin}>
          <input 
            type="password" 
            placeholder="รหัส PIN ผู้ดูแลระบบ" 
            className="w-full p-2 mb-4" 
            style={{ border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center', fontSize: '1.2rem', padding: '0.75rem' }}
            value={pin}
            onChange={e => setPin(e.target.value)}
            autoFocus
          />
          <div className="flex" style={{ display: 'flex', gap: '1rem' }}>
             <button type="button" className="btn btn-ghost flex-1" style={{width: '100%'}} onClick={() => navigate('/')}>ยกเลิก</button>
             <button type="submit" className="btn btn-secondary flex-1" style={{width: '100%'}}>เข้าสู่ระบบ</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
