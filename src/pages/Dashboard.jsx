import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { LayoutDashboard, Package, AlertTriangle, Clock, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Inventory.css';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    pendingReqs: 0,
    monthlyOut: 0
  });
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
        const lowStock = inv.filter(i => parseInt(i.Balance) <= parseInt(i.MinStock)).length;
        
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
          <div style={{ width: '250px', height: '40px', background: 'var(--bg-surface-solid)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="glass-panel" style={{ height: '100px', animation: 'pulse 1.5s infinite', background: 'var(--bg-surface-solid)', opacity: 0.7 }}></div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          <div className="glass-panel" style={{ height: '350px', animation: 'pulse 1.5s infinite', background: 'var(--bg-surface-solid)', opacity: 0.7 }}></div>
          <div className="glass-panel" style={{ height: '350px', animation: 'pulse 1.5s infinite', background: 'var(--bg-surface-solid)', opacity: 0.7 }}></div>
        </div>
        <style>{`
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 0.3; }
            100% { opacity: 0.6; }
          }
        `}</style>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>พัสดุทั้งหมด</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{stats.totalItems}</h2>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50%' }}>
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>พัสดุใกล้หมด</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{stats.lowStock}</h2>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '50%' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>รออนุมัติ</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{stats.pendingReqs}</h2>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '50%' }}>
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>จ่ายออกเดือนนี้ (ชิ้น)</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{stats.monthlyOut}</h2>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--secondary-light)', color: 'var(--secondary)', borderRadius: '50%' }}>
              <TrendingUp size={24} />
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
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} style={{ fontSize: '0.85rem' }} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.02)'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20}>
                    {topItems.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`var(--primary)`} />
                    ))}
                  </Bar>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentTx.map(tx => (
                <div key={tx.TxID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-base)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{inventoryMap[tx.ItemID] || tx.ItemID}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(tx.Date).toLocaleString('th-TH')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem', 
                      fontWeight: 'bold',
                      color: getTxColor(tx.Type),
                      background: `rgba(0,0,0,0.05)`
                    }}>
                      {getTxText(tx.Type)}
                    </span>
                    <strong style={{ fontSize: '1.1rem', color: getTxColor(tx.Type) }}>
                      {tx.Type === 'Out' ? '-' : '+'}{tx.Quantity}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
