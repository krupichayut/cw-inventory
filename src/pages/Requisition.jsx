import { useState, useEffect } from 'react';
import { api, getDirectImageUrl } from '../utils/api';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import './Requisition.css';

export default function Requisition() {
  const [currentStep, setCurrentStep] = useState(1); // 1 = Info, 2 = Items, 3 = Review
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [cart, setCart] = useState([]);
  const [requester, setRequester] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await api.getData();
      setItems(data.inventory.filter(i => parseInt(i.Balance) > 0)); // Only show items with stock
      setDepartments(data.departments || []);
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

  const handleNextStep1 = () => {
    if (!requester.trim() || !department) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    if (cart.length === 0) return alert('กรุณาเลือกพัสดุอย่างน้อย 1 รายการ');
    setCurrentStep(3);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.createRequest(requester, department, cart);
      alert('ส่งคำขอสำเร็จ รอแอดมินอนุมัติและจ่ายของ');
      setCart([]);
      setRequester('');
      setDepartment('');
      setCurrentStep(1);
    } catch (e) {
      alert('Error: ' + e);
    }
    setSubmitting(false);
  };

  return (
    <div className="req-page flex-layout wizard-mode">
      
      {/* --- Step Indicator --- */}
      <div className="wizard-progress glass-panel animate-fade-in" style={{ width: '100%', marginBottom: '1.5rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={`step-item ${currentStep >= 1 ? 'active' : ''}`}>1. ข้อมูลผู้เบิก</div>
        <div className={`step-line ${currentStep >= 2 ? 'active' : ''}`}></div>
        <div className={`step-item ${currentStep >= 2 ? 'active' : ''}`}>2. เลือกพัสดุ</div>
        <div className={`step-line ${currentStep >= 3 ? 'active' : ''}`}></div>
        <div className={`step-item ${currentStep >= 3 ? 'active' : ''}`}>3. ตรวจสอบยืนยัน</div>
      </div>

      {/* --- STEP 1: User Info --- */}
      {currentStep === 1 && (
        <div className="wizard-step glass-panel animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h2 className="page-title text-center" style={{ marginBottom: '2rem' }}>ข้อมูลผู้เบิก</h2>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>ชื่อ - นามสกุล</label>
            <input type="text" required value={requester} onChange={e => setRequester(e.target.value)} placeholder="ระบุชื่อของคุณ" style={{ padding: '0.75rem', width: '100%' }} />
          </div>
          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label>ฝ่ายงาน</label>
            <select required value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <option value="" disabled>-- เลือกฝ่ายงาน --</option>
              {departments.map(d => (
                <option key={d.ID} value={d.Name}>{d.Name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleNextStep1} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} disabled={!requester.trim() || !department}>
            ถัดไป <ArrowRight size={20} className="inline-icon" />
          </button>
        </div>
      )}

      {/* --- STEP 2: Select Items --- */}
      {currentStep === 2 && (
        <div className="wizard-step flex-layout animate-fade-in" style={{ width: '100%', gap: '1.5rem' }}>
          <div className="req-items" style={{ flex: 1 }}>
            <h2 className="page-title">เลือกพัสดุ</h2>
            {loading ? <p>Loading...</p> : (
              <div className="item-list">
                {items.map(item => (
                  <div key={item.ID} className="list-card glass-panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <img src={item.ImageURL ? getDirectImageUrl(item.ImageURL) : 'https://via.placeholder.com/60'} alt={item.Name} className="list-img" />
                    <div className="list-info" style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.Name}</h4>
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', fontWeight: 'bold' }}>
                        คงเหลือ: {item.Balance}
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => addToCart(item)}><Plus size={20} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="req-cart glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column' }}>
            <h2><ShoppingCart size={24} className="inline-icon"/> ตะกร้า ({cart.reduce((a,c) => a + c.quantity, 0)})</h2>
            
            <div className="cart-items" style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
              {cart.length === 0 ? <p className="text-muted text-center" style={{ marginTop: '2rem' }}>ยังไม่ได้เลือกพัสดุ</p> : (
                cart.map(c => (
                  <div key={c.id} className="cart-item" style={{ padding: '0.75rem', background: 'var(--bg-light)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div className="cart-item-info">
                      <div className="font-medium">{c.name}</div>
                    </div>
                    <div className="cart-controls" style={{ marginTop: '0.5rem' }}>
                      <button type="button" className="ctrl-btn" onClick={() => updateQty(c.id, -1)}><Minus size={16} /></button>
                      <span className="qty" style={{ width: '30px', textAlign: 'center' }}>{c.quantity}</span>
                      <button type="button" className="ctrl-btn" onClick={() => updateQty(c.id, 1)}><Plus size={16} /></button>
                      <button type="button" className="ctrl-btn text-danger ml-2" onClick={() => remove(c.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setCurrentStep(1)} style={{ flex: 1 }}><ArrowLeft size={20} /> กลับ</button>
              <button className="btn btn-primary" onClick={handleNextStep2} style={{ flex: 2 }} disabled={cart.length === 0}>ตรวจสอบ <ArrowRight size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {/* --- STEP 3: Review & Submit --- */}
      {currentStep === 3 && (
        <div className="wizard-step glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <h2 className="page-title text-center"><CheckCircle size={28} className="inline-icon text-primary" /> ตรวจสอบรายการ</h2>
          
          <div className="review-user-info" style={{ background: 'var(--bg-light)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '2rem' }}>
            <div><span className="text-muted">ชื่อผู้เบิก:</span> <strong>{requester}</strong></div>
            <div><span className="text-muted">ฝ่ายงาน:</span> <strong>{department}</strong></div>
            <div><span className="text-muted">วันที่:</span> <strong>{new Date().toLocaleDateString('th-TH')}</strong></div>
          </div>

          <div className="table-responsive" style={{ marginBottom: '2rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>ชื่อพัสดุ</th>
                  <th style={{ textAlign: 'center' }}>จำนวนที่เบิก</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((c, index) => (
                  <tr key={c.id}>
                    <td>{index + 1}</td>
                    <td>{c.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>{c.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={() => setCurrentStep(2)} disabled={submitting} style={{ padding: '0.75rem 2rem' }}>
              <ArrowLeft size={20} className="inline-icon" /> แก้ไขรายการ
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ padding: '0.75rem 3rem', fontSize: '1.1rem', background: 'var(--secondary)', borderColor: 'var(--secondary)' }}>
              {submitting ? 'กำลังส่งข้อมูล...' : 'ส่งคำขอเบิก'}
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
