/**
 * Environment detection utilities
 * Use these to conditionally enable/disable features based on environment
 */
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const isLocalhost = 
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname === '[::1]');

