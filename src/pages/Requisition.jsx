import { useState, useEffect } from 'react';
import { api, getDirectImageUrl } from '../utils/api';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import './Requisition.css';

export default function Requisition() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [requester, setRequester] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await api.getData();
      setItems(data.inventory.filter(i => parseInt(i.Balance) > 0)); // Only show items with stock
      setLoading(false);
    };
    loadData();
  }, []);

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.ID);
    if (existing) {
      if (existing.quantity < item.Balance) {
        setCart(cart.map(c => c.id === item.ID ? { ...c, quantity: c.quantity + 1 } : c));
      }
    } else {
      setCart([...cart, { id: item.ID, name: item.Name, max: parseInt(item.Balance), quantity: 1, image: item.ImageURL }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQ = c.quantity + delta;
        if (newQ > 0 && newQ <= c.max) return { ...c, quantity: newQ };
      }
      return c;
    }));
  };

  const remove = (id) => setCart(cart.filter(c => c.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('กรุณาเลือกพัสดุก่อนส่งคำขอ');
    
    setSubmitting(true);
    try {
      await api.createRequest(requester, cart);
      alert('ส่งคำขอสำเร็จ รอแอดมินอนุมัติและจ่ายของ');
      setCart([]);
      setRequester('');
    } catch (e) {
      alert('Error: ' + e);
    }
    setSubmitting(false);
  };

  return (
    <div className="req-page flex-layout">
      <div className="req-items animate-fade-in">
        <h1 className="page-title">เลือกพัสดุที่ต้องการเบิก</h1>
        {loading ? <p>Loading...</p> : (
          <div className="item-list">
            {items.map(item => (
              <div key={item.ID} className="list-card glass-panel">
                <img src={item.ImageURL ? getDirectImageUrl(item.ImageURL) : 'https://via.placeholder.com/60'} alt={item.Name} className="list-img" />
                <div className="list-info" style={{ width: '100%' }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.Name}</h4>
                  <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', fontWeight: 'bold' }}>
                    คงเหลือ: {item.Balance} ชิ้น
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => addToCart(item)}>เลือก</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="req-cart glass-panel animate-fade-in">
        <h2><ShoppingCart size={24} className="inline-icon"/> รายการขอเบิก</h2>
        <form onSubmit={handleSubmit} className="cart-form">
          <div className="form-group" style={{ marginBottom: '0' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              วันที่เบิก: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <label>ชื่อผู้เบิก</label>
            <input type="text" required value={requester} onChange={e => setRequester(e.target.value)} placeholder="ระบุชื่อของคุณ" />
          </div>

          <div className="cart-items">
            {cart.length === 0 ? <p className="text-muted">ยังไม่ได้เลือกพัสดุ</p> : (
              cart.map(c => (
                <div key={c.id} className="cart-item">
                  <div className="cart-item-info">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted">เบิกได้สูงสุด {c.max}</div>
                  </div>
                  <div className="cart-controls">
                    <button type="button" className="ctrl-btn" onClick={() => updateQty(c.id, -1)}><Minus size={16} /></button>
                    <span className="qty">{c.quantity}</span>
                    <button type="button" className="ctrl-btn" onClick={() => updateQty(c.id, 1)}><Plus size={16} /></button>
                    <button type="button" className="ctrl-btn text-danger ml-2" onClick={() => remove(c.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <button type="submit" className="btn btn-primary submit-btn" disabled={submitting || cart.length === 0}>
            {submitting ? 'กำลังส่ง...' : 'ส่งคำขอเบิกพัสดุ'}
          </button>
        </form>
      </div>
    </div>
  );
}
