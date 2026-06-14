const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IMAGE_MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const isSafeHttpUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const parseDataUrl = (value) => {
  if (typeof value !== 'string' || !value.startsWith('data:')) return null;

  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    base64Data: match[2],
  };
};

const fetchImageAsInlineData = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    mimeType: contentType.split(';')[0],
    base64Data: buffer.toString('base64'),
  };
};

const extractGeneratedImage = (responseBody) => {
  const candidates = Array.isArray(responseBody?.candidates) ? responseBody.candidates : [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      const inlineData = part?.inline_data || part?.inlineData;
      if (inlineData?.data) {
        return {
          mimeType: inlineData.mime_type || inlineData.mimeType || 'image/png',
          base64Data: inlineData.data,
        };
      }
    }
  }

  return null;
};

const buildPrompt = ({ productName, prompt }) => {
  const basePrompt = prompt && typeof prompt === 'string' && prompt.trim()
    ? prompt.trim()
    : 'Create a realistic eyeglass try-on photo.';

  return [
    basePrompt,
    productName ? `Product: ${productName}.` : '',
    'Use the person in the reference image and the eyewear reference to produce a photorealistic result.',
    'Preserve facial identity and match the glasses to the face, lighting, and camera perspective.',
    'Return only the generated image.',
  ].filter(Boolean).join(' ');
};

const getAiConfigStatus = async (req, res) => {
  const key = process.env.GEMINI_API_KEY || '';
  const isConfigured = Boolean(key.trim());

  // Non-sensitive diagnostic log (does not print the key itself)
  console.log('AI config check — GEMINI_API_KEY present:', Boolean(key), 'length:', key.length);

  return res.json({
    configured: isConfigured,
    model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
  });
};

const generateTryOnImage = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    const { productImage, userImage, prompt, productName } = req.body || {};

    if (!apiKey) {
      return res.status(503).json({ message: 'Gemini AI is not configured yet. Set GEMINI_API_KEY.' });
    }

    if (!isSafeHttpUrl(productImage)) {
      return res.status(400).json({ message: 'A valid product image URL is required.' });
    }

    const productReference = await fetchImageAsInlineData(productImage);
    const promptText = buildPrompt({ productName, prompt });
    const parts = [{ text: promptText }];

    const userReference = parseDataUrl(userImage);
    if (userReference) {
      parts.push({
        inline_data: {
          mime_type: userReference.mimeType,
          data: userReference.base64Data,
        },
      });
    }

    parts.push({
      inline_data: {
        mime_type: productReference.mimeType,
        data: productReference.base64Data,
      },
    });

    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['IMAGE'],
          },
        }),
      }
    );

    const responseBody = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      const message = responseBody?.error?.message || 'Gemini image generation failed.';

      // Map common Gemini errors to clearer HTTP responses for the client
      const lower = String(message || '').toLowerCase();
      if (apiResponse.status === 429 || /quota exceeded|rate limit|rate-limit/.test(lower)) {
        console.error('Gemini quota error:', message);
        return res.status(429).json({
          message: 'AI generation quota exceeded. Enable billing or request a quota increase in your Google Cloud project: https://ai.google.dev/gemini-api/docs/rate-limits',
          details: message,
        });
      }

      if (apiResponse.status === 403 || /billing|permission|access denied/.test(lower)) {
        console.error('Gemini billing/permission error:', message);
        return res.status(402).json({
          message: 'AI generation blocked by billing or permission settings. Check billing and API key restrictions in Google Cloud.',
          details: message,
        });
      }

      console.error('Gemini generation error:', message);
      return res.status(502).json({ message });
    }

    const generatedImage = extractGeneratedImage(responseBody);

    if (!generatedImage?.base64Data) {
      return res.status(502).json({ message: 'Gemini did not return an image.' });
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'ai-tryon');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const extension = IMAGE_MIME_EXTENSIONS[generatedImage.mimeType] || 'png';
    const filename = `tryon-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
    const filePath = path.join(uploadsDir, filename);
    const imageBuffer = Buffer.from(generatedImage.base64Data, 'base64');

    fs.writeFileSync(filePath, imageBuffer);

    return res.json({
      message: 'AI try-on image generated successfully',
      imageUrl: `/uploads/ai-tryon/${filename}`,
      mimeType: generatedImage.mimeType,
    });
  } catch (error) {
    console.error('Error in generateTryOnImage:', error);
    return res.status(500).json({ message: 'Failed to generate AI try-on image.' });
  }
};

module.exports = {
  getAiConfigStatus,
  generateTryOnImage,
};