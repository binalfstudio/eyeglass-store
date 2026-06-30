import { useState, useEffect, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useGetEyeglassesQuery } from '../redux/api/eyeglasses'
import { useGetCategoriesQuery } from '../redux/api/categories'
import { useAddToCartMutation } from '../redux/api/cart'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { 
  ShoppingBag, 
  X, 
  Heart, 
  Star,
  Search,
  Sparkles,
  ChevronRight,
  Zap,
  TrendingUp,
  Glasses,
  Gem,
  ArrowUp,
  Truck,
  Shield,
  RefreshCw,
  Headphones,
  Filter,
  SlidersHorizontal,
  Eye
} from 'lucide-react'
import './Shop.css'
import TryOn from '../components/TryOn'

const gradientColors = [
  'linear-gradient(to top, #3b82f6ee 0%, #3b82f6cc 40%, transparent 100%)',
  'linear-gradient(to top, #ec4899ee 0%, #ec4899cc 40%, transparent 100%)',
  'linear-gradient(to top, #f59e0bee 0%, #f59e0bcc 40%, transparent 100%)',
  'linear-gradient(to top, #10b981ee 0%, #10b981cc 40%, transparent 100%)',
  'linear-gradient(to top, #8b5cf6ee 0%, #8b5cf6cc 40%, transparent 100%)',
  'linear-gradient(to top, #ea580cee 0%, #ea580ccc 40%, transparent 100%)',
  'linear-gradient(to top, #06b6d4ee 0%, #06b6d4cc 40%, transparent 100%)',
  'linear-gradient(to top, #f43f5eee 0%, #f43f5ecc 40%, transparent 100%)'
]

const etbFormatter = new Intl.NumberFormat('en-ET', {
  style: 'currency',
  currency: 'ETB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const getValidImageUrl = (url, fallback) => {
  if (typeof url === 'string' && url.trim().startsWith('http')) {
    return url
  }
  return fallback
}

const excludedProductNames = new Set([
  'sports active frame',
  'modern rectangular',
  'modern rectangular glass',
])

const getApiErrorMessage = (error, t) => {
  const status = error?.status
  const message = error?.data?.message || error?.error || t('shop.loadFailed')
  const detail = error?.data?.detail

  if (status === 'FETCH_ERROR' || String(message).toLowerCase().includes('fetch failed')) {
    return t('shop.serverUnreachable')
  }

  if (message === 'Database not connected' || detail?.toLowerCase?.().includes('mysql')) {
    return detail ? `${message}: ${detail}` : message
  }

  return detail ? `${message}: ${detail}` : message
}

const Shop = () => {
  const { t } = useTranslation()
  const { data: eyeglasses, isLoading, error } = useGetEyeglassesQuery()
  const { data: categories, error: categoriesError } = useGetCategoriesQuery()
  const [addToCartApi] = useAddToCartMutation()
  const prefersReducedMotion = useReducedMotion()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [tryOnProduct, setTryOnProduct] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [cart, setCart] = useState([])
  const [isCategoryPaused, setIsCategoryPaused] = useState(false)

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('favorites')
      const parsedFavorites = savedFavorites ? JSON.parse(savedFavorites) : []
      setFavorites(Array.isArray(parsedFavorites) ? parsedFavorites : [])
    } catch {
      localStorage.removeItem('favorites')
      setFavorites([])
    }

    try {
      const savedCart = localStorage.getItem('cart')
      const parsedCart = savedCart ? JSON.parse(savedCart) : []
      setCart(Array.isArray(parsedCart) ? parsedCart : [])
    } catch {
      localStorage.removeItem('cart')
      setCart([])
    }
  }, [])

  const visibleEyeglasses = useMemo(
    () =>
      (eyeglasses || []).filter(
        (product) => !excludedProductNames.has((product.name || '').toLowerCase().trim())
      ),
    [eyeglasses]
  )

  const filteredProducts = visibleEyeglasses.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category_id === parseInt(selectedCategory)
    const productName = product.name || ''
    const productBrand = product.brand || ''
    const normalizedSearch = searchQuery.toLowerCase()
    const matchesSearch = productName.toLowerCase().includes(normalizedSearch) ||
                         productBrand.toLowerCase().includes(normalizedSearch)
    return matchesCategory && matchesSearch
  })

  const categoryList = categories || []
  const shouldLoopCategories = !prefersReducedMotion && categoryList.length > 2
  const categoryTrack = useMemo(
    () => (shouldLoopCategories ? [...categoryList, ...categoryList] : categoryList),
    [categoryList, shouldLoopCategories]
  )
  const categoryLoopDuration = Math.max(18, categoryList.length * 4)

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId.toString())
  }

  const toggleFavorite = (productId) => {
    const newFavorites = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId]
    setFavorites(newFavorites)
    localStorage.setItem('favorites', JSON.stringify(newFavorites))
  }

  const showCartNotification = (message) => {
    const notification = document.createElement('div')
    notification.className = 'cart-notification'
    const icon = document.createElement('span')
    icon.textContent = '✓'
    const text = document.createElement('span')
    text.textContent = ` ${message}`
    notification.append(icon, text)
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 2000)
  }

  const addToCart = async (product) => {
    const token = localStorage.getItem('token')
    const stockLimit = Number(product.quantity_in_stock)
    const hasStockLimit = Number.isFinite(stockLimit)

    if (hasStockLimit && stockLimit <= 0) {
      showCartNotification(`${product.name} is out of stock.`)
      return
    }

    if (token) {
      try {
        await addToCartApi({ eyeglass_id: product.id, quantity: 1 }).unwrap()
        window.dispatchEvent(new Event('cart-change'))
        showCartNotification(t('common.addedToCart'))
        return
      } catch (apiError) {
        const message = apiError?.data?.message || 'Unable to add this item right now.'
        showCartNotification(message)
        return
      }
    }

    const existingItem = cart.find(item => item.id === product.id)
    if (hasStockLimit && existingItem && existingItem.quantity >= stockLimit) {
      showCartNotification(`Only ${stockLimit} left in stock for ${product.name}.`)
      return
    }
    let newCart
    if (existingItem) {
      newCart = cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      )
    } else {
      newCart = [...cart, { ...product, quantity: 1 }]
    }
    setCart(newCart)
    localStorage.setItem('cart', JSON.stringify(newCart))
    window.dispatchEvent(new Event('cart-change'))
    showCartNotification(t('common.addedToCart'))
  }

  const formatPrice = (value) => etbFormatter.format(Number(value) || 0)

  if (isLoading) {
    return (
      <div className="shop-loading">
        <div className="shop-loading-content">
          <motion.div 
            className="shop-spinner-container"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Glasses size={48} className="spinner-icon" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="loading-text">{t('shop.loading')}</p>
            <div className="loading-dots">
              <motion.span 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              />
              <motion.span 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
              <motion.span 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          </motion.div>
        </div>
        {/* Skeleton Grid */}
        <div className="skeleton-grid">
          {[...Array(8)].map((_, i) => (
            <motion.div 
              key={i}
              className="skeleton-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="skeleton-image shimmer" />
              <div className="skeleton-content">
                <div className="skeleton-line shimmer" style={{ width: '70%' }} />
                <div className="skeleton-line shimmer" style={{ width: '40%' }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const apiError = error || categoriesError

  if (apiError) {
    const errorMessage = getApiErrorMessage(apiError, t)

    return (
      <div className="shop-error">
        <Glasses size={44} />
        <h2>{apiError?.status === 'FETCH_ERROR' ? t('shop.serverError') : t('shop.dbError')}</h2>
        <p>{errorMessage}</p>
        <small>{apiError?.status === 'FETCH_ERROR' ? t('shop.serverErrorHint') : t('shop.dbErrorHint')}</small>
        <button onClick={() => window.location.reload()} className="retry-btn">{t('common.tryAgain')}</button>
      </div>
    )
  }

  return (
    <div className="shop">
      {/* Hero Section - New Layout with Background Image */}
      <motion.section 
        className="shop-hero-v2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Background Image with Overlay */}
        <div className="hero-bg-container">
          <img 
            src="https://images.unsplash.com/photo-1509695507497-903c140c43b0?w=1920&q=80&auto=format&fit=crop" 
            alt="Background" 
            className="hero-bg-image"
          />
          <div className="hero-bg-overlay"></div>
          <div className="hero-bg-gradient"></div>
        </div>

        {/* Floating Decorative Elements */}
        <motion.div 
          className="floating-shape shape-1"
          animate={{ 
            y: [-30, 30, -30],
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="floating-shape shape-2"
          animate={{ 
            y: [30, -30, 30],
            rotate: [0, -15, 15, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="floating-shape shape-3"
          animate={{ 
            x: [-20, 20, -20],
            y: [-20, 20, -20]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="hero-content-wrapper">
          {/* Left Content */}
          <motion.div 
            className="hero-left-content"
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
          >
            <motion.div 
              className="hero-badge-v2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={18} />
              </motion.div>
              <span>{t('shop.newCollection')}</span>
            </motion.div>

            <motion.h1 
              className="hero-title-v2"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <span className="title-line">{t('shop.heroLine1')}</span>
              <span className="title-line highlight-gradient">{t('shop.heroLine2')}</span>
              <span className="title-line">{t('shop.heroLine3')}</span>
            </motion.h1>

            <motion.p 
              className="hero-desc-v2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {t('shop.heroDesc')}
            </motion.p>

            <motion.div 
              className="hero-cta-group"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              <motion.button 
                className="cta-primary"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.querySelector('.products-grid')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <ShoppingBag size={20} />
                {t('shop.shopNow')}
              </motion.button>
              <motion.button 
                className="cta-secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Glasses size={20} />
                {t('shop.viewCollection')}
              </motion.button>
            </motion.div>

            <motion.div 
              className="hero-stats-v2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <div className="stat-box">
                <motion.span 
                  className="stat-value"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                >
                  {visibleEyeglasses.length || 0}+
                </motion.span>
                <span className="stat-text">{t('shop.premiumStyles')}</span>
              </div>
              <div className="stat-box">
                <motion.span 
                  className="stat-value"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  50K+
                </motion.span>
                <span className="stat-text">{t('shop.happyCustomers')}</span>
              </div>
              <div className="stat-box">
                <motion.span 
                  className="stat-value"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                >
                  4.9
                </motion.span>
                <span className="stat-text">{t('shop.rating')}</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="scroll-indicator-v2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronRight size={24} style={{ transform: 'rotate(90deg)' }} />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Category Showcase Section */}
      <motion.section 
        className="category-showcase"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="section-header">
          <motion.span 
            className="section-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Sparkles size={16} />
            {t('shop.browseCategory')}
          </motion.span>
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {t('shop.findStyle')}
          </motion.h2>
        </div>
        
        <div className="category-row-shell">
          <div className="category-row-edge left" aria-hidden="true" />
          <div className="category-row-edge right" aria-hidden="true" />
          <motion.div
            className="category-row-track"
            animate={shouldLoopCategories && !isCategoryPaused ? { x: ['0%', '-50%'] } : { x: '0%' }}
            transition={
              shouldLoopCategories
                ? {
                    duration: categoryLoopDuration,
                    repeat: Infinity,
                    repeatType: 'loop',
                    ease: 'linear'
                  }
                : { duration: 0.4 }
            }
            onHoverStart={() => setIsCategoryPaused(true)}
            onHoverEnd={() => setIsCategoryPaused(false)}
            onFocusCapture={() => setIsCategoryPaused(true)}
            onBlurCapture={() => setIsCategoryPaused(false)}
            onTouchStart={() => setIsCategoryPaused(true)}
            onTouchEnd={() => setIsCategoryPaused(false)}
          >
          {categoryTrack.map((category, index) => (
            <motion.div
              key={`${category.id}-${index}`}
              className={`category-card ${selectedCategory === category.id.toString() ? 'active' : ''}`}
              onClick={() => handleCategorySelect(category.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleCategorySelect(category.id)
                }
              }}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: (index % Math.max(categoryList.length, 1)) * 0.08, type: 'spring' }}
              whileHover={{ 
                y: -10, 
                scale: 1.03,
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="category-card-image">
                <img 
                  src={category.image_url || `https://images.unsplash.com/photo-${[
                    '1574258495973-f010dfbb5371',
                    '1509695507497-903c140c43b0',
                    '1591076482161-42ce6da69f67',
                    '1511499760120',
                  ][index % 4]}?w=400&q=80`}
                  alt={category.name}
                />
                <div className="category-overlay">
                  <motion.div 
                    className="category-icon"
                    whileHover={{ rotate: 360, scale: 1.2 }}
                    transition={{ duration: 0.5 }}
                  >
                    {index % 4 === 0 && <Glasses size={32} />}
                    {index % 4 === 1 && <Sparkles size={32} />}
                    {index % 4 === 2 && <Star size={32} />}
                    {index % 4 === 3 && <Zap size={32} />}
                  </motion.div>
                </div>
              </div>
              <div className="category-card-content">
                <h3>{category.name}</h3>
                <p>{t('shop.productsCount', { count: visibleEyeglasses.filter(p => p.category_id === category.id).length || 0 })}</p>
                <motion.button 
                  className="explore-btn"
                  whileHover={{ x: 5 }}
                >
                  {t('shop.explore')} <ChevronRight size={16} />
                </motion.button>
              </div>
              {selectedCategory === category.id.toString() && (
                <motion.div 
                  className="active-indicator"
                  initial={{ scaleX: 0.2, opacity: 0.6 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                />
              )}
            </motion.div>
          ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Benefits Section */}
      <motion.section 
        className="benefits-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="benefits-grid">
          {[
            { icon: Truck, title: t('shop.benefits.shipping.title'), desc: t('shop.benefits.shipping.desc', { amount: formatPrice(100) }), color: '#10b981' },
            { icon: Shield, title: t('shop.benefits.warranty.title'), desc: t('shop.benefits.warranty.desc'), color: '#6366f1' },
            { icon: RefreshCw, title: t('shop.benefits.returns.title'), desc: t('shop.benefits.returns.desc'), color: '#ec4899' },
            { icon: Headphones, title: t('shop.benefits.support.title'), desc: t('shop.benefits.support.desc'), color: '#f59e0b' },
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              className="benefit-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <motion.div 
                className="benefit-icon"
                style={{ background: `linear-gradient(135deg, ${benefit.color}20, ${benefit.color}40)` }}
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <benefit.icon size={28} style={{ color: benefit.color }} />
              </motion.div>
              <h4>{benefit.title}</h4>
              <p>{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Filters & Search - Enhanced */}
      <motion.div 
        className="shop-controls"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6, type: "spring" }}
      >
        <div className="shop-controls-container">
          <motion.div 
            className="shop-search"
            whileFocus={{ scale: 1.02 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Search size={20} />
            </motion.div>
            <input
              type="text"
              placeholder={t('shop.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <motion.button
                className="search-clear"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                onClick={() => setSearchQuery('')}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={16} />
              </motion.button>
            )}
          </motion.div>

          <motion.div 
            className="category-pills"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            <motion.button
              className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              layout
            >
              <motion.span
                initial={false}
                animate={{ 
                  background: selectedCategory === 'all' 
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                    : 'transparent'
                }}
              >
                {t('shop.allStyles')}
              </motion.span>
              {selectedCategory === 'all' && (
                <motion.div
                  className="pill-active-indicator"
                  layoutId="activePill"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
            {categories?.map((category, index) => (
              <motion.button
                key={category.id}
                className={`category-pill ${selectedCategory === category.id.toString() ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id.toString())}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + index * 0.1 }}
              >
                {category.name}
                {selectedCategory === category.id.toString() && (
                  <motion.div
                    className="pill-active-indicator"
                    layoutId="activePill"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Results */}
      <div className="shop-results">
        <p><Trans i18nKey="shop.showingProducts" values={{ count: filteredProducts?.length || 0 }} components={{ strong: <strong /> }} /></p>
      </div>

      {/* Products Grid - Enhanced with Better Animations */}
      <motion.div 
        className="products-grid"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { 
            opacity: 1, 
            transition: { 
              staggerChildren: 0.08,
              delayChildren: 0.2
            } 
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {filteredProducts?.map((product, index) => {
            const gradient = gradientColors[index % gradientColors.length]
            return (
            <motion.div
              key={product.id}
              className="product-card"
              layout
              variants={{
                hidden: { 
                  opacity: 0, 
                  y: 50,
                  scale: 0.9
                },
                visible: { 
                  opacity: 1, 
                  y: 0,
                  scale: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 100,
                    damping: 12,
                    delay: index * 0.05
                  }
                }
              }}
              whileHover={{ 
                y: -12, 
                scale: 1.03,
                transition: { type: 'spring', stiffness: 300, damping: 20 }
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="product-card-image">
                <motion.img 
                  src={getValidImageUrl(product.image_url, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&auto=format&fit=crop')} 
                  alt={product.name || 'Eyeglass product'}
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                />
                
                <motion.div 
                  className="product-card-overlay" 
                  style={{ background: gradient }}
                  initial={{ opacity: 0.8 }}
                  whileHover={{ opacity: 1 }}
                >
                  <div className="product-card-content">
                    <motion.h3 
                      className="product-card-name"
                      initial={{ y: 10, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {product.name}
                    </motion.h3>
                    <motion.p 
                      className="product-card-count"
                      initial={{ y: 10, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {formatPrice(product.selling_price)}
                    </motion.p>
                    <motion.button 
                      className="product-card-link"
                      onClick={() => setQuickViewProduct(product)}
                      whileHover={{ x: 5, gap: '0.5rem' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t('shop.viewDetails')} <ChevronRight size={16} />
                    </motion.button>
                  </div>
                </motion.div>

                <motion.div 
                  className="product-badges-overlay"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  {product.prescription_required && (
                    <motion.span 
                      className="badge prescription"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      {t('common.rxRequired')}
                    </motion.span>
                  )}
                  {product.quantity_in_stock < 10 && (
                    <motion.span 
                      className="badge low-stock"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
                    >
                      {t('common.lowStock')}
                    </motion.span>
                  )}
                </motion.div>

                <motion.button 
                  className={`wishlist-btn-overlay ${favorites.includes(product.id) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(product.id)
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.05, type: "spring" }}
                  whileHover={{ scale: 1.15, rotate: 15 }}
                  whileTap={{ scale: 0.85 }}
                >
                  <Heart 
                    size={18} 
                    fill={favorites.includes(product.id) ? "currentColor" : "none"}
                    className={favorites.includes(product.id) ? "heart-pulse" : ""}
                  />
                </motion.button>
              </div>
            </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty State - Enhanced */}
      {filteredProducts?.length === 0 && (
        <motion.div 
          className="empty-state"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="empty-icon"
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            🔍
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t('shop.noProducts')}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {t('shop.noProductsHint')}
          </motion.p>
          <motion.button 
            onClick={() => {setSelectedCategory('all'); setSearchQuery('')}} 
            className="clear-filters-btn"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)' }}
            whileTap={{ scale: 0.95 }}
          >
            {t('shop.clearFilters')}
          </motion.button>
        </motion.div>
      )}

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewProduct && (
          <motion.div 
            className="quick-view-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQuickViewProduct(null)}
          >
            <motion.div 
              className="quick-view-modal"
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setQuickViewProduct(null)}>
                <X size={24} />
              </button>
              <div className="quick-view-content">
                <div className="quick-view-image">
                  <img 
                    src={getValidImageUrl(quickViewProduct.image_url, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&auto=format&fit=crop')} 
                    alt={quickViewProduct.name}
                  />
                </div>
                
                <div className="quick-view-details">
                  <h2>{quickViewProduct.name}</h2>
                  <p className="quick-view-brand">{quickViewProduct.brand}</p>
                  
                  <div className="quick-view-price">
                    <span className="price">{formatPrice(quickViewProduct.selling_price)}</span>
                  </div>
                  
                  <div className="quick-view-specs">
                    <div className="spec-row">
                      <span>{t('shop.frameType')}</span>
                      <strong>{quickViewProduct.frame_type}</strong>
                    </div>
                    <div className="spec-row">
                      <span>{t('shop.frameMaterial')}</span>
                      <strong>{quickViewProduct.frame_material}</strong>
                    </div>
                    <div className="spec-row">
                      <span>{t('shop.lensType')}</span>
                      <strong>{quickViewProduct.lens_type}</strong>
                    </div>
                  </div>
                  
                  <p className="quick-view-description">{quickViewProduct.description}</p>
                  
                  <div className="quick-view-actions">
                    <motion.button 
                      className="add-to-cart-large"
                      onClick={() => {
                        addToCart(quickViewProduct)
                        setQuickViewProduct(null)
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ShoppingBag size={20} />
                      {t('home.addToCart')}
                    </motion.button>
                    
                    <motion.button 
                      className={`favorite-large ${favorites.includes(quickViewProduct.id) ? 'active' : ''}`}
                      onClick={() => toggleFavorite(quickViewProduct.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Heart size={20} fill={favorites.includes(quickViewProduct.id) ? "currentColor" : "none"} />
                    </motion.button>

                    <motion.button
                      className="tryon-large"
                      onClick={() => {
                        setTryOnProduct(quickViewProduct)
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {t('shop.tryOn')}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Featured Products Section */}
      <motion.section 
        className="featured-products-section"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="section-header">
          <motion.span 
            className="section-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Star size={16} fill="currentColor" />
            {t('shop.featuredCollection')}
          </motion.span>
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {t('shop.editorsPicks')}
          </motion.h2>
        </div>
        
        <div className="featured-products-grid">
          {visibleEyeglasses.slice(0, 4).map((product, index) => (
            <motion.div
              key={`featured-${product.id}`}
              className="featured-product-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              whileHover={{ y: -10, scale: 1.02 }}
              onClick={() => setQuickViewProduct(product)}
            >
              <div className="featured-badge">
                <Sparkles size={14} />
                {t('shop.featured')}
              </div>
              <div className="featured-image">
                <img src={product.image_url} alt={product.name} />
                <motion.div 
                  className="featured-overlay"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      addToCart(product)
                    }}
                  >
                    <ShoppingBag size={20} />
                    Add to Cart
                  </motion.button>
                </motion.div>
              </div>
              <div className="featured-content">
                <h4>{product.name}</h4>
                <p>{product.brand}</p>
                <span className="featured-price">{formatPrice(product.selling_price)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Brand Showcase */}
      <motion.section 
        className="brand-showcase"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="section-header">
          <h3>{t('shop.trustedBrands')}</h3>
        </div>
        <div className="brand-marquee">
          <motion.div 
            className="brand-track"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 20,
                ease: "linear",
              }
            }}
          >
            {['Ray-Ban', 'Oakley', 'Gucci', 'Prada', 'Versace', 'Burberry', 'Tom Ford', 'Persol'].map((brand, i) => (
              <div key={i} className="brand-item">
                <span>{brand}</span>
              </div>
            ))}
            {['Ray-Ban', 'Oakley', 'Gucci', 'Prada', 'Versace', 'Burberry', 'Tom Ford', 'Persol'].map((brand, i) => (
              <div key={`dup-${i}`} className="brand-item">
                <span>{brand}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Newsletter Section */}
      <motion.section 
        className="newsletter-section"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="newsletter-container">
          <motion.div 
            className="newsletter-content"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h3>{t('shop.stayInLoop')}</h3>
            <p>{t('shop.newsletterDesc')}</p>
          </motion.div>
          <motion.form 
            className="newsletter-form"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            onSubmit={(e) => e.preventDefault()}
          >
            <input type="email" placeholder={t('common.emailPlaceholder')} required />
            <motion.button 
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('common.subscribe')}
            </motion.button>
          </motion.form>
        </div>
      </motion.section>

      {/* Back to Top Button */}
      <motion.button
        className="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1, y: -5 }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ArrowUp size={24} />
        </motion.div>
      </motion.button>
      {tryOnProduct && (
        <TryOn
          product={tryOnProduct}
          productImage={tryOnProduct.image_url || tryOnProduct.image}
          onClose={() => setTryOnProduct(null)}
        />
      )}
    </div>
  )
}

export default Shop
