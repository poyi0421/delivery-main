import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  User, 
  DollarSign, 
  LogOut, 
  AlertTriangle,
  Navigation,
  Store,
  Check
} from 'lucide-react';
import api from '../utils/api';

interface Product {
  id: number;
  merchant_id: number;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
}

interface Merchant {
  id: number;
  user_id: number;
  name: string;
  description?: string;
}

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: Product;
}

interface Order {
  id: number;
  merchant_id: number;
  status: string;
  delivery_fee: number;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  merchant?: Merchant;
  consumer?: {
    email: string;
  };
}

const DriverDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Basic decode of JWT payload to get driver's email (stored in localstorage or JWT)
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.sub || '外送夥伴');
      } catch (e) {
        setUserEmail('外送夥伴');
      }
    }

    fetchOrders();

    // Poll for auto-assigned deliveries every 10 seconds so the driver gets new orders instantly
    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders/');
      setOrders(response.data);
    } catch (err) {
      console.error(err);
      setError('載入訂單列表失敗');
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    if (!window.confirm('您確定已抵達送達點，並向消費者收取足額現金了嗎？')) {
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/api/orders/${orderId}/complete`);
      fetchOrders();
      alert('回報成功！訂單已完成結算。');
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    window.location.href = '/login';
  };

  // Grouping orders for the driver
  const activeDeliveries = orders.filter(o => o.status === 'DELIVERING');
  const completedDeliveries = orders.filter(o => o.status === 'COMPLETED');

  // Total earnings count: 39 元 delivery fee per order
  const totalEarnings = completedDeliveries.length * 39;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoBadge}>
            <Truck size={24} color="#000" />
          </div>
          <div>
            <h3 style={styles.brandText}>外送夥伴配送系統</h3>
            <p style={styles.brandSub}>{userEmail} (常駐上線中)</p>
          </div>
        </div>

        <div style={styles.statsSummary}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>今日送達</span>
            <span style={styles.statVal}>{completedDeliveries.length} 單</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>累計外送收入</span>
            <span style={{...styles.statVal, color: 'var(--safety-green)'}}>${totalEarnings}</span>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={handleLogout} style={styles.logoutBtn}>
          <LogOut size={16} />
          <span>登出</span>
        </button>
      </header>

      {/* Main Content */}
      <main style={styles.mainLayout}>
        {error && (
          <div className="card" style={styles.errorAlert}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div style={styles.dashboardGrid}>
          {/* Active Deliveries Column */}
          <div style={styles.activeColumn}>
            <h2 style={styles.sectionTitle}>🚚 當前配送中任務 ({activeDeliveries.length})</h2>
            
            <div style={styles.activeList}>
              {activeDeliveries.map(order => (
                <div key={order.id} className="card card-green-border" style={styles.activeCard}>
                  
                  {/* Glowing Cash Alert Panel */}
                  <div style={styles.cashAlert}>
                    <DollarSign size={20} />
                    <div>
                      <span style={styles.cashLabel}>向消費者收取現金 (貨到付款)</span>
                      <h3 style={styles.cashAmount}>${parseFloat(order.total_amount as any)} 元</h3>
                    </div>
                  </div>

                  <div style={styles.deliveryProgress}>
                    {/* Step 1: Merchant */}
                    <div style={styles.stepRow}>
                      <div style={styles.stepDotContainer}>
                        <div style={styles.stepDotGreen} />
                        <div style={styles.stepLine} />
                      </div>
                      <div style={styles.stepContent}>
                        <span style={styles.stepType}>1. 前往商家取餐</span>
                        <div style={styles.stepDetailCard}>
                          <Store size={16} color="var(--safety-green)" />
                          <div>
                            <h4 style={styles.detailName}>{order.merchant?.name}</h4>
                            <p style={styles.detailAddress}>
                              {order.merchant?.description || '請至商家櫃檯取餐。'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Consumer */}
                    <div style={styles.stepRow}>
                      <div style={styles.stepDotContainer}>
                        <div style={styles.stepDotOrange} />
                      </div>
                      <div style={styles.stepContent}>
                        <span style={styles.stepType}>2. 送至消費者</span>
                        <div style={styles.stepDetailCard}>
                          <User size={16} color="var(--safety-orange)" />
                          <div>
                            <h4 style={styles.detailName}>{order.consumer?.email}</h4>
                            <p style={styles.detailAddress}>配送地址：客戶指定地址 (聯絡信箱: {order.consumer?.email})</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order items snapshot */}
                  <div style={styles.itemsSnapshot}>
                    <h5 style={styles.itemsTitle}>餐點清單</h5>
                    {order.items.map(item => (
                      <div key={item.id} style={styles.itemRow}>
                        <span style={styles.itemName}>{item.product?.name}</span>
                        <span style={styles.itemQty}>x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action complete button */}
                  <button 
                    className="btn btn-green"
                    onClick={() => handleCompleteOrder(order.id)}
                    disabled={loading}
                    style={styles.completeBtn}
                  >
                    {loading ? (
                      <div className="spinner" style={{ width: '20px', height: '20px' }} />
                    ) : (
                      <>
                        <Check size={20} />
                        <span>確認送達並收取現金</span>
                      </>
                    )}
                  </button>
                </div>
              ))}

              {activeDeliveries.length === 0 && (
                <div style={styles.emptyActiveState}>
                  <Navigation size={48} color="var(--text-muted)" style={{ marginBottom: '16px', animation: 'bounce 2s infinite' }} />
                  <h3>等待指派中</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                    目前沒有配送中的任務。系統會自動指派最新待取餐訂單給空閒時間最長的外送夥伴！
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* History Column */}
          <div style={styles.historyColumn}>
            <h2 style={styles.sectionTitle}>📋 今日已完成任務 ({completedDeliveries.length})</h2>
            
            <div style={styles.historyList}>
              {completedDeliveries.map(order => (
                <div key={order.id} style={styles.historyCard}>
                  <div style={styles.historyHeader}>
                    <span style={styles.historyId}>單號 #{order.id}</span>
                    <span style={styles.historyTime}>
                      {new Date(order.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={styles.historyDetails}>
                    <span style={styles.historyStore}>{order.merchant?.name}</span>
                    <span style={styles.historyFee}>外送車資: +$39</span>
                  </div>
                </div>
              ))}
              {completedDeliveries.length === 0 && (
                <div style={styles.emptyHistoryState}>
                  <p>今日尚無完成的配送單數。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-dark)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-color)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'var(--safety-green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px var(--safety-green-glow)',
  },
  brandText: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: '1.2',
  },
  brandSub: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  statsSummary: {
    display: 'flex',
    gap: '24px',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    borderRadius: '8px',
  },
  mainLayout: {
    flex: 1,
    padding: '24px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    marginBottom: '20px',
    fontSize: '14px',
  },
  dashboardGrid: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
  },
  activeColumn: {
    flex: 1,
  },
  historyColumn: {
    width: '320px',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '20px',
    alignSelf: 'stretch',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '20px',
  },
  activeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  activeCard: {
    padding: '24px',
    borderWidth: '1.5px',
  },
  cashAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'var(--safety-green-glow)',
    border: '1.5px solid var(--safety-green)',
    borderRadius: '14px',
    padding: '16px 20px',
    color: 'var(--safety-green)',
    marginBottom: '20px',
    boxShadow: '0 0 15px rgba(204,255,0,0.1)',
  },
  cashLabel: {
    fontSize: '13px',
    fontWeight: 700,
    display: 'block',
  },
  cashAmount: {
    fontSize: '24px',
    fontWeight: 900,
  },
  deliveryProgress: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  stepRow: {
    display: 'flex',
    gap: '14px',
  },
  stepDotContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '6px',
  },
  stepDotGreen: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'var(--safety-green)',
    boxShadow: '0 0 8px var(--safety-green)',
  },
  stepDotOrange: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'var(--safety-orange)',
    boxShadow: '0 0 8px var(--safety-orange)',
  },
  stepLine: {
    width: '2px',
    flex: 1,
    backgroundColor: 'var(--border-color)',
    marginTop: '6px',
    minHeight: '40px',
  },
  stepContent: {
    flex: 1,
  },
  stepType: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  },
  stepDetailCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: 'var(--bg-dark)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '12px 16px',
  },
  detailName: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  detailAddress: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  itemsSnapshot: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '14px 18px',
    marginBottom: '20px',
  },
  itemsTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    paddingBottom: '4px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '4px',
  },
  itemName: {
    color: 'var(--text-primary)',
  },
  itemQty: {
    fontWeight: 700,
    color: 'var(--safety-green)',
  },
  completeBtn: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    boxShadow: '0 4px 12px var(--safety-green-glow)',
  },
  emptyActiveState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    border: '1px dashed var(--border-color)',
    textAlign: 'center',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
  },
  historyCard: {
    padding: '12px',
    backgroundColor: 'var(--bg-dark)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  historyId: {
    fontWeight: 700,
  },
  historyTime: {},
  historyDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  historyStore: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    marginRight: '8px',
  },
  historyFee: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--safety-green)',
  },
  emptyHistoryState: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    padding: '20px 0',
    textAlign: 'center',
  },
};

export default DriverDashboard;
