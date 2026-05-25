import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Printer, Settings } from 'lucide-react';
import { parseCustomDate } from '../utils/format';
import './Report.css';

export default function Report() {
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Default signatures and settings
  const [signatures, setSignatures] = useState({
    reporterName: '',
    reporterTitle: 'เจ้าหน้าที่พัสดุ',
    approverName: '',
    approverTitle: 'ผู้อำนวยการโรงเรียนไชยาวิทยา',
    reportMonth: new Date().getMonth(),
    reportYear: new Date().getFullYear()
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.getData();
        setItems(data.inventory || []);
        setTransactions(data.transactions || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadData();

    const savedSigs = localStorage.getItem('reportSignatures');
    if (savedSigs) {
      setSignatures(JSON.parse(savedSigs));
    }
  }, []);

  const handleSaveSignatures = (e) => {
    e.preventDefault();
    localStorage.setItem('reportSignatures', JSON.stringify(signatures));
    setShowSettings(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const getThaiMonthYear = () => {
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const m = signatures.reportMonth !== undefined ? parseInt(signatures.reportMonth) : new Date().getMonth();
    const y = signatures.reportYear !== undefined ? parseInt(signatures.reportYear) : new Date().getFullYear();
    return `เดือน ${thaiMonths[m]} พ.ศ. ${y + 543}`;
  };

  const thaiMonthsList = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // Calculate monthly flow metrics for historical reports
  const getMonthlyReportData = () => {
    const targetMonth = signatures.reportMonth !== undefined ? parseInt(signatures.reportMonth) : new Date().getMonth();
    const targetYear = signatures.reportYear !== undefined ? parseInt(signatures.reportYear) : new Date().getFullYear();
    
    const startDate = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    
    return items.map(item => {
      let currentBal = parseInt(item.Balance) || 0;
      let totalIn = 0;
      let totalOut = 0;
      
      const itemTxs = transactions.filter(t => t.ItemID === item.ID);
      
      itemTxs.forEach(t => {
        const txDate = parseCustomDate(t.Date);
        if (txDate > endDate) {
          // Transaction happened after the selected month: reverse its effect
          if (t.Type === 'In') {
            currentBal -= parseInt(t.Quantity) || 0;
          } else {
            currentBal += parseInt(t.Quantity) || 0;
          }
        } else if (txDate >= startDate && txDate <= endDate) {
          // Transaction happened during the selected month: sum it up
          if (t.Type === 'In') {
            totalIn += parseInt(t.Quantity) || 0;
          } else {
            totalOut += parseInt(t.Quantity) || 0;
          }
        }
      });
      
      const endingBalance = Math.max(0, currentBal);
      const beginningBalance = Math.max(0, endingBalance - totalIn + totalOut);
      
      return {
        ...item,
        beginningBalance,
        totalIn,
        totalOut,
        endingBalance
      };
    });
  };

  const reportItems = getMonthlyReportData();

  return (
    <div className="report-container">
      <div className="report-controls no-print">
        <div>
          <h1 className="page-title">ออกรายงานพัสดุ</h1>
          <p className="text-muted">ตรวจสอบความถูกต้องก่อนกดพิมพ์</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowSettings(true)}>
            <Settings size={18} /> ตั้งค่าผู้เซ็นชื่อ
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} /> พิมพ์หน้านี้ (Print A4)
          </button>
        </div>
      </div>

      <div className="a4-paper">
        <div className="report-header">
          <h2 className="report-title">รายงานบัญชีวัสดุคงเหลือ</h2>
          <h3 className="report-subtitle">โรงเรียนไชยาวิทยา</h3>
          <p className="report-date">ประจำ{getThaiMonthYear()}</p>
        </div>

        {loading ? <p className="text-center">กำลังโหลดข้อมูล...</p> : (
          <table className="report-table">
            <thead>
              <tr>
                <th width="5%" style={{ textAlign: 'center' }}>ลำดับ</th>
                <th width="15%" style={{ textAlign: 'center' }}>รหัสพัสดุ</th>
                <th width="35%">รายการพัสดุ</th>
                <th width="12%" style={{ textAlign: 'center' }}>ยอดยกมา</th>
                <th width="10%" style={{ textAlign: 'center' }}>รับเข้า (+)</th>
                <th width="10%" style={{ textAlign: 'center' }}>จ่ายออก (-)</th>
                <th width="13%" style={{ textAlign: 'center' }}>คงเหลือสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {reportItems.map((item, index) => (
                <tr key={item.ID}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-center">{item.ID}</td>
                  <td>{item.Name}</td>
                  <td className="text-center">{item.beginningBalance}</td>
                  <td className="text-center" style={{ color: 'var(--secondary)' }}>{item.totalIn > 0 ? `+${item.totalIn}` : '0'}</td>
                  <td className="text-center" style={{ color: 'var(--warning)' }}>{item.totalOut > 0 ? `-${item.totalOut}` : '0'}</td>
                  <td className="text-center" style={{ fontWeight: 'bold' }}>{item.endingBalance}</td>
                </tr>
              ))}
              {reportItems.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center">ไม่มีข้อมูลพัสดุ</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div className="signature-section" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40mm' }}>
          <div className="signature-box" style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ whiteSpace: 'nowrap' }}>ลงชื่อ...................................ผู้รายงาน</p>
            <p style={{ whiteSpace: 'nowrap' }}>({signatures.reporterName ? signatures.reporterName : '...................................'})</p>
            <p className="sig-title" style={{ whiteSpace: 'nowrap' }}>ตำแหน่ง {signatures.reporterTitle}</p>
          </div>
          <div className="signature-box" style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ whiteSpace: 'nowrap' }}>ลงชื่อ...................................ผู้อนุมัติ</p>
            <p style={{ whiteSpace: 'nowrap' }}>({signatures.approverName ? signatures.approverName : '...................................'})</p>
            <p className="sig-title" style={{ whiteSpace: 'nowrap' }}>ตำแหน่ง {signatures.approverTitle}</p>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay no-print">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '500px' }}>
            <h2>ตั้งค่ารายงาน</h2>
            <form onSubmit={handleSaveSignatures}>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>เดือนที่รายงาน</label>
                  <select 
                    value={signatures.reportMonth !== undefined ? signatures.reportMonth : new Date().getMonth()} 
                    onChange={e => setSignatures({...signatures, reportMonth: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}
                  >
                    {thaiMonthsList.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>ปี (ค.ศ.)</label>
                  <input 
                    type="number" 
                    value={signatures.reportYear !== undefined ? signatures.reportYear : new Date().getFullYear()} 
                    onChange={e => setSignatures({...signatures, reportYear: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <hr style={{ margin: '1rem 0', borderColor: 'var(--border-light)' }}/>
              
              <div className="form-group">
                <label>ชื่อผู้รายงาน (ซ้าย)</label>
                <input type="text" value={signatures.reporterName} onChange={e => setSignatures({...signatures, reporterName: e.target.value})} placeholder="เช่น นายสมชาย ใจดี" />
              </div>
              <div className="form-group">
                <label>ตำแหน่งผู้รายงาน</label>
                <input type="text" value={signatures.reporterTitle} onChange={e => setSignatures({...signatures, reporterTitle: e.target.value})} />
              </div>
              <hr style={{ margin: '1rem 0', borderColor: 'var(--border-light)' }}/>
              <div className="form-group">
                <label>ชื่อผู้อนุมัติ (ขวา)</label>
                <input type="text" value={signatures.approverName} onChange={e => setSignatures({...signatures, approverName: e.target.value})} placeholder="เช่น นายสมเกียรติ รักเรียน" />
              </div>
              <div className="form-group">
                <label>ตำแหน่งผู้อนุมัติ</label>
                <input type="text" value={signatures.approverTitle} onChange={e => setSignatures({...signatures, approverTitle: e.target.value})} />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSettings(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกการตั้งค่า</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
