import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { API_BASE_URL } from '../../utils/apiConfig'

export const aiApi = createApi({
  reducerPath: 'aiApi',
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
  endpoints: (builder) => ({
    getAiStatus: builder.query({
      query: () => '/ai/status',
    }),
    generateTryOnImage: builder.mutation({
      query: (data) => ({
        url: '/ai/tryon/generate',
        method: 'POST',
        body: data,
      }),
    }),
  }),
})

export const { useGetAiStatusQuery, useGenerateTryOnImageMutation } = aiApi