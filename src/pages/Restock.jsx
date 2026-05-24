import { useState, useEffect } from 'react';
import { api, getDirectImageUrl } from '../utils/api';
import { Plus, Minus, Trash2, CheckCircle, PackagePlus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import './Restock.css';

export default function Restock() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [restockerName, setRestockerName] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await api.getData();
      setItems(data.inventory.sort((a, b) => (a.Order || 999) - (b.Order || 999)));
      setLoading(false);
    };
    loadData();
    
    const savedName = localStorage.getItem('restockerName');
    if (savedName) setRestockerName(savedName);
  }, []);

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
      setReceiptUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const addToCart = (item, qtyToAdd = 1) => {
    const existing = cart.find(c => c.id === item.ID);
    if (existing) {
      setCart(cart.map(c => c.id === item.ID ? { ...c, quantity: c.quantity + qtyToAdd } : c));
    } else {
      setCart([...cart, { id: item.ID, name: item.Name, quantity: qtyToAdd, baseUnit: item.BaseUnit || 'ชิ้น' }]);
    }
  };

  const updateQty = (id, newQty) => {
    if (newQty > 0) {
      setCart(cart.map(c => c.id === id ? { ...c, quantity: newQty } : c));
    }
  };

  const remove = (id) => setCart(cart.filter(c => c.id !== id));

  const handleSubmit = async () => {
    if (!restockerName.trim()) return toast.error('กรุณาระบุชื่อผู้รับเข้า');
    if (cart.length === 0) return toast.error('กรุณาเลือกพัสดุที่ต้องการรับเข้าอย่างน้อย 1 รายการ');
    
    setSubmitting(true);
    localStorage.setItem('restockerName', restockerName);
    
    try {
      let finalReceiptUrl = '';
      if (receiptFile) {
        finalReceiptUrl = await api.uploadImage(receiptFile);
      }
      await api.batchRestock(cart, restockerName, finalReceiptUrl);
      toast.success('รับเข้าพัสดุสำเร็จ', { duration: 4000 });
      setCart([]);
      setReceiptFile(null);
      setReceiptUrl('');
    } catch (e) {
      toast.error('Error: ' + e);
    }
    setSubmitting(false);
  };

  const filteredItems = items.filter(i => 
    i.Name?.toLowerCase().includes(search.toLowerCase()) || 
    i.ID?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="restock-page flex-layout animate-fade-in" style={{ gap: '1.5rem', width: '100%', paddingBottom: '3rem' }}>
      
      {/* --- Left: Item Selection --- */}
      <div className="req-items glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h2 className="page-title"><PackagePlus size={24} className="inline-icon"/> เลือกพัสดุรับเข้า</h2>
        
        <div className="search-bar" style={{ margin: '1rem 0' }}>
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ หรือ รหัสพัสดุ..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? <p>Loading...</p> : (
          <div className="item-list" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredItems.map(item => (
              <div key={item.ID} className="list-card glass-panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <img src={item.ImageURL ? getDirectImageUrl(item.ImageURL) : 'https://via.placeholder.com/60'} alt={item.Name} className="list-img" />
                <div className="list-info" style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.Name}</h4>
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>คงเหลือเดิม: {item.Balance} {item.BaseUnit || 'ชิ้น'}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <button className="btn btn-primary" onClick={() => addToCart(item, 1)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    <Plus size={16} className="inline-icon" /> 1 {item.BaseUnit || 'ชิ้น'}
                  </button>
                  {item.PackUnit && item.PackSize > 1 && (
                    <button className="btn btn-ghost" onClick={() => addToCart(item, item.PackSize)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
                      <Plus size={16} className="inline-icon" /> 1 {item.PackUnit}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Right: Cart & Submit --- */}
      <div className="req-cart glass-panel" style={{ width: '400px', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>รายการรับเข้า ({cart.reduce((a,c) => a + c.quantity, 0)})</h2>
        
        <div className="cart-items" style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
          {cart.length === 0 ? <p className="text-muted text-center" style={{ marginTop: '2rem' }}>ยังไม่ได้เลือกพัสดุ</p> : (
            cart.map(c => (
              <div key={c.id} className="cart-item" style={{ padding: '0.75rem', background: 'var(--bg-light)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <div className="cart-item-info">
                  <div className="font-medium">{c.name}</div>
                </div>
                <div className="cart-controls" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="ctrl-btn" onClick={() => updateQty(c.id, c.quantity - 1)}><Minus size={16} /></button>
                  <input type="number" className="qty-input" value={c.quantity} onChange={(e) => updateQty(c.id, parseInt(e.target.value) || 1)} min="1" />
                  <button type="button" className="ctrl-btn" onClick={() => updateQty(c.id, c.quantity + 1)}><Plus size={16} /></button>
                  <span className="text-muted" style={{ fontSize: '0.85rem', flex: 1 }}>{c.baseUnit}</span>
                  <button type="button" className="ctrl-btn text-danger" onClick={() => remove(c.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>ชื่อผู้ดำเนินการรับเข้า <span className="text-danger">*</span></label>
            <input type="text" required value={restockerName} onChange={e => setRestockerName(e.target.value)} placeholder="เช่น ครูสมหมาย" style={{ width: '100%' }} />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>แนบรูปใบเสร็จ (ถ้ามี)</label>
            <div className="receipt-upload">
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {receiptUrl && <img src={receiptUrl} className="receipt-preview" alt="receipt preview" />}
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleSubmit} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} disabled={submitting || cart.length === 0}>
            {submitting ? 'กำลังบันทึกข้อมูล...' : <><CheckCircle size={20} className="inline-icon" /> ยืนยันการรับเข้าล็อตนี้</>}
          </button>
        </div>
      </div>
      
    </div>
  );
}
