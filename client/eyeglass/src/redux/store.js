import { configureStore } from '@reduxjs/toolkit'
import { eyeglassesApi } from './api/eyeglasses'
import { authApi } from './api/auth'
import { cartApi } from './api/cart'
import { categoriesApi } from './api/categories'
import { aiApi } from './api/ai'
import { screenshotPaymentApi } from './api/screenshotPayment'

export const store = configureStore({
  reducer: {
    [eyeglassesApi.reducerPath]: eyeglassesApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [cartApi.reducerPath]: cartApi.reducer,
    [categoriesApi.reducerPath]: categoriesApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
    [screenshotPaymentApi.reducerPath]: screenshotPaymentApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      eyeglassesApi.middleware,
      authApi.middleware,
      cartApi.middleware,
      categoriesApi.middleware,
      aiApi.middleware,
      screenshotPaymentApi.middleware,
    ),
})
