import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Upload,
} from 'lucide-react'
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
} from '../redux/api/cart'
import './Cart.css'

const etbFormatter = new Intl.NumberFormat('en-ET', {
  style: 'currency',
  currency: 'ETB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const getReadableError = (error, fallbackMessage) => {
  const rawMessage = error?.data?.message ?? error?.error ?? error?.message
  if (typeof rawMessage === 'string' && rawMessage.trim()) return rawMessage
  if (Array.isArray(rawMessage)) return rawMessage.filter(Boolean).join(', ') || fallbackMessage
  if (rawMessage && typeof rawMessage === 'object') {
    if (typeof rawMessage.message === 'string' && rawMessage.message.trim()) return rawMessage.message
    try { return JSON.stringify(rawMessage) } catch { return fallbackMessage }
  }
  return fallbackMessage
}

const getCartLoadErrorMessage = (error) => {
  const status = error?.status
  const message = error?.data?.message || error?.error || error?.message
  if (status === 401) return 'Your session expired. Please log in again to view your cart.'
  if (status === 403) return 'You are not allowed to access this cart. Please sign in again.'
  if (status === 'FETCH_ERROR' || String(message || '').toLowerCase().includes('fetch failed'))
    return 'Cannot reach the cart server. Make sure the backend is running on port 5000 and try again.'
  if (status === 'PARSING_ERROR') return 'The cart server returned an invalid response. Please restart the backend and try again.'
  if (typeof message === 'string' && message.trim()) return message
  return 'Unable to load your cart right now.'
}

const Cart = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [guestCartItems, setGuestCartItems] = useState([])
  const [cartError, setCartError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const token = localStorage.getItem('token')

  const { data: cart, isLoading, isError, error, refetch } = useGetCartQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  })
  const [updateCartItem, { isLoading: isUpdating }] = useUpdateCartItemMutation()
  const [removeFromCart, { isLoading: isRemoving }] = useRemoveFromCartMutation()
  const [clearCart, { isLoading: isClearing }] = useClearCartMutation()

  useEffect(() => {
    if (!token) {
      const savedCart = localStorage.getItem('cart')
      setGuestCartItems(savedCart ? JSON.parse(savedCart) : [])
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    if (isError) {
      if (cart && Array.isArray(cart) && cart.length > 0) {
        setCartError(getCartLoadErrorMessage(error))
        if (retryCount < 2) {
          const tid = setTimeout(() => { refetch(); setRetryCount((c) => c + 1) }, 900)
          return () => clearTimeout(tid)
        }
      }
    } else {
      setCartError('')
    }
  }, [isError, cart, error, token, refetch, retryCount])

  const syncGuestCart = (nextCart) => {
    setGuestCartItems(nextCart)
    localStorage.setItem('cart', JSON.stringify(nextCart))
    window.dispatchEvent(new Event('cart-change'))
  }

  const cartItems = token ? cart || [] : guestCartItems
  const isBusy = token && (isUpdating || isRemoving || isClearing)

  const hasStockIssue = useMemo(
    () => cartItems.some((item) => {
      const limit = Number(item.quantity_in_stock)
      return Number.isFinite(limit) && limit < Number(item.quantity)
    }),
    [cartItems]
  )

  const summary = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.selling_price) * Number(item.quantity), 0)
    const itemCount = cartItems.reduce((sum, item) => sum + Number(item.quantity), 0)
    const shipping = subtotal > 250 || subtotal === 0 ? 0 : 12
    const tax = subtotal * 0.08
    const total = subtotal + shipping + tax
    return { subtotal, itemCount, shipping, tax, total }
  }, [cartItems])

  const formatPrice = (value) => etbFormatter.format(Number(value) || 0)

  const handleQuantityChange = async (item, nextQuantity) => {
    if (nextQuantity < 1) { await handleRemoveItem(item.id); return }
    const stockLimit = Number(item.quantity_in_stock)
    if (Number.isFinite(stockLimit)) {
      if (stockLimit <= 0) { setCartError(`${item.name} is out of stock.`); return }
      if (nextQuantity > stockLimit) { setCartError(`Only ${stockLimit} left in stock for ${item.name}.`); return }
    }
    if (!token) { syncGuestCart(cartItems.map((c) => c.id === item.id ? { ...c, quantity: nextQuantity } : c)); return }
    try { await updateCartItem({ id: item.id, quantity: nextQuantity }).unwrap() }
    catch (e) { setCartError(getReadableError(e, 'Unable to update quantity.')) }
  }

  const handleRemoveItem = async (itemId) => {
    if (!token) { syncGuestCart(cartItems.filter((c) => c.id !== itemId)); return }
    try { await removeFromCart(itemId).unwrap() }
    catch (e) { setCartError(getReadableError(e, 'Unable to remove item.')) }
  }

  const handleClearCart = async () => {
    if (cartItems.length === 0) return
    if (!token) { syncGuestCart([]); return }
    try { await clearCart().unwrap() }
    catch (e) { setCartError(getReadableError(e, 'Unable to clear cart.')) }
  }

  const handleProceedToPayment = () => {
    if (!token) { navigate('/login'); return }
    if (hasStockIssue) { setCartError('Some items are out of stock. Update your cart to continue.'); return }
    navigate('/screenshot-payment')
  }

  if (token && isLoading) {
    return (
      <div className="cart-loading">
        <RefreshCw size={30} className="loading-spinner" />
        <p>{t('cart.loading')}</p>
      </div>
    )
  }

  if (token && isError && !(cart && Array.isArray(cart) && cart.length > 0)) {
    return (
      <div className="cart-error-state">
        <h2>{t('cart.loadError')}</h2>
        <p>{getCartLoadErrorMessage(error)}</p>
        <button onClick={refetch} className="retry-cart-btn">{t('common.tryAgain')}</button>
      </div>
    )
  }

  return (
    <div className="cart">
      <div className="cart-hero">
        <div className="cart-hero-glow" />
        <div className="cart-hero-content">
          <div>
            <span className="cart-badge">
              <Sparkles size={16} />
              {t('cart.smartCart')}
            </span>
            <h1 className="cart-title">{t('cart.title')}</h1>
            <p className="cart-subtitle">{t('cart.subtitle')}</p>
          </div>
          <div className="cart-hero-chip">
            <ShoppingCart size={18} />
            <span>{t('common.items', { count: summary.itemCount })}</span>
          </div>
        </div>
      </div>

      <div className="cart-content container">
        {cartError && (
          <div className="payment-feedback payment-feedback-error">{cartError}</div>
        )}

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-icon-wrap"><ShoppingBag size={34} /></div>
            <h2>{t('cart.empty')}</h2>
            <p>{t('cart.emptyHint')}</p>
            <button onClick={() => navigate('/shop')} className="go-shop-btn">
              {t('cart.goToShop')} <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="cart-grid">
            {/* Items */}
            <div className="cart-items-panel">
              <div className="cart-items-header">
                <h2>{t('cart.cartItems')}</h2>
                <button type="button" className="clear-cart-btn" onClick={handleClearCart} disabled={isBusy}>
                  <Trash2 size={16} /> {t('cart.clearCart')}
                </button>
              </div>

              <div className="cart-items">
                {cartItems.map((item) => {
                  const unitPrice = Number(item.selling_price)
                  const quantity = Number(item.quantity)
                  const stockLimit = Number(item.quantity_in_stock)
                  const hasStockLimit = Number.isFinite(stockLimit)
                  const isOutOfStock = hasStockLimit && stockLimit <= 0
                  const isOverStock = hasStockLimit && quantity > stockLimit
                  const showStockHint = hasStockLimit && (stockLimit <= 5 || isOverStock || quantity >= stockLimit)

                  return (
                    <motion.div key={item.id} className="cart-item" layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <img src={item.image_url || 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=300'} alt={item.name} />
                      <div className="cart-item-details">
                        <h3>{item.name}</h3>
                        <p className="item-brand">{item.brand || t('common.premiumCollection')}</p>
                        <p className="item-unit-price">{formatPrice(unitPrice)} {t('cart.each')}</p>
                        {showStockHint && (
                          <p className={`item-stock ${isOutOfStock || isOverStock ? 'item-stock-error' : ''}`}>
                            {isOutOfStock ? t('common.outOfStock') : isOverStock ? t('shop.onlyLeft', { count: stockLimit }) : t('shop.leftInStock', { count: stockLimit })}
                          </p>
                        )}
                      </div>
                      <div className="cart-item-actions">
                        <div className="quantity-controls">
                          <button type="button" onClick={() => handleQuantityChange(item, quantity - 1)} disabled={isBusy}><Minus size={14} /></button>
                          <span>{quantity}</span>
                          <button type="button" onClick={() => handleQuantityChange(item, quantity + 1)} disabled={isBusy || (hasStockLimit && quantity >= stockLimit)}><Plus size={14} /></button>
                        </div>
                        <div className="item-total">{formatPrice(unitPrice * quantity)}</div>
                        <button type="button" className="remove-item-btn" onClick={() => handleRemoveItem(item.id)} disabled={isBusy}>
                          <Trash2 size={16} /> {t('common.remove')}
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <aside className="cart-summary-panel">
              <h3>{t('cart.orderSummary')}</h3>

              <div className="summary-row">
                <span>{t('common.items', { count: summary.itemCount })}</span>
                <strong>{formatPrice(summary.subtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>{t('cart.shipping')}</span>
                <strong>{summary.shipping === 0 ? t('common.free') : formatPrice(summary.shipping)}</strong>
              </div>
              <div className="summary-row">
                <span>{t('cart.estimatedTax')}</span>
                <strong>{formatPrice(summary.tax)}</strong>
              </div>

              <div className="summary-total">
                <span>{t('cart.total')}</span>
                <strong>{formatPrice(summary.total)}</strong>
              </div>

              {/* Single payment action — manual bank transfer */}
              <button
                className="checkout-btn"
                type="button"
                disabled={isBusy}
                onClick={handleProceedToPayment}
              >
                <Upload size={18} />
                {token ? 'Pay via Bank Transfer' : 'Sign In to Checkout'}
                <ArrowRight size={16} />
              </button>

              <div className="summary-note">
                <Upload size={15} />
                <span>Transfer the total to our bank account, then upload your payment screenshot for verification.</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cart
