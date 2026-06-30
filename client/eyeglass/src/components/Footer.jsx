import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Glasses, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, CreditCard, Truck, Shield, RotateCcw } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const freeShippingAmount = 'ETB 50.00';

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

  const features = [
    { icon: Truck, title: t('footer.freeShipping'), desc: t('footer.freeShippingDesc', { amount: freeShippingAmount }) },
    { icon: Shield, title: t('footer.securePayment'), desc: t('footer.securePaymentDesc') },
    { icon: RotateCcw, title: t('footer.easyReturns'), desc: t('footer.easyReturnsDesc') },
    { icon: CreditCard, title: t('footer.bestPrices'), desc: t('footer.bestPricesDesc') }
  ];

  return (
    <footer className="footer">
      <div className="features-bar">
        <div className="features-bar-container">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
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

      <div className="footer-main">
        <motion.div
          className="footer-container"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div className="footer-column" variants={itemVariants}>
            <div className="footer-brand">
              <div className="footer-logo">
                <Glasses size={28} />
              </div>
              <h3>{t('brand.name')}</h3>
            </div>
            <p className="footer-desc">{t('brand.description')}</p>
            <div className="footer-contact">
              <div className="contact-item">
                <Mail size={16} />
                <span>{t('brand.email')}</span>
              </div>
              <div className="contact-item">
                <Phone size={16} />
                <span>{t('brand.phone')}</span>
              </div>
              <div className="contact-item">
                <MapPin size={16} />
                <span>{t('brand.address')}</span>
              </div>
            </div>
          </motion.div>

          <motion.div className="footer-column" variants={itemVariants}>
            <h4 className="footer-title">{t('footer.quickLinks')}</h4>
            <ul className="footer-links">
              <li><Link to="/">{t('nav.home')}</Link></li>
              <li><Link to="/shop">{t('nav.shop')}</Link></li>
              <li><Link to="/cart">{t('nav.cart')}</Link></li>
              <li><Link to="/login">{t('nav.login')}</Link></li>
              <li><Link to="/register">{t('nav.register')}</Link></li>
            </ul>
          </motion.div>

          <motion.div className="footer-column" variants={itemVariants}>
            <h4 className="footer-title">{t('footer.categories')}</h4>
            <ul className="footer-links">
              <li><Link to="/shop">{t('footer.mensGlasses')}</Link></li>
              <li><Link to="/shop">{t('footer.womensGlasses')}</Link></li>
              <li><Link to="/shop">{t('footer.kidsGlasses')}</Link></li>
              <li><Link to="/shop">{t('footer.sunglasses')}</Link></li>
              <li><Link to="/shop">{t('footer.blueLight')}</Link></li>
            </ul>
          </motion.div>

          <motion.div className="footer-column" variants={itemVariants}>
            <h4 className="footer-title">{t('footer.newsletter')}</h4>
            <p className="newsletter-desc">{t('footer.newsletterDesc')}</p>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={t('common.emailPlaceholder')}
                className="newsletter-input"
              />
              <motion.button
                type="submit"
                className="newsletter-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('common.subscribe')}
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

      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p className="copyright">{t('footer.copyright', { year })}</p>
          <div className="footer-bottom-links">
            <Link to="/">{t('footer.privacy')}</Link>
            <Link to="/">{t('footer.terms')}</Link>
            <Link to="/">{t('footer.cookies')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
