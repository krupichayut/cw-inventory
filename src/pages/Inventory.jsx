import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Search, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import './Inventory.css';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', minStock: 0, category: '', imageFile: null, imageUrl: '' });
  const [uploading, setUploading] = useState(false);

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
                    <img src={item.ImageURL} alt={item.Name} className="item-img" />
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
    </div>
  );
}
