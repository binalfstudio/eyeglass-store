import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../utils/apiConfig';

// Derive server base URL for static assets (uploads images)
const SERVER_BASE = API_BASE_URL.startsWith('http')
  ? API_BASE_URL.replace(/\/api\/?$/, '')
  : ''
// If path is already a full URL (Cloudinary), return it as-is
const toServerUrl = (p) => {
  if (!p) return ''
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return `${SERVER_BASE}${p}`
}

import { 
  LayoutDashboard, 
  Package, 
  Grid3X3, 
  Users, 
  ShoppingCart,
  Search,
  CalendarDays,
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  Save,
  LogOut,
  User,
  Camera,
  UserCircle2,
  ShieldCheck,
  Bell,
  Menu,
} from 'lucide-react';
import './AdminDashboard.css';

const etbFormatter = new Intl.NumberFormat('en-ET', {
  style: 'currency',
  currency: 'ETB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ORDER_STATUS_OPTIONS = [
  'pending_payment',
  'processing',
  'paid',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
];

const normalizeOrderStatus = (value) => {
  const normalized = String(value || 'pending_payment').trim().toLowerCase();
  return ORDER_STATUS_OPTIONS.includes(normalized) ? normalized : 'pending_payment';
};

const normalizePaymentStatus = (value) => String(value || '').trim().toLowerCase();

const readAdminState = (user) => {
  if (!user || typeof user !== 'object') return null;

  const hasIsAdmin = Object.prototype.hasOwnProperty.call(user, 'isAdmin');
  const hasIsAdminSnake = Object.prototype.hasOwnProperty.call(user, 'is_admin');

  if (!hasIsAdmin && !hasIsAdminSnake) return null;

  const raw = hasIsAdmin ? user.isAdmin : user.is_admin;
  const normalized = String(raw).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'admin';
};

const normalizeListPayload = (payload, preferredKeys = []) => {
  if (Array.isArray(payload)) return payload;
  for (const key of preferredKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

// Defined outside component so useMemo deps are stable (no new array each render)
const PAID_STATUSES = ['paid', 'shipped', 'completed'];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Product states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category_id: '',
    brand: '',
    frame_type: '',
    lens_type: '',
    frame_material: '',
    quantity_in_stock: 0,
    buying_price: 0,
    selling_price: 0,
    image_url: '',
    prescription_required: false
  });

  // Category states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [screenshotPayments, setScreenshotPayments] = useState([]);
  const [screenshotStatusFilter, setScreenshotStatusFilter] = useState('all');
  const [reviewingScreenshotId, setReviewingScreenshotId] = useState(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [screenshotReviewLoading, setScreenshotReviewLoading] = useState(false);
  const [previewScreenshot, setPreviewScreenshot] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('all');
  const [bulkOrderStatus, setBulkOrderStatus] = useState('processing');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [isBulkUpdatingOrders, setIsBulkUpdatingOrders] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityRange, setActivityRange] = useState('30d');

  // Profile states
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    profile_image: ''
  });
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState('');
  const [profileError, setProfileError] = useState('');
  const [bootMessage, setBootMessage] = useState('');

  const [animatedStats, setAnimatedStats] = useState({
    totalRevenue: 0,
    collectedRevenue: 0,
    activeCustomers: 0,
    orders: 0,
    pendingOrders: 0,
    uncollectedRevenue: 0,
    lowStockProducts: 0,
  });
  const [statTrends, setStatTrends] = useState({
    totalRevenue: 'neutral',
    collectedRevenue: 'neutral',
    activeCustomers: 'neutral',
    orders: 'neutral',
    pendingOrders: 'neutral',
    uncollectedRevenue: 'neutral',
    lowStockProducts: 'neutral',
  });
  const previousTargetsRef = useRef(null);
  const trendResetRef = useRef(null);

  const navigate = useNavigate();

  // Check admin access
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!token) {
      setBootMessage('Please sign in as an administrator to view this dashboard.');
      setIsLoading(false);
      return;
    }
    
    try {
      const parsedUser = storedUser ? JSON.parse(storedUser) : {};
      setUser(parsedUser);
      setProfileForm({
        name: parsedUser.name || '',
        email: parsedUser.email || '',
        phone: parsedUser.phone || '',
        address: parsedUser.address || '',
        profile_image: parsedUser.profile_image || ''
      });
      fetchData(token);
    } catch {
      // Recover from malformed local user payload by relying on token + profile.
      setUser(null);
      fetchData(token);
    }
  }, [navigate]);

  const fetchData = async (token) => {
    try {
      setBootMessage('');
      // Fetch products
      const productsRes = await fetch(`${API_BASE_URL}/eyeglasses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(normalizeListPayload(productsData, ['products', 'items', 'data']));
      }

      // Fetch categories
      const categoriesRes = await fetch(`${API_BASE_URL}/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(normalizeListPayload(categoriesData, ['categories', 'items', 'data']));
      }

      // Fetch admin profile
      const profileRes = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const profileAdminState = readAdminState(profileData);
        if (profileAdminState === false) {
          setBootMessage('Access denied. Your account is not an admin account.');
          return;
        }

        setUser((prev) => {
          const nextUser = {
            ...prev,
            ...profileData,
            isAdmin: profileAdminState ?? prev?.isAdmin ?? Boolean(profileData.isAdmin),
          };
          try {
            localStorage.setItem('user', JSON.stringify(nextUser));
            window.dispatchEvent(new Event('auth-change'));
          } catch {
            // ignore storage failures
          }
          return nextUser;
        });
        setProfileForm({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
          profile_image: profileData.profile_image || ''
        });
      } else if (profileRes.status === 401) {
        setBootMessage('Your session expired. Please log in again.');
        return;
      } else if (profileRes.status === 403) {
        setBootMessage('Access denied. Your account is not an admin account.');
        return;
      }

      // Fetch admin notifications
      const notificationsRes = await fetch(`${API_BASE_URL}/users/admin/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(normalizeListPayload(notificationsData, ['notifications', 'items', 'data']));
      }

      // Fetch admin users
      const usersRes = await fetch(`${API_BASE_URL}/users/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAdminUsers(normalizeListPayload(usersData, ['users', 'items', 'data']));
      }

      // Fetch admin orders & transactions
      const ordersRes = await fetch(`${API_BASE_URL}/payments/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const rawOrders = Array.isArray(ordersData)
          ? ordersData
          : Array.isArray(ordersData?.orders)
            ? ordersData.orders
            : [];

        setOrders(
          rawOrders.map((order) => ({
            ...order,
            id: Number(order?.id) || order?.id,
            status: normalizeOrderStatus(order?.status),
            payment_status: normalizePaymentStatus(order?.payment_status),
            created_at: order?.created_at || order?.createdAt || null,
          }))
        );
      }

      // Fetch screenshot payments
      const screenshotRes = await fetch(`${API_BASE_URL}/screenshot-payments/admin/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (screenshotRes.ok) {
        const screenshotData = await screenshotRes.json();
        setScreenshotPayments(Array.isArray(screenshotData) ? screenshotData : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      const isProd = import.meta.env.PROD;
      setBootMessage(
        isProd
          ? 'Failed to connect to the server. Please try again in a moment â€” the backend may be waking up.'
          : 'Failed to load admin data. Make sure the backend is running on port 5000, then refresh.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const unreadNotificationsCount = notifications.filter((item) => !item.is_read).length;

  const pendingScreenshotCount = screenshotPayments.filter((item) => item.status === 'pending').length;

  const displayScreenshotPayments = screenshotStatusFilter === 'all'
    ? screenshotPayments
    : screenshotPayments.filter((item) => item.status === screenshotStatusFilter);

  const handleMarkNotificationAsRead = async (notificationId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/users/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return;
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationTarget = (notification) => {
    const type = String(notification?.type || '').toLowerCase();
    const metadata = notification?.metadata || {};

    if (type === 'user_registered') {
      return {
        tab: 'users',
        label: 'Open Users',
        userId: Number(metadata?.userId) || null,
      };
    }

    if (
      type === 'order_created' ||
      type === 'payment_confirmed' ||
      type === 'payment_init_failed' ||
      type === 'order_status_updated'
    ) {
      return {
        tab: 'transactions',
        label: 'Open Transactions',
        orderId:
          Number(metadata?.orderId) ||
          Number(metadata?.internalOrderId) ||
          null,
      };
    }

    if (
      type === 'screenshot_payment_submitted' ||
      type === 'screenshot_payment_approved' ||
      type === 'screenshot_payment_rejected'
    ) {
      return {
        tab: 'screenshot-payments',
        label: 'Review Screenshot Payments',
        orderId: Number(metadata?.orderId) || null,
      };
    }

    return {
      tab: 'notifications',
      label: 'View Details',
      orderId: null,
      userId: null,
    };
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    if (!notification.is_read) {
      await handleMarkNotificationAsRead(notification.id);
    }

    const target = getNotificationTarget(notification);
    setActiveTab(target.tab);

    if (target.orderId) {
      setSelectedOrderId(target.orderId);
      setSelectedUserId(null);
      setTimeout(() => {
        const element = document.getElementById(`admin-order-row-${target.orderId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else if (target.userId) {
      setSelectedUserId(target.userId);
      setSelectedOrderId(null);
      setTimeout(() => {
        const element = document.getElementById(`admin-user-row-${target.userId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      setSelectedOrderId(null);
      setSelectedUserId(null);
    }
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select a valid image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Please choose an image smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((prev) => ({ ...prev, profile_image: String(reader.result || '') }));
      setProfileError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsProfileSaving(true);
    setProfileStatus('');
    setProfileError('');

    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim(),
          address: profileForm.address.trim(),
          profile_image: profileForm.profile_image || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setProfileError(data?.message || 'Failed to save profile.');
        return;
      }

      const updatedProfile = data.profile;
      setUser((prev) => ({ ...prev, ...updatedProfile }));
      setProfileForm({
        name: updatedProfile.name || '',
        email: updatedProfile.email || '',
        phone: updatedProfile.phone || '',
        address: updatedProfile.address || '',
        profile_image: updatedProfile.profile_image || ''
      });

      const storedUser = localStorage.getItem('user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : {};
      const mergedProfile = {
        ...parsedUser,
        ...updatedProfile,
        isAdmin:
          readAdminState(updatedProfile) ??
          readAdminState(parsedUser) ??
          false,
      };
      localStorage.setItem('user', JSON.stringify(mergedProfile));
      window.dispatchEvent(new Event('auth-change'));
      setProfileStatus('Profile updated successfully.');
    } catch (error) {
      setProfileError('Failed to save profile.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsUpdatingOrder(true);
      const response = await fetch(`${API_BASE_URL}/payments/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data?.message || 'Failed to update order status');
        return;
      }

      // Optimistic local update, then re-sync orders + notifications only
      setOrders((prev) =>
        prev.map((order) =>
          Number(order.id) === Number(orderId)
            ? { ...order, status: normalizeOrderStatus(data?.order?.status || status) }
            : order
        )
      );
      await Promise.all([refetchOrders(token), refetchNotifications(token)]);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handleToggleOrderSelection = (orderId) => {
    const parsedId = Number(orderId);
    if (!parsedId) return;

    setSelectedOrderIds((prev) =>
      prev.includes(parsedId) ? prev.filter((id) => id !== parsedId) : [...prev, parsedId]
    );
  };

  const handleToggleSelectAllVisible = () => {
    setSelectedOrderIds((prev) => {
      if (!allVisibleOrderIds.length) return prev;
      // Recompute inside setter to avoid stale closure
      const allSelected = allVisibleOrderIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !allVisibleOrderIds.includes(id));
      }
      const next = new Set(prev);
      allVisibleOrderIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleBulkOrderStatusUpdate = async () => {
    const token = localStorage.getItem('token');
    if (!token || !selectedOrderIds.length) return;

    try {
      setIsBulkUpdatingOrders(true);
      const response = await fetch(`${API_BASE_URL}/payments/admin/orders/bulk-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          status: bulkOrderStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data?.message || 'Bulk update failed');
        return;
      }

      // Optimistic local update, then re-sync orders + notifications only
      setOrders((prev) =>
        prev.map((order) =>
          selectedOrderIds.includes(Number(order.id)) ? { ...order, status: bulkOrderStatus } : order
        )
      );
      setSelectedOrderIds([]);
      await Promise.all([refetchOrders(token), refetchNotifications(token)]);
    } catch (error) {
      console.error('Error bulk updating order statuses:', error);
      alert('Bulk update failed');
    } finally {
      setIsBulkUpdatingOrders(false);
    }
  };

  const handleReviewScreenshotPayment = async (screenshotId, action) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setScreenshotReviewLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/screenshot-payments/admin/${screenshotId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action, adminNote: adminNoteInput }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data?.message || 'Failed to review screenshot payment');
        return;
      }

      // Optimistic local update
      setScreenshotPayments((prev) =>
        prev.map((item) =>
          item.id === screenshotId
            ? { ...item, status: data.status, admin_note: adminNoteInput, reviewed_at: new Date().toISOString() }
            : item
        )
      );
      setReviewingScreenshotId(null);
      setAdminNoteInput('');
      // Only re-fetch orders (status changed) + notifications + screenshots
      await Promise.all([
        refetchOrders(token),
        refetchScreenshots(token),
        refetchNotifications(token),
      ]);
    } catch (error) {
      console.error('Error reviewing screenshot payment:', error);
      alert('Failed to review screenshot payment');
    } finally {
      setScreenshotReviewLoading(false);
    }
  };

  // Targeted re-fetch helpers â€” avoid re-loading 7 endpoints after each mutation
  const refetchOrders = async (token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : [];
        setOrders(raw.map((order) => ({
          ...order,
          id: Number(order?.id) || order?.id,
          status: normalizeOrderStatus(order?.status),
          payment_status: normalizePaymentStatus(order?.payment_status),
          created_at: order?.created_at || order?.createdAt || null,
        })));
      }
    } catch (e) { console.error('refetchOrders:', e); }
  };

  const refetchScreenshots = async (token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/screenshot-payments/admin/list`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setScreenshotPayments(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error('refetchScreenshots:', e); }
  };

  const refetchNotifications = async (token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/admin/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(normalizeListPayload(data, ['notifications', 'items', 'data']));
      }
    } catch (e) { console.error('refetchNotifications:', e); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleRefreshDashboard = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsRefreshing(true);
    try {
      await fetchData(token);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Product handlers
  const buildProductPayload = () => ({
    ...productForm,
    category_id: productForm.category_id ? Number(productForm.category_id) : null,
    quantity_in_stock: Number(productForm.quantity_in_stock) || 0,
    buying_price: Number(productForm.buying_price) || 0,
    selling_price: Number(productForm.selling_price) || 0,
    prescription_required: Boolean(productForm.prescription_required),
  });

  const handleSaveProduct = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = editingProduct 
      ? `/api/eyeglasses/${editingProduct.id}`
      : '/api/eyeglasses/create';
    
    const method = editingProduct ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(buildProductPayload())
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        alert(editingProduct ? 'Product updated!' : 'Product created!');
        setShowProductModal(false);
        setEditingProduct(null);
        setProductForm({
          name: '', description: '', category_id: '', brand: '',
          frame_type: '', lens_type: '', frame_material: '',
          quantity_in_stock: 0, buying_price: 0, selling_price: 0,
          image_url: '', prescription_required: false
        });
        fetchData(token);
      } else {
        alert(data?.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Check that the server is running.');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`/api/eyeglasses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('Product deleted!');
        fetchData(token);
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Category handlers
  const handleSaveCategory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = editingCategory 
      ? `/api/categories/${editingCategory.id}`
      : '/api/categories';
    
    const method = editingCategory ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(categoryForm)
      });

      if (res.ok) {
        alert(editingCategory ? 'Category updated!' : 'Category created!');
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCategoryForm({ name: '', description: '' });
        fetchData(token);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.message || 'Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category. Check that the server is running.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Are you sure? This may affect products in this category.')) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('Category deleted!');
        fetchData(token);
      } else {
        alert('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Grid3X3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: ShoppingCart },
    { id: 'screenshot-payments', label: 'Screenshot Payments', icon: Camera },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const normalizedSearch = dashboardSearch.trim().toLowerCase();
  const filteredProducts = normalizedSearch
    ? products.filter((item) =>
        [item.name, item.brand, item.category_name, item.frame_type, item.lens_type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      )
    : products;
  const filteredCategories = normalizedSearch
    ? categories.filter((item) =>
        [item.name, item.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      )
    : categories;
  const filteredOrders = normalizedSearch
    ? orders.filter((item) =>
        [item.id, item.customer_name, item.customer_email, item.status, item.payment_status, item.currency]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      )
    : orders;
  const filteredUsers = normalizedSearch
    ? adminUsers.filter((item) =>
        [item.id, item.name, item.email, item.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      )
    : adminUsers;
  const filteredNotifications = normalizedSearch
    ? notifications.filter((item) =>
        [item.title, item.message, item.type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      )
    : notifications;
  const displayOrders = filteredOrders.filter((item) => {
    if (transactionStatusFilter === 'all') return true;
    return normalizeOrderStatus(item?.status) === transactionStatusFilter;
  });
  const allVisibleOrderIds = displayOrders.map((item) => Number(item.id)).filter(Boolean);
  const areAllVisibleOrdersSelected =
    allVisibleOrderIds.length > 0 && allVisibleOrderIds.every((orderId) => selectedOrderIds.includes(orderId));

  useEffect(() => {
    const visibleSet = new Set(allVisibleOrderIds);
    setSelectedOrderIds((prev) => prev.filter((id) => visibleSet.has(id)));
  }, [allVisibleOrderIds]);

  const paidStatuses = PAID_STATUSES;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const collectedRevenue = orders
    .filter((order) => PAID_STATUSES.includes(String(order.status || '').toLowerCase()))
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const activeCustomers = new Set(orders.map((order) => Number(order.user_id || 0)).filter(Boolean)).size;
  const statusCount = orders.reduce((acc, order) => {
    const statusKey = normalizeOrderStatus(order.status);
    acc[statusKey] = (acc[statusKey] || 0) + 1;
    return acc;
  }, {});
  const donutTotal = Math.max(orders.length, 1);
  const completedPercent = Math.round(((statusCount.completed || 0) / donutTotal) * 100);
  const pendingPercent = Math.round(((statusCount.pending_payment || 0) / donutTotal) * 100);
  const processingPercent = Math.round(((statusCount.processing || 0) / donutTotal) * 100);
  const completedOrders = statusCount.completed || 0;
  const processingOrders = statusCount.processing || 0;
  const pendingOrders = statusCount.pending_payment || 0;
  const fulfillmentRate = Math.round(((completedOrders + processingOrders) / donutTotal) * 100);
  const backlogTone = pendingPercent >= 40 ? 'danger' : pendingPercent >= 20 ? 'warn' : 'ok';
  const oldestPendingDays = orders.reduce((maxDays, order) => {
    if (String(order?.status || '').toLowerCase() !== 'pending_payment') return maxDays;
    const createdAt = order?.created_at ? new Date(order.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return maxDays;
    const ageDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    return Math.max(maxDays, ageDays);
  }, 0);
  const statusMixRows = [
    { key: 'completed', label: 'Completed', count: completedOrders, percent: completedPercent },
    { key: 'processing', label: 'Processing', count: processingOrders, percent: processingPercent },
    { key: 'pending', label: 'Pending', count: pendingOrders, percent: pendingPercent },
  ];
  const lowStockProductsCount = products.filter((item) => Number(item.quantity_in_stock || 0) <= 5).length;
  const unreadNotifications = notifications.filter((item) => !item.is_read).length;
  const adminCount = adminUsers.filter((item) => {
    const raw = item.isAdmin ?? item.is_admin;
    return raw === true || raw === 1 || raw === '1' || raw === 'true';
  }).length;
  const pendingOrdersCount = orders.filter((item) => String(item.status || '').toLowerCase() === 'pending_payment').length;
  const uncollectedRevenue = Math.max(totalRevenue - collectedRevenue, 0);
  const newestNotification = notifications?.[0] || null;

  const statTargets = useMemo(
    () => ({
      totalRevenue,
      collectedRevenue,
      activeCustomers,
      orders: orders.length,
      pendingOrders: pendingOrdersCount,
      uncollectedRevenue,
      lowStockProducts: lowStockProductsCount,
    }),
    [
      totalRevenue,
      collectedRevenue,
      activeCustomers,
      orders.length,
      pendingOrdersCount,
      uncollectedRevenue,
      lowStockProductsCount,
    ]
  );

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    let frameId = null;

    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedStats({
        totalRevenue: statTargets.totalRevenue * eased,
        collectedRevenue: statTargets.collectedRevenue * eased,
        activeCustomers: statTargets.activeCustomers * eased,
        orders: statTargets.orders * eased,
        pendingOrders: statTargets.pendingOrders * eased,
        uncollectedRevenue: statTargets.uncollectedRevenue * eased,
        lowStockProducts: statTargets.lowStockProducts * eased,
      });

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [statTargets]);

  useEffect(() => {
    const previous = previousTargetsRef.current;
    if (!previous) {
      previousTargetsRef.current = statTargets;
      return;
    }

    const nextTrends = {
      totalRevenue:
        statTargets.totalRevenue > previous.totalRevenue
          ? 'up'
          : statTargets.totalRevenue < previous.totalRevenue
            ? 'down'
            : 'neutral',
      collectedRevenue:
        statTargets.collectedRevenue > previous.collectedRevenue
          ? 'up'
          : statTargets.collectedRevenue < previous.collectedRevenue
            ? 'down'
            : 'neutral',
      activeCustomers:
        statTargets.activeCustomers > previous.activeCustomers
          ? 'up'
          : statTargets.activeCustomers < previous.activeCustomers
            ? 'down'
            : 'neutral',
      orders:
        statTargets.orders > previous.orders
          ? 'up'
          : statTargets.orders < previous.orders
            ? 'down'
            : 'neutral',
      pendingOrders:
        statTargets.pendingOrders > previous.pendingOrders
          ? 'up'
          : statTargets.pendingOrders < previous.pendingOrders
            ? 'down'
            : 'neutral',
      uncollectedRevenue:
        statTargets.uncollectedRevenue > previous.uncollectedRevenue
          ? 'up'
          : statTargets.uncollectedRevenue < previous.uncollectedRevenue
            ? 'down'
            : 'neutral',
      lowStockProducts:
        statTargets.lowStockProducts > previous.lowStockProducts
          ? 'up'
          : statTargets.lowStockProducts < previous.lowStockProducts
            ? 'down'
            : 'neutral',
    };

    setStatTrends(nextTrends);
    previousTargetsRef.current = statTargets;

    if (trendResetRef.current) {
      clearTimeout(trendResetRef.current);
    }
    trendResetRef.current = setTimeout(() => {
      setStatTrends({
        totalRevenue: 'neutral',
        collectedRevenue: 'neutral',
        activeCustomers: 'neutral',
        orders: 'neutral',
        pendingOrders: 'neutral',
        uncollectedRevenue: 'neutral',
        lowStockProducts: 'neutral',
      });
    }, 1200);

    return () => {
      if (trendResetRef.current) {
        clearTimeout(trendResetRef.current);
      }
    };
  }, [statTargets]);

  const activitySeries = useMemo(() => {
    const rangeDays = activityRange === '90d' ? 90 : activityRange === '14d' ? 14 : 30;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (rangeDays - 1));
    startDate.setHours(0, 0, 0, 0);

    const formatKey = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const byDay = {};
    for (let i = 0; i < rangeDays; i += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      byDay[formatKey(day)] = {
        date: day,
        orders: 0,
        revenue: 0,
        collectedRevenue: 0,
      };
    }

    orders.forEach((order) => {
      const createdAt = order?.created_at ? new Date(order.created_at) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return;
      if (createdAt < startDate || createdAt > endDate) return;

      const key = formatKey(createdAt);
      if (!byDay[key]) return;

      const orderTotal = Number(order.total || 0);
      byDay[key].orders += 1;
      byDay[key].revenue += orderTotal;
      if (PAID_STATUSES.includes(String(order.status || '').toLowerCase())) {
        byDay[key].collectedRevenue += orderTotal;
      }
    });

    return Object.values(byDay).map((item) => ({
      ...item,
      shortLabel: item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }));
  }, [orders, activityRange]);

  const activitySummary = useMemo(() => {
    const maxRevenue = Math.max(1, ...activitySeries.map((item) => Number(item.revenue || 0)));
    const maxOrders = Math.max(1, ...activitySeries.map((item) => Number(item.orders || 0)));
    const totalOrdersInRange = activitySeries.reduce((sum, item) => sum + Number(item.orders || 0), 0);
    const avgOrdersPerDay = totalOrdersInRange / Math.max(activitySeries.length, 1);

    let bestDay = null;
    activitySeries.forEach((item) => {
      if (!bestDay || Number(item.revenue || 0) > Number(bestDay.revenue || 0)) {
        bestDay = item;
      }
    });

    return {
      maxRevenue,
      maxOrders,
      totalOrdersInRange,
      avgOrdersPerDay,
      bestDay,
    };
  }, [activitySeries]);

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (bootMessage) {
    return (
      <div className="admin-loading">
        <p>{bootMessage}</p>
        <div className="admin-empty-actions">
          <button type="button" className="admin-btn-secondary" onClick={() => navigate('/login')}>
            Go to Login
          </button>
          <a href="/" className="admin-btn-secondary admin-back-link">
            Back to Store
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Mobile backdrop */}
      <div
        className={`admin-sidebar-backdrop ${sidebarOpen ? 'backdrop-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <div className="admin-brand-mark">
              <LayoutDashboard size={18} />
            </div>
            <div className="admin-brand-copy">
              <span>Z Visionary</span>
              <small>á‹œá‹µ áˆ˜áŠáŒ¸áˆ­ Â· Admin</small>
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
                {tab.id === 'notifications' && unreadNotificationsCount > 0 && (
                  <span className="admin-notification-pill">{unreadNotificationsCount}</span>
                )}
                {tab.id === 'screenshot-payments' && pendingScreenshotCount > 0 && (
                  <span className="admin-notification-pill">{pendingScreenshotCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-avatar">
              {user?.profile_image ? (
                <img src={user.profile_image} alt={user?.name || 'Admin'} className="admin-avatar-image" />
              ) : (
                <Users size={20} />
              )}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{user?.name}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          </div>
          <button className="admin-profile-shortcut" onClick={() => setActiveTab('profile')}>
            <User size={18} />
            <span>My Profile</span>
          </button>
          <button className="admin-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Mobile top bar â€” only visible on small screens via CSS */}
        <div className="admin-mobile-topbar">
          <button
            type="button"
            className="admin-mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <span className="admin-mobile-topbar-title">
            {tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
          </span>
          <div style={{ width: 44 }} />
        </div>
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            <a href="/" className="admin-back">
              <ChevronLeft size={18} />
              Back to Store
            </a>
            <div className="admin-header-titles">
              <h1 className="admin-title">{tabs.find(t => t.id === activeTab)?.label}</h1>
              <p className="admin-header-subtitle">Manage products, orders, users, and notifications in one place.</p>
            </div>
          </div>

          <div className="admin-header-actions">
            <div className="admin-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search server data..."
                aria-label="Search dashboard"
                value={dashboardSearch}
                onChange={(event) => setDashboardSearch(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="admin-icon-btn"
              aria-label="Open transactions"
              onClick={() => setActiveTab('transactions')}
            >
              <CalendarDays size={16} />
            </button>
            <button
              type="button"
              className="admin-icon-btn"
              aria-label="Clear search"
              onClick={() => setDashboardSearch('')}
            >
              <SlidersHorizontal size={16} />
            </button>
            <button type="button" className="admin-ai-btn" onClick={handleRefreshDashboard}>
              {isRefreshing ? <RefreshCw size={14} /> : <Sparkles size={14} />}
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="admin-content">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="admin-overview"
              >
                <div className="admin-overview-intro">
                  <h2>Dashboard</h2>
                  <p>Live operational overview of sales, fulfillment, and customer activity.</p>
                </div>

                <div className="admin-stats-grid">
                  <motion.button
                    type="button"
                    className="admin-stat-card"
                    onClick={() => setActiveTab('transactions')}
                    whileHover={{ y: -5, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="admin-stat-icon products">
                      <Package size={24} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Total Revenue</span>
                      <span className={`admin-stat-value admin-trend-${statTrends.totalRevenue}`}>{etbFormatter.format(animatedStats.totalRevenue)}</span>
                      <small className="admin-stat-footnote">All tracked orders</small>
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    className="admin-stat-card"
                    onClick={() => setActiveTab('transactions')}
                    whileHover={{ y: -5, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="admin-stat-icon categories">
                      <Grid3X3 size={24} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Collected Revenue</span>
                      <span className={`admin-stat-value admin-trend-${statTrends.collectedRevenue}`}>{etbFormatter.format(animatedStats.collectedRevenue)}</span>
                      <small className="admin-stat-footnote">Paid, shipped, completed</small>
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    className="admin-stat-card"
                    onClick={() => setActiveTab('users')}
                    whileHover={{ y: -5, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="admin-stat-icon users">
                      <Users size={24} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Active Customers</span>
                      <span className={`admin-stat-value admin-trend-${statTrends.activeCustomers}`}>{Math.round(animatedStats.activeCustomers)}</span>
                      <small className="admin-stat-footnote">Customers with orders</small>
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    className="admin-stat-card"
                    onClick={() => setActiveTab('transactions')}
                    whileHover={{ y: -5, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="admin-stat-icon orders">
                      <ShoppingCart size={24} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Orders</span>
                      <span className={`admin-stat-value admin-trend-${statTrends.orders}`}>{Math.round(animatedStats.orders)}</span>
                      <small className="admin-stat-footnote">Across all statuses</small>
                    </div>
                  </motion.button>
                </div>

                <div className="admin-live-strip">
                  <div className="admin-live-strip-head">
                    <span className="admin-live-dot" />
                    <strong>Live Insights</strong>
                    <small>Auto updates when data refreshes</small>
                  </div>
                  <div className="admin-live-metrics">
                    <button
                      type="button"
                      className="admin-live-metric admin-live-metric-warn"
                      onClick={() => {
                        setActiveTab('transactions');
                        setDashboardSearch('pending_payment');
                      }}
                    >
                      <span>Pending Orders</span>
                      <strong className={`admin-live-value admin-trend-${statTrends.pendingOrders}`}>{Math.round(animatedStats.pendingOrders)}</strong>
                    </button>
                    <button
                      type="button"
                      className="admin-live-metric admin-live-metric-info"
                      onClick={() => {
                        setActiveTab('transactions');
                        setDashboardSearch('');
                      }}
                    >
                      <span>Uncollected Revenue</span>
                      <strong className={`admin-live-value admin-trend-${statTrends.uncollectedRevenue}`}>{etbFormatter.format(animatedStats.uncollectedRevenue)}</strong>
                    </button>
                    <button
                      type="button"
                      className="admin-live-metric admin-live-metric-success"
                      onClick={() => {
                        setActiveTab('products');
                        setDashboardSearch('');
                      }}
                    >
                      <span>Low Stock Products</span>
                      <strong className={`admin-live-value admin-trend-${statTrends.lowStockProducts}`}>{Math.round(animatedStats.lowStockProducts)}</strong>
                    </button>
                    <button
                      type="button"
                      className="admin-live-metric admin-live-metric-accent"
                      onClick={() => {
                        setActiveTab('notifications');
                        setDashboardSearch('');
                      }}
                    >
                      <span>Latest Alert</span>
                      <strong>{newestNotification ? String(newestNotification.title || 'Open Notifications').slice(0, 24) : 'No alerts'}</strong>
                    </button>
                  </div>
                </div>

                <div className="admin-overview-panels">
                  <div className="admin-insight-panel">
                    <div className="admin-insight-header">
                      <h3>Order Activity</h3>
                      <div className="admin-activity-controls">
                        {['14d', '30d', '90d'].map((range) => (
                          <button
                            key={range}
                            type="button"
                            className={`admin-activity-pill ${activityRange === range ? 'active' : ''}`}
                            onClick={() => setActivityRange(range)}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>

                    {activitySeries.some((item) => item.orders > 0 || item.revenue > 0) ? (
                      <div className="admin-activity-wrap">
                        <div className="admin-activity-scroll">
                          <div
                            className="admin-activity-canvas"
                            style={{ width: `${Math.max(680, activitySeries.length * 36)}px` }}
                          >
                            {activitySeries.map((item, index) => {
                              const revenueHeight = Math.max(
                                item.revenue > 0 ? 4 : 2,
                                Math.round((Number(item.revenue || 0) / activitySummary.maxRevenue) * 150)
                              );
                              const ordersHeight = Math.max(
                                item.orders > 0 ? 4 : 2,
                                Math.round((Number(item.orders || 0) / activitySummary.maxOrders) * 70)
                              );
                              const showLabel =
                                index % Math.max(1, Math.ceil(activitySeries.length / 9)) === 0 ||
                                index === activitySeries.length - 1;

                              return (
                                <div key={`${item.shortLabel}-${index}`} className="admin-activity-day">
                                  <div className="admin-activity-bars">
                                    <div className="admin-activity-orders" style={{ height: `${ordersHeight}px` }} />
                                    <div className="admin-activity-revenue" style={{ height: `${revenueHeight}px` }} />
                                  </div>
                                  <div className="admin-activity-tooltip">
                                    <strong>{item.shortLabel}</strong>
                                    <span>Orders: {item.orders}</span>
                                    <span>Revenue: {etbFormatter.format(item.revenue)}</span>
                                    <span>Collected: {etbFormatter.format(item.collectedRevenue)}</span>
                                  </div>
                                  <span className="admin-activity-label">{showLabel ? item.shortLabel : ''}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="admin-activity-insights">
                          <div>
                            <span>Total Orders</span>
                            <strong>{activitySummary.totalOrdersInRange}</strong>
                          </div>
                          <div>
                            <span>Avg Orders / Day</span>
                            <strong>{activitySummary.avgOrdersPerDay.toFixed(1)}</strong>
                          </div>
                          <div>
                            <span>Best Revenue Day</span>
                            <strong>
                              {activitySummary.bestDay?.shortLabel || '-'}
                              {' Â· '}
                              {etbFormatter.format(activitySummary.bestDay?.revenue || 0)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="admin-empty-inline">No order activity in this range yet.</p>
                    )}
                  </div>

                  <div className="admin-insight-panel">
                    <div className="admin-insight-header">
                      <h3>Order Status Mix</h3>
                      <span>Distribution</span>
                    </div>
                    <div className="admin-donut-wrap">
                      <div
                        className="admin-donut"
                        style={{
                          background: `conic-gradient(#7c3aed 0 ${completedPercent}%, #22c55e ${completedPercent}% ${completedPercent + processingPercent}%, #f59e0b ${completedPercent + processingPercent}% ${completedPercent + processingPercent + pendingPercent}%, #334155 ${completedPercent + processingPercent + pendingPercent}% 100%)`,
                        }}
                      >
                        <div className="admin-donut-core">
                          <strong>{orders.length}</strong>
                          <span>Total Orders</span>
                        </div>
                      </div>
                      <div className="admin-donut-legend">
                        <div><i className="dot completed" /> Completed: {statusCount.completed || 0}</div>
                        <div><i className="dot processing" /> Processing: {statusCount.processing || 0}</div>
                        <div><i className="dot pending" /> Pending: {statusCount.pending_payment || 0}</div>
                      </div>
                    </div>
                    <div className="admin-status-intel">
                      <div className="admin-status-intel-grid">
                        <div className="admin-status-kpi admin-status-kpi-primary">
                          <span>Fulfillment Health</span>
                          <strong>{fulfillmentRate}%</strong>
                          <small>Completed + Processing</small>
                        </div>
                        <div className={`admin-status-kpi admin-status-kpi-${backlogTone}`}>
                          <span>Pending Backlog</span>
                          <strong>{pendingPercent}%</strong>
                          <small>{pendingOrders} orders need follow-up</small>
                        </div>
                        <div className="admin-status-kpi admin-status-kpi-muted">
                          <span>Oldest Pending</span>
                          <strong>{oldestPendingDays}d</strong>
                          <small>Longest waiting order age</small>
                        </div>
                      </div>

                      <div className="admin-status-progress-list">
                        {statusMixRows.map((row) => (
                          <div key={row.key} className="admin-status-progress-row">
                            <div className="admin-status-progress-top">
                              <span>{row.label}</span>
                              <strong>{row.count} â€¢ {row.percent}%</strong>
                            </div>
                            <div className="admin-status-progress-track">
                              <div
                                className={`admin-status-progress-fill ${row.key}`}
                                style={{ width: `${Math.min(Math.max(row.percent, 0), 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="admin-status-actions">
                        <button
                          type="button"
                          className="admin-status-action admin-status-action-warn"
                          onClick={() => {
                            setActiveTab('transactions');
                            setDashboardSearch('pending_payment');
                          }}
                        >
                          Review Pending
                        </button>
                        <button
                          type="button"
                          className="admin-status-action"
                          onClick={() => {
                            setActiveTab('transactions');
                            setDashboardSearch('processing');
                          }}
                        >
                          Track Processing
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-welcome">
                  <h2>Operational Snapshot</h2>
                  <p>Keep momentum high by prioritizing pending payments and processing orders first.</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div
                key="products"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="admin-section"
              >
                <div className="admin-section-header">
                  <div>
                    <h2>All Products</h2>
                    <p className="admin-section-subtitle">Catalog management, stock levels, and product updates.</p>
                  </div>
                  <button 
                    className="admin-btn-primary"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({
                        name: '', description: '', category_id: '', brand: '',
                        frame_type: '', lens_type: '', frame_material: '',
                        quantity_in_stock: 0, buying_price: 0, selling_price: 0,
                        image_url: '', prescription_required: false
                      });
                      setShowProductModal(true);
                    }}
                  >
                    <Plus size={18} />
                    Add Product
                  </button>
                </div>

                <div className="admin-chip-row">
                  <span className="admin-chip-pill">Total: {products.length}</span>
                  <span className="admin-chip-pill">Visible: {filteredProducts.length}</span>
                  <span className="admin-chip-pill">Categories: {categories.length}</span>
                  <span className="admin-chip-pill admin-chip-pill-warn">Low Stock (&lt;=5): {lowStockProductsCount}</span>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.brand || '-'}</td>
                          <td>{product.category_name || '-'}</td>
                          <td>{etbFormatter.format(Number(product.selling_price) || 0)}</td>
                          <td>{product.quantity_in_stock}</td>
                          <td className="admin-actions">
                            <button 
                              className="admin-btn-edit"
                              onClick={() => {
                                setEditingProduct(product);
                                setProductForm({
                                  name: product.name,
                                  description: product.description || '',
                                  category_id: product.category_id || '',
                                  brand: product.brand || '',
                                  frame_type: product.frame_type || '',
                                  lens_type: product.lens_type || '',
                                  frame_material: product.frame_material || '',
                                  quantity_in_stock: product.quantity_in_stock,
                                  buying_price: product.buying_price,
                                  selling_price: product.selling_price,
                                  image_url: product.image_url || '',
                                  prescription_required: product.prescription_required
                                });
                                setShowProductModal(true);
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="admin-btn-delete"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'categories' && (
              <motion.div
                key="categories"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="admin-section"
              >
                <div className="admin-section-header">
                  <div>
                    <h2>All Categories</h2>
                    <p className="admin-section-subtitle">Maintain product grouping and discoverability.</p>
                  </div>
                  <button 
                    className="admin-btn-primary"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({ name: '', description: '' });
                      setShowCategoryModal(true);
                    }}
                  >
                    <Plus size={18} />
                    Add Category
                  </button>
                </div>

                <div className="admin-chip-row">
                  <span className="admin-chip-pill">Category Count: {categories.length}</span>
                  <span className="admin-chip-pill">Visible: {filteredCategories.length}</span>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((category) => (
                        <tr key={category.id}>
                          <td>{category.name}</td>
                          <td>{category.description || '-'}</td>
                          <td className="admin-actions">
                            <button 
                              className="admin-btn-edit"
                              onClick={() => {
                                setEditingCategory(category);
                                setCategoryForm({
                                  name: category.name,
                                  description: category.description || ''
                                });
                                setShowCategoryModal(true);
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="admin-btn-delete"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'transactions' && (
              <motion.div
                key="transactions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="admin-section"
              >
                <div className="admin-section-header">
                  <div>
                    <h2>Orders & Transactions</h2>
                    <p className="admin-section-subtitle">Track payment status and fulfillment progress for each order.</p>
                  </div>
                </div>

                <div className="admin-chip-row">
                  <span className="admin-chip-pill">Orders: {orders.length}</span>
                  <span className="admin-chip-pill">Visible: {displayOrders.length}</span>
                  <span className="admin-chip-pill admin-chip-pill-success">Completed: {statusCount.completed || 0}</span>
                  <span className="admin-chip-pill admin-chip-pill-info">Processing: {statusCount.processing || 0}</span>
                  <span className="admin-chip-pill admin-chip-pill-warn">Pending Payment: {statusCount.pending_payment || 0}</span>
                  <span className="admin-chip-pill">Collected Revenue: {etbFormatter.format(collectedRevenue)}</span>
                </div>

                <div className="admin-transaction-toolbar">
                  <div className="admin-transaction-filters">
                    <select
                      value={transactionStatusFilter}
                      onChange={(event) => setTransactionStatusFilter(event.target.value)}
                    >
                      <option value="all">All statuses</option>
                      <option value="pending_payment">Pending payment</option>
                      <option value="processing">Processing</option>
                      <option value="paid">Paid</option>
                      <option value="shipped">Shipped</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>

                  <div className="admin-bulk-actions">
                    <span>{selectedOrderIds.length} selected</span>
                    <select
                      value={bulkOrderStatus}
                      onChange={(event) => setBulkOrderStatus(event.target.value)}
                      disabled={!selectedOrderIds.length || isBulkUpdatingOrders}
                    >
                      <option value="processing">processing</option>
                      <option value="paid">paid</option>
                      <option value="shipped">shipped</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                      <option value="refunded">refunded</option>
                      <option value="pending_payment">pending_payment</option>
                    </select>
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={handleBulkOrderStatusUpdate}
                      disabled={!selectedOrderIds.length || isBulkUpdatingOrders}
                    >
                      {isBulkUpdatingOrders ? 'Updating...' : 'Apply to Selected'}
                    </button>
                  </div>
                </div>

                {displayOrders.length === 0 ? (
                  <div className="admin-notifications-empty">
                    No orders found for this search.
                  </div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>
                            <label className="admin-checkbox" aria-label="Select all visible orders">
                              <input
                                type="checkbox"
                                checked={areAllVisibleOrdersSelected}
                                onChange={handleToggleSelectAllVisible}
                              />
                            </label>
                          </th>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Payment</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Control</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayOrders.map((order) => {
                          const normalizedPaymentStatus = normalizePaymentStatus(order.payment_status);
                          const normalizedOrderStatus = normalizeOrderStatus(order.status);
                          const isPaidLike =
                            normalizedPaymentStatus === 'success' ||
                            normalizedPaymentStatus === 'paid' ||
                            normalizedOrderStatus === 'paid' ||
                            normalizedOrderStatus === 'shipped' ||
                            normalizedOrderStatus === 'completed';

                          return (
                          <tr
                            key={order.id}
                            id={`admin-order-row-${order.id}`}
                            className={Number(selectedOrderId) === Number(order.id) ? 'admin-row-highlight' : ''}
                          >
                            <td>
                              <label className="admin-checkbox" aria-label={`Select order ${order.id}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedOrderIds.includes(Number(order.id))}
                                  onChange={() => handleToggleOrderSelection(order.id)}
                                />
                              </label>
                            </td>
                            <td>#{order.id}</td>
                            <td>
                              <div className="admin-order-customer">
                                <strong>{order.customer_name || 'Unknown'}</strong>
                                <span>{order.customer_email || '-'}</span>
                              </div>
                            </td>
                            <td>{order.item_count ?? '-'}</td>
                            <td>
                              {(order.currency || 'ETB')} {Number(order.total || 0).toFixed(2)}
                            </td>
                            <td>
                              <span className={`admin-payment-badge ${isPaidLike ? 'paid' : 'pending'}`}>
                                {order.payment_status || (isPaidLike ? 'paid' : 'pending')}
                              </span>
                            </td>
                            <td>
                              <span className={`admin-order-status admin-order-status-${normalizedOrderStatus}`}>
                                {normalizedOrderStatus}
                              </span>
                            </td>
                            <td>{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</td>
                            <td>
                              <select
                                className="admin-order-status-select"
                                value={normalizedOrderStatus}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                disabled={isUpdatingOrder || isBulkUpdatingOrders}
                              >
                                {ORDER_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="admin-section"
              >
                <div className="admin-section-header">
                  <div>
                    <h2>Registered Users</h2>
                    <p className="admin-section-subtitle">Monitor customer growth and administrative accounts.</p>
                  </div>
                </div>

                <div className="admin-chip-row">
                  <span className="admin-chip-pill">Total Users: {adminUsers.length}</span>
                  <span className="admin-chip-pill">Visible: {filteredUsers.length}</span>
                  <span className="admin-chip-pill admin-chip-pill-success">Admins: {adminCount}</span>
                  <span className="admin-chip-pill">Customers: {Math.max(adminUsers.length - adminCount, 0)}</span>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="admin-notifications-empty">
                    No users found for this search.
                  </div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Role</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((listUser) => (
                          <tr
                            key={listUser.id}
                            id={`admin-user-row-${listUser.id}`}
                            className={selectedUserId === listUser.id ? 'admin-row-highlight' : ''}
                          >
                            <td>#{listUser.id}</td>
                            <td>{listUser.name || '-'}</td>
                            <td>{listUser.email || '-'}</td>
                            <td>{listUser.phone || '-'}</td>
                            <td>
                              <span className={`admin-payment-badge ${listUser.isAdmin ? 'paid' : 'pending'}`}>
                                {listUser.isAdmin ? 'admin' : 'customer'}
                              </span>
                            </td>
                            <td>{new Date(listUser.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="admin-section"
              >
                <div className="admin-section-header">
                  <div>
                    <h2>Admin Notifications</h2>
                    <p className="admin-section-subtitle">Realtime operational alerts and event updates.</p>
                  </div>
                </div>

                <div className="admin-chip-row">
                  <span className="admin-chip-pill">Total: {notifications.length}</span>
                  <span className="admin-chip-pill">Visible: {filteredNotifications.length}</span>
                  <span className="admin-chip-pill admin-chip-pill-info">Unread: {unreadNotifications}</span>
                  <span className="admin-chip-pill">Read: {Math.max(notifications.length - unreadNotifications, 0)}</span>
                </div>

                {filteredNotifications.length === 0 ? (
                  <div className="admin-notifications-empty">
                    No notifications found for this search.
                  </div>
                ) : (
                  <div className="admin-notifications-list">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`admin-notification-item ${notification.is_read ? 'is-read' : 'is-unread'}`}
                        onClick={() => handleNotificationClick(notification)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNotificationClick(notification);
                          }
                        }}
                      >
                        <div className="admin-notification-content">
                          <h4>{notification.title}</h4>
                          <p>{notification.message}</p>
                          <span className="admin-notification-action-hint">
                            {getNotificationTarget(notification).label}
                          </span>
                          <span>
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                        </div>
                        {!notification.is_read && (
                          <button
                            type="button"
                            className="admin-mark-read-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkNotificationAsRead(notification.id);
                            }}
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'screenshot-payments' && (
              <motion.div
                key="screenshot-payments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="admin-section"
              >
                <div className="admin-section-header">
                  <div>
                    <h2>Screenshot Payments</h2>
                    <p className="admin-section-subtitle">Review and verify bank transfer payment screenshots from customers.</p>
                  </div>
                </div>

                <div className="admin-chip-row">
                  <span className="admin-chip-pill">Total: {screenshotPayments.length}</span>
                  <span className="admin-chip-pill admin-chip-pill-warn">Pending: {pendingScreenshotCount}</span>
                  <span className="admin-chip-pill admin-chip-pill-success">
                    Approved: {screenshotPayments.filter((s) => s.status === 'approved').length}
                  </span>
                  <span className="admin-chip-pill">
                    Rejected: {screenshotPayments.filter((s) => s.status === 'rejected').length}
                  </span>
                </div>

                <div className="admin-transaction-toolbar">
                  <div className="admin-transaction-filters">
                    <select
                      value={screenshotStatusFilter}
                      onChange={(e) => setScreenshotStatusFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {displayScreenshotPayments.length === 0 ? (
                  <div className="admin-notifications-empty">
                    No screenshot payments found.
                  </div>
                ) : (
                  <div className="admin-screenshot-list">
                    {displayScreenshotPayments.map((item) => (
                      <div
                        key={item.id}
                        className={`admin-screenshot-card ${item.status === 'pending' ? 'admin-screenshot-card-pending' : ''}`}
                      >
                        <div className="admin-screenshot-thumb-wrap">
                          <img
                            src={toServerUrl(item.screenshot_path)}
                            alt="Payment screenshot"
                            className="admin-screenshot-thumb"
                            onClick={() => setPreviewScreenshot(toServerUrl(item.screenshot_path))}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') setPreviewScreenshot(item.screenshot_path);
                            }}
                            title="Click to enlarge"
                          />
                          <span className={`admin-screenshot-status admin-screenshot-status-${item.status}`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="admin-screenshot-info">
                          <div className="admin-screenshot-info-row">
                            <div>
                              <strong>Order #{item.order_id}</strong>
                              <span className="admin-screenshot-customer">
                                {item.customer_name || 'Unknown'} Â· {item.customer_email || '-'}
                              </span>
                            </div>
                            <div className="admin-screenshot-amount">
                              {(item.currency || 'ETB')} {Number(item.total || 0).toFixed(2)}
                            </div>
                          </div>

                          {item.notes && (
                            <p className="admin-screenshot-notes">
                              <strong>Customer note:</strong> {item.notes}
                            </p>
                          )}

                          {item.admin_note && (
                            <p className="admin-screenshot-admin-note">
                              <strong>Admin note:</strong> {item.admin_note}
                            </p>
                          )}

                          <p className="admin-screenshot-date">
                            Submitted: {new Date(item.created_at).toLocaleString()}
                            {item.reviewed_at && ` Â· Reviewed: ${new Date(item.reviewed_at).toLocaleString()}`}
                          </p>

                          {item.status === 'pending' && (
                            <div className="admin-screenshot-actions">
                              {reviewingScreenshotId === item.id ? (
                                <div className="admin-screenshot-review-form">
                                  <textarea
                                    placeholder="Admin note (optional)..."
                                    value={adminNoteInput}
                                    onChange={(e) => setAdminNoteInput(e.target.value)}
                                    rows={2}
                                    maxLength={500}
                                    className="admin-screenshot-note-input"
                                  />
                                  <div className="admin-screenshot-review-btns">
                                    <button
                                      type="button"
                                      className="admin-btn-success"
                                      disabled={screenshotReviewLoading}
                                      onClick={() => handleReviewScreenshotPayment(item.id, 'approve')}
                                    >
                                      {screenshotReviewLoading ? 'Processing...' : 'âœ“ Approve'}
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-btn-delete"
                                      disabled={screenshotReviewLoading}
                                      onClick={() => handleReviewScreenshotPayment(item.id, 'reject')}
                                    >
                                      {screenshotReviewLoading ? 'Processing...' : 'âœ• Reject'}
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-btn-secondary"
                                      onClick={() => {
                                        setReviewingScreenshotId(null);
                                        setAdminNoteInput('');
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-btn-primary"
                                  onClick={() => {
                                    setReviewingScreenshotId(item.id);
                                    setAdminNoteInput('');
                                  }}
                                >
                                  Review Payment
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Image preview modal */}
                {previewScreenshot && (
                  <div
                    className="admin-modal-overlay"
                    onClick={() => setPreviewScreenshot(null)}
                    role="button"
                    tabIndex={0}
                    aria-label="Close preview"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setPreviewScreenshot(null);
                    }}
                  >
                    <motion.div
                      className="admin-screenshot-preview-modal"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="admin-screenshot-preview-close"
                        onClick={() => setPreviewScreenshot(null)}
                        aria-label="Close"
                      >
                        <X size={20} />
                      </button>
                      <img
                        src={previewScreenshot}
                        alt="Full size payment screenshot"
                        className="admin-screenshot-preview-img"
                      />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="admin-section"
              >
                <div className="admin-profile-card">
                  <div className="admin-profile-header">
                    <div className="admin-profile-avatar-wrap">
                      {profileForm.profile_image ? (
                        <img src={profileForm.profile_image} alt="Profile" className="admin-profile-avatar" />
                      ) : (
                        <div className="admin-profile-avatar admin-profile-avatar-fallback">
                          <UserCircle2 size={50} />
                        </div>
                      )}
                      <label className="admin-profile-image-picker" htmlFor="admin-profile-image-input">
                        <Camera size={14} />
                        <span>Upload</span>
                      </label>
                      <input
                        id="admin-profile-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageSelect}
                        className="admin-profile-image-input"
                      />
                    </div>

                    <div>
                      <h2>Admin Profile</h2>
                      <p>Manage your dashboard account details and profile picture.</p>
                      <div className="admin-profile-role">
                        <ShieldCheck size={14} />
                        <span>Administrator</span>
                      </div>
                    </div>
                  </div>

                  <div className="admin-profile-grid">
                    <label>
                      Full Name
                      <input
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                      />
                    </label>

                    <label>
                      Email
                      <input
                        name="email"
                        value={profileForm.email}
                        disabled
                      />
                    </label>

                    <label>
                      Phone
                      <input
                        name="phone"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        placeholder="e.g. +251..."
                      />
                    </label>

                    <label>
                      Address
                      <input
                        name="address"
                        value={profileForm.address}
                        onChange={handleProfileChange}
                        placeholder="City, sub-city, house no."
                      />
                    </label>
                  </div>

                  <div className="admin-profile-actions">
                    <button
                      className="admin-btn-primary"
                      onClick={handleSaveProfile}
                      disabled={isProfileSaving}
                    >
                      <Save size={18} />
                      {isProfileSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button
                      className="admin-btn-secondary"
                      onClick={() => setProfileForm((prev) => ({ ...prev, profile_image: '' }))}
                    >
                      Remove Picture
                    </button>
                  </div>

                  {profileStatus && <p className="admin-profile-success">{profileStatus}</p>}
                  {profileError && <p className="admin-profile-error">{profileError}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Product Modal */}
      {showProductModal && (
        <div className="admin-modal-overlay">
          <motion.div 
            className="admin-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="admin-modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setShowProductModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-grid">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Brand"
                  value={productForm.brand}
                  onChange={(e) => setProductForm({...productForm, brand: e.target.value})}
                />
                <select
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({...productForm, category_id: e.target.value})}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Frame Type"
                  value={productForm.frame_type}
                  onChange={(e) => setProductForm({...productForm, frame_type: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Lens Type"
                  value={productForm.lens_type}
                  onChange={(e) => setProductForm({...productForm, lens_type: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Frame Material"
                  value={productForm.frame_material}
                  onChange={(e) => setProductForm({...productForm, frame_material: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Stock Quantity"
                  value={productForm.quantity_in_stock}
                  onChange={(e) => setProductForm({...productForm, quantity_in_stock: parseInt(e.target.value) || 0})}
                />
                <input
                  type="number"
                  placeholder="Buying Price"
                  value={productForm.buying_price}
                  onChange={(e) => setProductForm({...productForm, buying_price: parseFloat(e.target.value) || 0})}
                />
                <input
                  type="number"
                  placeholder="Selling Price"
                  value={productForm.selling_price}
                  onChange={(e) => setProductForm({...productForm, selling_price: parseFloat(e.target.value) || 0})}
                />
                <input
                  type="text"
                  placeholder="Image URL"
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({...productForm, image_url: e.target.value})}
                />
              </div>
              <textarea
                placeholder="Description"
                value={productForm.description}
                onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                rows={3}
              />
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={productForm.prescription_required}
                  onChange={(e) => setProductForm({...productForm, prescription_required: e.target.checked})}
                />
                Prescription Required
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setShowProductModal(false)}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handleSaveProduct}>
                <Save size={18} />
                Save Product
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="admin-modal-overlay">
          <motion.div 
            className="admin-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="admin-modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowCategoryModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="admin-modal-body">
              <input
                type="text"
                placeholder="Category Name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
              />
              <textarea
                placeholder="Description (optional)"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handleSaveCategory}>
                <Save size={18} />
                Save Category
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;


