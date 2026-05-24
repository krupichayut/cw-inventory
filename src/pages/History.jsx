import { useState, useEffect } from 'react';
import { api, getDirectImageUrl } from '../utils/api';
import { Trash2, History as HistoryIcon, Search, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [inventoryMap, setInventoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getData();
      
      const invMap = {};
      (data.inventory || []).forEach(i => invMap[i.ID] = i.Name);
      setInventoryMap(invMap);
      
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
    const name = inventoryMap[tx.ItemID] || tx.ItemID;
    return name.toLowerCase().includes(search.toLowerCase()) || 
           tx.TxID.toLowerCase().includes(search.toLowerCase()) ||
           (tx.FulfillerName || '').toLowerCase().includes(search.toLowerCase()) ||
           (tx.RestockerName || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="history-page animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title"><HistoryIcon className="inline-icon" /> ประวัติทำรายการทั้งหมด</h1>
      </div>

      <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
        <Search size={20} className="text-muted" />
        <input 
          type="text" 
          placeholder="ค้นหาชื่อพัสดุ รหัส หรือชื่อผู้ดำเนินการ..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
        />
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
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(tx.Date).toLocaleString('th-TH')}</td>
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
                    {tx.RestockerName && <div>ผู้รับ: {tx.RestockerName}</div>}
                    {tx.FulfillerName && <div>ผู้จ่าย: {tx.FulfillerName}</div>}
                    {!tx.RestockerName && !tx.FulfillerName && '-'}
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
