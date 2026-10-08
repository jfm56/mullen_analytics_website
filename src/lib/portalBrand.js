// Public deployment branding only. Never use these values for authorization.
// Keep assets local so partner logos do not require remote image allowlists.
const logo = process.env.NEXT_PUBLIC_PORTAL_LOGO || '/navbar-logo.png';
const home = process.env.NEXT_PUBLIC_PORTAL_HOME_URL || '/';

export const portalBrand = Object.freeze({
  name: process.env.NEXT_PUBLIC_PORTAL_BRAND_NAME || 'Mullen Analytics',
  label: process.env.NEXT_PUBLIC_PORTAL_LABEL || 'Client Portal',
  logo: /^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(logo) ? logo : '/navbar-logo.png',
  homeUrl: home === '/' || /^https:\/\//i.test(home) ? home : '/',
  attribution: process.env.NEXT_PUBLIC_PORTAL_ATTRIBUTION || 'Powered by Mullen Analytics',
});
