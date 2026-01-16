import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured. Check AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

/**
 * Generate a safe S3 key for client uploads
 * Format: clients/{clientId}/uploads/{timestamp}_{safeFilename}
 */
export function makeClientUploadKey(clientId: string, filename: string): string {
  const timestamp = Date.now();
  const safeFilename = sanitizeFilename(filename);
  return `clients/${clientId}/uploads/${timestamp}_${safeFilename}`;
}

/**
 * Sanitize filename to remove path separators and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and keep only safe characters
  return filename
    .replace(/[\/\\]/g, '_') // Replace path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 255); // Limit length
}

/**
 * Parse allowed file types from comma-separated string
 */
export function parseAllowedTypes(allowedTypesStr: string | null | undefined): string[] {
  if (!allowedTypesStr) return [];
  return allowedTypesStr
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);
}

/**
 * Check if file extension is allowed
 */
export function isFileTypeAllowed(filename: string, allowedTypes: string[]): boolean {
  if (allowedTypes.length === 0) return true; // No restrictions
  
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return false;
  
  return allowedTypes.includes(ext);
}

/**
 * Create a presigned POST for direct browser upload to S3
 */
export async function createPresignedUploadPost(
  s3Key: string,
  contentType: string,
  maxSizeBytes: number,
  expiresInSeconds: number = 600 // 10 minutes
): Promise<{ url: string; fields: Record<string, string> }> {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET not configured');
  }

  const client = getS3Client();

  const { url, fields } = await createPresignedPost(client, {
    Bucket: bucket,
    Key: s3Key,
    Conditions: [
      ['content-length-range', 1, maxSizeBytes],
      ['starts-with', '$Content-Type', contentType.split('/')[0]], // e.g., 'text' or 'application'
    ],
    Fields: {
      'Content-Type': contentType,
    },
    Expires: expiresInSeconds,
  });

  return { url, fields };
}

/**
 * Create a presigned GET URL for downloading from S3
 */
export async function createPresignedDownloadUrl(
  s3Key: string,
  expiresInSeconds: number = 300 // 5 minutes
): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET not configured');
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Get content type from file extension
 */
export function getContentTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'csv': 'text/csv',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'json': 'application/json',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'zip': 'application/zip',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}
