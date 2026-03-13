import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../layouts/DashboardLayout';
import authService from '../services/authService';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import ChangePasswordForm from '../components/auth/ChangePasswordForm';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [pendingCompanies, setPendingCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchPendingCompanies();
    }, []);

    const fetchPendingCompanies = async () => {
        setLoading(true);
        try {
            const data = await authService.getPendingCompanies();
            setPendingCompanies(data);
        } catch (error) {
            toast.error('Failed to load pending companies');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        setActionLoading(id);
        try {
            await authService.approveCompany(id);
            toast.success('Company approved!');
            fetchPendingCompanies();
        } catch (error) {
            toast.error('Failed to approve company');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        setActionLoading(id);
        try {
            await authService.rejectCompany(id);
            toast.success('Company rejected');
            fetchPendingCompanies();
        } catch (error) {
            toast.error('Failed to reject company');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500 mt-1">Manage company registrations and platform settings.</p>
            </div>

            <div className="space-y-8">
                {/* Pending Companies */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Pending Company Registrations</h2>
                        {pendingCompanies.length > 0 && (
                            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {pendingCompanies.length}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-400">
                            <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                            <p className="text-sm">Loading...</p>
                        </div>
                    ) : pendingCompanies.length === 0 ? (
                        <div className="p-8 text-center">
                            <CheckCircle className="h-12 w-12 mx-auto text-green-300 mb-3" />
                            <p className="text-sm text-gray-500">No pending companies to review.</p>
                            <p className="text-xs text-gray-400 mt-1">All registrations have been processed.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {pendingCompanies.map((company) => (
                                <li key={company.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{company.company_name}</p>
                                        <p className="text-sm text-gray-500">{company.company_email}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Registered {new Date(company.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => handleApprove(company.id)}
                                            isLoading={actionLoading === company.id}
                                            className="w-auto py-1.5 px-4 text-xs bg-green-600 hover:bg-green-700 focus:ring-green-500"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            onClick={() => handleReject(company.id)}
                                            isLoading={actionLoading === company.id}
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
                            Update your admin credentials to keep the platform secure.
                        </p>
                        <ChangePasswordForm />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
