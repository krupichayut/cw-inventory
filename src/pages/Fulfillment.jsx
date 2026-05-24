import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CheckCircle, Clock, Package, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './Fulfillment.css';

export default function Fulfillment() {
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [fulfillerName, setFulfillerName] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await api.getData();
    setRequests(data.requests);
    setInventory(data.inventory);
    setLoading(false);
  };

  useEffect(() => { 
    loadData(); 
    const savedName = localStorage.getItem('fulfillerName');
    if (savedName) setFulfillerName(savedName);
  }, []);

  const handleFulfill = async (requestId) => {
    if (!fulfillerName.trim()) {
      return toast.error('กรุณาระบุชื่อผู้จ่ายของก่อนทำการจ่ายของ');
    }
    setProcessing(requestId);
    localStorage.setItem('fulfillerName', fulfillerName);
    try {
      await api.fulfillRequest(requestId, fulfillerName);
      toast.success('จ่ายของและตัดสต๊อกเรียบร้อย', { duration: 3000 });
      loadData();
    } catch (e) {
      toast.error('Error: ' + e);
    }
    setProcessing(null);
  };

  const handleDeleteRequest = async (requestId, isFulfilled) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบรายการเบิกนี้?' + (isFulfilled ? '\n\n(คำเตือน: การลบรายการนี้จะไม่ส่งผลต่อจำนวนสต๊อกในคลัง หากพบข้อผิดพลาด กรุณาไปแก้ไขสต๊อกเองที่เมนูคลังพัสดุ)' : ''))) return;
    
    // Optimistic Update
    setRequests(requests.filter(r => r.RequestID !== requestId));
    
    try {
      await api.deleteRequest(requestId);
      loadData();
    } catch (e) {
      alert('Error: ' + e);
      loadData();
    }
  };

  // Group requests by RequestID
  const grouped = requests.reduce((acc, req) => {
    if (!acc[req.RequestID]) {
      acc[req.RequestID] = {
        id: req.RequestID,
        date: new Date(req.Date).toLocaleString('th-TH'),
        requester: req.Requester,
        department: req.Department || '-',
        status: req.Status,
        items: []
      };
    }
    const invItem = inventory.find(i => i.ID === req.ItemID);
    acc[req.RequestID].items.push({
      ...req,
      name: invItem ? invItem.Name : req.ItemID,
      image: invItem ? invItem.ImageURL : null
    });
    return acc;
  }, {});

  const pendingList = Object.values(grouped).filter(r => r.status === 'Pending');
  const fulfilledList = Object.values(grouped).filter(r => r.status === 'Fulfilled');

  return (
    <div className="fulfillment-page animate-fade-in">
      <h1 className="page-title">รายการขอเบิก (Fulfillment Center)</h1>
      <p className="text-muted mb-4">เมื่อคุณจัดของเตรียมจ่ายเสร็จแล้ว ให้กด "จ่ายของ (Deduct)" เพื่อตัดสต๊อกออกจากระบบ</p>

      {loading ? <p>Loading...</p> : (
        <div className="fulfillment-grid">
          <div className="column pending-column">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2><Clock size={20} className="inline-icon text-warning" /> รอจัดของ ({pendingList.length})</h2>
              <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ margin: 0, whiteSpace: 'nowrap' }}>ผู้จ่ายของ:</label>
                <input 
                  type="text" 
                  value={fulfillerName} 
                  onChange={e => setFulfillerName(e.target.value)} 
                  placeholder="ชื่อผู้ดำเนินการ"
                  style={{ padding: '0.4rem', width: '150px' }}
                />
              </div>
            </div>
            <div className="request-list">
              {pendingList.map(req => (
                <div key={req.id} className="req-card glass-panel">
                  <div className="req-header">
                    <div>
                      <div className="req-id">{req.id}</div>
                      <div className="req-user">ผู้เบิก: {req.requester} <span className="text-muted text-sm">({req.department})</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button className="btn-ghost text-danger" onClick={() => handleDeleteRequest(req.id, false)} style={{ padding: '0.25rem', marginBottom: '0.5rem' }}>
                        <Trash2 size={18} />
                      </button>
                      <div className="req-date">{req.date}</div>
                    </div>
                  </div>
                  <div className="req-body">
                    {req.items.map((it, idx) => (
                      <div key={idx} className="req-item-line">
                        <Package size={16} className="text-muted" />
                        <span className="flex-1">{it.name}</span>
                        <span className="font-medium text-primary">x {it.Quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="req-footer">
                    <button 
                      className="btn btn-secondary w-full"
                      onClick={() => handleFulfill(req.id)}
                      disabled={processing === req.id}
                    >
                      <CheckCircle size={18} /> {processing === req.id ? 'กำลังดำเนินการ...' : 'จ่ายของ (Deduct)'}
                    </button>
                  </div>
                </div>
              ))}
              {pendingList.length === 0 && <p className="text-muted">ไม่มีรายการรอจัดของ</p>}
            </div>
          </div>

          <div className="column fulfilled-column">
            <h2><CheckCircle size={20} className="inline-icon text-secondary" /> จ่ายแล้วล่าสุด</h2>
            <div className="request-list opacity-75">
              {fulfilledList.slice().reverse().slice(0, 50).map(req => (
                <div key={req.id} className="req-card card">
                  <div className="req-header" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div className="req-user">{req.requester} <span className="text-muted text-sm">({req.department})</span></div>
                      <div className="badge-success mt-1">จ่ายแล้ว</div>
                    </div>
                    <button className="btn-ghost text-danger" onClick={() => handleDeleteRequest(req.id, true)} style={{ padding: '0.25rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="req-body text-sm text-muted">
                    {req.items.map((it, idx) => (
                      <div key={idx}>{it.name} (x{it.Quantity})</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
