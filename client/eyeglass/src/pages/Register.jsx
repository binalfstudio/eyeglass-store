import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRegisterMutation } from '../redux/api/auth'
import { useAddToCartMutation } from '../redux/api/cart'
import { Shield } from 'lucide-react'
import './Auth.css'

const Register = () => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [showAdminKey, setShowAdminKey] = useState(false)
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()
  const [register, { isLoading }] = useRegisterMutation()
  const [addToCartApi] = useAddToCartMutation()

  const mergeGuestCart = async () => {
    const savedCart = localStorage.getItem('cart')
    if (!savedCart) return

    let guestCartItems = []
    try {
      guestCartItems = JSON.parse(savedCart)
    } catch {
      return
    }

    if (!Array.isArray(guestCartItems) || guestCartItems.length === 0) return

    const mergeRequests = guestCartItems
      .map((item) => ({
        eyeglass_id: Number(item.id),
        quantity: Math.max(1, Number(item.quantity) || 1),
      }))
      .filter((item) => Number.isFinite(item.eyeglass_id) && item.eyeglass_id > 0)

    if (mergeRequests.length === 0) return

    const results = await Promise.allSettled(
      mergeRequests.map((item) => addToCartApi(item).unwrap())
    )

    const allSucceeded = results.every((result) => result.status === 'fulfilled')
    if (allSucceeded) {
      localStorage.removeItem('cart')
      window.dispatchEvent(new Event('cart-change'))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validation = {};
    if (!name || String(name).trim().length < 2) validation.name = t('auth.validation.nameMin');
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!email || !emailRe.test(String(email).trim())) validation.email = t('auth.validation.emailInvalid');
    if (!password || String(password).length < 8) validation.password = t('auth.validation.passwordMin');
    if (password && !/[A-Z]/.test(password)) validation.password = t('auth.validation.passwordUpper');
    if (password && !/[a-z]/.test(password)) validation.password = t('auth.validation.passwordLower');
    if (password && !/[0-9]/.test(password)) validation.password = t('auth.validation.passwordNumber');

    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }
    setErrors({});
    try {
      const data = { name, email, password }
      if (adminKey.trim()) {
        data.adminKey = adminKey.trim()
      }
      const result = await register(data).unwrap()
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result))
      await mergeGuestCart()
      window.dispatchEvent(new Event('auth-change'))
      window.dispatchEvent(new Event('cart-change'))
      navigate('/')
    } catch (error) {
      console.error('Registration error:', error)
      const serverMessage = error?.data?.message || error?.error || '';
      const validationErrors = Array.isArray(error?.data?.errors) ? error.data.errors : [];
      const details = validationErrors.length
        ? validationErrors.map((e) => `${e.field}: ${e.message}`).join('\n')
        : '';

      const finalMessage = [serverMessage, details].filter(Boolean).join('\n');
      alert(`${t('auth.registrationFailed')}:\n${finalMessage || JSON.stringify(error) || 'Unknown error'}`)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('auth.createAccount')}</h1>
        <p>{t('auth.joinUs')}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t('auth.fullName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-invalid={errors.name ? 'true' : 'false'}
          />
          {errors.name && <div className="input-error">{errors.name}</div>}
          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={errors.email ? 'true' : 'false'}
          />
          {errors.email && <div className="input-error">{errors.email}</div>}
          <input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-invalid={errors.password ? 'true' : 'false'}
          />
          {errors.password && <div className="input-error">{errors.password}</div>}

          <button
            type="button"
            className="admin-key-toggle"
            onClick={() => setShowAdminKey(!showAdminKey)}
          >
            <Shield size={16} />
            {showAdminKey ? t('auth.hideAdminKey') : t('auth.registerAsAdmin')}
          </button>

          {showAdminKey && (
            <input
              type="password"
              placeholder={t('auth.adminKeyPlaceholder')}
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="admin-key-input"
            />
          )}

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? t('auth.creatingAccount') : t('auth.signUp')}
          </button>
        </form>
        <p className="auth-link">
          {t('auth.hasAccount')} <Link to="/login">{t('auth.signInLink')}</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
