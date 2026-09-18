import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_KEY.trim() !== ''
  );
}

export interface CloudinaryUploadResult {
  url: string;
  publicId?: string;
  isCloudinary: boolean;
}

/**
 * Uploads a file buffer or base64 data to Cloudinary (or local fallback if not yet configured)
 */
export async function uploadImage(
  buffer: Buffer,
  folder = 'rway_campaign_reviews'
): Promise<CloudinaryUploadResult> {
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              isCloudinary: true,
            });
          } else {
            reject(new Error('Cloudinary returned empty result'));
          }
        }
      );

      uploadStream.end(buffer);
    });
  }

  // Fallback if Cloudinary keys not provided in .env yet
  const fs = await import('fs');
  const path = await import('path');

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `review_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  return {
    url: `/uploads/${filename}`,
    publicId: filename,
    isCloudinary: false,
  };
}

export default cloudinary;
