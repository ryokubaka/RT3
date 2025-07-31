/**
 * Format utility functions for the RT3 frontend
 * Contains reusable formatting functions used across multiple components
 */

/**
 * Format a date string to a human-readable format
 * @param {string|Date} dateString The date string or Date object to format
 * @param {boolean} includeTime Whether to include the time in the output
 * @returns {string} The formatted date string
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
    };
    
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format a date for input fields (YYYY-MM-DD)
 * @param {string|Date} dateString The date string or Date object to format
 * @returns {string} The formatted date string
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};

/**
 * Formats an operator level to a more readable format
 * @param {string} level The operator level (e.g., 'junior', 'mid', 'senior', 'master')
 * @returns {string} The formatted operator level
 */
export const formatOperatorLevel = (level) => {
  if (!level) return 'Unknown';
  
  const levelMap = {
    'junior': 'Junior Operator',
    'mid': 'Mid-Level Operator',
    'senior': 'Senior Operator',
    'master': 'Master Operator',
  };
  
  return levelMap[level.toLowerCase()] || level;
};

/**
 * Truncate a string to a specified length
 * @param {string} str The string to truncate
 * @param {number} length The maximum length
 * @returns {string} The truncated string
 */
export const truncateString = (str, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;
  
  return str.substring(0, length) + '...';
};

/**
 * Format a file size in bytes to a human-readable format
 * @param {number} bytes The size in bytes
 * @returns {string} The formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Capitalize the first letter of each word in a string
 * @param {string} str The string to capitalize
 * @returns {string} The capitalized string
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Calculate the completion percentage for a set of tasks
 * @param {Array} tasks The array of task objects
 * @param {string} completionField The field to check for completion
 * @returns {number} The completion percentage (0-100)
 */
export const calculateCompletionPercentage = (tasks, completionField = 'completion_date') => {
  if (!tasks || tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(task => task[completionField]);
  return Math.round((completedTasks.length / tasks.length) * 100);
};

export default {
  formatDate,
  formatDateForInput,
  formatOperatorLevel,
  truncateString,
  formatFileSize,
  capitalizeWords,
  calculateCompletionPercentage,
}; 