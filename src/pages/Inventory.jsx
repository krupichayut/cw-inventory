import { useState, useEffect } from 'react';
import { api, getDirectImageUrl } from '../utils/api';
import { Plus, Search, AlertTriangle, Image as ImageIcon, PackagePlus, Edit, Trash2 } from 'lucide-react';
import './Inventory.css';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', minStock: 0, category: '', imageFile: null, imageUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [adjustModal, setAdjustModal] = useState({ show: false, item: null, qty: 1 });
  const [editModal, setEditModal] = useState({ show: false, item: null, name: '', minStock: 0, category: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getData();
      setItems(data.inventory);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setNewItem({ ...newItem, imageFile: e.target.files[0], imageUrl: URL.createObjectURL(e.target.files[0]) });
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let uploadedUrl = '';
      if (newItem.imageFile) {
        uploadedUrl = await api.uploadImage(newItem.imageFile);
      }
      await api.addItem({
        name: newItem.name,
        minStock: parseInt(newItem.minStock),
        category: newItem.category,
        imageUrl: uploadedUrl
      });
      setShowModal(false);
      setNewItem({ name: '', minStock: 0, category: '', imageFile: null, imageUrl: '' });
      loadData();
    } catch (e) {
      alert('Error: ' + e);
    }
    setUploading(false);
  };

  const submitAdjustStock = async (e) => {
    e.preventDefault();
    const qty = parseInt(adjustModal.qty);
    const targetId = adjustModal.item.ID;
    
    // Optimistic Update (เพื่อความรวดเร็ว)
    setItems(items.map(i => i.ID === targetId ? { ...i, Balance: parseInt(i.Balance || 0) + qty } : i));
    setAdjustModal({ show: false, item: null, qty: 1 });
    
    try {
      await api.adjustStock(targetId, qty);
    } catch (e) {
      alert('Error: ' + e);
      loadData(); // Revert on failure
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    setUploading(true);
    const targetId = editModal.item.ID;
    const updatedData = {
      id: targetId,
      name: editModal.name,
      minStock: parseInt(editModal.minStock),
      category: editModal.category
    };

    // Optimistic Update
    setItems(items.map(i => i.ID === targetId ? { ...i, Name: updatedData.name, MinStock: updatedData.minStock, Category: updatedData.category } : i));
    setEditModal({ show: false, item: null });

    try {
      await api.updateItem(updatedData);
    } catch (e) {
      alert('Error: ' + e);
      loadData();
    }
    setUploading(false);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบพัสดุนี้? ข้อมูลจะไม่สามารถกู้คืนได้')) return;
    
    // Optimistic Update
    setItems(items.filter(i => i.ID !== id));
    
    try {
      await api.deleteItem(id);
    } catch (e) {
      alert('Error: ' + e);
      loadData();
    }
  };

  const filteredItems = items.filter(i => i.Name.toLowerCase().includes(search.toLowerCase()) || i.ID.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h1 className="page-title">ระบบจัดการพัสดุคงคลัง</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> เพิ่มพัสดุใหม่
        </button>
      </div>

      <div className="search-bar">
        <Search size={20} className="text-muted" />
        <input 
          type="text" 
          placeholder="ค้นหาชื่อ หรือ รหัสพัสดุ..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">กำลังโหลดข้อมูล...</div>
      ) : (
        <div className="grid">
          {filteredItems.map(item => {
            const isLow = parseInt(item.Balance) <= parseInt(item.MinStock);
            return (
              <div key={item.ID} className={`card item-card ${isLow ? 'low-stock-card' : ''}`}>
                <div className="item-img-container">
                  {item.ImageURL ? (
                    <img src={getDirectImageUrl(item.ImageURL)} alt={item.Name} className="item-img" />
                  ) : (
                    <div className="no-img"><ImageIcon size={40} /></div>
                  )}
                  {isLow && (
                    <div className="low-stock-badge">
                      <AlertTriangle size={14} /> ใกล้หมด
                    </div>
                  )}
                </div>
                <div className="item-info">
                  <div className="item-id">{item.ID}</div>
                  <h3 className="item-name">{item.Name}</h3>
                  <div className="item-category">{item.Category}</div>
                  <div className="item-stats">
                    <div className="stat-box">
                      <div className="stat-label">คงเหลือ</div>
                      <div className={`stat-val ${isLow ? 'text-danger' : 'text-primary'}`}>
                        {item.Balance}
                      </div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-label">จุดวิกฤต</div>
                      <div className="stat-val">{item.MinStock}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button 
                    className={`btn ${isLow ? 'btn-primary' : 'btn-ghost'}`} 
                    style={{ flex: 1, padding: '0.5rem' }}
                    onClick={() => setAdjustModal({ show: true, item: item, qty: 1 })}
                  >
                    <PackagePlus size={16} /> เติมสต๊อก
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    style={{ padding: '0.5rem' }}
                    onClick={() => setEditModal({ show: true, item: item, name: item.Name, minStock: item.MinStock, category: item.Category })}
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="btn btn-ghost text-danger" 
                    style={{ padding: '0.5rem' }}
                    onClick={() => handleDeleteItem(item.ID)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <h2>เพิ่มพัสดุใหม่</h2>
            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label>รูปภาพพัสดุ</label>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {newItem.imageUrl && <img src={newItem.imageUrl} className="preview-img" alt="preview" />}
              </div>
              <div className="form-group">
                <label>ชื่อพัสดุ</label>
                <input type="text" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>หมวดหมู่</label>
                <input type="text" required value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
              </div>
              <div className="form-group">
                <label>จุดวิกฤต (Min Stock)</label>
                <input type="number" required min="0" value={newItem.minStock} onChange={e => setNewItem({...newItem, minStock: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adjustModal.show && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '400px' }}>
            <h2>เติมสต๊อกพัสดุ</h2>
            <p className="text-muted" style={{ marginBottom: '1rem' }}>พัสดุ: <strong>{adjustModal.item.Name}</strong></p>
            <form onSubmit={submitAdjustStock}>
              <div className="form-group">
                <label>จำนวนที่ต้องการเพิ่ม (ชิ้น)</label>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  value={adjustModal.qty} 
                  onChange={e => setAdjustModal({...adjustModal, qty: e.target.value})} 
                  style={{ fontSize: '1.25rem', padding: '0.75rem' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setAdjustModal({ show: false, item: null, qty: 1 })}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'กำลังบันทึก...' : 'ยืนยันการเติมสต๊อก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal.show && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '400px' }}>
            <h2>แก้ไขข้อมูลพัสดุ</h2>
            <form onSubmit={handleEditItem}>
              <div className="form-group">
                <label>ชื่อพัสดุ</label>
                <input type="text" required value={editModal.name} onChange={e => setEditModal({...editModal, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>หมวดหมู่</label>
                <input type="text" required value={editModal.category} onChange={e => setEditModal({...editModal, category: e.target.value})} />
              </div>
              <div className="form-group">
                <label>จุดวิกฤต (Min Stock)</label>
                <input type="number" required min="0" value={editModal.minStock} onChange={e => setEditModal({...editModal, minStock: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal({ show: false, item: null })}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
