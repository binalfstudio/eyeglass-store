const PENDING_TX_REF_KEY = 'chapaPendingTxRef'

export const getPaymentTxRef = (search = '') => {
  const params = new URLSearchParams(search)
  return (
    params.get('trx_ref') ||
    params.get('tx_ref') ||
    params.get('trxref') ||
    params.get('reference') ||
    ''
  ).trim()
}

export const savePendingTxRef = (txRef) => {
  if (!txRef) return
  sessionStorage.setItem(PENDING_TX_REF_KEY, txRef)
}

export const loadPendingTxRef = () => sessionStorage.getItem(PENDING_TX_REF_KEY) || ''

export const clearPendingTxRef = () => {
  sessionStorage.removeItem(PENDING_TX_REF_KEY)
}

export const resolvePaymentTxRef = (search = '') => {
  return getPaymentTxRef(search) || loadPendingTxRef()
}
