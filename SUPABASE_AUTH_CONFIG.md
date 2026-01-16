# Supabase Auth Configuration for Password Reset

## Required Setup

To enable the password reset feature, you need to configure the redirect URLs in your Supabase project.

### Steps:

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Click "Authentication" in the left sidebar
   - Click "URL Configuration"

3. **Add Redirect URLs**

   Add the following URLs to the **"Redirect URLs"** section:

   **For Local Development:**
   ```
   http://localhost:3000/portal/reset-password
   ```

   **For Production:**
   ```
   https://mullenanalytics.com/portal/reset-password
   https://www.mullenanalytics.com/portal/reset-password
   ```

   Or if using Vercel:
   ```
   https://your-app.vercel.app/portal/reset-password
   ```

4. **Save Changes**
   - Click "Save" at the bottom of the page

## How It Works

### Password Reset Flow:

1. **User clicks "Reset my password" in portal**
   - System gets current user's email
   - Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/portal/reset-password' })`
   - User receives email with reset link

2. **User clicks link in email**
   - Supabase validates the token
   - Redirects to `/portal/reset-password`
   - Token is automatically handled by Supabase

3. **User enters new password**
   - Calls `supabase.auth.updateUser({ password: newPassword })`
   - Signs out user
   - Redirects to login page

### Security Features:

- Reset tokens expire after 1 hour (Supabase default)
- Tokens are single-use only
- User is automatically signed out after password change
- Password must be at least 6 characters
- Passwords must match confirmation

## Testing

### Local Testing:
1. Start dev server: `npm run dev`
2. Log in to portal
3. Click "Reset my password"
4. Check your email for reset link
5. Click link (should redirect to `http://localhost:3000/portal/reset-password`)
6. Enter new password
7. Verify redirect to login page

### Production Testing:
1. Deploy to production
2. Follow same steps as local testing
3. Verify email links point to production URL

## Troubleshooting

**Issue: "Invalid redirect URL" error**
- Solution: Make sure the URL is added to Supabase Auth settings exactly as shown above

**Issue: Reset email not received**
- Check spam folder
- Verify email is correct in Supabase Auth users table
- Check Supabase email rate limits

**Issue: Token expired**
- Reset tokens expire after 1 hour
- User needs to request a new reset email

**Issue: Redirect doesn't work**
- Verify URL is in the allowed list
- Check browser console for errors
- Ensure `window.location.origin` matches configured URL
