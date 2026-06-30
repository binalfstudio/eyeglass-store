import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, X, Send, Clock, CheckCircle2, AlertTriangle,
  ArrowLeft, Copy, Smartphone, Building2, User2, Hash,
  Bell, RefreshCw,
} from 'lucide-react'
import { useGetCartQuery } from '../redux/api/cart'
import { useSubmitScreenshotPaymentMutation, useGetMySubmissionsQuery } from '../redux/api/screenshotPayment'
import { API_BASE_URL } from '../utils/apiConfig'

import './ScreenshotPayment.css'

// Derive server base for image URLs (strips /api suffix)
const SERVER_BASE = API_BASE_URL.startsWith('http')
  ? API_BASE_URL.replace(/\/api\/?$/, '')
  : ''   // empty string → relative URL (works via Vite proxy)

// ── Bank / payment details shown to the user ────────────────────────────────
const BANK_INFO = [
  { icon: Building2, label: 'Bank',           value: 'Commercial Bank of Ethiopia (CBE)' },
  { icon: Hash,      label: 'Account Number', value: '1000-1234-5678-9' },
  { icon: User2,     label: 'Account Name',   value: 'Z Visionary Trading PLC' },
  { icon: Smartphone,label: 'TeleBirr',       value: '0911 000 000' },
]

const etbFmt = new Intl.NumberFormat('en-ET', {
  style: 'currency', currency: 'ETB', minimumFractionDigits: 2,
})

const STATUS = {
  pending:  { label: 'Pending Review',  color: 'warn',    Icon: Clock },
  approved: { label: 'Approved ✓',      color: 'success', Icon: CheckCircle2 },
  rejected: { label: 'Rejected',        color: 'error',   Icon: AlertTriangle },
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ScreenshotPayment() {
  const navigate  = useNavigate()
  const fileRef   = useRef(null)
  const token     = localStorage.getItem('token')

  // Cart data (read-only — user reviews before paying)
  const { data: cart = [], isLoading: cartLoading } = useGetCartQuery(undefined, {
    skip: !token, refetchOnMountOrArgChange: true,
  })

  // Summary
  const summary = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + Number(i.selling_price) * Number(i.quantity), 0)
    const shipping = subtotal > 250 || subtotal === 0 ? 0 : 12
    const tax      = subtotal * 0.08
    return { subtotal, shipping, tax, total: subtotal + shipping + tax }
  }, [cart])

  // Form state
  const [file,      setFile]      = useState(null)
  const [preview,   setPreview]   = useState(null)
  const [notes,     setNotes]     = useState('')
  const [dragOver,  setDragOver]  = useState(false)
  const [feedback,  setFeedback]  = useState(null)   // { type:'success'|'error', msg }
  const [copied,    setCopied]    = useState(null)    // which field was copied

  // API
  const [submit, { isLoading: submitting }] = useSubmitScreenshotPaymentMutation()
  const { data: mySubmissions = [], refetch: refetchSubs } = useGetMySubmissionsQuery(
    undefined, { skip: !token }
  )

  // ── helpers ───────────────────────────────────────────────────────────────
  const selectFile = (f) => {
    if (!f) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(f.type)) {
      setFeedback({ type: 'error', msg: 'Only JPEG, PNG, WEBP or GIF images are allowed.' })
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', msg: 'Image must be smaller than 5 MB.' })
      return
    }
    setFile(f)
    setFeedback(null)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  const clearFile = () => {
    setFile(null); setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const copyToClipboard = (value, key) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setFeedback({ type: 'error', msg: 'Please select a payment screenshot first.' }); return }

    const formData = new FormData()
    formData.append('screenshot', file)
    if (notes.trim()) formData.append('notes', notes.trim())

    try {
      const res = await submit(formData).unwrap()
      setFeedback({ type: 'success', msg: res.message || 'Screenshot submitted! We will verify and confirm your order.' })
      clearFile()
      setNotes('')
      refetchSubs()
      window.dispatchEvent(new Event('cart-change'))
    } catch (err) {
      const msg = err?.data?.message || err?.error || err?.message || 'Submission failed. Please try again.'
      setFeedback({ type: 'error', msg })
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="sp-page">

      {/* ── Header ── */}
      <div className="sp-topbar">
        <button className="sp-back" type="button" onClick={() => navigate('/cart')}>
          <ArrowLeft size={16} /> Back to Cart
        </button>
        <h1 className="sp-heading">Pay via Bank Transfer</h1>
        <p className="sp-subheading">
          Transfer the exact amount below to our account, take a screenshot of the confirmation,
          then upload it here. Our team verifies within a few hours and you will get a notification.
        </p>
      </div>

      <div className="sp-body">

        {/* ══ LEFT: steps + bank info + upload ══ */}
        <div className="sp-left">

          {/* Step 1 — amount */}
          <div className="sp-step-card">
            <div className="sp-step-num">1</div>
            <div className="sp-step-body">
              <h2 className="sp-step-title">Transfer this exact amount</h2>

              {cartLoading ? (
                <div className="sp-loading"><RefreshCw size={20} className="sp-spin" /> Loading cart…</div>
              ) : cart.length === 0 ? (
                <p className="sp-empty-cart">Your cart is empty. <button type="button" onClick={() => navigate('/shop')} className="sp-link">Go to shop</button></p>
              ) : (
                <>
                  {/* Cart lines */}
                  <div className="sp-cart-lines">
                    {cart.map((item) => (
                      <div key={item.id} className="sp-cart-line">
                        <span className="sp-cart-name">{item.name} <em>×{item.quantity}</em></span>
                        <span className="sp-cart-price">{etbFmt.format(Number(item.selling_price) * Number(item.quantity))}</span>
                      </div>
                    ))}
                    <div className="sp-cart-line sp-cart-sub">
                      <span>Subtotal</span><span>{etbFmt.format(summary.subtotal)}</span>
                    </div>
                    {summary.shipping > 0 && (
                      <div className="sp-cart-line sp-cart-sub">
                        <span>Shipping</span><span>{etbFmt.format(summary.shipping)}</span>
                      </div>
                    )}
                    <div className="sp-cart-line sp-cart-sub">
                      <span>Tax (8%)</span><span>{etbFmt.format(summary.tax)}</span>
                    </div>
                  </div>

                  {/* Total to transfer */}
                  <div className="sp-total-box">
                    <span>Total to Transfer</span>
                    <strong className="sp-total-amount">{etbFmt.format(summary.total)}</strong>
                    <button
                      type="button"
                      className="sp-copy-total"
                      onClick={() => copyToClipboard(summary.total.toFixed(2), 'total')}
                      title="Copy amount"
                    >
                      {copied === 'total' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      {copied === 'total' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step 2 — bank details */}
          <div className="sp-step-card">
            <div className="sp-step-num">2</div>
            <div className="sp-step-body">
              <h2 className="sp-step-title">Send to this account</h2>
              <div className="sp-bank-rows">
                {BANK_INFO.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="sp-bank-row">
                    <Icon size={16} className="sp-bank-icon" />
                    <div className="sp-bank-text">
                      <span className="sp-bank-label">{label}</span>
                      <span className="sp-bank-value">{value}</span>
                    </div>
                    <button
                      type="button"
                      className="sp-copy-btn"
                      onClick={() => copyToClipboard(value, label)}
                      title={`Copy ${label}`}
                    >
                      {copied === label ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 — upload */}
          <div className="sp-step-card">
            <div className="sp-step-num">3</div>
            <div className="sp-step-body">
              <h2 className="sp-step-title">Upload your payment screenshot</h2>
              <p className="sp-step-hint">Take a screenshot of the transfer confirmation from your banking app and upload it below.</p>

              <form onSubmit={handleSubmit} className="sp-form">

                {/* Drop zone */}
                <div
                  className={`sp-dropzone ${dragOver ? 'sp-dz-active' : ''} ${file ? 'sp-dz-filled' : ''}`}
                  onClick={() => !file && fileRef.current?.click()}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files?.[0]) }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload screenshot"
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !file) fileRef.current?.click() }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => selectFile(e.target.files?.[0])}
                    className="sp-file-input"
                  />

                  <AnimatePresence mode="wait">
                    {preview ? (
                      <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sp-preview-wrap">
                        <img src={preview} alt="Payment screenshot preview" className="sp-preview-img" />
                        <button
                          type="button" className="sp-clear-btn"
                          onClick={(e) => { e.stopPropagation(); clearFile() }}
                          aria-label="Remove image"
                        >
                          <X size={14} />
                        </button>
                        <p className="sp-filename">{file?.name}</p>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sp-dz-placeholder">
                        <Upload size={34} />
                        <p>Drag &amp; drop your screenshot here</p>
                        <span>or tap to browse</span>
                        <small>JPEG · PNG · WEBP · GIF &nbsp;|&nbsp; max 5 MB</small>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notes */}
                <label className="sp-label">
                  Additional notes <span className="sp-optional">(optional)</span>
                  <textarea
                    className="sp-textarea"
                    placeholder="e.g. transferred from CBE mobile at 2:30 PM, reference 1234…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </label>

                {/* Feedback */}
                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      key="fb"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`sp-feedback sp-fb-${feedback.type}`}
                    >
                      {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      {feedback.msg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" className="sp-submit-btn" disabled={submitting || !file || cart.length === 0}>
                  {submitting ? <><RefreshCw size={16} className="sp-spin" /> Submitting…</> : <><Send size={16} /> Send Screenshot to Admin</>}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ══ RIGHT: my submissions ══ */}
        <div className="sp-right">
          <div className="sp-subs-card">
            <div className="sp-subs-header">
              <Bell size={18} />
              <h2>My Submissions &amp; Status</h2>
            </div>

            {mySubmissions.length === 0 ? (
              <div className="sp-subs-empty">
                <Clock size={28} />
                <p>No submissions yet.</p>
                <small>After you send a screenshot it will appear here with the review status.</small>
              </div>
            ) : (
              <div className="sp-subs-list">
                {mySubmissions.map((sub) => {
                  const cfg = STATUS[sub.status] || STATUS.pending
                  const { Icon } = cfg
                  return (
                    <motion.div
                      key={sub.id}
                      className={`sp-sub-item sp-sub-${cfg.color}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {/* thumbnail */}
                      <img
                        src={`${SERVER_BASE}${sub.screenshot_path}`}
                        alt="screenshot"
                        className="sp-sub-thumb"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />

                      <div className="sp-sub-info">
                        <div className="sp-sub-row">
                          <span className="sp-sub-order">Order #{sub.order_id}</span>
                          <span className={`sp-sub-badge sp-badge-${cfg.color}`}>
                            <Icon size={11} /> {cfg.label}
                          </span>
                        </div>

                        <p className="sp-sub-amount">{etbFmt.format(Number(sub.total || 0))}</p>

                        {/* Admin note / message */}
                        {sub.admin_note && (
                          <div className={`sp-sub-msg sp-sub-msg-${cfg.color}`}>
                            <strong>Admin:</strong> {sub.admin_note}
                          </div>
                        )}

                        <p className="sp-sub-date">
                          Submitted {new Date(sub.created_at).toLocaleString()}
                          {sub.reviewed_at && <> · Reviewed {new Date(sub.reviewed_at).toLocaleString()}</>}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
