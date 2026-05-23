import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Printer, Settings } from 'lucide-react';
import './Report.css';

export default function Report() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Default signatures
  const [signatures, setSignatures] = useState({
    reporterName: '',
    reporterTitle: 'เจ้าหน้าที่พัสดุ',
    approverName: '',
    approverTitle: 'ผู้อำนวยการโรงเรียนไชยาวิทยา'
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await api.getData();
      setItems(data.inventory);
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
    const date = new Date();
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return `เดือน ${thaiMonths[date.getMonth()]} พ.ศ. ${date.getFullYear() + 543}`;
  };

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
                <th width="10%">ลำดับ</th>
                <th width="20%">รหัสพัสดุ</th>
                <th width="40%">รายการพัสดุ</th>
                <th width="15%">คงเหลือ (ชิ้น)</th>
                <th width="15%">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.ID}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-center">{item.ID}</td>
                  <td>{item.Name}</td>
                  <td className="text-center">{item.Balance}</td>
                  <td></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">ไม่มีข้อมูลพัสดุ</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div className="signature-section" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40mm' }}>
          <div className="signature-box" style={{ width: '45%', textAlign: 'center' }}>
            <p>ลงชื่อ........................................ผู้รายงาน</p>
            <p>({signatures.reporterName ? signatures.reporterName : '........................................'})</p>
            <p className="sig-title">ตำแหน่ง {signatures.reporterTitle}</p>
          </div>
          <div className="signature-box" style={{ width: '45%', textAlign: 'center' }}>
            <p>ลงชื่อ........................................ผู้อนุมัติ</p>
            <p>({signatures.approverName ? signatures.approverName : '........................................'})</p>
            <p className="sig-title">ตำแหน่ง {signatures.approverTitle}</p>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay no-print">
          <div className="modal-content glass-panel animate-fade-in">
            <h2>ตั้งค่ารายชื่อท้ายเอกสาร</h2>
            <form onSubmit={handleSaveSignatures}>
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
