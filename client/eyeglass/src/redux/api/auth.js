import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const authApi = createApi({
  reducerPath: 'authApi',
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
  tagTypes: ['Profile', 'UserNotifications'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/users/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (data) => ({
        url: '/users/register',
        method: 'POST',
        body: data,
      }),
    }),
    getProfile: builder.query({
      query: () => '/users/profile',
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Profile'],
    }),
    getUserNotifications: builder.query({
      query: () => '/users/notifications',
      providesTags: ['UserNotifications'],
    }),
    markUserNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/users/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['UserNotifications'],
    }),
    markAllUserNotificationsRead: builder.mutation({
      query: () => ({
        url: '/users/notifications/read-all',
        method: 'PUT',
      }),
      invalidatesTags: ['UserNotifications'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetUserNotificationsQuery,
  useMarkUserNotificationReadMutation,
  useMarkAllUserNotificationsReadMutation,
} = authApi
