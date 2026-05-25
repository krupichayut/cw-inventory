import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CheckCircle, Clock, Package, Trash2, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTimeThai } from '../utils/format';
import './Fulfillment.css';

export default function Fulfillment() {
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [fulfillerName, setFulfillerName] = useState('');
  const [staffList, setStaffList] = useState([]);

  const loadData = async () => {
    setLoading(true);
    const data = await api.getData();
    setRequests(data.requests);
    setInventory(data.inventory);
    try {
      const stf = await api.getStaff();
      setStaffList(stf);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => { 
    loadData(); 
    let defaultName = '';
    const adminUserStr = localStorage.getItem('adminUser');
    if (adminUserStr) {
      try {
        defaultName = JSON.parse(adminUserStr).Name;
      } catch(e){}
    }
    if (!defaultName) defaultName = localStorage.getItem('fulfillerName') || '';
    setFulfillerName(defaultName);
  }, []);

  const handleFulfillItem = async (requestId, itemId) => {
    if (!fulfillerName.trim()) {
      return toast.error('กรุณาระบุชื่อผู้จ่ายของ');
    }
    setProcessing(requestId + itemId);
    localStorage.setItem('fulfillerName', fulfillerName);
    try {
      await api.fulfillItem(requestId, itemId, fulfillerName);
      toast.success('จ่ายของเรียบร้อย', { duration: 2000 });
      loadData();
    } catch (e) {
      toast.error('Error: ' + (e.message || e));
    }
    setProcessing(null);
  };

  const handleUndoFulfillItem = async (requestId, itemId) => {
    if (!window.confirm('คุณต้องการดึงพัสดุชิ้นนี้กลับเข้าคลัง และเปลี่ยนสถานะกลับเป็นรอดำเนินการหรือไม่?')) return;
    setProcessing(requestId + itemId);
    try {
      await api.undoFulfillItem(requestId, itemId);
      toast.success('ดึงของกลับเข้าคลังเรียบร้อย', { duration: 2000 });
      loadData();
    } catch (e) {
      toast.error('Error: ' + (e.message || e));
    }
    setProcessing(null);
  };

  const handleFulfillAll = async (requestId, items) => {
    if (!fulfillerName.trim()) {
      return toast.error('กรุณาระบุชื่อผู้จ่ายของ');
    }
    setProcessing(requestId + '_all');
    localStorage.setItem('fulfillerName', fulfillerName);
    try {
      for (const it of items) {
        if (it.itemStatus === 'Pending') {
          await api.fulfillItem(requestId, it.ItemID, fulfillerName);
        }
      }
      toast.success('จ่ายของครบทุกรายการ', { duration: 2000 });
      loadData();
    } catch (e) {
      toast.error('Error: ' + (e.message || e));
      loadData();
    }
    setProcessing(null);
  };

  const handleDeleteRequest = async (requestId, isFulfilled) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบรายการเบิกทั้งคำขอนี้?' + (isFulfilled ? '\n\n(คำเตือน: การลบรายการนี้จะไม่ส่งผลต่อจำนวนสต๊อกในคลัง หากพบข้อผิดพลาด กรุณาไปกดยกเลิกรายชิ้นเพื่อคืนสต๊อกก่อนลบ)' : ''))) return;
    
    setRequests(requests.filter(r => r.RequestID !== requestId));
    try {
      await api.deleteRequest(requestId);
      loadData();
    } catch (e) {
      alert('Error: ' + e);
      loadData();
    }
  };

  const grouped = requests.reduce((acc, req) => {
    if (!acc[req.RequestID]) {
      acc[req.RequestID] = {
        id: req.RequestID,
        date: formatDateTimeThai(req.Date),
        timestamp: new Date(req.Date).getTime(),
        requester: req.Requester,
        department: req.Department || '-',
        items: []
      };
    }
    const invItem = inventory.find(i => i.ID === req.ItemID);
    acc[req.RequestID].items.push({
      ...req,
      name: invItem ? invItem.Name : req.ItemID,
      image: invItem ? invItem.ImageURL : null,
      itemStatus: req.Status
    });
    return acc;
  }, {});

  const pendingList = [];
  const fulfilledList = [];

  Object.values(grouped).forEach(r => {
    const hasPending = r.items.some(i => i.itemStatus === 'Pending');
    if (hasPending) {
      pendingList.push(r);
    } else {
      fulfilledList.push(r);
    }
  });

  pendingList.sort((a, b) => a.timestamp - b.timestamp);
  fulfilledList.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fulfillment-page animate-fade-in">
      <h1 className="page-title">รายการขอเบิก (Fulfillment Center)</h1>
      <p className="text-muted mb-4">สามารถเลือกจ่ายพัสดุทีละรายการ หรือกดจ่ายทั้งหมดในคำขอเดียวก็ได้</p>

      {loading ? <p>Loading...</p> : (
        <div className="fulfillment-grid">
          <div className="column pending-column">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2><Clock size={20} className="inline-icon text-warning" /> รอจัดของ ({pendingList.length})</h2>
              <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ margin: 0, whiteSpace: 'nowrap' }}>ผู้จ่ายของ:</label>
                <select 
                  value={fulfillerName} 
                  onChange={e => setFulfillerName(e.target.value)} 
                  style={{ padding: '0.4rem', width: '160px', borderRadius: '4px', border: '1px solid var(--border-light)' }}
                >
                  <option value="">-- เลือกเจ้าหน้าที่ --</option>
                  {staffList.map(s => <option key={s.ID} value={s.Name}>{s.Name}</option>)}
                  {!staffList.find(s => s.Name === fulfillerName) && fulfillerName && (
                    <option value={fulfillerName}>{fulfillerName}</option>
                  )}
                </select>
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
                    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
                      {req.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: idx !== req.items.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                            <Package size={16} className="text-muted flex-shrink-0" />
                            <span className="font-medium truncate" title={it.name}>{it.name}</span>
                            <span className="text-primary font-bold whitespace-nowrap">x {it.Quantity}</span>
                          </div>
                          <div style={{ marginLeft: '1rem', flexShrink: 0 }}>
                            {it.itemStatus === 'Pending' ? (
                              <button 
                                className="btn btn-secondary btn-sm" 
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                                onClick={() => handleFulfillItem(req.id, it.ItemID)} 
                                disabled={processing === req.id + it.ItemID}
                              >
                                {processing === req.id + it.ItemID ? 'กำลังจ่าย...' : 'จ่าย'}
                              </button>
                            ) : it.itemStatus === 'Fulfilled' ? (
                              <button 
                                className="btn btn-outline btn-sm text-warning" 
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                                onClick={() => handleUndoFulfillItem(req.id, it.ItemID)} 
                                disabled={processing === req.id + it.ItemID}
                              >
                                <Undo2 size={14} className="mr-1 inline-block"/> ยกเลิก
                              </button>
                            ) : (
                              <span className="badge-success text-xs px-2 py-1">รับของแล้ว</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="req-footer mt-4">
                    <button 
                      className="btn btn-primary w-full"
                      onClick={() => handleFulfillAll(req.id, req.items)}
                      disabled={processing === req.id + '_all'}
                    >
                      <CheckCircle size={18} /> {processing === req.id + '_all' ? 'กำลังดำเนินการ...' : 'จ่ายทั้งหมดในคำขอนี้'}
                    </button>
                  </div>
                </div>
              ))}
              {pendingList.length === 0 && <p className="text-muted text-center py-8">ไม่มีรายการรอจัดของ</p>}
            </div>
          </div>

          <div className="column fulfilled-column">
            <h2><CheckCircle size={20} className="inline-icon text-secondary" /> จ่ายครบแล้วล่าสุด</h2>
            <div className="request-list">
              {fulfilledList.slice(0, 50).map(req => {
                const allCompleted = req.items.every(i => i.itemStatus === 'Completed');
                return (
                  <div key={req.id} className={`req-card card ${allCompleted ? 'opacity-75' : ''}`}>
                    <div className="req-header" style={{ alignItems: 'flex-start' }}>
                      <div>
                        <div className="req-user font-medium">{req.requester}</div>
                        <div className="text-muted text-sm">{req.department}</div>
                        <div className={`mt-1 text-xs inline-block px-2 py-1 rounded-full ${allCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {allCompleted ? 'รับของไปแล้ว' : 'จ่ายครบแล้ว (รอผู้เบิกมารับ)'}
                        </div>
                      </div>
                      <button className="btn-ghost text-danger" onClick={() => handleDeleteRequest(req.id, true)} style={{ padding: '0.25rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="req-body mt-3">
                      {req.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.9rem' }}>
                          <span className="truncate flex-1 pr-2 text-muted">{it.name} <span className="font-medium">(x{it.Quantity})</span></span>
                          {it.itemStatus === 'Fulfilled' && (
                            <button 
                              className="text-warning hover:underline text-xs" 
                              onClick={() => handleUndoFulfillItem(req.id, it.ItemID)} 
                              disabled={processing === req.id + it.ItemID}
                            >
                              ยกเลิก
                            </button>
                          )}
                          {it.itemStatus === 'Completed' && (
                            <span className="text-success text-xs whitespace-nowrap"><CheckCircle size={12} className="inline-icon"/> รับแล้ว</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
