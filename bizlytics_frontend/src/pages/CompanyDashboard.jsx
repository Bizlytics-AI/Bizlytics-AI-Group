import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../layouts/DashboardLayout';
import authService from '../services/authService';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import ChangePasswordForm from '../components/auth/ChangePasswordForm';

const CompanyDashboard = () => {
    const { user } = useAuth();
    const [pendingHRs, setPendingHRs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchPendingHRs();
    }, []);

    const fetchPendingHRs = async () => {
        setLoading(true);
        try {
            const data = await authService.getPendingHRs();
            setPendingHRs(data);
        } catch (error) {
            toast.error('Failed to load pending HR requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        setActionLoading(id);
        try {
            await authService.approveHR(id);
            toast.success('HR approved!');
            fetchPendingHRs();
        } catch (error) {
            toast.error('Failed to approve HR');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        setActionLoading(id);
        try {
            await authService.rejectHR(id);
            toast.success('HR rejected');
            fetchPendingHRs();
        } catch (error) {
            toast.error('Failed to reject HR');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Company Dashboard</h1>
                <p className="text-gray-500 mt-1">
                    Manage your HR team and company settings.
                    {user?.schema_name && (
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
                            {user.schema_name}
                        </span>
                    )}
                </p>
            </div>

            <div className="space-y-8">
                {/* Pending HR Registrations */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Pending HR Registrations</h2>
                        {pendingHRs.length > 0 && (
                            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {pendingHRs.length}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-400">
                            <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                            <p className="text-sm">Loading...</p>
                        </div>
                    ) : pendingHRs.length === 0 ? (
                        <div className="p-8 text-center">
                            <CheckCircle className="h-12 w-12 mx-auto text-green-300 mb-3" />
                            <p className="text-sm text-gray-500">No pending HR registrations.</p>
                            <p className="text-xs text-gray-400 mt-1">All HR accounts have been processed.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {pendingHRs.map((hr) => (
                                <li key={hr.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{hr.email}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Requested {new Date(hr.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => handleApprove(hr.id)}
                                            isLoading={actionLoading === hr.id}
                                            className="w-auto py-1.5 px-4 text-xs bg-green-600 hover:bg-green-700 focus:ring-green-500"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            onClick={() => handleReject(hr.id)}
                                            isLoading={actionLoading === hr.id}
                                            variant="outline"
                                            className="w-auto py-1.5 px-4 text-xs text-red-600 border-red-300 hover:bg-red-50"
                                        >
                                            <XCircle className="h-3.5 w-3.5 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Security Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                    </div>
                    <div className="p-6 max-w-md">
                        <p className="text-sm text-gray-500 mb-6">
                            Update your password to keep your account secure.
                        </p>
                        <ChangePasswordForm />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CompanyDashboard;
