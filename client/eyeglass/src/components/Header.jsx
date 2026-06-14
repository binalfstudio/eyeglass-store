import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, User, Menu, X, Glasses, Search, Heart, LogOut, LayoutDashboard } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { cartApi, useGetCartQuery } from '../redux/api/cart';
import './Header.css';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = localStorage.getItem('token');
  const { data: serverCart = [], refetch: refetchCart } = useGetCartQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Check if user is logged in
  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    checkUser();
    // Listen for storage changes (other tabs) and auth-change (same tab)
    window.addEventListener('storage', checkUser);
    window.addEventListener('auth-change', checkUser);
    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('auth-change', checkUser);
    };
  }, [location]);

  useEffect(() => {
    if (token) {
      const count = serverCart.reduce((total, item) => total + Number(item.quantity || 0), 0);
      setCartCount(count);
      return;
    }

    const updateGuestCartCount = () => {
      const savedCart = localStorage.getItem('cart');
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];
      const count = parsedCart.reduce((total, item) => total + Number(item.quantity || 0), 0);
      setCartCount(count);
    };

    updateGuestCartCount();
    window.addEventListener('storage', updateGuestCartCount);
    window.addEventListener('cart-change', updateGuestCartCount);
    return () => {
      window.removeEventListener('storage', updateGuestCartCount);
      window.removeEventListener('cart-change', updateGuestCartCount);
    };
  }, [token, serverCart]);

  useEffect(() => {
    if (!token) return;
    const handleCartRefresh = () => {
      dispatch(cartApi.util.invalidateTags(['Cart']));
      refetchCart();
    };
    window.addEventListener('cart-change', handleCartRefresh);
    return () => {
      window.removeEventListener('cart-change', handleCartRefresh);
    };
  }, [token, refetchCart, dispatch]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    window.dispatchEvent(new Event('cart-change'));
    navigate('/login');
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/shop', label: 'Shop' },
    { path: '/cart', label: 'Cart' },
  ];

  const isAdminUser = (user) => {
    if (!user || typeof user !== 'object') return false;
    const raw = user.isAdmin ?? user.is_admin;
    return raw === true || raw === 1 || raw === '1' || raw === 'true';
  };

  // Add admin link if user is admin
  if (isAdminUser(user)) {
    navLinks.push({ path: '/admin', label: 'Admin', icon: LayoutDashboard });
  }

  const isActive = (path) => location.pathname === path;
  const cartCountLabel = cartCount > 99 ? '99+' : cartCount;
  const avatarInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`header ${isScrolled ? 'header-scrolled' : ''}`}
      >
        <div className="header-container">
          {/* Logo */}
          <motion.div 
            className="logo"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
          >
            <div className="logo-icon">
              <Glasses size={28} strokeWidth={2} />
            </div>
            <span className="logo-text">Visionary</span>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.path}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                <Link
                  to={link.path}
                  className={`nav-link ${isActive(link.path) ? 'nav-link-active' : ''}`}
                >
                  <span>{link.label}</span>
                  {isActive(link.path) && (
                    <motion.div
                      className="nav-link-underline"
                      layoutId="activeNav"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Actions */}
          <div className="header-actions">
            <motion.button
              className="action-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Search size={20} />
            </motion.button>
            
            <motion.button
              className="action-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart size={20} />
            </motion.button>

            <motion.div
              className="cart-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="cart-badge"
                >
                  {cartCountLabel}
                </motion.span>
              )}
            </motion.div>

            {/* User Section */}
            {user ? (
              <div className="user-section">
                <button
                  type="button"
                  className="profile-chip"
                  onClick={() => navigate('/profile')}
                  title="Open profile"
                >
                  {user.profile_image ? (
                    <img src={user.profile_image} alt={user.name} className="header-avatar" />
                  ) : (
                    <span className="header-avatar header-avatar-fallback">{avatarInitial}</span>
                  )}
                  <span className="user-name">{user.name}</span>
                </button>
                <motion.button
                  className="action-btn logout-btn"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut size={20} />
                </motion.button>
              </div>
            ) : (
              <motion.button
                className="action-btn user-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/login')}
              >
                <User size={20} />
              </motion.button>
            )}

            {/* Mobile Menu Toggle */}
            <motion.button
              className="mobile-menu-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="mobile-menu"
          >
            <nav className="mobile-nav">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.path}
                    className={`mobile-nav-link ${isActive(link.path) ? 'mobile-nav-link-active' : ''}`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              {user ? (
                <>
                  <div className="mobile-user-name">Hello, {user.name}</div>
                  <button className="mobile-logout-btn" onClick={handleLogout}>
                    <LogOut size={18} /> Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="mobile-nav-link">Login</Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
