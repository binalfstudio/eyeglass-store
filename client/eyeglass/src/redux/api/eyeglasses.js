import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { API_BASE_URL } from '../../utils/apiConfig'

export const eyeglassesApi = createApi({
  reducerPath: 'eyeglassesApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: (builder) => ({
    getEyeglasses: builder.query({
      query: () => '/eyeglasses',
    }),
    getEyeglass: builder.query({
      query: (id) => `/eyeglasses/${id}`,
    }),
    createEyeglass: builder.mutation({
      query: (data) => ({
        url: '/eyeglasses/create',
        method: 'POST',
        body: data,
      }),
    }),
  }),
})

export const { useGetEyeglassesQuery, useGetEyeglassQuery, useCreateEyeglassMutation } = eyeglassesApi
