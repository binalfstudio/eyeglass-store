import React, { useEffect, useMemo, useRef, useState } from 'react'
import './TryOn.css'
import { X } from 'lucide-react'
import { useGenerateTryOnImageMutation, useGetAiStatusQuery } from '../redux/api/ai'

const GALLERY_STORAGE_KEY = 'tryon-ai-gallery'

const drawSource = (ctx, source, width, height) => {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, width, height)
  if (source) {
    ctx.drawImage(source, 0, 0, width, height)
  }
}

const TryOn = ({ productImage, product, onClose }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const productRef = useRef(null)
  const sourceRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const uploadedObjectUrlRef = useRef('')
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState('camera')
  const [loadError, setLoadError] = useState('')
  const [generatedPreview, setGeneratedPreview] = useState('')
  const [generationError, setGenerationError] = useState('')
  const [uploadedPreview, setUploadedPreview] = useState('')
  const [gallery, setGallery] = useState([])
  const [horizontalShift, setHorizontalShift] = useState(0)
  const [verticalShift, setVerticalShift] = useState(0)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [generateTryOnImage, { isLoading: isGenerating }] = useGenerateTryOnImageMutation()
  const { data: aiStatus, isLoading: aiStatusLoading } = useGetAiStatusQuery()

  const resolvedProductImage = useMemo(
    () => productImage || product?.image_url || product?.image || '',
    [productImage, product]
  )

  const productName = product?.name || 'Eyeglass frame'
  const aiConfigured = Boolean(aiStatus?.configured)
  const [hideAiNote, setHideAiNote] = useState(() => {
    try {
      return localStorage.getItem('tryon-hide-ai-note') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      if (hideAiNote) localStorage.setItem('tryon-hide-ai-note', '1')
    } catch {
      // ignore storage failures
    }
  }, [hideAiNote])

  useEffect(() => {
    try {
      const savedGallery = localStorage.getItem(GALLERY_STORAGE_KEY)
      if (savedGallery) {
        setGallery(JSON.parse(savedGallery))
      }
    } catch {
      setGallery([])
    }
  }, [])

  const persistGallery = (nextGallery) => {
    setGallery(nextGallery)
    try {
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(nextGallery))
    } catch {
      // Ignore storage failures in private mode or low-quota browsers.
    }
  }

  const addGalleryItem = (imageUrl, source = 'AI result') => {
    if (!imageUrl) return

    const nextItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      imageUrl,
      productName,
      source,
      createdAt: new Date().toISOString(),
    }

    const nextGallery = [nextItem, ...gallery.filter((item) => item.imageUrl !== imageUrl)].slice(0, 8)
    persistGallery(nextGallery)
  }

  const clearGallery = () => {
    persistGallery([])
  }

  useEffect(() => {
    if (!resolvedProductImage) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = resolvedProductImage
    productRef.current = img
  }, [resolvedProductImage])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const video = videoRef.current
    let alive = true

    const renderOverlay = () => {
      const product = productRef.current
      const source = sourceRef.current || video
      if (!ctx || !canvas || !source || !product) return

      const width = canvas.width || source.videoWidth || source.naturalWidth || 640
      const height = canvas.height || source.videoHeight || source.naturalHeight || 480
      drawSource(ctx, source, width, height)

      const productRatio = product.naturalHeight / product.naturalWidth || 0.38
      const baseFaceWidth = width * 0.36
      const overlayWidth = baseFaceWidth * scale
      const overlayHeight = overlayWidth * productRatio

      const centerX = width * 0.5 + horizontalShift * width * 0.18
      const centerY = height * 0.38 + verticalShift * height * 0.14

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(product, -overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight)
      ctx.restore()

      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY + overlayHeight * 0.18, overlayWidth * 0.48, overlayHeight * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const startCamera = async () => {
      if (!video || !canvas) return
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      video.srcObject = stream
      await video.play()
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      sourceRef.current = video
      setReady(true)

      const loop = () => {
        if (!alive) return
        renderOverlay()
        rafRef.current = window.requestAnimationFrame(loop)
      }

      loop()
    }

    const renderUpload = (image) => {
      if (!canvas) return
      const renderOnce = () => {
        if (!alive) return
        renderOverlay()
      }

      canvas.width = image.naturalWidth || image.width || 640
      canvas.height = image.naturalHeight || image.height || 480
      sourceRef.current = image
      setReady(true)
      renderOnce()
    }

    const init = async () => {
      try {
        if (mode === 'camera') {
          await startCamera()
        } else {
          const image = sourceRef.current
          if (image) {
            renderUpload(image)
          }
        }
      } catch (error) {
        console.error('TryOn failed to start:', error)
        setMode('upload')
        setReady(true)
        setLoadError('Camera access failed. Use upload mode or allow camera access in the browser.')
      }
    }

    init()

    return () => {
      alive = false
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [mode, horizontalShift, verticalShift, scale, rotation])

  const captureSourceImage = () => {
    const source = sourceRef.current || videoRef.current
    if (!source) return ''

    const width = source.videoWidth || source.naturalWidth || source.width || 640
    const height = source.videoHeight || source.naturalHeight || source.height || 480
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const tempCtx = tempCanvas.getContext('2d')

    if (!tempCtx) return ''

    if (source instanceof HTMLVideoElement) {
      tempCtx.drawImage(source, 0, 0, width, height)
    } else {
      tempCtx.drawImage(source, 0, 0, width, height)
    }

    return tempCanvas.toDataURL('image/jpeg', 0.9)
  }

  const captureTryOnPreview = () => {
    const canvas = canvasRef.current
    if (!canvas) return ''

    try {
      return canvas.toDataURL('image/jpeg', 0.92)
    } catch (error) {
      console.error('Failed to capture local try-on preview:', error)
      return ''
    }
  }

  const handleCameraMode = () => {
    setLoadError('')
    setGenerationError('')
    setMode('camera')
  }

  const handleUploadClick = () => {
    setLoadError('')
    setGenerationError('')
    setMode('upload')
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (uploadedObjectUrlRef.current) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current)
    }

    const objectUrl = URL.createObjectURL(file)
    uploadedObjectUrlRef.current = objectUrl
    setUploadedPreview(objectUrl)
    setMode('upload')

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      sourceRef.current = image
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return

      canvas.width = image.naturalWidth || image.width || 640
      canvas.height = image.naturalHeight || image.height || 480
      drawSource(ctx, image, canvas.width, canvas.height)
      setReady(true)
    }
    image.src = objectUrl
  }

  const handleGenerateTryOn = async () => {
    setGenerationError('')
    setLoadError('')

    if (!aiConfigured) {
      setGenerationError('AI preview is unavailable until GEMINI_API_KEY is set on the server.')
      return
    }

    if (!resolvedProductImage) {
      setGenerationError('Missing product image.')
      return
    }

    const userImage = captureSourceImage()

    if (!userImage) {
      setGenerationError('Open the camera or upload a selfie first.')
      return
    }

    try {
      const response = await generateTryOnImage({
        productImage: resolvedProductImage,
        userImage,
        productName,
        prompt: `Create a realistic try-on photo for ${productName}.`,
      }).unwrap()

      if (response?.imageUrl) {
        setGeneratedPreview(response.imageUrl)
        addGalleryItem(response.imageUrl)
      } else {
        setGenerationError('No generated image was returned.')
      }
    } catch (error) {
      // Map common server statuses to friendly UI messages and avoid printing raw API details
      const status = error?.status || error?.originalStatus || (error?.data ? 502 : null)
      const serverMessage = error?.data?.message || error?.error || ''

      if (status === 429) {
        console.error('AI generation quota error details:', error?.data || error)
        const fallbackImage = captureTryOnPreview()
        if (fallbackImage) {
          setGeneratedPreview(fallbackImage)
          addGalleryItem(fallbackImage, 'Local fallback preview')
          setGenerationError('AI generation quota exceeded. Showing your local try-on preview instead.')
          return
        }

        setGenerationError('AI generation quota exceeded. Enable billing or request a quota increase in your Google Cloud project.')
        return
      }

      if (status === 402 || /billing|permission|access denied/i.test(serverMessage)) {
        console.error('AI billing/permission error details:', error?.data || error)
        const fallbackImage = captureTryOnPreview()
        if (fallbackImage) {
          setGeneratedPreview(fallbackImage)
          addGalleryItem(fallbackImage, 'Local fallback preview')
          setGenerationError('AI generation is unavailable right now. Showing your local try-on preview instead.')
          return
        }

        setGenerationError('AI generation blocked by billing or permission settings. Check billing & API key restrictions in Google Cloud.')
        return
      }

      console.error('AI generation error details:', error)
      setGenerationError(serverMessage || 'AI generation failed. Please try again.')
    }
  }

  return (
    <div className="tryon-overlay">
      <div className="tryon-modal">
        <button className="tryon-close" onClick={onClose}><X size={18} /></button>
        <div className="tryon-body">
          <div className="tryon-left">
            <div className="tryon-canvas-wrap">
              <video ref={videoRef} autoPlay playsInline muted className={`tryon-video ${mode === 'camera' ? '' : 'tryon-video-hidden'}`} />
              <canvas ref={canvasRef} className="tryon-canvas" />
              {!ready && (
                <div className="tryon-placeholder">
                  <img src={productImage} alt="product preview" />
                  <p>Open camera or upload a photo to preview the frame.</p>
                </div>
              )}
            </div>
            <div className="tryon-controls">
              <button onClick={handleCameraMode}>Use Camera</button>
              <button onClick={handleUploadClick}>Use Upload</button>
              <button onClick={handleGenerateTryOn} disabled={isGenerating || aiStatusLoading || !aiConfigured} className="tryon-generate-btn">
                {aiStatusLoading ? 'Checking…' : isGenerating ? 'Generating…' : aiConfigured ? 'Generate AI Photo' : 'AI Unavailable'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="tryon-file-input" />
            </div>
            {!aiConfigured && !aiStatusLoading && !hideAiNote && (
              <div className="tryon-note">
                <div className="tryon-note-main">AI try-on disabled — server not configured.</div>
                <button type="button" aria-label="Dismiss AI note" className="tryon-note-close" onClick={() => setHideAiNote(true)}>✕</button>
                <div className="tryon-note-sub">Set GEMINI_API_KEY in the server .env to enable.</div>
              </div>
            )}
            <div className="tryon-adjustments">
              <label>
                Horizontal
                <input type="range" min="-1" max="1" step="0.01" value={horizontalShift} onChange={(e) => setHorizontalShift(Number(e.target.value))} />
              </label>
              <label>
                Vertical
                <input type="range" min="-1" max="1" step="0.01" value={verticalShift} onChange={(e) => setVerticalShift(Number(e.target.value))} />
              </label>
              <label>
                Size
                <input type="range" min="0.75" max="1.35" step="0.01" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
              </label>
              <label>
                Rotation
                <input type="range" min="-20" max="20" step="1" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} />
              </label>
            </div>
            {!ready && <p className="hint">Starting try-on...</p>}
            {loadError && <p className="tryon-error">{loadError}</p>}
            {generationError && <p className="tryon-error">{generationError}</p>}
          </div>
          <div className="tryon-right">
            <h3>Try this product</h3>
            <div className="product-preview">
              <img src={resolvedProductImage} alt="product" />
            </div>
            {uploadedPreview && (
              <div className="upload-preview">
                <img src={uploadedPreview} alt="uploaded preview" />
              </div>
            )}
            {generatedPreview && (
              <div className="generated-preview">
                <h4>AI result</h4>
                <img src={generatedPreview} alt="generated try-on" />
                <button type="button" className="gallery-save-btn" onClick={() => addGalleryItem(generatedPreview, 'Saved result')}>
                  Save Again
                </button>
              </div>
            )}
            {gallery.length > 0 && (
              <div className="tryon-gallery">
                <div className="tryon-gallery-header">
                  <h4>Saved gallery</h4>
                  <button type="button" className="gallery-clear-btn" onClick={clearGallery}>
                    Clear
                  </button>
                </div>
                <div className="tryon-gallery-grid">
                  {gallery.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="tryon-gallery-item"
                      onClick={() => setGeneratedPreview(item.imageUrl)}
                      title={`Open ${item.productName}`}
                    >
                      <img src={item.imageUrl} alt={item.productName} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="hint">Use the sliders to fit the frame over the face. Upload works even when camera access is blocked.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TryOn
