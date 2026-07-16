import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  LogOut,
  AlertTriangle,
  Play,
  PackageCheck
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
  driver?: {
    email: string;
  };
}

const MerchantDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [profile, setProfile] = useState<Merchant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<Product[]>([]);
  
  // Loading & error states
  const [error, setError] = useState('');
  
  // Product modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodAvailable, setProdAvailable] = useState(true);
  const [submittingProduct, setSubmittingProduct] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchProducts();
    fetchOrders();

    // Setup polling for incoming orders every 10 seconds to make the board feel alive
    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/merchants/my/profile');
      setProfile(response.data);
    } catch (err) {
      console.error(err);
      setError('無法載入店家資訊');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/merchants/my/products');
      setMenu(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders/');
      setOrders(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Order state actions
  const handleAcceptOrder = async (orderId: number) => {
    try {
      await api.post(`/api/orders/${orderId}/accept`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.detail || '接單失敗');
    }
  };

  const handleReadyOrder = async (orderId: number) => {
    try {
      await api.post(`/api/orders/${orderId}/ready`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.detail || '標記失敗');
    }
  };

  // Product modal operations
  const openAddModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice(0);
    setProdAvailable(true);
    setShowProductModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdDesc(product.description || '');
    setProdPrice(product.price);
    setProdAvailable(product.is_available);
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || prodPrice < 0) {
      alert('請填寫餐點名稱且價格不可小於 0');
      return;
    }

    setSubmittingProduct(true);
    try {
      if (editingProduct) {
        // Edit existing product
        await api.put(`/api/merchants/products/${editingProduct.id}`, {
          name: prodName,
          description: prodDesc,
          price: prodPrice,
          is_available: prodAvailable,
        });
      } else {
        // Add new product
        await api.post('/api/merchants/products', {
          name: prodName,
          description: prodDesc,
          price: prodPrice,
        });
      }
      setShowProductModal(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || '儲存商品失敗');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleToggleProduct = async (product: Product) => {
    try {
      if (product.is_available) {
        // If available, soft delete it
        await api.delete(`/api/merchants/products/${product.id}`);
      } else {
        // If unavailable, put is_available to true
        await api.put(`/api/merchants/products/${product.id}`, {
          is_available: true
        });
      }
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || '切換商品狀態失敗');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    window.location.href = '/login';
  };

  // Grouping orders
  const activeOrders = orders.filter(o => o.status !== 'COMPLETED');
  const pastOrders = orders.filter(o => o.status === 'COMPLETED');

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <Store size={24} color="var(--safety-orange)" />
          <div>
            <h3 style={styles.brandText}>{profile?.name || '店家管理後台'}</h3>
            <p style={styles.brandSub}>{profile?.description || '歡迎回來管理您的店面'}</p>
          </div>
        </div>

        <div style={styles.navControls}>
          <button 
            style={{...styles.navTab, ...(activeTab === 'orders' ? styles.navTabActive : {})}}
            onClick={() => setActiveTab('orders')}
          >
            <ClipboardList size={18} />
            <span>訂單看板</span>
            {activeOrders.length > 0 && (
              <span style={styles.badgeCount}>{activeOrders.length}</span>
            )}
          </button>
          <button 
            style={{...styles.navTab, ...(activeTab === 'menu' ? styles.navTabActive : {})}}
            onClick={() => setActiveTab('menu')}
          >
            <Store size={18} />
            <span>菜單管理</span>
          </button>
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

        {activeTab === 'orders' ? (
          // Orders board
          <div style={styles.ordersLayout}>
            {/* Active Orders column */}
            <div style={styles.ordersColumn}>
              <h2 style={styles.sectionTitle}>進行中訂單 ({activeOrders.length})</h2>
              
              <div style={styles.ordersGrid}>
                {activeOrders.map(order => (
                  <div key={order.id} className="card card-orange-border" style={styles.orderCard}>
                    <div style={styles.orderCardHeader}>
                      <div>
                        <span style={styles.orderNumber}>訂單編號 #{order.id}</span>
                        <span style={styles.orderTime}>
                          {new Date(order.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} 下單
                        </span>
                      </div>
                      {order.status === 'PENDING_STORE' && <span className="badge badge-pending">新訂單</span>}
                      {order.status === 'PREPARING' && <span className="badge badge-preparing">製作中</span>}
                      {order.status === 'READY_FOR_PICKUP' && <span className="badge badge-ready">等待取餐</span>}
                      {order.status === 'DELIVERING' && <span className="badge badge-delivering">配送中</span>}
                    </div>

                    <div style={styles.orderItems}>
                      {order.items.map(item => (
                        <div key={item.id} style={styles.orderItemRow}>
                          <span style={styles.orderItemName}>
                            {item.product?.name} <span style={styles.qtyText}>x{item.quantity}</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={styles.orderSummary}>
                      <span style={styles.totalAmountLabel}>應收現金:</span>
                      <span style={styles.totalAmountVal}>${parseFloat(order.total_amount as any)}</span>
                    </div>

                    {/* Order action button */}
                    <div style={styles.orderActionContainer}>
                      {order.status === 'PENDING_STORE' && (
                        <button 
                          className="btn btn-orange" 
                          onClick={() => handleAcceptOrder(order.id)}
                          style={{ width: '100%' }}
                        >
                          <Play size={16} />
                          <span>接受此單，開始製作</span>
                        </button>
                      )}
                      {order.status === 'PREPARING' && (
                        <button 
                          className="btn btn-orange" 
                          onClick={() => handleReadyOrder(order.id)}
                          style={{ width: '100%' }}
                        >
                          <PackageCheck size={16} />
                          <span>準備完成，呼叫外送員</span>
                        </button>
                      )}
                      {order.status === 'READY_FOR_PICKUP' && (
                        <div style={styles.statusWaitCard}>
                          <Clock size={16} />
                          <span>正在等待系統指派空閒外送員...</span>
                        </div>
                      )}
                      {order.status === 'DELIVERING' && (
                        <div style={styles.statusDeliveringCard}>
                          <CheckCircle2 size={16} />
                          <span>外送員 {order.driver?.email.split('@')[0]} 正在配送中</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {activeOrders.length === 0 && (
                  <div style={styles.emptyState}>
                    <CheckCircle2 size={40} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                    <p>目前沒有進行中的訂單，享受短暫的空閒吧！</p>
                  </div>
                )}
              </div>
            </div>

            {/* Past Orders column */}
            <div style={styles.historyColumn}>
              <h2 style={styles.sectionTitle}>今日歷史訂單 ({pastOrders.length})</h2>
              <div style={styles.historyList}>
                {pastOrders.map(order => (
                  <div key={order.id} style={styles.historyRow}>
                    <div style={styles.historyInfo}>
                      <span style={styles.historyId}>單號 #{order.id}</span>
                      <span style={styles.historyTime}>
                        {new Date(order.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span style={styles.historyAmount}>${parseFloat(order.total_amount as any)}</span>
                    <span className="badge badge-completed" style={{ fontSize: '11px', padding: '2px 8px' }}>已送達</span>
                  </div>
                ))}
                {pastOrders.length === 0 && (
                  <div style={styles.emptyHistoryState}>
                    <p>尚無完成的訂單紀錄。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Menu CRUD board
          <div>
            <div style={styles.menuHeader}>
              <h2 style={styles.sectionTitle}>餐點菜單管理</h2>
              <button className="btn btn-orange" onClick={openAddModal}>
                <Plus size={16} />
                <span>新增餐點</span>
              </button>
            </div>

            <div style={styles.menuGrid}>
              {menu.map(product => (
                <div key={product.id} className="card" style={styles.menuItemCard}>
                  <div style={styles.menuItemHeader}>
                    <div style={styles.menuItemInfo}>
                      <h3 style={styles.menuItemName}>{product.name}</h3>
                      <p style={styles.menuItemDesc}>{product.description || '無描述資訊。'}</p>
                    </div>
                    <span style={styles.menuItemPrice}>${product.price}</span>
                  </div>

                  <div style={styles.menuItemActions}>
                    {/* Toggle Switch */}
                    <button 
                      style={styles.toggleBtn}
                      onClick={() => handleToggleProduct(product)}
                    >
                      {product.is_available ? (
                        <>
                          <ToggleRight size={32} color="var(--safety-orange)" />
                          <span style={{...styles.toggleLabel, color: 'var(--safety-orange)'}}>上架中</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={32} color="var(--text-muted)" />
                          <span style={{...styles.toggleLabel, color: 'var(--text-muted)'}}>已下架</span>
                        </>
                      )}
                    </button>

                    <button className="btn btn-secondary" onClick={() => openEditModal(product)} style={styles.editBtn}>
                      <Edit3 size={14} />
                      <span>編輯</span>
                    </button>
                  </div>
                </div>
              ))}
              {menu.length === 0 && (
                <div style={styles.emptyState}>
                  <p>您的菜單目前空空如也，點擊右上角新增第一道美味吧！</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Product Add / Edit Modal */}
      {showProductModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalCard}>
            <h3 style={styles.modalTitle}>{editingProduct ? '編輯餐點商品' : '新增餐點商品'}</h3>
            <form onSubmit={handleProductSubmit} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label htmlFor="prodName">餐點名稱</label>
                <input
                  id="prodName"
                  type="text"
                  placeholder="例如：招牌紅燒牛肉麵"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label htmlFor="prodPrice">價格 (元)</label>
                <input
                  id="prodPrice"
                  type="number"
                  placeholder="例如：150"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(parseFloat(e.target.value) || 0)}
                  min="0"
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label htmlFor="prodDesc">商品介紹</label>
                <textarea
                  id="prodDesc"
                  placeholder="介紹一下您的美味商品..."
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              {editingProduct && (
                <div style={styles.modalToggleRow}>
                  <label>上架狀態</label>
                  <button 
                    type="button"
                    style={styles.toggleBtn}
                    onClick={() => setProdAvailable(!prodAvailable)}
                  >
                    {prodAvailable ? (
                      <ToggleRight size={32} color="var(--safety-orange)" />
                    ) : (
                      <ToggleLeft size={32} color="var(--text-muted)" />
                    )}
                  </button>
                </div>
              )}

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowProductModal(false)}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="btn btn-orange"
                  disabled={submittingProduct}
                >
                  {submittingProduct ? (
                    <div className="spinner" style={{ width: '18px', height: '18px' }} />
                  ) : (
                    <span>儲存餐點</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  navControls: {
    display: 'flex',
    gap: '8px',
    backgroundColor: 'var(--bg-dark)',
    padding: '4px',
    borderRadius: '10px',
  },
  navTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    position: 'relative',
    transition: 'all var(--transition-fast)',
  },
  navTabActive: {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--safety-orange)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  badgeCount: {
    backgroundColor: 'var(--safety-orange)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: '6px',
    marginLeft: '2px',
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
  ordersLayout: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
  },
  ordersColumn: {
    flex: 1,
  },
  historyColumn: {
    width: '340px',
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
    marginBottom: '16px',
  },
  ordersGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  orderCard: {
    padding: '20px',
  },
  orderCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '10px',
    marginBottom: '14px',
  },
  orderNumber: {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    display: 'block',
  },
  orderTime: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  orderItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '14px',
  },
  orderItemRow: {
    fontSize: '15px',
  },
  orderItemName: {
    color: 'var(--text-primary)',
  },
  qtyText: {
    fontWeight: 700,
    color: 'var(--safety-orange)',
    marginLeft: '6px',
  },
  orderSummary: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    gap: '8px',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    paddingTop: '12px',
    marginBottom: '16px',
  },
  totalAmountLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  totalAmountVal: {
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--safety-orange)',
  },
  orderActionContainer: {
    marginTop: '10px',
  },
  statusWaitCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'var(--bg-dark)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  statusDeliveringCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'var(--safety-green-glow)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--safety-green)',
    fontSize: '14px',
    fontWeight: 600,
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
  },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid var(--border-color)',
  },
  historyInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  historyId: {
    fontSize: '14px',
    fontWeight: 700,
  },
  historyTime: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  historyAmount: {
    fontSize: '15px',
    fontWeight: 700,
  },
  emptyHistoryState: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    padding: '20px 0',
    textAlign: 'center',
  },
  menuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  menuItemCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '160px',
  },
  menuItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  menuItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  menuItemName: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  menuItemDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: '1.4',
  },
  menuItemPrice: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  menuItemActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    paddingTop: '12px',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    padding: 0,
  },
  toggleLabel: {
    fontSize: '13px',
    fontWeight: 700,
  },
  editBtn: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontSize: '15px',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    width: '90%',
    maxWidth: '440px',
    padding: '24px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '20px',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  modalToggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
};

export default MerchantDashboard;
