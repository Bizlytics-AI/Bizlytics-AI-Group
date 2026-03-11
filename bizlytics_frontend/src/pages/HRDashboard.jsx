import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import FileUpload from '../components/analytics/FileUpload';
import FileList from '../components/analytics/FileList';
import useAuth from '../hooks/useAuth';

const HRDashboard = () => {
    const { user } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleUploadSuccess = () => {
        // Increment trigger to cause FileList to re-fetch
        setRefreshTrigger((prev) => prev + 1);
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
                <p className="text-gray-500 mt-1">
                    Upload and manage your company's analytics data.
                    {user?.schema_name && (
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
                            {user.schema_name}
                        </span>
                    )}
                </p>
            </div>

            {/* Analytics Section */}
            <div className="space-y-6">
                {/* Upload Section */}
                <FileUpload onUploadSuccess={handleUploadSuccess} />

                {/* Files Table */}
                <FileList refreshTrigger={refreshTrigger} />
            </div>
        </DashboardLayout>
    );
};

export default HRDashboard;
