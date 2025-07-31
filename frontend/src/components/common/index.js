/**
 * Common component exports
 * This file provides a centralized export for all common components
 */

export { default as StatusChip } from './StatusChip';
export { default as PageHeader } from './PageHeader';
export { default as DataLoadingError } from './DataLoadingError';
export { default as FormDialog } from './FormDialog';

// Export all common components as a single object
export default {
  StatusChip: require('./StatusChip').default,
  PageHeader: require('./PageHeader').default,
  DataLoadingError: require('./DataLoadingError').default,
  FormDialog: require('./FormDialog').default,
}; 