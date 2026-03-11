import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import analyticsService from '../../services/analyticsService';
import Button from '../common/Button';

const ACCEPTED_TYPES = {
    'text/csv': '.csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'application/json': '.json',
};

const FileUpload = ({ onUploadSuccess }) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const validateFile = (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const allowed = ['csv', 'xlsx', 'xls', 'json'];
        if (!allowed.includes(ext)) {
            toast.error(`Unsupported file type: .${ext}. Allowed: .csv, .xlsx, .json`);
            return false;
        }
        if (file.size > 50 * 1024 * 1024) {
            toast.error('File too large. Maximum size is 50MB.');
            return false;
        }
        return true;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (validateFile(file)) setSelectedFile(file);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (validateFile(file)) setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        try {
            const result = await analyticsService.uploadFile(selectedFile);
            toast.success(result.message || 'File uploaded successfully!');
            setSelectedFile(null);
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            const detail = error.response?.data?.detail;
            toast.error(detail || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                Upload Data File
            </h3>

            {/* Drop Zone */}
            <div
                className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
          ${dragActive
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                    }
        `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700">
                    {dragActive ? 'Drop your file here' : 'Drag & drop a file, or click to browse'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Supports CSV, XLSX, and JSON (max 50MB)
                </p>
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
                <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{formatSize(selectedFile.size)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleUpload}
                            isLoading={uploading}
                            className="w-auto py-1.5 px-4 text-sm"
                        >
                            Upload
                        </Button>
                        <button
                            onClick={(e) => { e.stopPropagation(); clearFile(); }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
