import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CheckCircle, Search, Trash2, Undo2, ArrowLeft, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTimeThai, parseCustomDate } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import '../pages/Fulfillment.css'; 

export default function FulfilledRequests() {
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getData();
      setRequests(data.requests || []);
      setInventory(data.inventory || []);
      setDepartments(data.departments || []);
    } catch (e) {
      console.error(e);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบรายการเบิกทั้งคำขอนี้? (หากลบ จะไม่ส่งผลต่อจำนวนสต๊อกในคลัง)')) return;
    setRequests(requests.filter(r => r.RequestID !== requestId));
    try {
      await api.deleteRequest(requestId);
      loadData(true);
    } catch (e) {
      toast.error('Error: ' + e);
      loadData(true);
    }
  };

  // Group requests by RequestID
  const grouped = requests.reduce((acc, req) => {
    if (!acc[req.RequestID]) {
      acc[req.RequestID] = {
        id: req.RequestID,
        date: formatDateTimeThai(req.Date),
        timestamp: parseCustomDate(req.Date).getTime(),
        requester: req.Requester,
        department: req.Department || '-',
        items: []
      };
    }
    const invItem = inventory.find(i => i.ID === req.ItemID);
    acc[req.RequestID].items.push({
      ...req,
      name: invItem ? invItem.Name : req.ItemID,
      itemStatus: req.Status
    });
    return acc;
  }, {});

  // Filter requests that are fulfilled or completed
  const fulfilledList = Object.values(grouped).filter(r => {
    const hasPending = r.items.some(i => i.itemStatus === 'Pending');
    const isFulfilled = r.items.some(i => i.itemStatus === 'Fulfilled' || i.itemStatus === 'Completed');
    return !hasPending && isFulfilled;
  });

  // Sort by date descending
  fulfilledList.sort((a, b) => b.timestamp - a.timestamp);

  // Filter by search and department
  const filteredList = fulfilledList.filter(req => {
    const matchSearch = req.requester.toLowerCase().includes(search.toLowerCase()) || 
      req.id.toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept || req.department === filterDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="fulfillment-page animate-fade-in" style={{ padding: '2rem 3rem 4rem 3rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}><FileCheck className="inline-icon" style={{ verticalAlign: 'middle', marginRight: '8px' }} /> รายการจ่ายพัสดุสำเร็จแล้ว</h1>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/fulfillment')} style={{ border: '1px solid var(--border-light)' }}>
          <ArrowLeft size={18} /> กลับหน้าควบคุมการจ่าย
        </button>
      </div>

      <div className="history-filters" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ marginBottom: 0, flex: 1, minWidth: '250px' }}>
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อผู้เบิก หรือรหัสใบเบิก..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', minHeight: '44px', background: 'white' }}>
            <option value="">ทุกฝ่ายงาน/กลุ่มสาระฯ</option>
            {departments.map(d => <option key={d.ID} value={d.Name}>{d.Name}</option>)}
          </select>
        </div>
      </div>

      {loading ? <p>กำลังโหลดข้อมูล...</p> : (
        <div className="request-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredList.map(req => {
            const allCompleted = req.items.every(i => i.itemStatus === 'Completed');
            return (
              <div key={req.id} className="req-card glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem' }}>
                <div className="req-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div className="req-id">{req.id}</div>
                    <div className="req-user" style={{ fontSize: '1.05rem', fontWeight: '600', marginTop: '0.25rem' }}>ผู้เบิก: {req.requester}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ฝ่ายงาน: {req.department}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button className="btn-ghost text-danger" onClick={() => handleDeleteRequest(req.id)} style={{ padding: '0.25rem' }} title="ลบคำขอนี้">
                      <Trash2 size={16} />
                    </button>
                    <div className="req-date" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{req.date}</div>
                  </div>
                </div>

                <div className="req-body" style={{ flex: 1 }}>
                  {req.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', fontSize: '0.9rem', borderBottom: idx !== req.items.length - 1 ? '1px dashed var(--border-light)' : 'none' }}>
                      <span className="truncate flex-1 pr-2" style={{ color: 'var(--text-main)' }}>{it.name} <span className="font-semibold text-primary" style={{ marginLeft: '0.25rem' }}>(x{it.Quantity})</span></span>
                      {it.itemStatus === 'Fulfilled' && (
                        <button 
                          className="btn-ghost text-warning" 
                          onClick={() => handleUndoFulfillItem(req.id, it.docId)} 
                          disabled={processing === it.docId}
                          style={{ padding: '2px 8px', fontSize: '0.75rem', border: '1px solid var(--warning)', borderRadius: '4px', minHeight: '24px' }}
                        >
                          ยกเลิกจ่าย
                        </button>
                      )}
                      {it.itemStatus === 'Completed' && (
                        <span style={{ color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ รับของแล้ว</span>
                      )}
                    </div>
                  ))}
                </div>

                {!allCompleted && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <button 
                      className="btn btn-outline w-full text-warning"
                      onClick={() => handleUndoFulfillAll(req.id, req.items)}
                      disabled={processing === req.id + '_undo_all'}
                      style={{ fontSize: '0.85rem', border: '1px solid var(--warning)', minHeight: '36px', width: '100%' }}
                    >
                      <Undo2 size={14} className="mr-1 inline-block" /> ดึงกลับเข้าคลังทั้งหมด
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filteredList.length === 0 && (
            <div className="glass-panel text-center py-12" style={{ gridColumn: '1 / -1', padding: '3rem' }}>
              <CheckCircle size={48} className="text-muted mx-auto mb-4" style={{ opacity: 0.5 }} />
              <p className="text-muted">ไม่พบข้อมูลใบเบิกที่จ่ายสำเร็จตามเงื่อนไขค้นหา</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
