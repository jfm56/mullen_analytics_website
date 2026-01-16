# AWS S3 Client Data Uploads - Setup Guide

This guide walks you through setting up AWS S3 for client data uploads with presigned URLs.

## Overview

The system allows clients to upload files directly to AWS S3 using presigned URLs. No AWS credentials are exposed to the client browser. Each client gets their own S3 prefix: `clients/{clientId}/uploads/`

## Step 1: Create S3 Bucket

1. Log into AWS Console
2. Navigate to S3
3. Click "Create bucket"
4. Bucket settings:
   - **Bucket name**: `mullen-analytics-client-data` (or your preferred name)
   - **Region**: `us-east-1` (or your preferred region)
   - **Block all public access**: ✅ ENABLED (keep bucket private)
   - **Bucket Versioning**: Optional (recommended for data recovery)
   - **Default encryption**: Enable SSE-S3
   - **Object Lock**: Disabled

5. Click "Create bucket"

## Step 2: Create IAM Policy

1. Navigate to IAM → Policies
2. Click "Create policy"
3. Use JSON editor and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ClientUploadsAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:AbortMultipartUpload"
      ],
      "Resource": [
        "arn:aws:s3:::mullen-analytics-client-data",
        "arn:aws:s3:::mullen-analytics-client-data/clients/*"
      ]
    }
  ]
}
```

4. Name it: `MullenAnalyticsClientUploadsPolicy`
5. Click "Create policy"

## Step 3: Create IAM User

1. Navigate to IAM → Users
2. Click "Create user"
3. User name: `mullen-analytics-uploads`
4. Click "Next"
5. Attach the policy you just created: `MullenAnalyticsClientUploadsPolicy`
6. Click "Next" → "Create user"

## Step 4: Create Access Keys

1. Click on the user you just created
2. Go to "Security credentials" tab
3. Scroll to "Access keys"
4. Click "Create access key"
5. Select "Application running outside AWS"
6. Click "Next" → "Create access key"
7. **IMPORTANT**: Copy both:
   - Access key ID
   - Secret access key
   
   ⚠️ You won't be able to see the secret key again!

## Step 5: Add Environment Variables

Add these to your `.env.local` file (for local development):

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=mullen-analytics-client-data
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

For **Vercel production**, add these same variables in:
- Vercel Dashboard → Your Project → Settings → Environment Variables
- Add each variable for Production, Preview, and Development

## Step 6: Run Database Migration

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Open the file: `supabase_migration_uploads.sql`
4. Copy and paste the SQL into the editor
5. Click "Run" to execute

This creates:
- `uploads` table for tracking uploaded files
- Upload settings columns on `profiles` table
- Necessary indexes

## Step 7: Test the System

### Enable uploads for a test client:

1. Start your dev server: `npm run dev`
2. Log in as admin at http://localhost:3000/admin
3. Go to a client profile
4. In "Client Data Uploads" section:
   - ✅ Check "Enable uploads"
   - Set allowed file types: `csv,xlsx,json,pdf`
   - Set max upload: `50` MB
   - Click "Save Settings"

### Upload a test file:

1. Still on the client profile page
2. Click "Choose File" and select a CSV or Excel file
3. Click "Upload"
4. File should upload to S3 and appear in the uploads table

### Test client portal:

1. Log in as that client at http://localhost:3000/portal/login
2. Navigate to "Upload data"
3. Upload a file
4. Verify it appears in the uploads list
5. Click "Download" to test presigned download URLs

## Security Features

✅ **No AWS credentials in browser** - Only presigned URLs are sent to clients
✅ **Client isolation** - Each client can only access their own files via S3 prefix
✅ **File type validation** - Server validates file extensions before presigning
✅ **Size limits** - Configurable per client
✅ **Time-limited URLs** - Presigned URLs expire in 10 minutes (upload) or 5 minutes (download)
✅ **Authorization checks** - Admin or client ownership verified on every request

## File Organization in S3

```
mullen-analytics-client-data/
└── clients/
    ├── {client-uuid-1}/
    │   └── uploads/
    │       ├── 1705419234567_data.csv
    │       └── 1705419456789_report.xlsx
    └── {client-uuid-2}/
        └── uploads/
            └── 1705419678901_export.json
```

## Troubleshooting

### "AWS credentials not configured" error
- Check that all 4 AWS environment variables are set in `.env.local`
- Restart your dev server after adding env vars

### "Uploads are not enabled for this client"
- Go to Admin → Client Profile
- Enable uploads in the "Client Data Uploads" section

### "File type not allowed"
- Check the `allowed_file_types` setting for the client
- Ensure the file extension matches (e.g., `.csv` for CSV files)

### "Failed to upload file to S3"
- Verify IAM policy allows `s3:PutObject` on the bucket
- Check that the bucket name in env vars matches your actual bucket
- Ensure the bucket is in the same region as specified in `AWS_REGION`

### Files upload but can't download
- Verify IAM policy allows `s3:GetObject`
- Check browser console for CORS errors (though presigned URLs bypass CORS)

## Cost Estimation

AWS S3 pricing (us-east-1):
- **Storage**: $0.023 per GB/month
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests
- **Data transfer out**: First 100 GB/month free, then $0.09/GB

Example: 100 clients uploading 10 files/month (100MB each):
- Storage: 100GB × $0.023 = $2.30/month
- Uploads: 1,000 × $0.005 = $0.005
- Downloads: ~2,000 × $0.0004 = $0.0008
- **Total**: ~$2.31/month

## Next Steps

- Set up S3 lifecycle policies to archive old files to Glacier
- Add file processing (e.g., CSV validation, data ingestion)
- Implement file deletion functionality
- Add email notifications when clients upload files
- Set up CloudWatch alarms for S3 bucket metrics
