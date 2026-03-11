import api from '../utils/api';

const analyticsService = {
    /**
     * Upload a file (CSV, XLSX, JSON) for the HR's company.
     * @param {File} file - The file object from an input or drag-and-drop.
     * @returns {Promise<{message: string, upload_id: number, status: string}>}
     */
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/analytics/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * List all uploaded files for the current HR's company.
     * @returns {Promise<Array<{id: number, filename: string, status: string, created_at: string}>>}
     */
    getFiles: async () => {
        const response = await api.get('/analytics/files');
        return response.data;
    },
};

export default analyticsService;
