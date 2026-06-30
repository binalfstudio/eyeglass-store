import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { 
  ArrowRight, 
  Sparkles, 
  Truck, 
  Shield, 
  Headphones, 
  Glasses,
  Star,
  Zap,
  Heart,
  ShoppingBag,
  Quote,
  Mail,
  ChevronRight
} from 'lucide-react'
import './Home.css'

const Home = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  }

  const features = useMemo(() => [
    { icon: Sparkles, title: t('home.features.quality.title'), desc: t('home.features.quality.desc'), color: '#6366f1' },
    { icon: Truck, title: t('home.features.delivery.title'), desc: t('home.features.delivery.desc'), color: '#ec4899' },
    { icon: Shield, title: t('home.features.payment.title'), desc: t('home.features.payment.desc'), color: '#10b981' },
    { icon: Headphones, title: t('home.features.support.title'), desc: t('home.features.support.desc'), color: '#f59e0b' }
  ], [t])

  const categories = useMemo(() => [
    { id: 1, name: t('home.categories.mens'), image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=500&auto=format&fit=crop', count: '45 ' + t('common.products'), color: '#3b82f6' },
    { id: 2, name: t('home.categories.womens'), image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=500&auto=format&fit=crop', count: '52 ' + t('common.products'), color: '#ec4899' },
    { id: 3, name: t('home.categories.kids'), image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=500&auto=format&fit=crop', count: '28 ' + t('common.products'), color: '#f59e0b' },
    { id: 4, name: t('home.categories.sunglasses'), image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=500&auto=format&auto=format&fit=crop', count: '36 ' + t('common.products'), color: '#10b981' }
  ], [t])

  const featuredProducts = [
    { id: 1, name: 'Classic Round Frame', price: 129, originalPrice: 169, rating: 4.8, reviews: 124, image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=400&auto=format&fit=crop', badgeKey: 'bestseller' },
    { id: 2, name: 'Modern Rectangular', price: 149, originalPrice: 199, rating: 4.9, reviews: 89, image: 'https://images.unsplash.com/photo-1483412468200-72182dbbc544?q=80&w=1173&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', badgeKey: 'new' },
    { id: 3, name: 'Vintage Cat Eye', price: 159, originalPrice: 209, rating: 4.7, reviews: 67, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&auto=format&fit=crop', badgeKey: null },
    { id: 4, name: 'Titanium Ultra-Light', price: 199, originalPrice: 259, rating: 4.9, reviews: 156, image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=400&auto=format&auto=format&fit=crop', badgeKey: 'premium' }
  ]

  const stats = useMemo(() => [
    { value: '50K+', label: t('home.stats.customers') },
    { value: '10K+', label: t('home.stats.products') },
    { value: '4.9', label: t('home.stats.rating') },
    { value: '24/7', label: t('home.stats.support') }
  ], [t])

  const testimonials = [
    { id: 1, name: 'Sarah Johnson', role: 'Fashion Designer', avatar: 'SJ', content: 'The quality of these glasses is exceptional. I\'ve received so many compliments!', rating: 5 },
    { id: 2, name: 'Michael Chen', role: 'Software Engineer', avatar: 'MC', content: 'Best online glasses shopping experience. Fast shipping and perfect fit.', rating: 5 },
    { id: 3, name: 'Emma Williams', role: 'Marketing Manager', avatar: 'EW', content: 'Affordable prices without compromising on style. Highly recommend!', rating: 5 }
  ]

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <img
            src="https://images.unsplash.com/photo-1509695507497-903c140c43b0?w=1920&q=80"
            alt="Premium eyewear background"
            className="hero-bg-image"
          />
          <div className="hero-overlay" />
          <div className="hero-gradient" />
          <div className="hero-pattern" />
          <div className="hero-shape hero-shape-1" />
          <div className="hero-shape hero-shape-2" />
          <div className="hero-shape hero-shape-3" />
        </div>
        
        <div className="hero-content">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="hero-text"
          >
            <motion.div variants={itemVariants} className="hero-badge">
              <Sparkles size={16} />
              <span>{t('home.newCollection')}</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="hero-title">
              {t('home.heroTitle')}
              <span className="gradient-text">{t('home.heroTitleHighlight')}</span>
              {t('home.heroTitleEnd')}
            </motion.h1>
            
            <motion.p variants={itemVariants} className="hero-desc">
              {t('home.heroDesc')}
            </motion.p>
            
            <motion.div variants={itemVariants} className="hero-buttons">
              <motion.button 
                className="btn btn-primary hero-cta"
                onClick={() => navigate('/shop')}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('common.shopNow')}
                <ArrowRight size={20} />
              </motion.button>
              
              <motion.button 
                className="btn btn-secondary"
                onClick={() => navigate('/shop')}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('common.exploreCollection')}
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="hero-stats">
              {stats.map((stat, index) => (
                <div key={index} className="stat-item">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="scroll-indicator"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="scroll-mouse">
            <div className="scroll-wheel" />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-header"
          >
            <span className="section-subtitle">{t('home.whyUs')}</span>
            <h2 className="section-title">{t('home.experienceDiff')}</h2>
          </motion.div>

          <motion.div
            className="features-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                variants={itemVariants}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
              >
                <div className="feature-icon" style={{ background: `linear-gradient(135deg, ${feature.color}20 0%, ${feature.color}40 100%)`, color: feature.color }}>
                  <feature.icon size={28} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                <motion.div 
                  className="feature-glow"
                  style={{ background: feature.color }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-bg">
          <div className="cta-gradient" />
        </div>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="cta-content"
          >
            <h2>{t('home.ctaTitle')}</h2>
            <p>{t('home.ctaDesc')}</p>
            <motion.button 
              className="btn btn-white"
              onClick={() => navigate('/shop')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('home.startShopping')}
              <ArrowRight size={20} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Featured Categories Section */}
      <section className="categories-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-header"
          >
            <span className="section-subtitle">{t('home.browseCategory')}</span>
            <h2 className="section-title">{t('home.findStyle')}</h2>
          </motion.div>

          <motion.div
            className="categories-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {categories.map((category) => (
              <motion.div
                key={category.id}
                className="category-card"
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.02 }}
                onClick={() => navigate('/shop')}
              >
                <div className="category-image">
                  <img src={category.image} alt={category.name} />
                  <div className="category-overlay" style={{ background: `linear-gradient(to top, ${category.color}dd, transparent)` }}>
                    <div className="category-info">
                      <h3>{category.name}</h3>
                      <p>{category.count}</p>
                      <span className="category-link">
                        {t('common.shopNow')} <ChevronRight size={16} />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="featured-products-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-header"
          >
            <span className="section-subtitle">{t('home.featuredCollection')}</span>
            <h2 className="section-title">{t('home.popularPicks')}</h2>
          </motion.div>

          <motion.div
            className="featured-products-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {featuredProducts.map((product) => (
              <motion.div
                key={product.id}
                className="featured-product-card"
                variants={itemVariants}
                whileHover={{ y: -8 }}
              >
                {product.badgeKey && (
                  <span className="product-badge" style={{ 
                    background: product.badgeKey === 'bestseller' ? '#f59e0b' : 
                               product.badgeKey === 'new' ? '#10b981' : '#6366f1' 
                  }}>
                    {t(`home.badges.${product.badgeKey}`)}
                  </span>
                )}
                <button className="wishlist-btn">
                  <Heart size={18} />
                </button>
                <div className="featured-product-image">
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="featured-product-info">
                  <div className="featured-rating">
                    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                    <span>{product.rating}</span>
                    <span className="reviews">({product.reviews})</span>
                  </div>
                  <h3>{product.name}</h3>
                  <div className="featured-price">
                    <span className="current-price">${product.price}</span>
                    <span className="original-price">${product.originalPrice}</span>
                  </div>
                  <motion.button 
                    className="add-cart-btn"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ShoppingBag size={16} />
                    {t('home.addToCart')}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="view-all-btn-wrapper"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <motion.button 
              className="btn btn-outline"
              onClick={() => navigate('/shop')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('common.viewAll')}
              <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Promotional Banners */}
      <section className="promo-section">
        <div className="container">
          <div className="promo-grid">
            <motion.div 
              className="promo-card promo-large"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="promo-content">
                <span className="promo-label">{t('home.summerSale')}</span>
                <h3>{t('home.upTo50Off')}</h3>
                <p>{t('home.onSelectedFrames')}</p>
                <motion.button 
                  className="btn btn-promo"
                  onClick={() => navigate('/shop')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('home.shopSale')}
                  <Zap size={16} />
                </motion.button>
              </div>
              <div className="promo-image">
                <img src="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&h=400&auto=format&auto=format&fit=crop" alt="Sale" />
              </div>
            </motion.div>

            <motion.div 
              className="promo-card promo-small"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="promo-content">
                <span className="promo-label">{t('home.newArrivals')}</span>
                <h3>{t('home.collection2024')}</h3>
                <motion.button 
                  className="btn btn-promo-outline"
                  onClick={() => navigate('/shop')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('home.explore')}
                  <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-header"
          >
            <span className="section-subtitle">{t('home.testimonials')}</span>
            <h2 className="section-title">{t('home.whatCustomersSay')}</h2>
          </motion.div>

          <motion.div
            className="testimonials-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {testimonials.map((testimonial) => (
              <motion.div
                key={testimonial.id}
                className="testimonial-card"
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <Quote size={32} className="quote-icon" />
                <div className="testimonial-rating">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={16} fill="#f59e0b" stroke="#f59e0b" />
                  ))}
                </div>
                <p className="testimonial-content">{testimonial.content}</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{testimonial.avatar}</div>
                  <div className="author-info">
                    <h4>{testimonial.name}</h4>
                    <span>{testimonial.role}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section">
        <div className="container">
          <motion.div 
            className="newsletter-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="newsletter-content">
              <div className="newsletter-icon">
                <Mail size={32} />
              </div>
              <h2>{t('home.newsletterTitle')}</h2>
              <p>{t('home.newsletterDesc')}</p>
              <div className="newsletter-form">
                <input type="email" placeholder={t('common.emailPlaceholder')} />
                <motion.button 
                  className="btn btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('common.subscribe')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default Home
