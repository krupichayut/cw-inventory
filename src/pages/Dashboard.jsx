import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { LayoutDashboard, Package, AlertTriangle, Clock, TrendingUp, Activity, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatDateTimeThai } from '../utils/format';
import './Inventory.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    pendingReqs: 0,
    monthlyOut: 0
  });
  const [outOfStockList, setOutOfStockList] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [inventoryMap, setInventoryMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.getData();
        
        // 1. Inventory Stats
        const inv = data.inventory || [];
        const invMap = {};
        inv.forEach(i => invMap[i.ID] = i.Name);
        setInventoryMap(invMap);
        
        const totalItems = inv.length;
        
        const outOfStockItems = inv.filter(i => parseInt(i.Balance || 0) === 0);
        const lowStockItems = inv.filter(i => parseInt(i.Balance || 0) > 0 && parseInt(i.Balance || 0) <= parseInt(i.MinStock || 0));
        
        setOutOfStockList(outOfStockItems);
        setLowStockList(lowStockItems);
        
        const lowStock = outOfStockItems.length + lowStockItems.length;
        
        // 2. Request Stats
        const reqs = data.requests || [];
        const pendingReqs = reqs.filter(r => r.Status === 'Pending').length;
        
        // 3. Transaction Stats (This Month)
        const tx = data.transactions || [];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        let monthlyOutQty = 0;
        const monthlyItemCounts = {}; // For top items
        
        tx.forEach(t => {
          const d = new Date(t.Date);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            if (t.Type === 'Out') {
              const qty = parseInt(t.Quantity) || 0;
              monthlyOutQty += qty;
              monthlyItemCounts[t.ItemID] = (monthlyItemCounts[t.ItemID] || 0) + qty;
            }
          }
        });
        
        setStats({
          totalItems,
          lowStock,
          pendingReqs,
          monthlyOut: monthlyOutQty
        });
        
        // 4. Calculate Top Items
        const sortedItems = Object.keys(monthlyItemCounts)
          .map(id => ({ id, name: invMap[id] || id, count: monthlyItemCounts[id] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
          
        // Calculate max for bar width
        const maxCount = sortedItems.length > 0 ? sortedItems[0].count : 1;
        setTopItems(sortedItems.map(item => ({ ...item, pct: Math.round((item.count / maxCount) * 100) })));
        
        // 5. Recent Activity (Last 5)
        const sortedTx = [...tx].sort((a, b) => new Date(b.Date) - new Date(a.Date)).slice(0, 5);
        setRecentTx(sortedTx);
        
      } catch (e) {
        console.error("Dashboard error", e);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page animate-fade-in" style={{ paddingBottom: '2rem' }}>
        <div className="page-header">
          <div className="skeleton" style={{ width: '250px', height: '40px' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="glass-panel skeleton" style={{ height: '100px' }}></div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          <div className="glass-panel skeleton" style={{ height: '350px' }}></div>
          <div className="glass-panel skeleton" style={{ height: '350px' }}></div>
        </div>
      </div>
    );
  }

  const getTxColor = (type) => {
    if (type === 'In') return 'var(--secondary)';
    if (type === 'Out') return 'var(--warning)';
    return 'var(--text-muted)';
  };

  const getTxText = (type) => {
    if (type === 'In') return 'นำเข้า';
    if (type === 'Out') return 'เบิกจ่าย';
    return 'ปรับยอด';
  };

  return (
    <div className="dashboard-page animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title"><LayoutDashboard className="inline-icon" /> แดชบอร์ดภาพรวม</h1>
      </div>

      {/* --- STAT CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="stat-card stat-primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/inventory')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>พัสดุทั้งหมด</p>
              <h2 style={{ fontSize: '2.5rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', lineHeight: 1 }}>{stats.totalItems}</h2>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Package size={28} />
            </div>
          </div>
        </div>

        <div className="stat-card stat-danger" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/inventory')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>พัสดุใกล้หมด</p>
              <h2 style={{ fontSize: '2.5rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', lineHeight: 1 }}>{stats.lowStock}</h2>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
              <AlertTriangle size={28} />
            </div>
          </div>
        </div>

        <div className="stat-card stat-warning" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/requisition')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>รออนุมัติ</p>
              <h2 style={{ fontSize: '2.5rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', lineHeight: 1 }}>{stats.pendingReqs}</h2>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
              <Clock size={28} />
            </div>
          </div>
        </div>

        <div className="stat-card stat-secondary" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/history')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>จ่ายออกเดือนนี้ (ชิ้น)</p>
              <h2 style={{ fontSize: '2.5rem', margin: 0, fontFamily: 'Outfit', fontWeight: '800', lineHeight: 1 }}>{stats.monthlyOut}</h2>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
              <TrendingUp size={28} />
            </div>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* --- TOP ITEMS CHART (Recharts) --- */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} className="text-primary"/> พัสดุเบิกสูงสุด (ประจำเดือน)
          </h3>
          
          {topItems.length === 0 ? (
            <p className="text-center text-muted" style={{ padding: '2rem 0' }}>ยังไม่มีการเบิกพัสดุในเดือนนี้</p>
          ) : (
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--primary-light)" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} style={{ fontSize: '0.85rem' }} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.03)'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                  />
                  <Bar dataKey="count" fill="url(#colorBar)" radius={[0, 8, 8, 0]} barSize={24} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* --- RECENT ACTIVITY --- */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} className="text-primary"/> ความเคลื่อนไหวล่าสุด
          </h3>
          
          {recentTx.length === 0 ? (
            <p className="text-center text-muted" style={{ padding: '2rem 0' }}>ยังไม่มีประวัติทำรายการ</p>
          ) : (
            <div className="timeline-container">
              {recentTx.map(tx => (
                <div key={tx.TxID} className="timeline-item">
                  <div className={`timeline-dot dot-${tx.Type.toLowerCase()}`}></div>
                  <div className="timeline-content">
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>{inventoryMap[tx.ItemID] || tx.ItemID}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <Clock size={12} className="inline-icon" /> 
                        {formatDateTimeThai(tx.Date)} 
                        {tx.FulfillerName && ` • จ่ายโดย: ${tx.FulfillerName}`}
                        {tx.RestockerName && ` • รับเข้าโดย: ${tx.RestockerName}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 'var(--radius-full)', 
                        fontSize: '0.75rem', 
                        fontWeight: '700',
                        color: getTxColor(tx.Type),
                        background: `rgba(0,0,0,0.04)`,
                        letterSpacing: '0.5px'
                      }}>
                        {getTxText(tx.Type)}
                      </span>
                      <strong style={{ fontSize: '1.25rem', color: getTxColor(tx.Type), fontFamily: 'Outfit' }}>
                        {tx.Type === 'Out' ? '-' : '+'}{tx.Quantity}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* --- LOW STOCK & OUT OF STOCK LISTS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <XCircle size={20} /> พัสดุของหมดแล้ว (Out of Stock)
          </h3>
          {outOfStockList.length === 0 ? (
            <p className="text-center text-muted" style={{ padding: '2rem 0' }}>ไม่มีพัสดุที่ของหมด</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {outOfStockList.map(item => (
                <li key={item.ID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: '500' }}>{item.Name}</span>
                  <span className="text-danger" style={{ fontWeight: 'bold', background: 'var(--danger-light)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                    0 {item.BaseUnit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
            <AlertTriangle size={20} /> พัสดุใกล้หมด (Low Stock)
          </h3>
          {lowStockList.length === 0 ? (
            <p className="text-center text-muted" style={{ padding: '2rem 0' }}>ไม่มีพัสดุที่ใกล้หมด</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {lowStockList.map(item => (
                <li key={item.ID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: '500' }}>{item.Name}</span>
                  <span className="text-warning" style={{ fontWeight: 'bold', background: 'var(--warning-light)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                    {item.Balance} {item.BaseUnit} (ขั้นต่ำ {item.MinStock})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

    </div>
  );
}
