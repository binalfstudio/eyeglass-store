import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
import { getPaymentTxRef } from '../utils/payment';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const txRef = getPaymentTxRef(location.search);
    if (txRef && location.pathname !== '/payment-result') {
      navigate(`/payment-result${location.search}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="layout">
      <Header />
      <motion.main
        className="main-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.main>
      <Footer />
    </div>
  );
};

export default Layout;
