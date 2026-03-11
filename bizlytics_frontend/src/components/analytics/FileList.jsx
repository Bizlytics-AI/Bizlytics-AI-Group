import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import analyticsService from '../../services/analyticsService';

const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Pending' },
    processing: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Processing' },
    completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Completed' },
    failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Failed' },
};

const FileList = ({ refreshTrigger }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const data = await analyticsService.getFiles();
            setFiles(data);
        } catch (error) {
            toast.error('Failed to load uploaded files');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [refreshTrigger]);

    const getFileExtBadge = (filename) => {
        const ext = filename.split('.').pop().toUpperCase();
        const colors = {
            CSV: 'bg-emerald-100 text-emerald-700',
            XLSX: 'bg-blue-100 text-blue-700',
            XLS: 'bg-blue-100 text-blue-700',
            JSON: 'bg-purple-100 text-purple-700',
        };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[ext] || 'bg-gray-100 text-gray-700'}`}>
                {ext}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-center gap-2 text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading files...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Uploaded Files
                </h3>
                <button
                    onClick={fetchFiles}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {files.length === 0 ? (
                <div className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No files uploaded yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Upload a CSV, XLSX, or JSON file to get started.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 text-left">
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {files.map((file) => {
                                const status = statusConfig[file.status] || statusConfig.pending;
                                const StatusIcon = status.icon;
                                return (
                                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                                    {file.filename}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{getFileExtBadge(file.filename)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} border ${status.border}`}>
                                                <StatusIcon className={`h-3.5 w-3.5 ${file.status === 'processing' ? 'animate-spin' : ''}`} />
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(file.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FileList;
