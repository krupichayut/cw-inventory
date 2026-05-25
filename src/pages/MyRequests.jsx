import { useState, useEffect } from 'react';
import { api, getDirectImageUrl } from '../utils/api';
import { formatDateTimeThai, parseCustomDate } from '../utils/format';
import { Search, Clock, CheckCircle, Package, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './MyRequests.css';

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [activeName, setActiveName] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const savedName = localStorage.getItem('requesterName') || '';
    setSearchName(savedName);
    if (savedName) {
      loadData(savedName);
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (nameToSearch) => {
    setLoading(true);
    setActiveName(nameToSearch);
    try {
      const data = await api.getData();
      setInventory(data.inventory || []);
      
      const myReqs = (data.requests || []).filter(req => {
        if (!req.Requester) return false;
        const normDb = req.Requester.trim().toLowerCase().replace(/\s+/g, ' ');
        const normSearch = nameToSearch.trim().toLowerCase().replace(/\s+/g, ' ');
        return normDb === normSearch;
      });
      
      setRequests(myReqs);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchName.trim()) {
      loadData(searchName);
    }
  };

  const handleConfirmReceipt = async (requestId) => {
    if (!window.confirm('ยืนยันว่าคุณได้รับพัสดุครบถ้วนตามรายการที่จัดเตรียมไว้แล้วใช่หรือไม่?')) return;
    try {
      await api.confirmReceipt(requestId);
      loadData(activeName);
    } catch (e) {
      alert('Error: ' + e);
    }
  };

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
      image: invItem ? getDirectImageUrl(invItem.ImageURL) : null,
      baseUnit: invItem ? invItem.BaseUnit : 'ชิ้น',
      itemStatus: req.Status
    });
    return acc;
  }, {});

  const requestList = Object.values(grouped).map(req => {
    const hasPending = req.items.some(i => i.itemStatus === 'Pending');
    const hasFulfilled = req.items.some(i => i.itemStatus === 'Fulfilled');
    const allCompleted = req.items.every(i => i.itemStatus === 'Completed');
    
    let overallStatus = 'Pending';
    if (allCompleted) overallStatus = 'Completed';
    else if (!hasPending && hasFulfilled) overallStatus = 'Fulfilled';
    else if (hasPending && hasFulfilled) overallStatus = 'Partial';
    
    return { ...req, overallStatus, hasFulfilled, allCompleted };
  }).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="my-requests-page animate-fade-in pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">ติดตามสถานะคำขอ</h1>
        <button className="btn btn-outline" onClick={() => navigate('/requester')} style={{ padding: '0.4rem 0.8rem' }}>
          <ArrowLeft size={16} className="mr-1" /> กลับไปเบิกพัสดุ
        </button>
      </div>

      <div className="glass-panel p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="search-bar flex-1" style={{ margin: 0 }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="กรอกชื่อผู้เบิกของคุณเพื่อค้นหา..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </form>
        <p className="text-xs text-muted mt-2 ml-1">
          * ระบบจะค้นหาจากชื่อที่คุณใช้กรอกตอนกดส่งคำขอเบิกพัสดุ
        </p>
      </div>

      {!activeName ? (
        <div className="empty-state">
          <Search size={48} className="text-muted mb-4 opacity-50" />
          <h3>กรุณากรอกชื่อของคุณเพื่อดูประวัติ</h3>
        </div>
      ) : loading ? (
        <div className="flex justify-center p-8">
          <div className="spinner"></div>
        </div>
      ) : requestList.length === 0 ? (
        <div className="empty-state">
          <Package size={48} className="text-muted mb-4 opacity-50" />
          <h3>ไม่พบประวัติการเบิกพัสดุของ "{activeName}"</h3>
          <p className="text-muted mt-2">อาจจะพิมพ์ชื่อผิด หรือยังไม่เคยทำรายการ</p>
        </div>
      ) : (
        <div className="request-timeline">
          {requestList.map(req => (
            <div key={req.id} className={`request-card ${req.allCompleted ? 'border-l-4 border-green-500 opacity-80' : req.overallStatus === 'Pending' ? 'status-pending' : 'border-l-4 border-blue-500'}`}>
              <div className="request-header flex justify-between items-start">
                <div>
                  <h3 className="req-id">{req.id}</h3>
                  <p className="req-date text-sm text-muted">{req.date}</p>
                </div>
                <div className={`status-badge ${req.allCompleted ? 'bg-green-100 text-green-800' : req.overallStatus === 'Pending' ? 'badge-warning' : 'bg-blue-100 text-blue-800'}`}>
                  {req.allCompleted ? (
                    <><CheckCircle size={16} /> รับของแล้ว</>
                  ) : req.overallStatus === 'Pending' ? (
                    <><Clock size={16} /> รอดำเนินการ</>
                  ) : req.overallStatus === 'Partial' ? (
                    <><Clock size={16} /> จ่ายบางส่วน</>
                  ) : (
                    <><CheckCircle size={16} /> จ่ายครบแล้ว</>
                  )}
                </div>
              </div>

              {req.allCompleted ? (
                 <div className="status-message bg-green-50 text-green-800 p-3 rounded-md mt-4">
                  คุณได้รับพัสดุรายการนี้เรียบร้อยแล้ว ขอบคุณครับ
                </div>
              ) : req.hasFulfilled ? (
                <div className="status-message bg-blue-50 text-blue-800 p-3 rounded-md mt-4">
                  <strong>พัสดุจัดเตรียมไว้แล้ว!</strong> กรุณาเข้ามารับของที่ฝ่ายพัสดุ
                </div>
              ) : (
                <div className="status-message message-pending">
                  รอฝ่ายพัสดุจัดเตรียมและจ่ายของ
                </div>
              )}

              <div className="request-items mt-4">
                <h4 className="text-sm font-semibold mb-2">รายการที่เบิก:</h4>
                <ul className="item-list">
                  {req.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="item-thumb" />
                        ) : (
                          <div className="item-thumb-placeholder"><Package size={16} /></div>
                        )}
                        <span className="item-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="item-qty font-medium" style={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}>
                          {item.Quantity} {item.baseUnit}
                        </div>
                        <div className="text-xs mt-1">
                          {item.itemStatus === 'Pending' && <span className="text-warning">รอจัดของ</span>}
                          {item.itemStatus === 'Fulfilled' && <span className="text-blue-600 font-medium">รอรับของ</span>}
                          {item.itemStatus === 'Completed' && <span className="text-success">รับแล้ว</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {req.hasFulfilled && !req.allCompleted && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button 
                    className="btn btn-primary w-full" 
                    onClick={() => handleConfirmReceipt(req.id)}
                  >
                    <CheckCircle size={18} /> ยืนยันว่ารับของแล้วครบถ้วน
                  </button>
                  <p className="text-xs text-center text-muted mt-2">
                    * กดปุ่มนี้เมื่อคุณได้รับพัสดุจากเจ้าหน้าที่เรียบร้อยแล้ว
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
