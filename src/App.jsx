import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Requisition from './pages/Requisition';
import Fulfillment from './pages/Fulfillment';
import StockTake from './pages/StockTake';
import Report from './pages/Report';
import Departments from './pages/Departments';
import Restock from './pages/Restock';
import History from './pages/History';
import { Package, User, ShieldAlert, ArrowLeft, Lock, PackageSearch, PackagePlus, Users, LayoutDashboard, ClipboardList, BarChart3, History as HistoryIcon } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';

function App() {
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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
              <Navbar onLogout={() => setIsAdminAuth(false)} onChangePassword={() => setShowPasswordModal(true)} />
              <main className="main-content animate-fade-in">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/fulfillment" element={<Fulfillment />} />
                  <Route path="/restock" element={<Restock />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/stocktake" element={<StockTake />} />
                  <Route path="/departments" element={<Departments />} />
                  <Route path="/report" element={<Report />} />
                  <Route path="*" element={<Navigate to="/admin" />} />
                </Routes>
              </main>
              {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
            </>
          ) : (
            <AdminLogin onLogin={() => setIsAdminAuth(true)} />
          )
        } />
      </Routes>
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { background: 'var(--bg-surface-solid)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }
        }} 
      />
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  return (
    <div className="landing-page flex items-center justify-center min-h-screen">
      <div className="glass-panel text-center p-8 animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto', marginTop: '10vh' }}>
        <img src="/logo.jpg" alt="โรงเรียนไชยาวิทยา" style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '0 auto 1.5rem auto', borderRadius: '50%' }} />
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
      <div className="nav-brand" style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/logo.jpg" alt="โรงเรียนไชยาวิทยา" style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '50%' }} />
        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>เบิกพัสดุ - โรงเรียนไชยาวิทยา</span>
      </div>
    </nav>
  );
}

function AdminLogin({ onLogin }) {
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const savedPin = localStorage.getItem('adminPin') || '1234';
    if (pin === savedPin) { 
      toast.success('เข้าสู่ระบบสำเร็จ');
      onLogin();
    } else {
      toast.error('รหัสผ่านไม่ถูกต้อง');
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

function ChangePasswordModal({ onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    const savedPin = localStorage.getItem('adminPin') || '1234';
    if (currentPin !== savedPin) {
      toast.error('รหัสผ่านเดิมไม่ถูกต้อง');
      return;
    }
    if (newPin.trim() === '') {
      toast.error('กรุณาตั้งรหัสผ่านใหม่');
      return;
    }
    localStorage.setItem('adminPin', newPin);
    toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '400px' }}>
        <h2><Lock size={24} className="inline-icon" /> เปลี่ยนรหัสผ่าน Admin</h2>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>รหัสผ่านปัจจุบัน</label>
            <input type="password" required value={currentPin} onChange={e => setCurrentPin(e.target.value)} />
          </div>
          <div className="form-group">
            <label>รหัสผ่านใหม่</label>
            <input type="password" required value={newPin} onChange={e => setNewPin(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary">บันทึกรหัสผ่าน</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
