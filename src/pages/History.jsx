import { useState, useEffect } from 'react';
import { api, getDirectImageUrl } from '../utils/api';
import { Trash2, History as HistoryIcon, Search, Image as ImageIcon, Printer, Filter, Calendar } from 'lucide-react';
import { formatDateTimeThai } from '../utils/format';
import toast from 'react-hot-toast';
import './History.css';

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [inventoryMap, setInventoryMap] = useState({});
  const [requestsMap, setRequestsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterType, setFilterType] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getData();
      
      const invMap = {};
      (data.inventory || []).forEach(i => invMap[i.ID] = i.Name);
      setInventoryMap(invMap);
      
      const reqMap = {};
      (data.requests || []).forEach(r => reqMap[r.RequestID] = r.Requester);
      setRequestsMap(reqMap);
      
      const sortedTx = (data.transactions || []).sort((a, b) => new Date(b.Date) - new Date(a.Date));
      setTransactions(sortedTx);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (txId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบประวัตินี้?\n(คำเตือน: การลบประวัติจะไม่ส่งผลต่อจำนวนสต๊อกปัจจุบัน หากต้องการแก้สต๊อกให้ไปที่หน้าคลังพัสดุ)')) return;
    
    // Optimistic Update
    setTransactions(transactions.filter(t => t.TxID !== txId));
    
    try {
      await api.deleteTransaction(txId);
      toast.success('ลบประวัติสำเร็จ');
    } catch (e) {
      toast.error('Error: ' + e);
      loadData();
    }
  };

  const getTxColor = (type) => {
    if (type === 'In') return 'var(--secondary)';
    if (type === 'Out') return 'var(--warning)';
    return 'var(--text-muted)';
  };

  const getTxText = (type) => {
    if (type === 'In') return 'รับเข้าพัสดุ';
    if (type === 'Out') return 'เบิกจ่าย';
    return 'ปรับลดยอด';
  };

  const filteredTx = transactions.filter(tx => {
    const name = inventoryMap[tx.ItemID] || tx.ItemID || '';
    const matchSearch = String(name).toLowerCase().includes(search.toLowerCase()) || 
           String(tx.TxID || '').toLowerCase().includes(search.toLowerCase()) ||
           String(tx.FulfillerName || '').toLowerCase().includes(search.toLowerCase()) ||
           String(tx.RestockerName || '').toLowerCase().includes(search.toLowerCase());
           
    let matchMonth = true;
    if (filterMonth) {
       let txMonth = '';
       if (tx.Date && typeof tx.Date === 'string') {
         if (tx.Date.includes('/')) {
           const parts = tx.Date.split(' ')[0].split('/');
           if (parts.length >= 3) {
             const m = parts[1].padStart(2, '0');
             const y = parts[2];
             txMonth = `${y}-${m}`;
           }
         } else {
           txMonth = tx.Date.substring(0, 7);
         }
       }
       matchMonth = txMonth === filterMonth;
    }
    
    let matchType = true;
    if (filterType !== 'All') {
       if (filterType === 'Adjust') {
         matchType = tx.Type !== 'In' && tx.Type !== 'Out';
       } else {
         matchType = tx.Type === filterType;
       }
    }
    
    return matchSearch && matchMonth && matchType;
  });

  const formatMonthThai = (yyyyMM) => {
    if (!yyyyMM) return '';
    const [year, month] = yyyMM.split('-');
    const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    return `${thaiMonths[parseInt(month) - 1]} ${parseInt(year) + 543}`;
  };

  return (
    <div className="history-page animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="print-only-header">
        <h2>รายงานประวัติการทำรายการ</h2>
        {filterMonth && <p>ประจำเดือน {formatMonthThai(filterMonth)}</p>}
        {filterType !== 'All' && <p>ประเภทรายการ: {filterType === 'In' ? 'รับเข้าพัสดุ' : filterType === 'Out' ? 'เบิกจ่าย' : 'ปรับลดยอด'}</p>}
      </div>

      <div className="page-header no-print">
        <h1 className="page-title"><HistoryIcon className="inline-icon" /> ประวัติทำรายการทั้งหมด</h1>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={18} /> พิมพ์รายงาน
        </button>
      </div>

      <div className="history-filters no-print">
        <div className="search-bar" style={{ marginBottom: 0, flex: 1 }}>
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อพัสดุ รหัส หรือชื่อผู้ดำเนินการ..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Calendar size={18} className="text-muted" />
          <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
        </div>
        <div className="filter-group">
          <Filter size={18} className="text-muted" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="All">ทุกประเภท</option>
            <option value="In">เฉพาะรับเข้าพัสดุ</option>
            <option value="Out">เฉพาะเบิกจ่าย</option>
            <option value="Adjust">เฉพาะปรับลดยอด</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">กำลังโหลดข้อมูล...</div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>วัน/เวลา</th>
                <th>ประเภท</th>
                <th>พัสดุ</th>
                <th style={{ textAlign: 'center' }}>จำนวน</th>
                <th>ผู้ดำเนินการ</th>
                <th style={{ textAlign: 'center' }}>ใบเสร็จ</th>
                <th style={{ textAlign: 'center' }}>ลบ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.TxID}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateTimeThai(tx.Date)}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold',
                      color: getTxColor(tx.Type), background: `rgba(0,0,0,0.05)`
                    }}>
                      {getTxText(tx.Type)}
                    </span>
                  </td>
                  <td>{inventoryMap[tx.ItemID] || tx.ItemID}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: getTxColor(tx.Type) }}>
                    {tx.Type === 'Out' ? '-' : '+'}{tx.Quantity}
                  </td>
                  <td>
                    {tx.RestockerName && <div style={{ fontSize: '0.85rem' }}>ผู้รับเข้า: {tx.RestockerName}</div>}
                    {(tx.RequesterName || requestsMap[tx.RefReqID]) && <div style={{ fontSize: '0.85rem' }}>ผู้เบิก: {tx.RequesterName || requestsMap[tx.RefReqID]}</div>}
                    {tx.FulfillerName && <div style={{ fontSize: '0.85rem' }}>ผู้จ่าย: {tx.FulfillerName}</div>}
                    {!tx.RestockerName && !tx.FulfillerName && !tx.RequesterName && !requestsMap[tx.RefReqID] && '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {tx.ReceiptURL ? (
                      <a href={getDirectImageUrl(tx.ReceiptURL)} target="_blank" rel="noreferrer" title="ดูรูปใบเสร็จ">
                        <ImageIcon size={20} className="text-primary" />
                      </a>
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-ghost text-danger" onClick={() => handleDelete(tx.TxID)} style={{ padding: '0.4rem' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTx.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>ไม่พบประวัติการทำรายการ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
