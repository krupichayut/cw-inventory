import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { UserCog, Plus, Trash2, Edit, ShieldAlert, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import './Inventory.css'; 

export default function StaffSettings() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [addModal, setAddModal] = useState({ show: false, name: '', position: '', password: '' });
  const [editModal, setEditModal] = useState({ show: false, id: '', name: '', position: '', password: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getStaff();
      setStaffList(data);
    } catch (e) {
      console.error(e);
      toast.error('ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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
    <div className="inventory-page animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}><UserCog className="inline-icon" /> จัดการเจ้าหน้าที่พัสดุ</h1>
        <button className="btn btn-primary" onClick={() => setAddModal({ ...addModal, show: true })}>
          <Plus size={20} /> เพิ่มเจ้าหน้าที่
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <div className="text-center text-muted py-8">กำลังโหลดข้อมูล...</div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-8">
            <ShieldAlert size={48} className="text-muted mx-auto mb-4" />
            <h3 className="text-muted">ยังไม่มีข้อมูลเจ้าหน้าที่</h3>
            <p className="text-muted mt-2">โปรดเพิ่มรายชื่อเจ้าหน้าที่เพื่อให้ผู้ใช้งานแต่ละคนมีรหัสผ่านของตนเอง</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ชื่อ-นามสกุล</th>
                  <th>ตำแหน่ง</th>
                  <th>รหัสผ่าน (PIN)</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(staff => (
                  <tr key={staff.ID}>
                    <td style={{ fontWeight: 500 }}>{staff.Name}</td>
                    <td>{staff.Position || '-'}</td>
                    <td>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                         <Key size={14} /> 
                         <span style={{ letterSpacing: '2px' }}>{staff.Password ? '••••' : 'ไม่ระบุ'}</span>
                       </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          className="btn-ghost" 
                          onClick={() => setEditModal({ show: true, id: staff.ID, name: staff.Name, position: staff.Position, password: staff.Password || '' })}
                          style={{ padding: '0.4rem', color: 'var(--primary)' }}
                          title="แก้ไข"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          className="btn-ghost" 
                          onClick={() => handleDelete(staff.ID, staff.Name)}
                          style={{ padding: '0.4rem', color: 'var(--danger)' }}
                          title="ลบ"
                        >
                          <Trash2 size={18} />
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
