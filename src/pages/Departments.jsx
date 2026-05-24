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

  const handleEdit = async (dept) => {
    const newName = window.prompt('แก้ไขชื่อฝ่ายงาน:', dept.Name);
    if (newName === null) return;
    
    const newOrderStr = window.prompt('แก้ไขลำดับ (เลขยิ่งน้อยยิ่งขึ้นก่อน):', dept.Order || 999);
    if (newOrderStr === null) return;
    
    const newOrder = parseInt(newOrderStr) || 999;

    if (newName.trim() === '' || (newName === dept.Name && newOrder === dept.Order)) return;

    // Optimistic Update
    setDepartments(departments.map(d => d.ID === dept.ID ? { ...d, Name: newName, Order: newOrder } : d).sort((a,b)=>(a.Order||999)-(b.Order||999)));
    
    try {
      await api.updateDepartment(dept.ID, newName, newOrder);
      toast.success('แก้ไขชื่อฝ่ายงานสำเร็จ');
      loadData();
    } catch (e) {
      toast.error('Error: ' + e);
      loadData();
    }
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
                    <button className="btn-ghost text-primary" onClick={() => handleEdit(dept)} style={{ padding: '0.5rem', marginRight: '0.5rem' }}>
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
    </div>
  );
}
