import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Store, 
  ChevronRight, 
  Plus, 
  Minus, 
  ClipboardList, 
  CheckCircle2, 
  ArrowLeft, 
  AlertTriangle,
  User
} from 'lucide-react';
import api from '../utils/api';

// Interface definitions based on API schemas
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
  driver?: {
    email: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
}

const ConsumerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'browse' | 'orders'>('browse');
  const [currentView, setCurrentView] = useState<'merchants' | 'menu'>('merchants');
  
  // Data states
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [menu, setMenu] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Cart cross-store check states
  const [showCartWarning, setShowCartWarning] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<Product | null>(null);

  // Load merchants and orders on mount
  useEffect(() => {
    fetchMerchants();
    fetchOrders();
  }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/merchants/');
      setMerchants(response.data);
    } catch (err) {
      console.error(err);
      setError('載入店家列表失敗');
    } finally {
      setLoading(false);
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

  const fetchMenu = async (merchantId: number) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/merchants/${merchantId}/menu`);
      setMenu(response.data);
    } catch (err) {
      console.error(err);
      setError('載入菜單失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMerchant = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    fetchMenu(merchant.id);
    setCurrentView('menu');
  };

  const handleBackToMerchants = () => {
    setSelectedMerchant(null);
    setMenu([]);
    setCurrentView('merchants');
  };

  // Cart operations
  const addToCart = (product: Product) => {
    // Cross-store validation: Check if cart already has items from another store
    if (cart.length > 0 && cart[0].product.merchant_id !== product.merchant_id) {
      setPendingCartItem(product);
      setShowCartWarning(true);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleConfirmClearCart = () => {
    if (pendingCartItem) {
      setCart([{ product: pendingCartItem, quantity: 1 }]);
      setPendingCartItem(null);
    }
    setShowCartWarning(false);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => 
      prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Compute Cart Amounts
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? 39.00 : 0;
  const cartTotal = cartSubtotal + deliveryFee;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const orderData = {
        merchant_id: cart[0].product.merchant_id,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      };
      await api.post('/api/orders/', orderData);
      setCart([]); // Clear cart
      alert('訂單提交成功！您可在「我的訂單」頁面追蹤即時配送狀態。');
      fetchOrders();
      setActiveTab('orders'); // Auto jump to orders tab
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || '下單失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    window.location.href = '/login';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_STORE':
        return <span className="badge badge-pending">等待接單</span>;
      case 'PREPARING':
        return <span className="badge badge-preparing">製作中</span>;
      case 'READY_FOR_PICKUP':
        return <span className="badge badge-ready">待取餐</span>;
      case 'DELIVERING':
        return <span className="badge badge-delivering">配送中</span>;
      case 'COMPLETED':
        return <span className="badge badge-completed">已送達</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={styles.container}>
      {/* Navigation Header */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.logo}>🛵</span>
          <span style={styles.brandText}>快勢捷外送</span>
        </div>
        <div style={styles.navControls}>
          <button 
            style={{...styles.navTab, ...(activeTab === 'browse' ? styles.navTabActive : {})}}
            onClick={() => setActiveTab('browse')}
          >
            <Store size={18} />
            <span>瀏覽美食</span>
          </button>
          <button 
            style={{...styles.navTab, ...(activeTab === 'orders' ? styles.navTabActive : {})}}
            onClick={() => {
              setActiveTab('orders');
              fetchOrders();
            }}
          >
            <ClipboardList size={18} />
            <span>我的訂單</span>
            {orders.some(o => o.status !== 'COMPLETED') && (
              <span style={styles.orderDot} />
            )}
          </button>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout} style={styles.logoutBtn}>
          登出帳戶
        </button>
      </header>

      {/* Main layout */}
      <div style={styles.mainLayout}>
        <div style={styles.contentColumn}>
          {error && (
            <div className="card" style={{ display: 'flex', gap: '8px', padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--error)', marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
          {activeTab === 'browse' ? (
            currentView === 'merchants' ? (
              // Merchants List view
              <div>
                <div style={styles.viewHeader}>
                  <h2 style={styles.sectionTitle}>精選合作商家</h2>
                  <p style={styles.sectionSubtitle}>挑選您喜愛的店家並點選餐點</p>
                </div>

                {loading ? (
                  <div style={styles.spinnerContainer}>
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <div style={styles.merchantGrid}>
                    {merchants.map(merchant => (
                      <div 
                        key={merchant.id} 
                        className="card card-hover card-orange-border"
                        style={styles.merchantCard}
                        onClick={() => handleSelectMerchant(merchant)}
                      >
                        <div style={styles.merchantCardHeader}>
                          <Store size={22} color="var(--safety-orange)" />
                          <h3 style={styles.merchantName}>{merchant.name}</h3>
                        </div>
                        <p style={styles.merchantDesc}>
                          {merchant.description || '店家尚無提供簡介。'}
                        </p>
                        <div style={styles.cardFooter}>
                          <span style={styles.browseMenuText}>瀏覽菜單</span>
                          <ChevronRight size={16} color="var(--safety-orange)" />
                        </div>
                      </div>
                    ))}
                    {merchants.length === 0 && (
                      <div style={styles.emptyState}>
                        <p>目前尚無商家上線。</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Menu Details view
              <div>
                <button className="btn btn-secondary" onClick={handleBackToMerchants} style={styles.backBtn}>
                  <ArrowLeft size={16} />
                  <span>返回商家列表</span>
                </button>

                <div style={styles.menuHeader}>
                  <h2 style={styles.selectedMerchantName}>{selectedMerchant?.name}</h2>
                  <p style={styles.selectedMerchantDesc}>{selectedMerchant?.description}</p>
                </div>

                {loading ? (
                  <div style={styles.spinnerContainer}>
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <div style={styles.menuGrid}>
                    {menu.map(product => (
                      <div key={product.id} className="card" style={styles.productCard}>
                        <div style={styles.productInfo}>
                          <h3 style={styles.productName}>{product.name}</h3>
                          <p style={styles.productDesc}>{product.description || '美味餐點，現點現做。'}</p>
                        </div>
                        <div style={styles.productBuy}>
                          <span style={styles.productPrice}>${product.price}</span>
                          <button 
                            className="btn btn-orange" 
                            style={styles.addBtn}
                            onClick={() => addToCart(product)}
                          >
                            <Plus size={16} />
                            <span>加到購物車</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {menu.length === 0 && (
                      <div style={styles.emptyState}>
                        <p>此店家目前尚無商品上架。</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          ) : (
            // Orders List View
            <div>
              <div style={styles.viewHeader}>
                <h2 style={styles.sectionTitle}>我的訂單紀錄</h2>
                <p style={styles.sectionSubtitle}>即時追蹤您的外送配送狀態</p>
              </div>

              <div style={styles.ordersList}>
                {orders.map(order => (
                  <div key={order.id} className="card" style={styles.orderCard}>
                    <div style={styles.orderCardHeader}>
                      <div>
                        <div style={styles.orderStoreInfo}>
                          <Store size={18} color="var(--text-secondary)" />
                          <h4 style={styles.orderStoreName}>{order.merchant?.name || `商家 ID: ${order.merchant_id}`}</h4>
                        </div>
                        <span style={styles.orderTime}>
                          下單時間: {new Date(order.created_at).toLocaleString('zh-TW')}
                        </span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div style={styles.orderItems}>
                      {order.items.map(item => (
                        <div key={item.id} style={styles.orderItemRow}>
                          <span style={styles.orderItemName}>
                            {item.product?.name || `商品 ID: ${item.product_id}`} <span style={styles.itemQty}>x{item.quantity}</span>
                          </span>
                          <span style={styles.orderItemPrice}>${parseFloat(item.price as any) * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div style={styles.orderSummary}>
                      <div style={styles.summaryRow}>
                        <span>外送費:</span>
                        <span>${parseFloat(order.delivery_fee as any)}</span>
                      </div>
                      <div style={styles.summaryTotalRow}>
                        <span>實付總額 (貨到付款):</span>
                        <span style={styles.orderTotalAmount}>${parseFloat(order.total_amount as any)}</span>
                      </div>
                      
                      {order.status === 'DELIVERING' && order.driver && (
                        <div style={styles.driverInfoCard}>
                          <User size={16} color="var(--safety-green)" />
                          <span>外送夥伴 {order.driver.email} 正在全速配送中，請保持手機暢通！</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div style={styles.emptyState}>
                    <ClipboardList size={40} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                    <p>您目前沒有任何訂單紀錄。</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Shopping Cart Sidebar (Only visible in 'browse' tab) */}
        {activeTab === 'browse' && (
          <div style={styles.cartColumn}>
            <div className="card" style={styles.cartCard}>
              <div style={styles.cartHeader}>
                <ShoppingCart size={20} color="var(--safety-orange)" />
                <h3 style={styles.cartTitle}>我的購物車</h3>
                {cart.length > 0 && (
                  <button onClick={clearCart} style={styles.clearCartBtn}>
                    清空
                  </button>
                )}
              </div>

              <div style={styles.cartItemsList}>
                {cart.map(item => (
                  <div key={item.product.id} style={styles.cartItem}>
                    <div style={styles.cartItemInfo}>
                      <span style={styles.cartItemName}>{item.product.name}</span>
                      <span style={styles.cartItemSubtotal}>${item.product.price * item.quantity}</span>
                    </div>
                    <div style={styles.cartItemActions}>
                      <button 
                        style={styles.qtyBtn} 
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={styles.qtyDisplay}>{item.quantity}</span>
                      <button 
                        style={styles.qtyBtn} 
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div style={styles.cartEmptyState}>
                    <ShoppingBag size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                    <p>購物車空空如也</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>點擊餐點加到購物車中</p>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div style={styles.cartSummary}>
                  <div style={styles.cartSummaryRow}>
                    <span>小計:</span>
                    <span>${cartSubtotal}</span>
                  </div>
                  <div style={styles.cartSummaryRow}>
                    <span>固定運費:</span>
                    <span>${deliveryFee}</span>
                  </div>
                  <div style={{...styles.cartSummaryRow, ...styles.cartSummaryTotal}}>
                    <span>貨到付款總計:</span>
                    <span style={styles.cartTotalText}>${cartTotal}</span>
                  </div>

                  <button 
                    className="btn btn-orange" 
                    onClick={handleCheckout}
                    disabled={loading}
                    style={styles.checkoutBtn}
                  >
                    {loading ? (
                      <div className="spinner" style={{ width: '18px', height: '18px' }} />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>確認下單</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cross-Store Warning Modal */}
      {showCartWarning && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <AlertTriangle size={24} color="var(--safety-orange)" />
              <h3 style={styles.modalTitle}>更換店家提示</h3>
            </div>
            <p style={styles.modalText}>
              您目前的購物車內含有其他店家的餐點。本平台限制單次訂購僅能選擇單一商家。
            </p>
            <p style={styles.modalTextWarning}>
              點擊「確定」將會清空目前購物車，並重新加入新店家的商品。
            </p>
            <div style={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowCartWarning(false);
                  setPendingCartItem(null);
                }}
              >
                取消
              </button>
              <button 
                className="btn btn-orange" 
                onClick={handleConfirmClearCart}
              >
                確定更換
              </button>
            </div>
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
    gap: '8px',
  },
  logo: {
    fontSize: '24px',
  },
  brandText: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.025em',
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
  orderDot: {
    position: 'absolute',
    top: '6px',
    right: '12px',
    width: '6px',
    height: '6px',
    backgroundColor: 'var(--safety-orange)',
    borderRadius: '50%',
    boxShadow: '0 0 8px var(--safety-orange)',
  },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    borderRadius: '8px',
  },
  mainLayout: {
    display: 'flex',
    flex: 1,
    padding: '24px',
    gap: '24px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  contentColumn: {
    flex: 1,
    minWidth: 0,
  },
  cartColumn: {
    width: '320px',
    flexShrink: 0,
  },
  viewHeader: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 0',
  },
  merchantGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  merchantCard: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    height: '180px',
  },
  merchantCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  merchantName: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  merchantDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.03)',
  },
  browseMenuText: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--safety-orange)',
  },
  backBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  menuHeader: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
  },
  selectedMerchantName: {
    fontSize: '24px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  selectedMerchantDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  productCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '150px',
  },
  productInfo: {
    marginBottom: '12px',
  },
  productName: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  productDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  productBuy: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  addBtn: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '8px',
  },
  cartCard: {
    position: 'sticky',
    top: '80px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 120px)',
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '14px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '14px',
  },
  cartTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    flex: 1,
  },
  clearCartBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cartItemsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingRight: '4px',
  },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px',
    backgroundColor: 'var(--bg-dark)',
    borderRadius: '10px',
  },
  cartItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
    paddingRight: '8px',
  },
  cartItemName: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cartItemSubtotal: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
  },
  cartItemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  qtyBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    backgroundColor: 'var(--border-color)',
    border: 'none',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  qtyDisplay: {
    fontSize: '14px',
    fontWeight: 700,
    width: '16px',
    textAlign: 'center',
  },
  cartEmptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  cartSummary: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cartSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  cartSummaryTotal: {
    borderTop: '1px dashed var(--border-color)',
    paddingTop: '10px',
    marginTop: '4px',
  },
  cartTotalText: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--safety-orange)',
  },
  checkoutBtn: {
    marginTop: '8px',
    width: '100%',
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
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  orderCard: {
    padding: '20px',
  },
  orderCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
    marginBottom: '12px',
  },
  orderStoreInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  orderStoreName: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  orderTime: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  orderItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  orderItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  orderItemName: {
    color: 'var(--text-primary)',
  },
  itemQty: {
    color: 'var(--text-secondary)',
    marginLeft: '6px',
    fontWeight: 600,
  },
  orderItemPrice: {
    color: 'var(--text-secondary)',
  },
  orderSummary: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  summaryTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: 700,
    marginTop: '2px',
  },
  orderTotalAmount: {
    color: 'var(--safety-orange)',
    fontWeight: 800,
  },
  driverInfoCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--safety-green-glow)',
    border: '1px solid rgba(204,255,0,0.2)',
    padding: '10px 14px',
    borderRadius: '10px',
    color: 'var(--safety-green)',
    fontSize: '13px',
    fontWeight: 600,
    marginTop: '10px',
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
    padding: '28px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '14px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  modalText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '10px',
    lineHeight: '1.5',
  },
  modalTextWarning: {
    fontSize: '14px',
    color: 'var(--safety-orange)',
    fontWeight: 700,
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};

export default ConsumerDashboard;
