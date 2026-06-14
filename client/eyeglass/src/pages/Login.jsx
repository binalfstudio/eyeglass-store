import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLoginMutation } from '../redux/api/auth'
import { useAddToCartMutation } from '../redux/api/cart'
import './Auth.css'

const Login = () => {
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
      const message = error?.data?.message || error?.error || 'Login failed'
      alert(message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p>Sign in to your account</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
