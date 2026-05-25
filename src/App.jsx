import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import StaffSettings from './pages/StaffSettings';
import MyRequests from './pages/MyRequests';
import { Package, User, ShieldAlert, ArrowLeft, Lock, PackageSearch, PackagePlus, Users, LayoutDashboard, ClipboardList, BarChart3, History as HistoryIcon, UserCog } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { api } from './utils/api';
import './App.css';

function App() {
  const [isAdminAuth, setIsAdminAuth] = useState(() => {
    return localStorage.getItem('isAdminAuth') === 'true';
  });
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
              <Routes>
                <Route path="/" element={<Requisition />} />
                <Route path="/my-requests" element={<MyRequests />} />
                <Route path="*" element={<Navigate to="/requester" />} />
              </Routes>
            </main>
          </>
        } />

        {/* สำหรับ Admin */}
        <Route path="/admin/*" element={
          isAdminAuth ? (
            <div className="admin-layout">
              <Navbar onLogout={() => { localStorage.removeItem('isAdminAuth'); setIsAdminAuth(false); }} onChangePassword={() => setShowPasswordModal(true)} />
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
                  <Route path="/staff" element={<StaffSettings />} />
                  <Route path="*" element={<Navigate to="/admin" />} />
                </Routes>
              </main>
              {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
            </div>
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
        <img src="/app-icon.jpg" alt="โรงเรียนไชยาวิทยา" style={{ width: '130px', height: '130px', objectFit: 'cover', margin: '0 auto 1.5rem auto', borderRadius: '24px', boxShadow: 'var(--shadow-md)', border: '4px solid white' }} />
        <h1 className="page-title" style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>ระบบเบิกพัสดุกลาง โรงเรียนไชยาวิทยา</h1>
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
    <nav className="navbar" style={{ justifyContent: 'space-between', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}><ArrowLeft size={20}/> กลับ</button>
        <div className="nav-brand" style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/app-icon.jpg" alt="โรงเรียนไชยาวิทยา" style={{ height: '40px', width: '40px', objectFit: 'cover', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', border: '2px solid white' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>เบิกพัสดุ</span>
        </div>
      </div>
      <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.95rem' }} onClick={() => navigate('/requester/my-requests')}>
        <HistoryIcon size={18} className="mr-2" /> ติดตามสถานะคำขอ
      </button>
    </nav>
  );
}

function AdminLogin({ onLogin }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const list = await api.getStaff();
        setStaffList(list);
        if (list.length > 0) {
          setSelectedStaffId(list[0].ID);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchStaff();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (staffList.length === 0) {
      // Fallback to default PIN if no staff exists
      const savedPin = localStorage.getItem('adminPin') || '1234';
      if (pin === savedPin) { 
        localStorage.setItem('isAdminAuth', 'true');
        localStorage.setItem('adminUser', JSON.stringify({ ID: 'admin', Name: 'ผู้ดูแลระบบสูงสุด', Position: 'Admin' }));
        toast.success('เข้าสู่ระบบสำเร็จ (โหมดผู้ดูแลเริ่มต้น)');
        onLogin();
      } else {
        toast.error('รหัสผ่านไม่ถูกต้อง');
      }
      return;
    }

    const staff = staffList.find(s => s.ID === selectedStaffId);
    if (!staff) {
      return toast.error('กรุณาเลือกชื่อเจ้าหน้าที่');
    }
    
    // Check password (plain text for now)
    if (staff.Password === pin || (staff.Password === undefined && pin === '1234')) {
      localStorage.setItem('isAdminAuth', 'true');
      localStorage.setItem('adminUser', JSON.stringify(staff));
      toast.success(`ยินดีต้อนรับคุณ ${staff.Name}`);
      onLogin();
    } else {
      toast.error('รหัสผ่านส่วนตัวไม่ถูกต้อง');
    }
  };

  if (loading) return <div className="landing-page flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="landing-page flex items-center justify-center min-h-screen">
      <div className="glass-panel text-center p-8 animate-fade-in" style={{ maxWidth: '400px', margin: '0 auto', marginTop: '15vh', width: '100%' }}>
        <ShieldAlert size={48} className="text-secondary mx-auto mb-4" />
        <h2 className="mb-4">เข้าสู่ระบบเจ้าหน้าที่</h2>
        <form onSubmit={handleLogin}>
          {staffList.length > 0 && (
            <div className="form-group text-left" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>เลือกชื่อเข้าใช้งาน</label>
              <select 
                value={selectedStaffId} 
                onChange={e => setSelectedStaffId(e.target.value)}
                style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '1.05rem', background: 'var(--bg-base)' }}
              >
                {staffList.map(s => (
                  <option key={s.ID} value={s.ID}>{s.Name} ({s.Position})</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="form-group text-left" style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {staffList.length === 0 ? 'รหัสผ่านส่วนกลาง (เริ่มต้น 1234)' : 'รหัสผ่านส่วนตัว'}
            </label>
            <input 
              type="password" 
              placeholder={staffList.length === 0 ? "รหัส PIN กลาง" : "รหัสผ่านของคุณ"} 
              className="w-full" 
              style={{ border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '1.1rem', padding: '0.85rem', width: '100%', textAlign: 'center', letterSpacing: '2px' }}
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex" style={{ display: 'flex', gap: '1rem' }}>
             <button type="button" className="btn btn-ghost flex-1" style={{width: '100%', padding: '0.85rem'}} onClick={() => navigate('/')}>กลับ</button>
             <button type="submit" className="btn btn-secondary flex-1" style={{width: '100%', padding: '0.85rem'}}>เข้าสู่ระบบ</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (newPin.trim() === '') {
      toast.error('กรุณาตั้งรหัสผ่านใหม่');
      return;
    }

    setSaving(true);
    try {
      const adminUserStr = localStorage.getItem('adminUser');
      let isStaff = false;
      let staffData = null;

      if (adminUserStr) {
        try {
          staffData = JSON.parse(adminUserStr);
          if (staffData && staffData.ID && staffData.ID !== 'admin') {
            isStaff = true;
          }
        } catch (e) {}
      }

      if (isStaff && staffData) {
        const currentSavedPassword = staffData.Password !== undefined ? staffData.Password : '1234';
        if (currentPin !== currentSavedPassword) {
          toast.error('รหัสผ่านเดิมไม่ถูกต้อง');
          setSaving(false);
          return;
        }

        await api.updateStaff(staffData.ID, {
          Name: staffData.Name,
          Position: staffData.Position,
          Password: newPin
        });

        staffData.Password = newPin;
        localStorage.setItem('adminUser', JSON.stringify(staffData));
        toast.success('เปลี่ยนรหัสผ่านส่วนตัวสำเร็จ');
      } else {
        const savedPin = localStorage.getItem('adminPin') || '1234';
        if (currentPin !== savedPin) {
          toast.error('รหัสผ่านเดิมไม่ถูกต้อง');
          setSaving(false);
          return;
        }

        localStorage.setItem('adminPin', newPin);
        toast.success('เปลี่ยนรหัสผ่าน Admin สำเร็จ');
      }
      onClose();
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    }
    setSaving(false);
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '400px' }}>
        <h2><Lock size={24} className="inline-icon" /> เปลี่ยนรหัสผ่าน</h2>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>รหัสผ่านปัจจุบัน</label>
            <input type="password" required value={currentPin} onChange={e => setCurrentPin(e.target.value)} disabled={saving} />
          </div>
          <div className="form-group">
            <label>รหัสผ่านใหม่</label>
            <input type="password" required value={newPin} onChange={e => setNewPin(e.target.value)} disabled={saving} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่าน'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default App;
