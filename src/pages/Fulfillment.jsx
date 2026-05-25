import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CheckCircle, Clock, Package, Trash2, Undo2, Check } from 'lucide-react';
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
  const [editQty, setEditQty] = useState({});
  const [readyItems, setReadyItems] = useState({}); // { [docId]: boolean }

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await api.getData();
    setRequests(data.requests);
    setInventory(data.inventory);
    try {
      const stf = await api.getStaff();
      setStaffList(stf);
    } catch(e) {}
    if (!silent) setLoading(false);
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

  const toggleReady = (docId) => {
    setReadyItems(prev => {
      const next = {...prev};
      if (next[docId]) {
        delete next[docId];
      } else {
        next[docId] = true;
      }
      return next;
    });
  };

  const handleFulfillReady = async (requestId, items) => {
    if (!fulfillerName.trim()) {
      return toast.error('กรุณาระบุชื่อผู้จ่ายของ');
    }
    
    // กรองเอาเฉพาะชิ้นที่ถูกเลือก "พร้อม"
    const selectedItems = items.filter(it => readyItems[it.docId] && it.itemStatus === 'Pending');
    if (selectedItems.length === 0) {
      return toast.error('กรุณาเลือกพัสดุที่พร้อมจ่ายอย่างน้อย 1 รายการ');
    }

    setProcessing(requestId + '_ready');
    localStorage.setItem('fulfillerName', fulfillerName);
    
    try {
      for (const it of selectedItems) {
        const qtyToFulfill = editQty[it.docId] !== undefined ? editQty[it.docId] : it.Quantity;
        if (qtyToFulfill > 0 && qtyToFulfill <= it.Quantity) {
          await api.fulfillItem(it.docId, fulfillerName, qtyToFulfill);
        }
      }
      toast.success(`จ่ายของสำเร็จ ${selectedItems.length} รายการ`, { duration: 2000 });
      
      // Clear ready items & edit qty for these docs
      setReadyItems(prev => {
        const next = {...prev};
        selectedItems.forEach(it => delete next[it.docId]);
        return next;
      });
      setEditQty(prev => {
        const next = {...prev};
        selectedItems.forEach(it => delete next[it.docId]);
        return next;
      });
      
      loadData(true);
    } catch (e) {
      toast.error('Error: ' + (e.message || e));
      loadData(true);
    }
    setProcessing(null);
  };

  const handleUndoFulfillItem = async (requestId, docId) => {
    if (!window.confirm('คุณต้องการดึงพัสดุชิ้นนี้กลับเข้าคลัง และเปลี่ยนสถานะกลับเป็นรอดำเนินการหรือไม่?')) return;
    setProcessing(docId);
    try {
      await api.undoFulfillItem(docId);
      toast.success('ดึงของกลับเข้าคลังเรียบร้อย', { duration: 2000 });
      loadData(true);
    } catch (e) {
      toast.error('Error: ' + (e.message || e));
    }
    setProcessing(null);
  };

  const handleUndoFulfillAll = async (requestId, items) => {
    if (!window.confirm('คุณต้องการดึงพัสดุทุกชิ้นในคำขอนี้กลับเข้าคลัง และเปลี่ยนสถานะกลับเป็นรอดำเนินการหรือไม่?')) return;
    setProcessing(requestId + '_undo_all');
    try {
      for (const it of items) {
        if (it.itemStatus === 'Fulfilled') {
          await api.undoFulfillItem(it.docId);
        }
      }
      toast.success('ดึงของกลับเข้าคลังทั้งหมดเรียบร้อย', { duration: 2000 });
      loadData(true);
    } catch (e) {
      toast.error('Error: ' + (e.message || e));
      loadData(true);
    }
    setProcessing(null);
  };

  const handleDeleteRequest = async (requestId, isFulfilled) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบรายการเบิกทั้งคำขอนี้? (หากลบ จะไม่ส่งผลต่อจำนวนสต๊อกในคลัง)')) return;
    setRequests(requests.filter(r => r.RequestID !== requestId));
    try {
      await api.deleteRequest(requestId);
      loadData(true);
    } catch (e) {
      alert('Error: ' + e);
      loadData(true);
    }
  };

  // Group requests by RequestID, but we'll split items into pending and fulfilled
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
    const pendingItems = r.items.filter(i => i.itemStatus === 'Pending');
    const fulfilledItems = r.items.filter(i => i.itemStatus !== 'Pending');

    if (pendingItems.length > 0) {
      pendingList.push({ ...r, items: pendingItems });
    }
    if (fulfilledItems.length > 0) {
      fulfilledList.push({ ...r, items: fulfilledItems });
    }
  });

  pendingList.sort((a, b) => a.timestamp - b.timestamp);
  fulfilledList.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fulfillment-page animate-fade-in">
      <h1 className="page-title">รายการขอเบิก (Fulfillment Center)</h1>
      <p className="text-muted mb-4">ระบุจำนวน และกด "พร้อม" ในรายการที่จัดของแล้ว จากนั้นกดปุ่มจ่ายสีฟ้าเพื่อตัดสต๊อก</p>

      {loading ? <p>Loading...</p> : (
        <div className="fulfillment-grid">
          <div className="column pending-column">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2><Clock size={20} className="inline-icon text-warning" /> พัสดุค้างจ่าย ({pendingList.length} คำขอ)</h2>
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
              {pendingList.map(req => {
                const selectedCount = req.items.filter(i => readyItems[i.docId]).length;
                
                return (
                <div key={`pending-${req.id}`} className="req-card glass-panel">
                  <div className="req-header">
                    <div>
                      <div className="req-id">{req.id}</div>
                      <div className="req-user">ผู้เบิก: {req.requester} <span className="text-muted text-sm">({req.department})</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button className="btn-ghost text-danger" onClick={() => handleDeleteRequest(req.id, false)} style={{ padding: '0.25rem', marginBottom: '0.5rem' }} title="ลบคำขอนี้">
                        <Trash2 size={18} />
                      </button>
                      <div className="req-date">{req.date}</div>
                    </div>
                  </div>
                  
                  <div className="req-body">
                    <div className="text-sm font-medium text-warning mb-2 px-1">
                      รอจัดของค้าง {req.items.length} รายการ
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
                      {req.items.map((it, idx) => {
                        const isReady = readyItems[it.docId];
                        return (
                          <div key={it.docId} style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            padding: '0.75rem 1rem', 
                            borderBottom: idx !== req.items.length - 1 ? '1px solid var(--gray-100)' : 'none',
                            backgroundColor: isReady ? 'var(--primary-light)' : 'transparent',
                            transition: 'background-color 0.2s'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                              <Package size={16} className={isReady ? "text-primary" : "text-muted"} style={{ flexShrink: 0 }} />
                              <span className={`font-medium truncate ${isReady ? 'text-primary' : ''}`} title={it.name}>{it.name}</span>
                            </div>
                            <div style={{ marginLeft: '1rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className="text-sm text-muted">จ่าย:</span>
                              <input 
                                type="number" 
                                min="1" 
                                max={it.Quantity}
                                value={editQty[it.docId] !== undefined ? editQty[it.docId] : it.Quantity}
                                onChange={(e) => {
                                  let val = parseInt(e.target.value);
                                  if (isNaN(val)) val = 1;
                                  if (val > it.Quantity) val = it.Quantity;
                                  setEditQty({...editQty, [it.docId]: val});
                                }}
                                disabled={isReady}
                                style={{ width: '50px', padding: '0.2rem', textAlign: 'center', border: '1px solid var(--border-light)', borderRadius: '4px', backgroundColor: isReady ? 'transparent' : 'white' }}
                              />
                              <span className="text-sm text-muted whitespace-nowrap">/ {it.Quantity}</span>
                              
                              <button 
                                className={`btn btn-sm ml-2 ${isReady ? 'btn-primary' : 'btn-outline'}`}
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', width: '70px' }}
                                onClick={() => toggleReady(it.docId)}
                              >
                                {isReady ? <><Check size={14} className="inline mr-1" /> พร้อม</> : 'พร้อม'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div className="req-footer mt-4">
                    <button 
                      className="btn btn-primary w-full shadow-sm"
                      onClick={() => handleFulfillReady(req.id, req.items)}
                      disabled={processing === req.id + '_ready' || selectedCount === 0}
                      style={{ height: '44px' }}
                    >
                      <CheckCircle size={18} /> 
                      {processing === req.id + '_ready' 
                        ? 'กำลังดำเนินการ...' 
                        : selectedCount > 0 
                          ? `จ่ายเฉพาะพัสดุที่พร้อม (${selectedCount} รายการ)` 
                          : 'กรุณากด "พร้อม" เพื่อจัดของ'
                      }
                    </button>
                  </div>
                </div>
              )})}
              {pendingList.length === 0 && <div className="text-center py-8 opacity-50"><CheckCircle size={48} className="mx-auto mb-4" /><p>ไม่มีรายการค้างจ่าย</p></div>}
            </div>
          </div>

          <div className="column fulfilled-column">
            <h2><CheckCircle size={20} className="inline-icon text-secondary" /> จ่ายครบแล้วล่าสุด</h2>
            <div className="request-list">
              {fulfilledList.slice(0, 50).map(req => {
                const allCompleted = req.items.every(i => i.itemStatus === 'Completed');
                return (
                  <div key={`fulfilled-${req.id}`} className={`req-card card ${allCompleted ? 'opacity-75' : ''}`}>
                    <div className="req-header" style={{ alignItems: 'flex-start' }}>
                      <div>
                        <div className="req-user font-medium">{req.requester}</div>
                        <div className="text-muted text-sm">{req.department}</div>
                        <div className={`mt-1 text-xs inline-block px-2 py-1 rounded-full ${allCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {allCompleted ? 'รับของไปแล้ว' : 'จ่ายของแล้ว (รอผู้เบิกมารับ)'}
                        </div>
                      </div>
                      <button className="btn-ghost text-danger" onClick={() => handleDeleteRequest(req.id, true)} style={{ padding: '0.25rem' }} title="ลบคำขอนี้">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="req-body mt-3">
                      {req.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.9rem' }}>
                          <span className="truncate flex-1 pr-2 text-muted">{it.name} <span className="font-medium text-primary ml-1">(x{it.Quantity})</span></span>
                          {it.itemStatus === 'Fulfilled' && (
                            <button 
                              className="text-warning hover:underline text-xs" 
                              onClick={() => handleUndoFulfillItem(req.id, it.docId)} 
                              disabled={processing === it.docId}
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
                    {!allCompleted && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                        <button 
                          className="btn btn-outline btn-sm text-warning w-full"
                          onClick={() => handleUndoFulfillAll(req.id, req.items)}
                          disabled={processing === req.id + '_undo_all'}
                          style={{ fontSize: '0.85rem' }}
                        >
                          <Undo2 size={14} className="mr-1 inline-block" /> ยกเลิกรายการจ่ายชุดนี้
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {fulfilledList.length === 0 && <p className="text-muted text-center py-8">ยังไม่มีประวัติการจ่าย</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
