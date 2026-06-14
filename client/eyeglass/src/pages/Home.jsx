import { useNavigate } from 'react-router-dom'
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

  const features = [
    { icon: Sparkles, title: 'Premium Quality', desc: 'High-quality frames and lenses for lasting durability', color: '#6366f1' },
    { icon: Truck, title: 'Fast Delivery', desc: 'Get your eyeglasses delivered within 2-3 business days', color: '#ec4899' },
    { icon: Shield, title: 'Secure Payment', desc: '100% secure checkout with multiple payment options', color: '#10b981' },
    { icon: Headphones, title: 'Expert Support', desc: 'Our opticians are here to help you choose the perfect pair', color: '#f59e0b' }
  ]

  const categories = [
    { id: 1, name: 'Men\'s Glasses', image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=500&auto=format&fit=crop', count: '45 Products', color: '#3b82f6' },
    { id: 2, name: 'Women\'s Glasses', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=500&auto=format&fit=crop', count: '52 Products', color: '#ec4899' },
    { id: 3, name: 'Kids Glasses', image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=500&auto=format&fit=crop', count: '28 Products', color: '#f59e0b' },
    { id: 4, name: 'Sunglasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=500&auto=format&auto=format&fit=crop', count: '36 Products', color: '#10b981' }
  ]

  const featuredProducts = [
    { id: 1, name: 'Classic Round Frame', price: 129, originalPrice: 169, rating: 4.8, reviews: 124, image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=400&auto=format&fit=crop', badge: 'Bestseller' },
    { id: 2, name: 'Modern Rectangular', price: 149, originalPrice: 199, rating: 4.9, reviews: 89, image: 'https://images.unsplash.com/photo-1483412468200-72182dbbc544?q=80&w=1173&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', badge: 'New' },
    { id: 3, name: 'Vintage Cat Eye', price: 159, originalPrice: 209, rating: 4.7, reviews: 67, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&auto=format&fit=crop', badge: null },
    { id: 4, name: 'Titanium Ultra-Light', price: 199, originalPrice: 259, rating: 4.9, reviews: 156, image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=400&auto=format&auto=format&fit=crop', badge: 'Premium' }
  ]

  const testimonials = [
    { id: 1, name: 'Sarah Johnson', role: 'Fashion Designer', avatar: 'SJ', content: 'The quality of these glasses is exceptional. I\'ve received so many compliments!', rating: 5 },
    { id: 2, name: 'Michael Chen', role: 'Software Engineer', avatar: 'MC', content: 'Best online glasses shopping experience. Fast shipping and perfect fit.', rating: 5 },
    { id: 3, name: 'Emma Williams', role: 'Marketing Manager', avatar: 'EW', content: 'Affordable prices without compromising on style. Highly recommend!', rating: 5 }
  ]

  const stats = [
    { value: '50K+', label: 'Happy Customers' },
    { value: '10K+', label: 'Products' },
    { value: '4.9', label: 'Rating' },
    { value: '24/7', label: 'Support' }
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
              <span>New Collection 2024</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="hero-title">
              See the World
              <span className="gradient-text"> Clearly</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="hero-desc">
              Premium eyeglasses crafted for style and comfort. Find your perfect pair today and experience vision like never before.
            </motion.p>
            
            <motion.div variants={itemVariants} className="hero-buttons">
              <motion.button 
                className="btn btn-primary hero-cta"
                onClick={() => navigate('/shop')}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Shop Now
                <ArrowRight size={20} />
              </motion.button>
              
              <motion.button 
                className="btn btn-secondary"
                onClick={() => navigate('/shop')}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Explore Collection
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
            <span className="section-subtitle">Why Choose Us</span>
            <h2 className="section-title">Experience the Difference</h2>
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
            <h2>Ready to Transform Your Look?</h2>
            <p>Join thousands of satisfied customers and find your perfect pair today.</p>
            <motion.button 
              className="btn btn-white"
              onClick={() => navigate('/shop')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Shopping
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
            <span className="section-subtitle">Browse By Category</span>
            <h2 className="section-title">Find Your Perfect Style</h2>
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
                        Shop Now <ChevronRight size={16} />
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
            <span className="section-subtitle">Featured Collection</span>
            <h2 className="section-title">Most Popular Picks</h2>
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
                {product.badge && (
                  <span className="product-badge" style={{ 
                    background: product.badge === 'Bestseller' ? '#f59e0b' : 
                               product.badge === 'New' ? '#10b981' : '#6366f1' 
                  }}>
                    {product.badge}
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
                    Add to Cart
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
              View All Products
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
                <span className="promo-label">Summer Sale</span>
                <h3>Up to 50% Off</h3>
                <p>On selected premium frames</p>
                <motion.button 
                  className="btn btn-promo"
                  onClick={() => navigate('/shop')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Shop Sale
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
                <span className="promo-label">New Arrivals</span>
                <h3>2024 Collection</h3>
                <motion.button 
                  className="btn btn-promo-outline"
                  onClick={() => navigate('/shop')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Explore
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
            <span className="section-subtitle">Testimonials</span>
            <h2 className="section-title">What Our Customers Say</h2>
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
              <h2>Subscribe to Our Newsletter</h2>
              <p>Get exclusive offers, new arrivals, and style tips delivered to your inbox.</p>
              <div className="newsletter-form">
                <input type="email" placeholder="Enter your email" />
                <motion.button 
                  className="btn btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Subscribe
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
