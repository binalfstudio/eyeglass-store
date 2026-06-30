import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { API_BASE_URL } from '../../utils/apiConfig'

export const screenshotPaymentApi = createApi({
  reducerPath: 'screenshotPaymentApi',
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
  tagTypes: ['ScreenshotPayment'],
  endpoints: (builder) => ({
    // User submits screenshot — multipart/form-data, so we use FormData
    submitScreenshotPayment: builder.mutation({
      query: (formData) => ({
        url: '/screenshot-payments/submit',
        method: 'POST',
        body: formData,
        // Don't set Content-Type — browser sets it with boundary automatically
        formData: true,
      }),
      invalidatesTags: ['ScreenshotPayment'],
    }),

    // User views their own submissions
    getMySubmissions: builder.query({
      query: () => '/screenshot-payments/my-submissions',
      providesTags: ['ScreenshotPayment'],
    }),

    // Admin: list all submissions (optional status filter)
    adminGetScreenshotPayments: builder.query({
      query: (status) =>
        `/screenshot-payments/admin/list${status && status !== 'all' ? `?status=${status}` : ''}`,
      providesTags: ['ScreenshotPayment'],
    }),

    // Admin: approve or reject
    adminReviewScreenshotPayment: builder.mutation({
      query: ({ id, action, adminNote }) => ({
        url: `/screenshot-payments/admin/${id}/review`,
        method: 'PUT',
        body: { action, adminNote },
      }),
      invalidatesTags: ['ScreenshotPayment'],
    }),
  }),
})

export const {
  useSubmitScreenshotPaymentMutation,
  useGetMySubmissionsQuery,
  useAdminGetScreenshotPaymentsQuery,
  useAdminReviewScreenshotPaymentMutation,
} = screenshotPaymentApi
