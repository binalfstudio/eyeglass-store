import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart, User, Menu, X, Glasses,
  LogOut, Bell, CheckCircle2, AlertTriangle, Clock, ChevronRight,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { cartApi, useGetCartQuery } from '../redux/api/cart';
import {
  useGetUserNotificationsQuery,
  useMarkUserNotificationReadMutation,
  useMarkAllUserNotificationsReadMutation,
} from '../redux/api/auth';
import LanguageSwitcher from './LanguageSwitcher';
import './Header.css';

const Header = () => {
  const { t }                             = useTranslation();
  const [isScrolled, setIsScrolled]       = useState(false);
  const [isMobileMenuOpen, setMobileMenu] = useState(false);
  const [cartCount, setCartCount]         = useState(0);
  const [user, setUser]                   = useState(null);
  const [notifOpen, setNotifOpen]         = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token    = localStorage.getItem('token');

  /* ── Cart data ── */
  const { data: serverCart = [], refetch: refetchCart } = useGetCartQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  /* ── Notifications ── */
  const { data: userNotifications = [] } = useGetUserNotificationsQuery(undefined, {
    skip: !token,
    pollingInterval: 30000,
  });
  const [markRead]    = useMarkUserNotificationReadMutation();
  const [markAllRead] = useMarkAllUserNotificationsReadMutation();
  const unreadCount   = userNotifications.filter((n) => !n.is_read).length;

  const NOTIF_ICONS = { payment_approved: CheckCircle2, payment_rejected: AlertTriangle };
  const handleMarkRead    = async (id) => { try { await markRead(id).unwrap();    } catch {} };
  const handleMarkAllRead = async ()   => { try { await markAllRead().unwrap();   } catch {} };

  /* ── Scroll listener ── */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Close overlays on route change ── */
  useEffect(() => { setMobileMenu(false); setNotifOpen(false); }, [location]);

  /* ── Lock body scroll when mobile menu is open ── */
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  /* ── User from localStorage ── */
  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem('user');
      try { setUser(stored ? JSON.parse(stored) : null); } catch { setUser(null); }
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('auth-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('auth-change', sync);
    };
  }, [location]);

  /* ── Cart count ── */
  useEffect(() => {
    if (token) {
      setCartCount(serverCart.reduce((s, i) => s + Number(i.quantity || 0), 0));
      return;
    }
    const sync = () => {
      const items = (() => { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } })();
      setCartCount(items.reduce((s, i) => s + Number(i.quantity || 0), 0));
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('cart-change', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('cart-change', sync); };
  }, [token, serverCart]);

  useEffect(() => {
    if (!token) return;
    const refresh = () => { dispatch(cartApi.util.invalidateTags(['Cart'])); refetchCart(); };
    window.addEventListener('cart-change', refresh);
    return () => window.removeEventListener('cart-change', refresh);
  }, [token, refetchCart, dispatch]);

  /* ── Logout ── */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    window.dispatchEvent(new Event('cart-change'));
    navigate('/login');
  };

  const isAdminUser = (u) => {
    if (!u) return false;
    const raw = u.isAdmin ?? u.is_admin;
    return raw === true || raw === 1 || raw === '1' || raw === 'true';
  };

  const navLinks = useMemo(() => {
    const links = [
      { path: '/',     label: t('nav.home') },
      { path: '/shop', label: t('nav.shop') },
      { path: '/cart', label: t('nav.cart') },
    ];
    if (isAdminUser(user)) links.push({ path: '/admin', label: t('nav.admin') });
    return links;
  }, [t, user]);

  const isActive     = (p) => location.pathname === p;
  const cartLabel    = cartCount > 99 ? '99+' : cartCount;
  const avatarLetter = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      {/* ════════════════ HEADER BAR ════════════════ */}
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`header ${isScrolled ? 'header-scrolled' : ''}`}
      >
        <div className="header-container">

          {/* Logo */}
          <motion.div
            className="logo"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
            aria-label="Go to home"
          >
            <div className="logo-icon">
              <Glasses size={22} strokeWidth={2.3} />
            </div>
            <span className="logo-text">{t('brand.name')}</span>
          </motion.div>

          {/* ── Desktop nav: modern segmented pill ── */}
          <nav className="desktop-nav" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${isActive(link.path) ? 'nav-link-active' : ''}`}
              >
                {isActive(link.path) && (
                  <motion.span
                    layoutId="nav-pill"
                    className="nav-pill-bg"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="nav-link-label">{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* ── Right actions ── */}
          <div className="header-actions">

            {/* Language — always visible, compact on mobile */}
            <span className="action-lang">
              <LanguageSwitcher compact />
            </span>

            {/* Cart */}
            <motion.button
              className="action-btn cart-btn"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => navigate('/cart')}
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            >
              <ShoppingCart size={18} />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key="badge"
                    className="cart-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    {cartLabel}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Notification bell */}
            {user && (
              <div className="notif-wrap">
                <motion.button
                  className="action-btn notif-btn"
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                >
                  <Bell size={18} />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        key="nb"
                        className="notif-badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                <AnimatePresence>
                  {notifOpen && (
                    <>
                      <div className="notif-backdrop" onClick={() => setNotifOpen(false)} />
                      <motion.div
                        className="notif-dropdown"
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0,  scale: 1   }}
                        exit={  { opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="notif-header">
                          <span className="notif-title">Notifications</span>
                          {unreadCount > 0 && (
                            <button className="notif-mark-all" type="button" onClick={handleMarkAllRead}>
                              Mark all read
                            </button>
                          )}
                        </div>

                        {userNotifications.length === 0 ? (
                          <div className="notif-empty">
                            <Bell size={22} />
                            <p>No notifications yet</p>
                          </div>
                        ) : (
                          <div className="notif-list">
                            {userNotifications.map((notif) => {
                              const Icon = NOTIF_ICONS[notif.type] || Clock;
                              const tone = notif.type === 'payment_approved' ? 'success'
                                : notif.type === 'payment_rejected' ? 'error' : 'info';
                              return (
                                <div
                                  key={notif.id}
                                  className={`notif-item ${notif.is_read ? 'notif-read' : 'notif-unread'} notif-type-${tone}`}
                                  onClick={() => { if (!notif.is_read) handleMarkRead(notif.id); }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !notif.is_read) handleMarkRead(notif.id); }}
                                >
                                  <div className="notif-item-icon"><Icon size={14} /></div>
                                  <div className="notif-item-body">
                                    <p className="notif-item-title">{notif.title}</p>
                                    <p className="notif-item-msg">{notif.message}</p>
                                    <span className="notif-item-time">{new Date(notif.created_at).toLocaleString()}</span>
                                  </div>
                                  {!notif.is_read && <span className="notif-dot" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* User avatar — desktop only */}
            {user ? (
              <div className="user-section hide-on-mobile">
                <button
                  type="button"
                  className="profile-chip"
                  onClick={() => navigate('/profile')}
                  title="My Profile"
                >
                  {user.profile_image
                    ? <img src={user.profile_image} alt={user.name} className="header-avatar" />
                    : <span className="header-avatar header-avatar-fallback">{avatarLetter}</span>
                  }
                  <span className="user-name">{user.name}</span>
                </button>
                <motion.button
                  className="action-btn logout-btn"
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={handleLogout}
                  title={t('nav.logout')}
                >
                  <LogOut size={17} />
                </motion.button>
              </div>
            ) : (
              <motion.button
                className="action-btn user-btn hide-on-mobile"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => navigate('/login')}
                aria-label="Login"
              >
                <User size={18} />
              </motion.button>
            )}

            {/* ── Hamburger: ALWAYS last, never clipped ── */}
            <motion.button
              className="mobile-menu-btn"
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenu((v) => !v)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen
                  ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.16 }}><X size={20} /></motion.span>
                  : <motion.span key="m" initial={{ rotate: 90,  opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.16 }}><Menu size={20} /></motion.span>
                }
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ════════════════ MOBILE DRAWER ════════════════ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Dim backdrop */}
            <motion.div
              key="backdrop"
              className="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setMobileMenu(false)}
            />

            {/* Slide-in drawer */}
            <motion.div
              key="drawer"
              className="mobile-menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            >
              {/* Drawer header */}
              <div className="mobile-menu-header">
                <div className="mobile-logo">
                  <div className="logo-icon">
                    <Glasses size={18} strokeWidth={2.3} />
                  </div>
                  <span>{t('brand.name')}</span>
                </div>
                <button
                  className="mobile-close-btn"
                  onClick={() => setMobileMenu(false)}
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nav links */}
              <nav className="mobile-nav" aria-label="Mobile navigation">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.055, duration: 0.22 }}
                  >
                    <Link
                      to={link.path}
                      className={`mobile-nav-link ${isActive(link.path) ? 'mobile-nav-link-active' : ''}`}
                      onClick={() => setMobileMenu(false)}
                    >
                      <span>{link.label}</span>
                      <ChevronRight size={15} className="mobile-nav-chevron" />
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Footer */}
              <div className="mobile-menu-footer">
                <div className="mobile-lang-row">
                  <LanguageSwitcher />
                </div>

                {user ? (
                  <div className="mobile-user-block">
                    <div className="mobile-user-info">
                      {user.profile_image
                        ? <img src={user.profile_image} alt={user.name} className="mobile-avatar" />
                        : <span className="mobile-avatar mobile-avatar-fallback">{avatarLetter}</span>
                      }
                      <div style={{ minWidth: 0 }}>
                        <p className="mobile-user-name">{user.name}</p>
                        <p className="mobile-user-email">{user.email}</p>
                      </div>
                    </div>
                    <button
                      className="mobile-profile-btn"
                      onClick={() => { navigate('/profile'); setMobileMenu(false); }}
                    >
                      View Profile
                    </button>
                    <button className="mobile-logout-btn" onClick={handleLogout}>
                      <LogOut size={15} /> {t('nav.logout')}
                    </button>
                  </div>
                ) : (
                  <button
                    className="mobile-login-btn"
                    onClick={() => { navigate('/login'); setMobileMenu(false); }}
                  >
                    <User size={15} /> {t('nav.login')}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
