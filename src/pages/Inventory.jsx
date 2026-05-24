import { useState, useEffect } from 'react';
import { api, getDirectImageUrl } from '../utils/api';
import { Plus, Search, AlertTriangle, Image as ImageIcon, PackagePlus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './Inventory.css';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', minStock: 0, category: '', imageFile: null, imageUrl: '', order: 999, baseUnit: 'ชิ้น', packUnit: '', packSize: 1 });
  const [uploading, setUploading] = useState(false);
  const [adjustModal, setAdjustModal] = useState({ show: false, item: null, qty: 1 });
  const [editModal, setEditModal] = useState({ show: false, item: null, name: '', minStock: 0, category: '', order: 999, baseUnit: 'ชิ้น', packUnit: '', packSize: 1 });

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
      let uploadedUrl = newItem.imageUrl;
      if (newItem.imageFile) {
        uploadedUrl = await api.uploadImage(newItem.imageFile);
      }
      await api.addItem({
        name: newItem.name,
        minStock: parseInt(newItem.minStock),
        category: newItem.category,
        imageUrl: uploadedUrl,
        order: parseInt(newItem.order),
        baseUnit: newItem.baseUnit,
        packUnit: newItem.packUnit,
        packSize: parseInt(newItem.packSize)
      });
      setShowModal(false);
      setNewItem({ name: '', minStock: 0, category: '', imageFile: null, imageUrl: '', order: 999, baseUnit: 'ชิ้น', packUnit: '', packSize: 1 });
      toast.success('เพิ่มพัสดุใหม่สำเร็จ');
      loadData();
    } catch (e) {
      toast.error('Error: ' + e);
    }
    setUploading(false);
  };

  const submitAdjustStock = async (e) => {
    e.preventDefault();
    const qty = parseInt(adjustModal.qty);
    const targetId = adjustModal.item.ID;
    
    setItems(items.map(i => i.ID === targetId ? { ...i, Balance: parseInt(i.Balance || 0) + qty } : i));
    setAdjustModal({ show: false, item: null, qty: 1 });
    
    try {
      await api.adjustStock(targetId, qty);
      toast.success('อัปเดตสต๊อกสำเร็จ');
    } catch (e) {
      toast.error('Error: ' + e);
      loadData();
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
      category: editModal.category,
      order: editModal.order,
      baseUnit: editModal.baseUnit,
      packUnit: editModal.packUnit,
      packSize: editModal.packSize
    };

    setItems(items.map(i => i.ID === targetId ? { ...i, Name: updatedData.name, MinStock: updatedData.minStock, Category: updatedData.category, Order: updatedData.order, BaseUnit: updatedData.baseUnit, PackUnit: updatedData.packUnit, PackSize: updatedData.packSize } : i));
    setEditModal({ show: false, item: null });

    try {
      await api.updateItem(updatedData);
      toast.success('แก้ไขข้อมูลสำเร็จ');
    } catch (e) {
      toast.error('Error: ' + e);
      loadData();
    }
    setUploading(false);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบพัสดุนี้? ข้อมูลจะไม่สามารถกู้คืนได้')) return;
    
    setItems(items.filter(i => i.ID !== id));
    
    try {
      await api.deleteItem(id);
      toast.success('ลบพัสดุสำเร็จ');
    } catch (e) {
      toast.error('Error: ' + e);
      loadData();
    }
  };

  const filteredItems = items
    .filter(i => i.Name?.toLowerCase().includes(search.toLowerCase()) || i.ID?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.Order || 999) - (b.Order || 999));

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
        <table className="inventory-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัส</th>
              <th>ภาพ</th>
              <th>ชื่อพัสดุ</th>
              <th>หมวดหมู่</th>
              <th className="text-right">คงเหลือ</th>
              <th className="text-right">ขั้นต่ำ</th>
              <th>หน่วย</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const isLow = parseInt(item.Balance) <= parseInt(item.MinStock);
              return (
                <tr key={item.ID} className={isLow ? 'low-stock' : ''}>
                  <td>{item.Order || '-'}</td>
                  <td className="item-id">{item.ID}</td>
                  <td>
                    {item.ImageURL ? (
                      <img src={getDirectImageUrl(item.ImageURL)} alt={item.Name} className="table-img" />
                    ) : (
                      <div className="no-img-small"><ImageIcon size={16} /></div>
                    )}
                  </td>
                  <td>{item.Name}</td>
                  <td>{item.Category}</td>
                  <td className="text-right">{item.Balance}</td>
                  <td className="text-right">{item.MinStock}</td>
                  <td>{item.BaseUnit || 'ชิ้น'}</td>
                  <td className="text-center" style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button className="btn btn-ghost" onClick={() => setAdjustModal({ show: true, item: item, qty: 1 })}><PackagePlus size={16} /></button>
                    <button className="btn btn-ghost" onClick={() => setEditModal({ show: true, item: item, name: item.Name, minStock: item.MinStock, category: item.Category, order: item.Order || 999, baseUnit: item.BaseUnit || 'ชิ้น', packUnit: item.PackUnit || '', packSize: item.PackSize || 1 })}><Edit size={16} /></button>
                    <button className="btn btn-ghost text-danger" onClick={() => handleDeleteItem(item.ID)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>จำนวนสต๊อกขั้นต่ำ</label>
                  <input type="number" required value={newItem.minStock} onChange={e => setNewItem({...newItem, minStock: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>ลำดับ (เลขยิ่งน้อยยิ่งขึ้นก่อน)</label>
                  <input type="number" required value={newItem.order} onChange={e => setNewItem({...newItem, order: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>หน่วยย่อย (เช่น ชิ้น)</label>
                  <input type="text" required value={newItem.baseUnit} onChange={e => setNewItem({...newItem, baseUnit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>หน่วยแพ็ค (ถ้ามี)</label>
                  <input type="text" placeholder="เช่น กล่อง" value={newItem.packUnit} onChange={e => setNewItem({...newItem, packUnit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>จำนวน/แพ็ค</label>
                  <input type="number" min="1" value={newItem.packSize} onChange={e => setNewItem({...newItem, packSize: parseInt(e.target.value)})} disabled={!newItem.packUnit} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>จุดวิกฤต (Min Stock)</label>
                  <input type="number" required min="0" value={editModal.minStock} onChange={e => setEditModal({...editModal, minStock: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>ลำดับ (Order)</label>
                  <input type="number" required value={editModal.order} onChange={e => setEditModal({...editModal, order: parseInt(e.target.value)})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>หน่วยย่อย (เช่น ชิ้น)</label>
                  <input type="text" required value={editModal.baseUnit} onChange={e => setEditModal({...editModal, baseUnit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>หน่วยแพ็ค (ถ้ามี)</label>
                  <input type="text" placeholder="เช่น กล่อง" value={editModal.packUnit} onChange={e => setEditModal({...editModal, packUnit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>จำนวน/แพ็ค</label>
                  <input type="number" min="1" value={editModal.packSize} onChange={e => setEditModal({...editModal, packSize: parseInt(e.target.value)})} disabled={!editModal.packUnit} />
                </div>
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
