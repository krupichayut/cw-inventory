import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, CheckCircle, ClipboardList, FileText, LogOut, Lock, Users, PackagePlus, History, UserCog } from 'lucide-react';

export default function Navbar({ onLogout, onChangePassword }) {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <img src="/app-icon.jpg" alt="โรงเรียนไชยาวิทยา" className="sidebar-logo" />
        <span className="brand-text">ระบบพัสดุ (Admin)</span>
      </div>
      <div className="nav-links">
        <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} /> ภาพรวม
        </NavLink>
        <NavLink to="/admin/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Package size={20} /> คลังพัสดุ
        </NavLink>
        <NavLink to="/admin/restock" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PackagePlus size={20} /> รับเข้าล็อตใหม่
        </NavLink>
        <NavLink to="/admin/fulfillment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CheckCircle size={20} /> จ่ายของ
        </NavLink>
        <NavLink to="/admin/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <History size={20} /> ประวัติทั้งหมด
        </NavLink>
        <NavLink to="/admin/stocktake" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ClipboardList size={20} /> ตรวจนับประจำปี
        </NavLink>
        <NavLink to="/admin/departments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} /> ฝ่ายงาน
        </NavLink>
        <NavLink to="/admin/staff" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UserCog size={20} /> เจ้าหน้าที่พัสดุ
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
