import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const cartApi = createApi({
  reducerPath: 'cartApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Cart'],
  endpoints: (builder) => ({
    getCart: builder.query({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation({
      query: (data) => ({
        url: '/cart',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation({
      query: ({ id, quantity }) => ({
        url: `/cart/${id}`,
        method: 'PUT',
        body: { quantity },
      }),
      invalidatesTags: ['Cart'],
    }),
    removeFromCart: builder.mutation({
      query: (id) => ({
        url: `/cart/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: builder.mutation({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    createCheckoutSession: builder.mutation({
      query: ({ successUrl, cancelUrl }) => ({
        url: '/payments/create-checkout-session',
        method: 'POST',
        body: { successUrl, cancelUrl },
      }),
      invalidatesTags: ['Cart'],
    }),
    getPendingPaymentSession: builder.query({
      query: () => '/payments/pending-session',
    }),
    confirmPaymentSession: builder.mutation({
      query: (sessionId) => ({
        url: `/payments/confirm/${sessionId}`,
        method: 'GET',
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
})

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  useCreateCheckoutSessionMutation,
  useLazyGetPendingPaymentSessionQuery,
  useConfirmPaymentSessionMutation,
} = cartApi
