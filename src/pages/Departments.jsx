import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Users, Plus, Trash2, Edit } from 'lucide-react';
import './Inventory.css'; // Reuse inventory css for grid

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getData();
      setDepartments(data.departments || []);
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
    setDepartments([...departments, { ID: tempId, Name: newDept }]);
    
    try {
      await api.addDepartment(newDept);
      setNewDept('');
      loadData();
    } catch (e) {
      alert('Error: ' + e);
      loadData();
    }
    setProcessing(false);
  };

  const handleEdit = async (dept) => {
    const newName = window.prompt('แก้ไขชื่อฝ่ายงาน:', dept.Name);
    if (!newName || newName.trim() === '' || newName === dept.Name) return;

    // Optimistic Update
    setDepartments(departments.map(d => d.ID === dept.ID ? { ...d, Name: newName } : d));
    
    try {
      await api.updateDepartment(dept.ID, newName);
      loadData();
    } catch (e) {
      alert('Error: ' + e);
      loadData();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบฝ่ายงานนี้?')) return;
    
    // Optimistic
    setDepartments(departments.filter(d => d.ID !== id));
    
    try {
      await api.deleteDepartment(id);
      loadData();
    } catch (e) {
      alert('Error: ' + e);
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
                  <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{dept.Name}</span>
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
