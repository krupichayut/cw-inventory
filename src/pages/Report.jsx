import { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { Printer, Settings, Calendar, CalendarRange, Layers } from 'lucide-react';
import { parseCustomDate } from '../utils/format';
import { THAI_MONTHS, calculateReportData, getReportPeriodTitle } from '../utils/reportHelper';
import './Report.css';

const getDefaultSettings = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  return {
    reporterName: '',
    reporterTitle: 'เจ้าหน้าที่พัสดุ',
    approverName: '',
    approverTitle: 'ผู้อำนวยการโรงเรียนไชยาวิทยา',
    reportMode: 'monthly',
    reportMonth: now.getMonth(),
    reportYear: currentYear,
    termLabel: '',
    termStartMonth: 4, // พฤษภาคม
    termStartYear: currentYear,
    termEndMonth: 9, // ตุลาคม
    termEndYear: currentYear
  };
};

const getInitialSettings = () => {
  const defaults = getDefaultSettings();
  const savedSigs = localStorage.getItem('reportSignatures');
  if (!savedSigs) return defaults;
  try {
    return { ...defaults, ...JSON.parse(savedSigs) };
  } catch {
    return defaults;
  }
};

export default function Report() {
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [signatures, setSignatures] = useState(getInitialSettings);

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
  }, []);

  const updateSettings = (patch) => {
    setSignatures((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('reportSignatures', JSON.stringify(next));
      return next;
    });
  };

  const handleTermStartChange = (newMonth, newYear) => {
    const startYM = newYear * 12 + newMonth;
    const endYM = signatures.termEndYear * 12 + signatures.termEndMonth;
    if (startYM > endYM) {
      updateSettings({
        termStartMonth: newMonth,
        termStartYear: newYear,
        termEndMonth: newMonth,
        termEndYear: newYear
      });
    } else {
      updateSettings({ termStartMonth: newMonth, termStartYear: newYear });
    }
  };

  const handleTermEndChange = (newMonth, newYear) => {
    const startYM = signatures.termStartYear * 12 + signatures.termStartMonth;
    const endYM = newYear * 12 + newMonth;
    if (endYM < startYM) {
      updateSettings({
        termStartMonth: newMonth,
        termStartYear: newYear,
        termEndMonth: newMonth,
        termEndYear: newYear
      });
    } else {
      updateSettings({ termEndMonth: newMonth, termEndYear: newYear });
    }
  };

  const handleSaveSignatures = (e) => {
    e.preventDefault();
    localStorage.setItem('reportSignatures', JSON.stringify(signatures));
    setShowSettings(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set([
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
      signatures.reportYear,
      signatures.termStartYear,
      signatures.termEndYear
    ]);

    transactions.forEach((tx) => {
      if (tx?.Date) {
        const y = parseCustomDate(tx.Date).getFullYear();
        if (y >= 2020 && y <= 2100) yearSet.add(y);
      }
    });

    return Array.from(yearSet).filter(Number.isInteger).sort((a, b) => a - b);
  }, [transactions, signatures.reportYear, signatures.termStartYear, signatures.termEndYear]);

  const reportConfig = useMemo(() => ({
    mode: signatures.reportMode,
    reportMonth: signatures.reportMonth,
    reportYear: signatures.reportYear,
    termLabel: signatures.termLabel,
    termStartMonth: signatures.termStartMonth,
    termStartYear: signatures.termStartYear,
    termEndMonth: signatures.termEndMonth,
    termEndYear: signatures.termEndYear
  }), [signatures]);

  const reportItems = useMemo(
    () => calculateReportData(items, transactions, reportConfig),
    [items, transactions, reportConfig]
  );

  const periodTitle = getReportPeriodTitle(reportConfig);

  return (
    <div className="report-container">
      <div className="report-controls no-print">
        <div className="report-controls-top">
          <div>
            <h1 className="page-title">ออกรายงานพัสดุ</h1>
            <p className="text-muted">เลือกช่วงเวลารายงานและตรวจสอบความถูกต้องก่อนกดพิมพ์</p>
          </div>
          <div className="report-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(true)}>
              <Settings size={18} /> ตั้งค่าผู้เซ็นชื่อ
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrint}>
              <Printer size={18} /> พิมพ์หน้านี้ (Print A4)
            </button>
          </div>
        </div>

        <div className="report-period-bar">
          <div className="period-segmented" role="tablist" aria-label="ประเภทรายงาน">
            <button
              type="button"
              role="tab"
              aria-selected={signatures.reportMode === 'monthly'}
              className={`period-tab ${signatures.reportMode === 'monthly' ? 'active' : ''}`}
              onClick={() => updateSettings({ reportMode: 'monthly' })}
            >
              <Calendar size={16} /> รายเดือน
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={signatures.reportMode === 'term'}
              className={`period-tab ${signatures.reportMode === 'term' ? 'active' : ''}`}
              onClick={() => updateSettings({ reportMode: 'term' })}
            >
              <CalendarRange size={16} /> รายเทอม
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={signatures.reportMode === 'all'}
              className={`period-tab ${signatures.reportMode === 'all' ? 'active' : ''}`}
              onClick={() => updateSettings({ reportMode: 'all' })}
            >
              <Layers size={16} /> ทั้งหมด
            </button>
          </div>

          {signatures.reportMode === 'monthly' && (
            <div className="period-inputs">
              <div className="period-field">
                <label htmlFor="report-month-select">เดือน</label>
                <select
                  id="report-month-select"
                  value={signatures.reportMonth}
                  onChange={(e) => updateSettings({ reportMonth: parseInt(e.target.value, 10) })}
                >
                  {THAI_MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="period-field">
                <label htmlFor="report-year-select">ปี</label>
                <select
                  id="report-year-select"
                  value={signatures.reportYear}
                  onChange={(e) => updateSettings({ reportYear: parseInt(e.target.value, 10) })}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>พ.ศ. {y + 543}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {signatures.reportMode === 'term' && (
            <div className="period-term-grid">
              <div className="period-field period-field-label">
                <label htmlFor="term-label-input">ชื่อภาคเรียน (ถ้ามี)</label>
                <input
                  id="term-label-input"
                  type="text"
                  value={signatures.termLabel}
                  onChange={(e) => updateSettings({ termLabel: e.target.value })}
                  placeholder="เช่น ภาคเรียนที่ 1/2569"
                />
              </div>

              <div className="period-range-group">
                <span className="range-caption">ตั้งแต่</span>
                <select
                  aria-label="เดือนเริ่มต้น"
                  value={signatures.termStartMonth}
                  onChange={(e) => handleTermStartChange(parseInt(e.target.value, 10), signatures.termStartYear)}
                >
                  {THAI_MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  aria-label="ปีเริ่มต้น"
                  value={signatures.termStartYear}
                  onChange={(e) => handleTermStartChange(signatures.termStartMonth, parseInt(e.target.value, 10))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>พ.ศ. {y + 543}</option>
                  ))}
                </select>
              </div>

              <div className="period-range-group">
                <span className="range-caption">ถึง</span>
                <select
                  aria-label="เดือนสิ้นสุด"
                  value={signatures.termEndMonth}
                  onChange={(e) => handleTermEndChange(parseInt(e.target.value, 10), signatures.termEndYear)}
                >
                  {THAI_MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  aria-label="ปีสิ้นสุด"
                  value={signatures.termEndYear}
                  onChange={(e) => handleTermEndChange(signatures.termEndMonth, parseInt(e.target.value, 10))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>พ.ศ. {y + 543}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {signatures.reportMode === 'all' && (
            <div className="period-all-note">
              สรุปยอดรับเข้า–จ่ายออกสะสมทั้งหมด ตั้งแต่รายการแรกในระบบจนถึงปัจจุบัน
            </div>
          )}
        </div>
      </div>

      <div className="a4-paper">
        <div className="report-header">
          <h2 className="report-title">รายงานบัญชีวัสดุคงเหลือ</h2>
          <h3 className="report-subtitle">โรงเรียนไชยาวิทยา</h3>
          <p className="report-date">{periodTitle}</p>
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
            <h2>ตั้งค่าผู้เซ็นชื่อในรายงาน</h2>
            <form onSubmit={handleSaveSignatures}>
              <div className="form-group">
                <label>ชื่อผู้รายงาน (ซ้าย)</label>
                <input
                  type="text"
                  value={signatures.reporterName}
                  onChange={(e) => setSignatures({ ...signatures, reporterName: e.target.value })}
                  placeholder="เช่น นายสมชาย ใจดี"
                />
              </div>
              <div className="form-group">
                <label>ตำแหน่งผู้รายงาน</label>
                <input
                  type="text"
                  value={signatures.reporterTitle}
                  onChange={(e) => setSignatures({ ...signatures, reporterTitle: e.target.value })}
                />
              </div>
              <hr style={{ margin: '1rem 0', borderColor: 'var(--border-light)' }} />
              <div className="form-group">
                <label>ชื่อผู้อนุมัติ (ขวา)</label>
                <input
                  type="text"
                  value={signatures.approverName}
                  onChange={(e) => setSignatures({ ...signatures, approverName: e.target.value })}
                  placeholder="เช่น นายสมเกียรติ รักเรียน"
                />
              </div>
              <div className="form-group">
                <label>ตำแหน่งผู้อนุมัติ</label>
                <input
                  type="text"
                  value={signatures.approverTitle}
                  onChange={(e) => setSignatures({ ...signatures, approverTitle: e.target.value })}
                />
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
