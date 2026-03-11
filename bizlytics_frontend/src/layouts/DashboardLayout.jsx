import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';

const DashboardLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (!user) return null;

    const roleBadgeColors = {
        admin: 'bg-red-100 text-red-800',
        company: 'bg-blue-100 text-blue-800',
        hr: 'bg-green-100 text-green-800',
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-xl font-bold text-indigo-600 tracking-tight">
                                ✦ Bizlytics
                            </span>
                            <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest ${roleBadgeColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                                {user.role}
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-500 text-sm hidden sm:block">{user.email}</span>
                            <Button onClick={handleLogout} variant="outline" className="w-auto py-1.5 px-4 text-sm">
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
