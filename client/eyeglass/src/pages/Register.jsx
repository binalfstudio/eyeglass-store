import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useRegisterMutation } from '../redux/api/auth'
import { useAddToCartMutation } from '../redux/api/cart'
import { Shield } from 'lucide-react'
import './Auth.css'

const Register = () => {
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
    // client-side validation
    const validation = {};
    if (!name || String(name).trim().length < 2) validation.name = 'Name must be at least 2 characters.';
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!email || !emailRe.test(String(email).trim())) validation.email = 'Please enter a valid email address.';
    if (!password || String(password).length < 8) validation.password = 'Password must be at least 8 characters.';
    if (password && !/[A-Z]/.test(password)) validation.password = 'Password must include at least one uppercase letter.';
    if (password && !/[a-z]/.test(password)) validation.password = 'Password must include at least one lowercase letter.';
    if (password && !/[0-9]/.test(password)) validation.password = 'Password must include at least one number.';

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
      // Notify Header component of auth change
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

        alert('Registration failed:\n' + (finalMessage || JSON.stringify(error) || 'Unknown error'))
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p>Join us today</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-invalid={errors.name ? 'true' : 'false'}
          />
          {errors.name && <div className="input-error">{errors.name}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={errors.email ? 'true' : 'false'}
          />
          {errors.email && <div className="input-error">{errors.email}</div>}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-invalid={errors.password ? 'true' : 'false'}
          />
          {errors.password && <div className="input-error">{errors.password}</div>}
          
          {/* Admin Key Toggle */}
          <button 
            type="button" 
            className="admin-key-toggle"
            onClick={() => setShowAdminKey(!showAdminKey)}
          >
            <Shield size={16} />
            {showAdminKey ? 'Hide Admin Key' : 'Register as Admin?'}
          </button>
          
          {/* Admin Key Input */}
          {showAdminKey && (
            <input
              type="password"
              placeholder="Enter Admin Key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="admin-key-input"
            />
          )}
          
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
