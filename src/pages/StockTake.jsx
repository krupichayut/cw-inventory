import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ClipboardList, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import './StockTake.css';

export default function StockTake() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async (force = false) => {
    setLoading(true);
    const data = await api.getData(force);
    const takeItems = data.inventory.map(i => ({
      ...i,
      ActualQty: i.Balance
    }));
    setItems(takeItems);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQtyChange = (id, val) => {
    setItems(items.map(i => i.ID === id ? { ...i, ActualQty: val } : i));
  };

  const handleSave = async () => {
    const diffs = items.filter(i => {
      const sysQty = parseInt(i.Balance) || 0;
      const actQty = i.ActualQty === '' ? 0 : parseInt(i.ActualQty);
      return sysQty !== actQty;
    });

    if (diffs.length === 0) {
      toast.success('ไม่มียอดแตกต่าง (ยอดตรงกันหมด)');
      return;
    }
    
    if (!window.confirm(`พบยอดที่แตกต่าง ${diffs.length} รายการ ต้องการยืนยันการปรับปรุงสต๊อกในฐานข้อมูลจริงหรือไม่?`)) return;

    setSaving(true);
    try {
      for (const item of diffs) {
        const sysQty = parseInt(item.Balance) || 0;
        const actQty = item.ActualQty === '' ? 0 : parseInt(item.ActualQty);
        const diff = actQty - sysQty;
        await api.adjustStock(item.ID, diff, 'Adjust');
      }
      toast.success(`บันทึกส่วนต่างสำเร็จ ${diffs.length} รายการ`);
      await loadData(true);
    } catch (e) {
      toast.error('Error: ' + (e.message || e));
    }
    setSaving(false);
  };

  return (
    <div className="stocktake-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title"><ClipboardList size={28} className="inline-icon text-primary" /> ตรวจสอบประจำปี</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
          <Save size={18} /> {saving ? 'กำลังบันทึก...' : 'บันทึกผลการนับ'}
        </button>
      </div>
      <p className="text-muted mb-4">ระบบดึงยอดปัจจุบัน (Snapshot) มาให้แล้ว กรุณากรอก "ยอดนับจริง" หากพบว่าไม่ตรงกัน</p>

      {loading ? <p>Loading...</p> : (
        <div className="table-container glass-panel">
          <table className="stock-table">
            <thead>
              <tr>
                <th>รหัสพัสดุ</th>
                <th>ชื่อพัสดุ</th>
                <th className="text-center">ยอดระบบ</th>
                <th className="text-center">ยอดนับจริง</th>
                <th className="text-center">ส่วนต่าง</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const sysQty = parseInt(item.Balance);
                const actQty = item.ActualQty === '' ? 0 : parseInt(item.ActualQty);
                const diff = actQty - sysQty;
                const hasDiff = diff !== 0;

                return (
                  <tr key={item.ID} className={hasDiff ? 'row-diff' : ''}>
                    <td className="text-muted">{item.ID}</td>
                    <td className="font-medium">{item.Name}</td>
                    <td className="text-center text-lg">{sysQty}</td>
                    <td className="text-center">
                      <input 
                        type="number" 
                        className="qty-input"
                        value={item.ActualQty}
                        onChange={e => handleQtyChange(item.ID, e.target.value)}
                      />
                    </td>
                    <td className={`text-center font-bold ${diff > 0 ? 'text-secondary' : diff < 0 ? 'text-danger' : 'text-muted'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
