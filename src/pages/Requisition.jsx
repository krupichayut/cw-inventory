import { useState, useEffect } from 'react';
import { api, getDirectImageUrl } from '../utils/api';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, ArrowLeft, CheckCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { db } from '../utils/firebase';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
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
  const [previewImage, setPreviewImage] = useState(null);
  const [isSystemOpen, setIsSystemOpen] = useState(true);
  
  // Search and Category states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    { id: 'All', name: 'ทั้งหมด' },
    { id: 'หมวดเครื่องเขียนและอุปกรณ์สำนักงาน', name: 'เครื่องเขียน/สำนักงาน' },
    { id: 'หมวดอุปกรณ์อิเล็กทรอนิกส์และไอที', name: 'อิเล็กทรอนิกส์/ไอที' },
    { id: 'หมวดผลิตภัณฑ์กระดาษและซอง', name: 'กระดาษ/ซอง' },
    { id: 'หมวดผลิตภัณฑ์และอุปกรณ์ทำความสะอาด', name: 'อุปกรณ์ทำความสะอาด' },
    { id: 'อื่นๆ', name: 'อื่นๆ' }
  ];

  useEffect(() => {
    setLoading(true);
    let inventoryList = [];
    let requestsList = [];
    let isDataLoaded = false;

    const processData = () => {
      if (!isDataLoaded) return;
      const pendingMap = {};
      requestsList.forEach(r => {
        if (r.Status === 'Pending') {
          pendingMap[r.ItemID] = (pendingMap[r.ItemID] || 0) + (parseInt(r.Quantity) || 0);
        }
      });
      
      const availableItems = inventoryList.map(i => {
        const bal = parseInt(i.Balance) || 0;
        const pending = pendingMap[i.ID] || 0;
        return {
          ...i,
          AvailableBalance: Math.max(0, bal - pending)
        };
      });

      setItems(availableItems
        .filter(i => i.AvailableBalance > 0)
        .sort((a, b) => (a.Order || 999) - (b.Order || 999))
      );
      setLoading(false);
    };

    const unsubInv = onSnapshot(collection(db, 'inventory'), (snap) => {
      inventoryList = snap.docs.map(d => d.data());
      isDataLoaded = true;
      processData();
    });

    const unsubReq = onSnapshot(query(collection(db, 'requests'), where('Status', '==', 'Pending')), (snap) => {
      requestsList = snap.docs.map(d => d.data());
      processData();
    });

    const unsubSys = onSnapshot(doc(db, 'settings', 'system'), (docSnap) => {
      if (docSnap.exists()) {
        setIsSystemOpen(docSnap.data().isRequisitionOpen !== false);
      }
    });

    const loadDepts = async () => {
      const data = await api.getData();
      setDepartments((data.departments || []).sort((a, b) => (a.Order || 999) - (b.Order || 999)));
    };
    loadDepts();

    const savedName = localStorage.getItem('requesterName');
    const savedDept = localStorage.getItem('requesterDepartment');
    if (savedName) setRequester(savedName);
    if (savedDept) setDepartment(savedDept);

    return () => {
      unsubInv();
      unsubReq();
      unsubSys();
    };
  }, []);

  const filteredItems = items.filter(item => {
    const matchSearch = item.Name?.toLowerCase().includes(search.toLowerCase()) || item.ID?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'All' || item.Category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const addToCart = (item, qtyToAdd = 1) => {
    const existing = cart.find(c => c.id === item.ID);
    if (existing) {
      if (existing.quantity + qtyToAdd <= item.AvailableBalance) {
        setCart(cart.map(c => c.id === item.ID ? { ...c, quantity: c.quantity + qtyToAdd } : c));
      } else {
        toast.error(`ไม่สามารถเพิ่มได้ สต๊อกคงเหลือสุทธิไม่พอ (เหลือให้เบิก ${item.AvailableBalance})`);
      }
    } else {
      if (qtyToAdd <= item.AvailableBalance) {
        setCart([...cart, { id: item.ID, name: item.Name, max: item.AvailableBalance, quantity: qtyToAdd, image: item.ImageURL, baseUnit: item.BaseUnit || 'ชิ้น' }]);
      } else {
        toast.error(`สต๊อกคงเหลือสุทธิไม่พอ (เหลือให้เบิก ${item.AvailableBalance})`);
      }
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

  const setQty = (id, newQ) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        if (newQ === '' || isNaN(newQ)) return { ...c, quantity: '' };
        const val = parseInt(newQ);
        if (val > 0 && val <= c.max) return { ...c, quantity: val };
        if (val > c.max) return { ...c, quantity: c.max };
      }
      return c;
    }));
  };

  const remove = (id) => setCart(cart.filter(c => c.id !== id));

  const handleNextStep1 = () => {
    if (!requester.trim() || !department) return toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    if (cart.length === 0) return toast.error('กรุณาเลือกพัสดุอย่างน้อย 1 รายการ');
    setCurrentStep(3);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const trimmedName = requester.trim().replace(/\s+/g, ' ');
    localStorage.setItem('requesterName', trimmedName);
    localStorage.setItem('requesterDepartment', department);
    
    // Validate stock one last time against real-time items
    for (const cartItem of cart) {
      const realItem = items.find(i => i.ID === cartItem.id);
      if (!realItem || cartItem.quantity > realItem.AvailableBalance) {
         toast.error(`เสียใจด้วย! สต๊อก ${cartItem.name} เพิ่งถูกเบิกตัดหน้า (เหลือให้เบิกแค่ ${realItem ? realItem.AvailableBalance : 0}) กรุณาปรับจำนวนใหม่`, { duration: 6000 });
         setSubmitting(false);
         return;
      }
    }

    try {
      await api.createRequest(trimmedName, department, cart);
      toast.success('ส่งคำขอสำเร็จ รอแอดมินอนุมัติและจ่ายของ', { duration: 4000 });
      setCart([]);
      setCurrentStep(1);
    } catch (e) {
      toast.error('Error: ' + e);
    }
    setSubmitting(false);
  };

  if (!isSystemOpen) {
    return (
      <div className="req-page flex-layout" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="glass-panel text-center animate-fade-in" style={{ padding: '3rem', maxWidth: '500px' }}>
          <div style={{ background: 'var(--warning-light)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🚧</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-dark)', marginBottom: '1rem' }}>ปิดให้บริการชั่วคราว</h2>
          <p className="text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
            ขณะนี้ระบบเบิกพัสดุปิดให้บริการชั่วคราว เพื่อให้เจ้าหน้าที่จัดระเบียบคลังพัสดุและเคลียร์ยอด<br/><br/>กรุณากลับมาทำรายการใหม่อีกครั้งในภายหลังครับ
          </p>
        </div>
      </div>
    );
  }

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
            <label>สำหรับใช้ในกลุ่มสาระฯ/กลุ่มงาน</label>
            <select required value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <option value="" disabled>-- เลือกกลุ่มสาระฯ/กลุ่มงาน --</option>
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
          <div className="req-items" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>เลือกพัสดุ</h2>
            
            <div className="search-bar" style={{ margin: '0.5rem 0 1rem 0' }}>
              <Search size={20} className="text-muted" />
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ รหัสพัสดุ..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="category-tabs" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`btn btn-sm ${selectedCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ 
                    whiteSpace: 'nowrap',
                    padding: '0.4rem 0.8rem',
                    minHeight: '36px',
                    fontSize: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: selectedCategory === cat.id ? 'var(--primary)' : 'rgba(0,0,0,0.03)',
                    color: selectedCategory === cat.id ? 'white' : 'var(--text-muted)'
                  }}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {loading ? <p>Loading...</p> : (
              <div className="item-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '60vh' }}>
                {filteredItems.map(item => (
                  <div key={item.ID} className="list-card glass-panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <img 
                      src={item.ImageURL ? getDirectImageUrl(item.ImageURL) : 'https://via.placeholder.com/60'} 
                      alt={item.Name} 
                      className="list-img" 
                      style={{ cursor: item.ImageURL ? 'pointer' : 'default', transition: 'transform 0.2s', hover: { transform: 'scale(1.05)' } }}
                      onClick={() => item.ImageURL && setPreviewImage(getDirectImageUrl(item.ImageURL))}
                    />
                    <div className="list-info" style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.Name}</h4>
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', fontWeight: 'bold' }}>
                        พร้อมจ่าย: {item.AvailableBalance} {item.BaseUnit || 'ชิ้น'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                      <button className="btn btn-primary" onClick={() => addToCart(item, 1)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                        เลือก
                      </button>
                      {item.PackUnit && item.PackSize > 1 && (
                        <button className="btn btn-ghost" onClick={() => addToCart(item, item.PackSize)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
                          เลือกแบบ{item.PackUnit}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <p className="text-center text-muted" style={{ padding: '2rem' }}>ไม่พบรายการพัสดุที่สอดคล้อง</p>
                )}
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
                    <div className="cart-controls" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center' }}>
                      <button type="button" className="ctrl-btn" onClick={() => updateQty(c.id, -1)} aria-label="ลดจำนวน" title="ลดจำนวน"><Minus size={16} /></button>
                      <input 
                        type="number" 
                        className="qty-input" 
                        style={{ width: '50px', textAlign: 'center', border: '1px solid var(--border-light)', borderRadius: '4px', padding: '2px' }} 
                        value={c.quantity} 
                        onChange={(e) => setQty(c.id, e.target.value)}
                        onBlur={(e) => {
                          if (c.quantity === '' || c.quantity < 1) setQty(c.id, 1);
                        }}
                        aria-label="จำนวนพัสดุ"
                      />
                      <button type="button" className="ctrl-btn" onClick={() => updateQty(c.id, 1)} aria-label="เพิ่มจำนวน" title="เพิ่มจำนวน"><Plus size={16} /></button>
                      <span className="text-muted" style={{ fontSize: '0.85rem', marginLeft: '0.5rem', flex: 1 }}>{c.baseUnit}</span>
                      <button type="button" className="ctrl-btn text-danger ml-2" onClick={() => remove(c.id)} aria-label="ลบออกจากตะกร้า" title="ลบออกจากตะกร้า"><Trash2 size={16} /></button>
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
            <div><span className="text-muted">กลุ่มสาระฯ/กลุ่มงาน:</span> <strong>{department}</strong></div>
            <div><span className="text-muted">วันที่:</span> <strong>{new Date().toLocaleDateString('th-TH')}</strong></div>
          </div>

          <div className="table-responsive" style={{ marginBottom: '2rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>ชื่อพัสดุ</th>
                  <th style={{ textAlign: 'center' }}>จำนวน</th>
                  <th>หน่วย</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((c, index) => (
                  <tr key={c.id}>
                    <td>{index + 1}</td>
                    <td>{c.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>{c.quantity}</td>
                    <td>{c.baseUnit}</td>
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
      
      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
