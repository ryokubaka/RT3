/**
 * Constants used across the RT3 frontend
 */

// API endpoints
export const API_ENDPOINTS = {
  CURRENT_USER: '/team-roster/me',
  TEAM_ROSTER: '/team-roster',
  JQR_TRACKER: '/jqr/tracker',
  JQR_ITEMS: '/jqr/items',
  TRAINING: {
    RED_TEAM: '/training/red-team',
    CERTS: '/training/certs',
    VENDOR: '/training/vendor',
    SKILL_LEVELS: '/training/skill-levels',
  },
};

// User roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
};

// Operator levels
export const OPERATOR_LEVELS = {
  MEMBER: 'member',
  APPRENTRICE: 'apprentice',
  JOURNEYMAN: 'journeyman',
  MASTER: 'master',
};

// Training status
export const TRAINING_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
};

// Color schemes
export const COLORS = {
  PRIMARY: '#1976d2',
  SECONDARY: '#dc004e',
  SUCCESS: '#4caf50',
  WARNING: '#ff9800',
  ERROR: '#f44336',
  INFO: '#2196f3',
  // Status colors
  STATUS: {
    NOT_STARTED: '#f5f5f5',
    IN_PROGRESS: '#bbdefb',
    COMPLETE: '#c8e6c9',
  },
  // Background colors
  BACKGROUND: {
    LIGHT: '#f5f5f5',
    DEFAULT: '#ffffff',
    DARK: '#e0e0e0',
    HEADER: '#e3f2fd',
  },
  // Text colors
  TEXT: {
    PRIMARY: '#212121',
    SECONDARY: '#757575',
    DISABLED: '#9e9e9e',
  },
};

// Table pagination options
export const PAGINATION_OPTIONS = [10, 25, 50, 100];

// Date formats
export const DATE_FORMATS = {
  SHORT: 'MMM d, yyyy',
  MEDIUM: 'MMMM d, yyyy',
  LONG: 'MMMM d, yyyy h:mm a',
  ISO: 'yyyy-MM-dd',
};

// File size limits
export const FILE_SIZE_LIMITS = {
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  IMAGE: 5 * 1024 * 1024, // 5MB
};

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  DOCUMENT: ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx', '.xls', '.xlsx'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif'],
};

// Locations
export const LOCATIONS = [
  'HQ',
  'Remote',
  'Field Office',
  'Training Center',
];

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  SESSION_EXPIRED: 'Your session has expired. Please log in again',
  CONNECTION_ERROR: 'Could not connect to the server. Please check your internet connection',
  GENERIC: 'An error occurred. Please try again later',
};

export default {
  API_ENDPOINTS,
  USER_ROLES,
  OPERATOR_LEVELS,
  TRAINING_STATUS,
  COLORS,
  PAGINATION_OPTIONS,
  DATE_FORMATS,
  FILE_SIZE_LIMITS,
  ALLOWED_FILE_TYPES,
  LOCATIONS,
  ERROR_MESSAGES,
}; 