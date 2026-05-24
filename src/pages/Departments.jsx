import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Users, Plus, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import './Inventory.css'; // Reuse inventory css for grid

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState('');
  const [newDeptOrder, setNewDeptOrder] = useState(999);
  const [processing, setProcessing] = useState(false);
  const [editModal, setEditModal] = useState({ show: false, id: '', name: '', order: 999 });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getData();
      const sorted = (data.departments || []).sort((a, b) => (a.Order || 999) - (b.Order || 999));
      setDepartments(sorted);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDept.trim()) return;
    setProcessing(true);
    
    // Optimistic Update
    const tempId = 'TEMP-' + Date.now();
    const newOrder = parseInt(newDeptOrder) || 999;
    setDepartments([...departments, { ID: tempId, Name: newDept, Order: newOrder }].sort((a,b)=>a.Order-b.Order));
    
    try {
      await api.addDepartment(newDept, newOrder);
      setNewDept('');
      setNewDeptOrder(999);
      toast.success('เพิ่มฝ่ายงานสำเร็จ');
      loadData();
    } catch (e) {
      toast.error('Error: ' + e);
      loadData();
    }
    setProcessing(false);
  };

  const handleEditClick = (dept) => {
    setEditModal({ show: true, id: dept.ID, name: dept.Name, order: dept.Order || 999 });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editModal.name.trim()) return;
    setProcessing(true);

    const newOrder = parseInt(editModal.order) || 999;

    // Optimistic Update
    setDepartments(departments.map(d => d.ID === editModal.id ? { ...d, Name: editModal.name, Order: newOrder } : d).sort((a,b)=>(a.Order||999)-(b.Order||999)));
    
    try {
      await api.updateDepartment(editModal.id, editModal.name, newOrder);
      toast.success('แก้ไขฝ่ายงานสำเร็จ');
      setEditModal({ show: false, id: '', name: '', order: 999 });
      loadData();
    } catch (e) {
      toast.error('Error: ' + e);
      loadData();
    }
    setProcessing(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบฝ่ายงานนี้?')) return;
    
    // Optimistic
    setDepartments(departments.filter(d => d.ID !== id));
    
    try {
      await api.deleteDepartment(id);
      toast.success('ลบฝ่ายงานสำเร็จ');
      loadData();
    } catch (e) {
      toast.error('Error: ' + e);
      loadData();
    }
  };

  return (
    <div className="inventory-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title"><Users className="inline-icon" /> จัดการฝ่ายงาน</h1>
      </div>

      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto 2rem auto', padding: '1.5rem' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="ชื่อฝ่ายงานใหม่..." 
            value={newDept} 
            onChange={e => setNewDept(e.target.value)} 
            style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
            required
          />
          <input 
            type="number" 
            placeholder="ลำดับ (Order)" 
            value={newDeptOrder} 
            onChange={e => setNewDeptOrder(e.target.value)} 
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={processing || !newDept.trim()}>
            <Plus size={20} /> เพิ่มฝ่ายงาน
          </button>
        </form>
      </div>

      {loading ? <p className="text-center">กำลังโหลดข้อมูล...</p> : (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {departments.length === 0 ? (
            <p className="text-center text-muted">ยังไม่มีฝ่ายงานในระบบ</p>
          ) : (
            <div className="list-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {departments.map(dept => (
                <div key={dept.ID} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ background: 'var(--bg-base)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>ลำดับ: {dept.Order || 999}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{dept.Name}</span>
                  </div>
                  <div>
                    <button className="btn-ghost text-primary" onClick={() => handleEditClick(dept)} style={{ padding: '0.5rem', marginRight: '0.5rem' }}>
                      <Edit size={18} />
                    </button>
                    <button className="btn-ghost text-danger" onClick={() => handleDelete(dept.ID)} style={{ padding: '0.5rem' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editModal.show && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>แก้ไขฝ่ายงาน</h2>
            <form onSubmit={submitEdit}>
              <div className="form-group">
                <label>ชื่อฝ่ายงาน</label>
                <input 
                  type="text" 
                  value={editModal.name} 
                  onChange={e => setEditModal({...editModal, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>ลำดับ (เลขน้อยขึ้นก่อน)</label>
                <input 
                  type="number" 
                  value={editModal.order} 
                  onChange={e => setEditModal({...editModal, order: e.target.value})} 
                  required 
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal({ show: false, id: '', name: '', order: 999 })}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={processing}>บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
