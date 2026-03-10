import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import authService from '../services/authService';
import Button from '../components/common/Button';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [pendingHRs, setPendingHRs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingCompanies();
    }
    if (user?.role === 'company') {
      fetchPendingHRs();
    }
  }, [user]);

  // ---- Admin: Company Management ----
  const fetchPendingCompanies = async () => {
    try {
      const data = await authService.getPendingCompanies();
      setPendingCompanies(data);
    } catch (error) {
      toast.error('Failed to load pending companies');
    }
  };

  const handleApproveCompany = async (id) => {
    setLoading(true);
    try {
      await authService.approveCompany(id);
      toast.success('Company approved!');
      fetchPendingCompanies();
    } catch (error) {
      toast.error('Failed to approve company');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectCompany = async (id) => {
    setLoading(true);
    try {
      await authService.rejectCompany(id);
      toast.success('Company rejected!');
      fetchPendingCompanies();
    } catch (error) {
      toast.error('Failed to reject company');
    } finally {
      setLoading(false);
    }
  };

  // ---- Company: HR Management ----
  const fetchPendingHRs = async () => {
    try {
      const data = await authService.getPendingHRs();
      setPendingHRs(data);
    } catch (error) {
      toast.error('Failed to load pending HR requests');
    }
  };

  const handleApproveHR = async (id) => {
    setLoading(true);
    try {
      await authService.approveHR(id);
      toast.success('HR approved!');
      fetchPendingHRs();
    } catch (error) {
      toast.error('Failed to approve HR');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectHR = async (id) => {
    setLoading(true);
    try {
      await authService.rejectHR(id);
      toast.success('HR rejected!');
      fetchPendingHRs();
    } catch (error) {
      toast.error('Failed to reject HR');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-indigo-600">Bizlytics</span>
              <span className="ml-4 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 uppercase tracking-widest">
                {user.role} Dashboard
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 text-sm hidden sm:block">{user.email}</span>
              <Button onClick={handleLogout} variant="outline" className="w-auto py-1 px-3">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">
              Welcome back, {user.role}!
            </h1>
            
            <p className="text-gray-600 mb-8">
              This is a placeholder dashboard. Your role is <span className="font-bold">{user.role}</span>.
              {user.schema_name && (
                <span> Operating in tenant schema: <code className="bg-gray-100 px-1 rounded">{user.schema_name}</code></span>
              )}
            </p>

            {/* Admin: Pending Companies */}
            {user.role === 'admin' && (
              <div className="mt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Pending Company Registrations</h2>
                
                {pendingCompanies.length === 0 ? (
                  <p className="text-gray-500 italic">No pending companies to review.</p>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {pendingCompanies.map((company) => (
                        <li key={company.id} className="px-4 py-4 flex items-center justify-between sm:px-6">
                          <div>
                            <div className="text-sm font-medium text-indigo-600">{company.company_name}</div>
                            <div className="text-sm text-gray-500">{company.company_email}</div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => handleApproveCompany(company.id)} 
                              isLoading={loading}
                              className="w-auto py-1.5 px-3 text-xs bg-green-600 hover:bg-green-700 focus:ring-green-500"
                            >
                              Approve
                            </Button>
                            <Button 
                              onClick={() => handleRejectCompany(company.id)} 
                              isLoading={loading}
                              variant="outline"
                              className="w-auto py-1.5 px-3 text-xs text-red-600 border-red-300 hover:bg-red-50 focus:ring-red-500"
                            >
                              Reject
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Company: Pending HR Registrations */}
            {user.role === 'company' && (
              <div className="mt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Pending HR Registrations</h2>
                
                {pendingHRs.length === 0 ? (
                  <p className="text-gray-500 italic">No pending HR registrations to review.</p>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {pendingHRs.map((hr) => (
                        <li key={hr.id} className="px-4 py-4 flex items-center justify-between sm:px-6">
                          <div>
                            <div className="text-sm font-medium text-indigo-600">{hr.email}</div>
                            <div className="text-sm text-gray-500">
                              Requested on {new Date(hr.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => handleApproveHR(hr.id)} 
                              isLoading={loading}
                              className="w-auto py-1.5 px-3 text-xs bg-green-600 hover:bg-green-700 focus:ring-green-500"
                            >
                              Approve
                            </Button>
                            <Button 
                              onClick={() => handleRejectHR(hr.id)} 
                              isLoading={loading}
                              variant="outline"
                              className="w-auto py-1.5 px-3 text-xs text-red-600 border-red-300 hover:bg-red-50 focus:ring-red-500"
                            >
                              Reject
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
