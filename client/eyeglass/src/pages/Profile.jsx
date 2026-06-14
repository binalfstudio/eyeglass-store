import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, Save, UserCircle2, ShieldCheck, User } from 'lucide-react'
import { useGetProfileQuery, useUpdateProfileMutation } from '../redux/api/auth'
import './Profile.css'

const Profile = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const { data: profile, isLoading, isError, error, refetch } = useGetProfileQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  })
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    profile_image: '',
  })
  const [status, setStatus] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      navigate('/login')
    }
  }, [navigate, token])

  useEffect(() => {
    if (!profile) return
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || '',
      profile_image: profile.profile_image || '',
    })
  }, [profile])

  const roleLabel = useMemo(() => (profile?.isAdmin ? 'Administrator' : 'User'), [profile])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Please choose an image smaller than 2 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, profile_image: String(reader.result || '') }))
      setErrorMessage('')
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, profile_image: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')
    setErrorMessage('')

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        profile_image: formData.profile_image || null,
      }

      const result = await updateProfile(payload).unwrap()
      const updatedProfile = result.profile

      const storedUser = localStorage.getItem('user')
      const parsedUser = storedUser ? JSON.parse(storedUser) : {}
      const mergedUser = {
        ...parsedUser,
        name: updatedProfile.name,
        email: updatedProfile.email,
        isAdmin: updatedProfile.isAdmin,
        profile_image: updatedProfile.profile_image,
      }
      localStorage.setItem('user', JSON.stringify(mergedUser))
      window.dispatchEvent(new Event('auth-change'))
      setStatus('Profile saved successfully.')
    } catch (submitError) {
      setErrorMessage(
        submitError?.data?.message ||
        submitError?.error ||
        'Failed to save profile.'
      )
    }
  }

  if (!token) return null

  if (isLoading) {
    return (
      <div className="profile-loading">
        <p>Loading profile...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="profile-error">
        <h2>Could not load profile</h2>
        <p>{error?.data?.message || 'Please try again.'}</p>
        <button onClick={refetch} type="button">Retry</button>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <motion.div
        className="profile-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            {formData.profile_image ? (
              <img src={formData.profile_image} alt="Profile" className="profile-avatar" />
            ) : (
              <div className="profile-avatar profile-avatar-fallback">
                <UserCircle2 size={52} />
              </div>
            )}
            <label className="profile-image-picker" htmlFor="profile-image-input">
              <Camera size={15} />
              <span>Upload</span>
            </label>
            <input
              id="profile-image-input"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="profile-image-input"
            />
          </div>

          <div>
            <h1>My Profile</h1>
            <p>Update your account details and profile picture.</p>
            <div className="profile-role-chip">
              {profile?.isAdmin ? <ShieldCheck size={14} /> : <User size={14} />}
              <span>{roleLabel}</span>
            </div>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="profile-grid">
            <label>
              Full Name
              <input name="name" value={formData.name} onChange={handleChange} required />
            </label>

            <label>
              Email
              <input name="email" value={formData.email} disabled />
            </label>

            <label>
              Phone
              <input name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g. +251..." />
            </label>

            <label>
              Address
              <input name="address" value={formData.address} onChange={handleChange} placeholder="City, sub-city, house no." />
            </label>
          </div>

          <div className="profile-actions">
            <button type="submit" className="profile-save-btn" disabled={isSaving}>
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
            <button type="button" className="profile-remove-btn" onClick={removeImage}>
              Remove Picture
            </button>
          </div>

          {status && <p className="profile-status-success">{status}</p>}
          {errorMessage && <p className="profile-status-error">{errorMessage}</p>}
        </form>
      </motion.div>
    </div>
  )
}

export default Profile