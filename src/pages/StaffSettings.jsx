import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { UserCog, Plus, Trash2, Edit, ShieldAlert, Key, Settings, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import './Inventory.css'; 

export default function StaffSettings() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // System Settings state
  const [sysSettings, setSysSettings] = useState({
    fiscalYear: '',
    semesterStart: '',
    semesterEnd: ''
  });
  
  const [addModal, setAddModal] = useState({ show: false, name: '', position: '', password: '' });
  const [editModal, setEditModal] = useState({ show: false, id: '', name: '', position: '', password: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffData, settingsData] = await Promise.all([
        api.getStaff(),
        api.getSystemSettings()
      ]);
      setStaffList(staffData);
      setSysSettings(settingsData);
    } catch (e) {
      console.error(e);
      toast.error('ไม่สามารถโหลดข้อมูลการตั้งค่าได้');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const saveSystemSettings = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.saveSystemSettings(sysSettings);
      toast.success('บันทึกการตั้งค่าระบบเรียบร้อย');
    } catch(e) {
      toast.error('Error: ' + e);
    }
    setProcessing(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addModal.name.trim() || !addModal.password.trim()) {
      toast.error('กรุณากรอกชื่อและรหัสผ่าน');
      return;
    }
    setProcessing(true);
    
    try {
      await api.addStaff({ 
        Name: addModal.name, 
        Position: addModal.position || 'เจ้าหน้าที่พัสดุ', 
        Password: addModal.password 
      });
      toast.success('เพิ่มเจ้าหน้าที่สำเร็จ');
      setAddModal({ show: false, name: '', position: '', password: '' });
      loadData();
    } catch (e) {
      toast.error('Error: ' + e);
    }
    setProcessing(false);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editModal.name.trim() || !editModal.password.trim()) {
      toast.error('กรุณากรอกชื่อและรหัสผ่าน');
      return;
    }
    setProcessing(true);

    try {
      await api.updateStaff(editModal.id, { 
        Name: editModal.name, 
        Position: editModal.position, 
        Password: editModal.password 
      });
      toast.success('แก้ไขข้อมูลเจ้าหน้าที่สำเร็จ');
      setEditModal({ show: false, id: '', name: '', position: '', password: '' });
      loadData();
    } catch (e) {
      toast.error('Error: ' + e);
    }
    setProcessing(false);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบเจ้าหน้าที่ "${name}"?`)) return;
    
    setProcessing(true);
    try {
      await api.deleteStaff(id);
      toast.success('ลบเจ้าหน้าที่สำเร็จ');
      loadData();
    } catch (e) {
      toast.error('Error: ' + e);
    }
    setProcessing(false);
  };

  return (
    <div className="inventory-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}><Settings className="inline-icon" /> ตั้งค่าระบบและผู้ใช้งาน</h1>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        
        {/* General Settings */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} className="text-secondary" /> ตั้งค่าทั่วไป (System)
          </h2>
          
          {loading ? (
            <p className="text-muted">กำลังโหลด...</p>
          ) : (
            <form onSubmit={saveSystemSettings}>
              <div className="form-group mb-4">
                <label>ปีงบประมาณปัจจุบัน (พ.ศ.)</label>
                <input 
                  type="text" 
                  className="w-full"
                  value={sysSettings.fiscalYear || ''}
                  onChange={e => setSysSettings({...sysSettings, fiscalYear: e.target.value})}
                  placeholder="เช่น 2569"
                />
              </div>
              <div className="form-group mb-4">
                <label>วันเปิดภาคเรียน (เริ่มต้น)</label>
                <input 
                  type="date" 
                  className="w-full"
                  value={sysSettings.semesterStart || ''}
                  onChange={e => setSysSettings({...sysSettings, semesterStart: e.target.value})}
                />
              </div>
              <div className="form-group mb-6">
                <label>วันปิดภาคเรียน (สิ้นสุด)</label>
                <input 
                  type="date" 
                  className="w-full"
                  value={sysSettings.semesterEnd || ''}
                  onChange={e => setSysSettings({...sysSettings, semesterEnd: e.target.value})}
                />
              </div>
              <button type="submit" className="btn btn-secondary w-full" disabled={processing}>
                <Save size={18} className="mr-2" /> {processing ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าระบบ'}
              </button>
            </form>
          )}
        </div>

        {/* Staff Settings */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCog size={20} className="text-primary" /> จัดการเจ้าหน้าที่พัสดุ
            </h2>
            <button className="btn btn-primary btn-sm" onClick={() => setAddModal({ ...addModal, show: true })}>
              <Plus size={16} /> เพิ่ม
            </button>
          </div>
          
          {loading ? (
            <div className="text-center text-muted py-8">กำลังโหลดข้อมูล...</div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-8">
              <ShieldAlert size={40} className="text-muted mx-auto mb-3" />
              <p className="text-muted text-sm">ยังไม่มีข้อมูลเจ้าหน้าที่</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>ชื่อ-สกุล</th>
                    <th>PIN</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(staff => (
                    <tr key={staff.ID}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{staff.Name}</div>
                        <div className="text-muted text-xs">{staff.Position || '-'}</div>
                      </td>
                      <td>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                           <Key size={14} /> 
                           <span style={{ letterSpacing: '2px', fontSize: '0.9rem' }}>{staff.Password ? '••••' : 'ไม่มี'}</span>
                         </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            className="btn-ghost" 
                            onClick={() => setEditModal({ show: true, id: staff.ID, name: staff.Name, position: staff.Position, password: staff.Password || '' })}
                            style={{ padding: '0.2rem', color: 'var(--primary)' }}
                            title="แก้ไข"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="btn-ghost" 
                            onClick={() => handleDelete(staff.ID, staff.Name)}
                            style={{ padding: '0.2rem', color: 'var(--danger)' }}
                            title="ลบ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Add Modal */}
      {addModal.show && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '400px' }}>
            <h2><UserCog size={24} className="inline-icon" /> เพิ่มเจ้าหน้าที่ใหม่</h2>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>ชื่อ-นามสกุล (สำหรับแสดงผล)</label>
                <input 
                  type="text" 
                  required 
                  className="w-full"
                  value={addModal.name} 
                  onChange={e => setAddModal({...addModal, name: e.target.value})} 
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              <div className="form-group">
                <label>ตำแหน่ง</label>
                <input 
                  type="text" 
                  className="w-full"
                  value={addModal.position} 
                  onChange={e => setAddModal({...addModal, position: e.target.value})} 
                  placeholder="เช่น เจ้าหน้าที่พัสดุ"
                />
              </div>
              <div className="form-group">
                <label>รหัสผ่านเข้าใช้งาน (PIN)</label>
                <input 
                  type="text" 
                  required 
                  className="w-full"
                  value={addModal.password} 
                  onChange={e => setAddModal({...addModal, password: e.target.value})} 
                  placeholder="ตั้งรหัสผ่าน"
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setAddModal({ ...addModal, show: false })} disabled={processing}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={processing}>
                  {processing ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {editModal.show && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '400px' }}>
            <h2><Edit size={24} className="inline-icon" /> แก้ไขข้อมูลเจ้าหน้าที่</h2>
            <form onSubmit={submitEdit}>
              <div className="form-group">
                <label>ชื่อ-นามสกุล</label>
                <input 
                  type="text" 
                  required 
                  className="w-full"
                  value={editModal.name} 
                  onChange={e => setEditModal({...editModal, name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>ตำแหน่ง</label>
                <input 
                  type="text" 
                  className="w-full"
                  value={editModal.position} 
                  onChange={e => setEditModal({...editModal, position: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>รหัสผ่านใหม่ (PIN)</label>
                <input 
                  type="text" 
                  required 
                  className="w-full"
                  value={editModal.password} 
                  onChange={e => setEditModal({...editModal, password: e.target.value})} 
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal({ ...editModal, show: false })} disabled={processing}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={processing}>
                  {processing ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
