import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const categoriesApi = createApi({
  reducerPath: 'categoriesApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: (builder) => ({
    getCategories: builder.query({
      query: () => '/categories',
    }),
    getCategory: builder.query({
      query: (id) => `/categories/${id}`,
    }),
  }),
})

export const { useGetCategoriesQuery, useGetCategoryQuery } = categoriesApi
