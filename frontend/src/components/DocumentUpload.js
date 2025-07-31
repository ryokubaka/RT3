import React, { useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Typography,
    Paper,
} from '@mui/material';
import { Delete as DeleteIcon, FilePresent as FileIcon } from '@mui/icons-material';
import { Edit as EditIcon } from '@mui/icons-material';
import { getApiUrl } from '../utils/apiConfig';

const DocumentUpload = ({
    currentDocUrl,
    documentType, // 'red_team', 'certification', 'vendor', 'skill_level'
    operatorName,
    recordId,
    onUpload,
    onDelete,
    accept = 'application/pdf,image/*',
    isViewOnly = false,
    preventImmediateUpload = false,
}) => {
    const [fileName, setFileName] = useState(
        currentDocUrl ? currentDocUrl.split('/').pop() : ''
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showUploadOptions, setShowUploadOptions] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [tempFile, setTempFile] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState('');

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            setError('Please select a PDF or image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size should be less than 10MB');
            return;
        }

        setError('');
        setSelectedFileName(file.name);

        if (preventImmediateUpload) {
            // For new records, just store the file and notify parent
            setTempFile(file);
            onUpload({ file });
        } else {
            setLoading(true);
            try {
                // For existing records, proceed with immediate upload
                const formData = new FormData();
                formData.append('file', file);
                formData.append('document_type', documentType);
                formData.append('operator_name', operatorName);
                formData.append('record_id', recordId);

                const response = await fetch(getApiUrl('/training/document/upload'), {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const data = await response.json();
                setFileName(file.name);
                setShowUploadOptions(false);
                onUpload(data);
            } catch (error) {
                console.error('Upload error:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            if (!currentDocUrl) {
                throw new Error('No document to delete');
            }

            const response = await fetch(
                getApiUrl(`/training/document?document_type=${documentType}&operator_name=${operatorName}&record_id=${recordId}`),
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to delete document');
            }

            setFileName('');
            setShowUploadOptions(false);
            onDelete();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openDocument = () => {
        if (currentDocUrl) {
            // Format the URL correctly - always prepend with /uploads
            // And don't include /uploads if it's already at the start
            const formattedUrl = currentDocUrl.startsWith('/uploads') 
                ? currentDocUrl 
                : `/uploads${currentDocUrl}`;
            
            // For non-image documents, we'll do a HEAD request to check if it exists
            fetch(formattedUrl, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        window.open(formattedUrl, '_blank');
                    } else {
                        setError('File not found. The document may have been moved or deleted.');
                        // Notify parent component that document is inaccessible
                        onDelete();
                    }
                })
                .catch(() => {
                    setError('Failed to access document. It may have been moved or deleted.');
                    // Notify parent component that document is inaccessible
                    onDelete();
                });
        }
    };

    // If a file exists, show View button unless upload options are being shown
    if (currentDocUrl && !showUploadOptions) {
        return (
            <Box>
                <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={openDocument}
                    startIcon={<FileIcon />}
                >
                    View
                </Button>
                {!isViewOnly && (
                    <IconButton
                        size="small"
                        color="default"
                        onClick={() => setShowUploadOptions(true)}
                        title="Replace document"
                        sx={{ ml: 1 }}
                    >
                        <EditIcon />
                    </IconButton>
                )}
            </Box>
        );
    }

    // If in view-only mode and no current document, just show a message
    if (isViewOnly && !currentDocUrl) {
        return (
            <Typography variant="body2" color="text.secondary">None</Typography>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
            {currentDocUrl ? (
                <Paper
                    elevation={1}
                    sx={{
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'background.paper',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileIcon color="primary" />
                        <Typography
                            variant="body2"
                            component="a"
                            href={currentDocUrl.startsWith('/uploads') ? currentDocUrl : `/uploads${currentDocUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                textDecoration: 'none',
                                color: 'primary.main',
                                '&:hover': {
                                    textDecoration: 'underline',
                                },
                            }}
                        >
                            {fileName}
                        </Typography>
                    </Box>
                    {!isViewOnly && (
                        <Box>
                            <IconButton
                                size="small"
                                onClick={() => setShowUploadOptions(true)}
                                disabled={loading}
                            >
                                <EditIcon />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    )}
                </Paper>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={24} /> : <FileIcon />}
                        fullWidth
                    >
                        {fileName ? 'Replace Document' : 'Upload Document'}
                        <input
                            type="file"
                            hidden
                            accept={accept}
                            onChange={handleFileChange}
                        />
                    </Button>
                    {selectedFileName && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Selected file: {selectedFileName}
                        </Typography>
                    )}
                </Box>
            )}

            {error && (
                <Typography color="error" variant="body2">
                    {error}
                </Typography>
            )}

            {currentDocUrl && showUploadOptions && !isViewOnly && (
                <Button 
                    variant="text" 
                    size="small" 
                    onClick={() => setShowUploadOptions(false)}
                    sx={{ mt: 1 }}
                >
                    Cancel
                </Button>
            )}
        </Box>
    );
};

export default DocumentUpload;