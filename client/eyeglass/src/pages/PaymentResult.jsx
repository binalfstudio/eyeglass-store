import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight, ShoppingCart } from 'lucide-react'
import { useDispatch } from 'react-redux'
import {
  cartApi,
  useConfirmPaymentSessionMutation,
  useClearCartMutation,
  useLazyGetPendingPaymentSessionQuery,
} from '../redux/api/cart'
import {
  clearPendingTxRef,
  resolvePaymentTxRef,
} from '../utils/payment'
import './PaymentResult.css'

const getReadableError = (error, fallbackMessage) => {
  const rawMessage = error?.data?.message ?? error?.error ?? error?.message

  if (typeof rawMessage === 'string' && rawMessage.trim()) {
    return rawMessage
  }

  if (Array.isArray(rawMessage)) {
    return rawMessage.filter(Boolean).join(', ') || fallbackMessage
  }

  if (rawMessage && typeof rawMessage === 'object') {
    if (typeof rawMessage.message === 'string' && rawMessage.message.trim()) {
      return rawMessage.message
    }

    try {
      return JSON.stringify(rawMessage)
    } catch {
      return fallbackMessage
    }
  }

  return fallbackMessage
}

const PaymentResult = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const dispatch = useDispatch()
  const [confirmPaymentSession] = useConfirmPaymentSessionMutation()
  const [clearCart] = useClearCartMutation()
  const [fetchPendingSession] = useLazyGetPendingPaymentSessionQuery()

  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Verifying your payment...')

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const txRef = useMemo(() => resolvePaymentTxRef(location.search), [location.search])
  const incomingStatus = (params.get('status') || params.get('payment_status') || '').toLowerCase()

  useEffect(() => {
    const run = async () => {
      let paymentRef = txRef

      if (!paymentRef && token) {
        try {
          const pending = await fetchPendingSession().unwrap()
          paymentRef = pending?.sessionId || ''
        } catch {
          // No pending session to recover
        }
      }

      if (!paymentRef) {
        setStatus('error')
        setMessage('Missing payment reference. Please try checkout again.')
        return
      }

      if (incomingStatus === 'cancelled' || incomingStatus === 'failed') {
        setStatus('cancelled')
        setMessage('Payment was cancelled. Your cart items are still saved.')
        return
      }

      if (!token) {
        setStatus('error')
        setMessage('Please log in to complete payment verification.')
        return
      }

      try {
        await confirmPaymentSession(paymentRef).unwrap()
        try {
          await clearCart().unwrap()
        } catch {
          // Cart may already be empty after checkout or webhook
        }
        localStorage.removeItem('cart')
        dispatch(cartApi.util.invalidateTags(['Cart']))
        clearPendingTxRef()
        setStatus('success')
        setMessage('Payment successful. Your order has been confirmed.')
      } catch (error) {
        setStatus('error')
        setMessage(getReadableError(error, 'Payment was received, but confirmation failed. Please contact support with your tx_ref.'))
      }
    }

    run()
  }, [clearCart, confirmPaymentSession, dispatch, fetchPendingSession, incomingStatus, token, txRef])

  useEffect(() => {
    if (status === 'success') {
      window.dispatchEvent(new Event('cart-change'))
    }
  }, [status])

  return (
    <div className="payment-result-page">
      <motion.div
        className="payment-result-card"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="payment-icon-wrap">
          {status === 'loading' && <Loader2 className="spin" size={44} />}
          {status === 'success' && <CheckCircle2 size={44} />}
          {(status === 'error' || status === 'cancelled') && <AlertTriangle size={44} />}
        </div>

        <h1>
          {status === 'loading' && 'Processing Payment'}
          {status === 'success' && 'Payment Confirmed'}
          {status === 'cancelled' && 'Payment Cancelled'}
          {status === 'error' && 'Payment Verification Failed'}
        </h1>

        <p>{message}</p>

        {txRef && (
          <div className="payment-ref">
            <span>Transaction Reference</span>
            <strong>{txRef}</strong>
          </div>
        )}

        <div className="payment-actions">
          {status === 'error' && !token ? (
            <button onClick={() => navigate('/login')} className="payment-btn primary">
              Login <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={() => navigate('/cart')} className="payment-btn primary">
              View Cart <ShoppingCart size={16} />
            </button>
          )}

          <button onClick={() => navigate('/shop')} className="payment-btn ghost">
            Continue Shopping <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default PaymentResult
