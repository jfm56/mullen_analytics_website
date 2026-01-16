export function getWelcomeEmailTemplate(clientName, portalUrl, tempPassword) {
  return {
    subject: 'Welcome to Mullen Analytics - Your Portal Access',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2c5aa0; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .credentials { background-color: #fff; padding: 15px; border-left: 4px solid #2c5aa0; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Mullen Analytics</h1>
    </div>
    <div class="content">
      <p>Hello ${clientName || 'there'},</p>
      
      <p>Your client portal account has been created! You now have access to your personalized analytics dashboard where you can:</p>
      
      <ul>
        <li>View your project status and deliverables</li>
        <li>Access interactive dashboards and reports</li>
        <li>Upload data files securely</li>
        <li>Communicate with our team</li>
        <li>View and pay invoices</li>
      </ul>
      
      <div class="credentials">
        <strong>Your Login Credentials:</strong><br>
        <strong>Portal URL:</strong> ${portalUrl}<br>
        <strong>Temporary Password:</strong> ${tempPassword}
      </div>
      
      <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
      
      <a href="${portalUrl}" class="button">Access Your Portal</a>
      
      <p>If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
      
      <p>Best regards,<br>
      The Mullen Analytics Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mullen Analytics. All rights reserved.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Welcome to Mullen Analytics

Hello ${clientName || 'there'},

Your client portal account has been created! You now have access to your personalized analytics dashboard.

Your Login Credentials:
Portal URL: ${portalUrl}
Temporary Password: ${tempPassword}

Important: Please change your password after your first login for security purposes.

Access your portal at: ${portalUrl}

If you have any questions or need assistance, please don't hesitate to reach out to us.

Best regards,
The Mullen Analytics Team
    `
  };
}

export function getDocumentRequestEmailTemplate(clientName, portalUrl, allowedFileTypes, maxSizeMB) {
  return {
    subject: 'Document Upload Request - Mullen Analytics',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2c5aa0; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .info-box { background-color: #fff; padding: 15px; border-left: 4px solid #2c5aa0; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Document Upload Request</h1>
    </div>
    <div class="content">
      <p>Hello ${clientName || 'there'},</p>
      
      <p>We've enabled document uploads for your account. You can now securely upload files to your client portal.</p>
      
      <div class="info-box">
        <strong>Upload Guidelines:</strong><br>
        <strong>Allowed file types:</strong> ${allowedFileTypes || 'csv, xlsx, json, pdf'}<br>
        <strong>Maximum file size:</strong> ${maxSizeMB || 50}MB per file
      </div>
      
      <p>Your files are securely stored and encrypted. Only you and authorized Mullen Analytics team members can access them.</p>
      
      <a href="${portalUrl}/uploads" class="button">Upload Documents</a>
      
      <p>If you have any questions about what documents to upload or need assistance, please contact us.</p>
      
      <p>Best regards,<br>
      The Mullen Analytics Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mullen Analytics. All rights reserved.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Document Upload Request

Hello ${clientName || 'there'},

We've enabled document uploads for your account. You can now securely upload files to your client portal.

Upload Guidelines:
- Allowed file types: ${allowedFileTypes || 'csv, xlsx, json, pdf'}
- Maximum file size: ${maxSizeMB || 50}MB per file

Your files are securely stored and encrypted.

Upload documents at: ${portalUrl}/uploads

If you have any questions, please contact us.

Best regards,
The Mullen Analytics Team
    `
  };
}

export function getFileUploadedNotificationTemplate(clientName, fileName, uploadedBy, portalUrl) {
  return {
    subject: 'New File Uploaded - Mullen Analytics',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2c5aa0; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .info-box { background-color: #fff; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>File Upload Notification</h1>
    </div>
    <div class="content">
      <p>Hello ${clientName || 'there'},</p>
      
      <p>A new file has been uploaded to your account.</p>
      
      <div class="info-box">
        <strong>File Details:</strong><br>
        <strong>Filename:</strong> ${fileName}<br>
        <strong>Uploaded by:</strong> ${uploadedBy}<br>
        <strong>Date:</strong> ${new Date().toLocaleString()}
      </div>
      
      <p>You can view and download this file from your portal.</p>
      
      <a href="${portalUrl}/uploads" class="button">View Uploads</a>
      
      <p>Best regards,<br>
      The Mullen Analytics Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mullen Analytics. All rights reserved.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `File Upload Notification

Hello ${clientName || 'there'},

A new file has been uploaded to your account.

File Details:
- Filename: ${fileName}
- Uploaded by: ${uploadedBy}
- Date: ${new Date().toLocaleString()}

You can view and download this file from your portal at: ${portalUrl}/uploads

Best regards,
The Mullen Analytics Team
    `
  };
}

export function getProfileUpdateNotificationTemplate(clientName, updateType, portalUrl) {
  const updateMessages = {
    project_status: 'Your project status has been updated.',
    tableau_added: 'A new dashboard has been added to your account.',
    general: 'Your profile has been updated.'
  };

  const message = updateMessages[updateType] || updateMessages.general;

  return {
    subject: 'Account Update - Mullen Analytics',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2c5aa0; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .info-box { background-color: #fff; padding: 15px; border-left: 4px solid #2c5aa0; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Update</h1>
    </div>
    <div class="content">
      <p>Hello ${clientName || 'there'},</p>
      
      <div class="info-box">
        <p>${message}</p>
      </div>
      
      <p>Log in to your portal to view the latest updates.</p>
      
      <a href="${portalUrl}" class="button">View Portal</a>
      
      <p>If you have any questions, please don't hesitate to reach out.</p>
      
      <p>Best regards,<br>
      The Mullen Analytics Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Mullen Analytics. All rights reserved.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Account Update

Hello ${clientName || 'there'},

${message}

Log in to your portal to view the latest updates: ${portalUrl}

If you have any questions, please don't hesitate to reach out.

Best regards,
The Mullen Analytics Team
    `
  };
}
