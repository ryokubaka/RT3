/**
 * API configuration utilities
 * This file contains functions for handling API URLs and WebSocket connections
 */

// Get the current protocol and host
const protocol = window.location.protocol;
const host = window.location.host;

// Base URLs
const API_BASE_URL = `${protocol}//${host}/api`;
const WS_BASE_URL = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws`;
const UPLOADS_BASE_URL = `${protocol}//${host}/uploads`;

/**
 * Get the full URL for an API endpoint
 * @param {string} path The API endpoint (should start with '/')
 * @returns {string} The full URL to the API endpoint
 */
export const getApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Make sure the normalized path doesn't have a trailing slash
  const cleanPath = normalizedPath.endsWith('/') && normalizedPath.length > 1 
    ? normalizedPath.slice(0, -1) 
    : normalizedPath;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Get the full URL for a WebSocket connection
 * @returns {string} The full WebSocket URL
 */
export const getWsUrl = () => {
  return `${WS_BASE_URL}`;
};

/**
 * Get the full URL for a file in the uploads directory
 * @param {string} path The path to the file (should start with '/')
 * @returns {string} The full URL to the file
 */
export const getUploadsUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${UPLOADS_BASE_URL}${normalizedPath}`;
};

/**
 * Get the full URL for an avatar
 * @param {string} username The username
 * @param {string} filename The filename
 * @returns {string} The full URL to the avatar
 */
export const getAvatarUrl = (username, filename) => {
  if (!username || !filename) return '';
  return `${UPLOADS_BASE_URL}/${username}/${filename}`;
};

/**
 * Get the full URL for a direct image
 * @param {string} path The path to the image (should start with '/')
 * @returns {string} The full URL to the image
 */
export const getDirectImageUrl = (path) => {
  if (!path) {
    console.warn('getDirectImageUrl called with empty path');
    return '';
  }
  
  
  
  // Remove any leading /uploads if present
  const cleanPath = path.replace(/^\/uploads/, '');
  
  // Remove any protocol and host if present
  const normalizedPath = cleanPath.replace(/^https?:\/\/[^/]+/, '');
  
  // Ensure path starts with a slash
  const finalPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  
  const fullUrl = `${finalPath}`;
  
  
  return fullUrl;
};

const apiConfig = {
  getApiUrl,
  getWsUrl,
  getUploadsUrl,
  getAvatarUrl,
  getDirectImageUrl,
};

export default apiConfig; 
