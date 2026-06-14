import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Glasses, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, CreditCard, Truck, Shield, RotateCcw } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <footer className="footer">
      {/* Features Bar */}
      <div className="features-bar">
        <div className="features-bar-container">
          {[
            { icon: Truck, title: 'Free Shipping', desc: 'On orders over ETB 50.00' },
            { icon: Shield, title: 'Secure Payment', desc: '100% secure checkout' },
            { icon: RotateCcw, title: 'Easy Returns', desc: '30-day return policy' },
            { icon: CreditCard, title: 'Best Prices', desc: 'Guaranteed low prices' }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="feature-item"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="feature-icon-wrapper">
                <feature.icon size={24} />
              </div>
              <div className="feature-content">
                <h4>{feature.title}</h4>
                <p>{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Footer */}
      <div className="footer-main">
        <motion.div
          className="footer-container"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Brand Column */}
          <motion.div className="footer-column" variants={itemVariants}>
            <div className="footer-brand">
              <div className="footer-logo">
                <Glasses size={28} />
              </div>
              <h3>Visionary</h3>
            </div>
            <p className="footer-desc">
              Premium eyeglasses crafted for style and comfort. Find your perfect pair today and see the world clearly.
            </p>
            <div className="footer-contact">
              <div className="contact-item">
                <Mail size={16} />
                <span>support@visionary.com</span>
              </div>
              <div className="contact-item">
                <Phone size={16} />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="contact-item">
                <MapPin size={16} />
                <span>123 Fashion Ave, NY 10001</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div className="footer-column" variants={itemVariants}>
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/shop">Shop</Link></li>
              <li><Link to="/cart">Cart</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </motion.div>

          {/* Categories */}
          <motion.div className="footer-column" variants={itemVariants}>
            <h4 className="footer-title">Categories</h4>
            <ul className="footer-links">
              <li><Link to="/shop">Men's Glasses</Link></li>
              <li><Link to="/shop">Women's Glasses</Link></li>
              <li><Link to="/shop">Kids' Glasses</Link></li>
              <li><Link to="/shop">Sunglasses</Link></li>
              <li><Link to="/shop">Blue Light</Link></li>
            </ul>
          </motion.div>

          {/* Newsletter */}
          <motion.div className="footer-column" variants={itemVariants}>
            <h4 className="footer-title">Newsletter</h4>
            <p className="newsletter-desc">
              Subscribe for exclusive offers and updates!
            </p>
            <form className="newsletter-form">
              <input
                type="email"
                placeholder="Enter your email"
                className="newsletter-input"
              />
              <motion.button
                type="submit"
                className="newsletter-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Subscribe
              </motion.button>
            </form>
            <div className="social-links">
              {[
                { icon: Facebook, label: 'Facebook' },
                { icon: Twitter, label: 'Twitter' },
                { icon: Instagram, label: 'Instagram' },
                { icon: Youtube, label: 'Youtube' }
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href="#"
                  className="social-link"
                  whileHover={{ scale: 1.2, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={social.label}
                >
                  <social.icon size={20} />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p className="copyright">
            © 2024 Visionary. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            <Link to="/">Privacy Policy</Link>
            <Link to="/">Terms of Service</Link>
            <Link to="/">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
