/**
 * API configuration and mock flag
 */
export const API_CONFIG = {
  // Respects VITE_USE_MOCKS=false in production
  USE_MOCKS: import.meta.env.VITE_USE_MOCKS === 'true',
  BASE_URL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://virasat-api-275851497852.asia-south1.run.app/api',
  SIMULATED_DELAY_MS: 150,
};
