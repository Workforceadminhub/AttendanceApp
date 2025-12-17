# Security Headers Configuration

This document explains how security headers are configured for different hosting platforms.

## Security Headers Included

1. **Content-Security-Policy** - Protects against XSS attacks by whitelisting approved content sources
2. **X-Frame-Options** - Prevents clickjacking attacks (set to SAMEORIGIN)
3. **X-Content-Type-Options** - Prevents MIME-sniffing (set to nosniff)
4. **Referrer-Policy** - Controls referrer information sent with requests
5. **Permissions-Policy** - Controls which browser features and APIs can be used
6. **X-XSS-Protection** - Additional XSS protection (legacy browsers)
7. **Strict-Transport-Security** - Forces HTTPS connections

## Platform-Specific Configuration

### AWS Amplify

The `amplify.yml` file in the root directory contains the security headers configuration. These headers will be automatically applied when you deploy to AWS Amplify.

**To apply:**
1. Ensure `amplify.yml` is in your repository root
2. Deploy using `amplify publish` or through the Amplify Console
3. Headers will be applied automatically

### Netlify

The `public/_headers` file contains the security headers configuration for Netlify.

**To apply:**
1. Ensure `public/_headers` is in your repository
2. Deploy to Netlify
3. Headers will be automatically applied

### Vercel

The `vercel.json` file in the root directory contains the security headers configuration.

**To apply:**
1. Ensure `vercel.json` is in your repository root
2. Deploy to Vercel
3. Headers will be automatically applied

### Apache Server

The `public/.htaccess` file contains the security headers configuration for Apache servers.

**To apply:**
1. Ensure your Apache server has `mod_headers` enabled
2. Copy `.htaccess` from `public/` to your web root directory
3. Restart Apache if needed

### Nginx Server

See `nginx.conf.example` for an example configuration.

**To apply:**
1. Copy the security headers section from `nginx.conf.example`
2. Add to your Nginx site configuration
3. Reload Nginx: `sudo nginx -s reload`

### Other Platforms

For other hosting platforms, you may need to:
1. Configure headers through the platform's dashboard/console
2. Use platform-specific configuration files
3. Contact your hosting provider for guidance

## Meta Tags (Fallback)

Meta tags have been added to `public/index.html` as a fallback, but HTTP headers are preferred and more secure. The meta tags will only work if the server doesn't set HTTP headers.

## Testing Security Headers

You can test your security headers using:
- [SecurityHeaders.com](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- Browser DevTools (Network tab → Response Headers)

## Customization

If you need to customize the Content-Security-Policy or other headers:

1. **Content-Security-Policy**: Update the CSP string in all configuration files if you add new external resources
2. **API Endpoints**: The current CSP includes:
   - `https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com` (your API)
   - `https://*.supabase.co` (Supabase)

3. **Permissions-Policy**: Adjust based on features your app needs

## Important Notes

- HTTP headers take precedence over meta tags
- Some headers (like Strict-Transport-Security) only work over HTTPS
- Content-Security-Policy may need adjustment if you add new external scripts or resources
- Test thoroughly after deploying headers to ensure your app still works correctly

