/**
 * API utility functions for the RT3 frontend
 * Contains reusable API calls used across multiple components
 */

import { getApiUrl } from './apiConfig';

/**
 * Get the authentication token from local storage
 * @returns {string|null} The authentication token or null if not found
 */
export const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Generic authenticated API request
 * @param {string} endpoint The API endpoint
 * @param {Object} options The fetch options
 * @returns {Promise<any>} The response data
 * @throws {Error} If the fetch fails
 */
export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  try {
    // Skip verification for FormData requests
    if (!(options.body instanceof FormData)) {
      const verifyResponse = await fetch(getApiUrl('/team-roster/me'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!verifyResponse.ok) {
        if (verifyResponse.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Authentication expired');
        }
        throw new Error('Failed to fetch user data');
      }
    }

    // Then make the actual request
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    // Only add Content-Type for JSON requests, not FormData
    if (options.body && options.method && options.method !== 'GET' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(getApiUrl(endpoint), {
      ...options,
      headers,
      // Only stringify if not FormData
      body: options.body instanceof FormData ? options.body : 
            options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : 
            undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Authentication expired');
      }
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(errorText || response.statusText);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

/**
 * Fetch all operators from the team roster
 * @param {boolean} activeOnly Whether to return only active operators
 * @returns {Promise<Array>} The operators
 * @throws {Error} If the fetch fails
 */
export const fetchOperators = async (activeOnly = false) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(getApiUrl('/team-roster/'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Authentication expired');
    }
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Upload a file to the API
 * @param {string} endpoint The API endpoint
 * @param {FormData} formData The form data containing the file
 * @returns {Promise<any>} The response data
 * @throws {Error} If the upload fails
 */
export const uploadFile = async (endpoint, formData) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(getApiUrl('/jqr/tracker/'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Authentication expired');
    }
    throw new Error(`File upload failed: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Get the URL for a file in the uploads directory
 * @param {string} username The username
 * @param {string} filename The filename
 * @returns {string} The full URL to the file
 */
export const fetchJQRItems = async () => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(getApiUrl('/jqr/items/'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Authentication expired');
    }
    throw new Error('Failed to fetch JQR items');
  }

  return await response.json();
};

/**
 * Get the URL for an avatar image
 * @param {Object} user The user object
 * @returns {string|null} The avatar URL or null if no avatar
 */
export const getAvatarUrl = (user) => {
  if (!user?.avatar?.filename) {
    return null;
  }
  return getApiUrl(`/uploads/${user.operator_handle}/${user.avatar.filename}`);
};

/**
 * Get the URL for a direct image
 * @param {string} directUrl The direct URL from the API
 * @returns {string} The full URL to the image
 */
export const getDirectImageUrl = (directUrl) => {
  return directUrl;
};

export const fetchCurrentUser = async () => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(getApiUrl('/team-roster/me'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};

// Fix the default export
const api = {
  fetchCurrentUser,
  fetchJQRItems,
  fetchOperators,
  getAuthToken,
  getAvatarUrl,
  getDirectImageUrl,
  uploadFile,
  apiRequest
};

export default api; 