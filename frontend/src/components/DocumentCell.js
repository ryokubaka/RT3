import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import DocumentUpload from './DocumentUpload';

const DocumentCell = React.memo(({ row, isAdmin, onUpload, onDelete, documentType, currentUser }) => {
  const canUpload = isAdmin || row.operator_name === currentUser?.name;
  const [tempFile, setTempFile] = useState(null);

  // Map signed_memo_url to file_url for skill level records
  const fileUrl = documentType === 'skill_level' ? row.signed_memo_url : row.file_url;

  const handleUpload = async (data) => {
    if (!row.id) {
      // For new records, just store the file temporarily
      setTempFile(data.file);
      // Call onUpload with the temporary file data
      onUpload({ ...row, tempFile: data.file });
    } else {
      // For existing records, proceed with immediate upload
      onUpload({ ...row, file_url: data.file_url });
    }
  };

  const handleDelete = () => {
    setTempFile(null);
    onDelete(row);
  };

  if (!fileUrl && !tempFile) {
    return canUpload ? (
      <Box sx={{ wordBreak: 'break-all' }}>
        <DocumentUpload
          documentType={documentType}
          operatorName={row.operator_name}
          recordId={row.id}
          currentDocUrl={null}
          onUpload={handleUpload}
          onDelete={handleDelete}
          isViewOnly={!canUpload}
          preventImmediateUpload={!row.id}
        />
      </Box>
    ) : (
      <Typography variant="body2" color="text.secondary">None</Typography>
    );
  }

  return (
    <Box sx={{ wordBreak: 'break-all' }}>
      <DocumentUpload
        documentType={documentType}
        operatorName={row.operator_name}
        recordId={row.id}
        currentDocUrl={fileUrl}
        onUpload={handleUpload}
        onDelete={handleDelete}
        isViewOnly={!canUpload}
        preventImmediateUpload={!row.id}
      />
    </Box>
  );
});

export default DocumentCell; 