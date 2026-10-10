/**
 * API configuration and mock flag
 */
export const API_CONFIG = {
  // Defaults to true so app works instantly out-of-the-box
  USE_MOCKS: import.meta.env.VITE_USE_MOCKS !== 'false',
  BASE_URL: import.meta.env.VITE_API_URL || 'https://api.virasat.care/v1',
  SIMULATED_DELAY_MS: 150,
};
