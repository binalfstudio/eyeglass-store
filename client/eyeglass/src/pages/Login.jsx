import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLoginMutation } from '../redux/api/auth'
import { useAddToCartMutation } from '../redux/api/cart'
import './Auth.css'

const Login = () => {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const [login, { isLoading }] = useLoginMutation()
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
    try {
      const result = await login({ email, password }).unwrap()
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result))
      await mergeGuestCart()
      window.dispatchEvent(new Event('auth-change'))
      window.dispatchEvent(new Event('cart-change'))
      navigate('/')
    } catch (error) {
      const message = error?.data?.message || error?.error || t('auth.loginFailed')
      alert(message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('auth.welcomeBack')}</h1>
        <p>{t('auth.signInSubtitle')}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
        <p className="auth-link">
          {t('auth.noAccount')} <Link to="/register">{t('auth.signUpLink')}</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
