import { NavLink } from 'react-router-dom';
import { Package, CheckCircle, ClipboardList, FileText, LogOut, Lock, Users } from 'lucide-react';

export default function Navbar({ onLogout, onChangePassword }) {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Package className="text-primary" size={28} />
        <span>ระบบพัสดุโรงเรียนไชยาวิทยา (Admin)</span>
      </div>
      <div className="nav-links">
        <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Package size={20} /> พัสดุคงคลัง
        </NavLink>
        <NavLink to="/admin/fulfillment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CheckCircle size={20} /> จ่ายของ
        </NavLink>
        <NavLink to="/admin/stocktake" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ClipboardList size={20} /> ตรวจนับประจำปี
        </NavLink>
        <NavLink to="/admin/departments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} /> ฝ่ายงาน
        </NavLink>
        <NavLink to="/admin/report" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={20} /> พิมพ์รายงาน
        </NavLink>
        <button className="nav-item text-muted" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={onChangePassword}>
          <Lock size={20} /> รหัสผ่าน
        </button>
        <button className="nav-item text-danger" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={onLogout}>
          <LogOut size={20} /> ออกระบบ
        </button>
      </div>
    </nav>
  );
}
