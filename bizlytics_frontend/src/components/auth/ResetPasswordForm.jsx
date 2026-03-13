import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import Input from '../common/Input';
import Button from '../common/Button';
import authService from '../../services/authService';

const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
          <Lock className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Invalid reset link</h3>
        <p className="text-sm text-gray-600">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate('/forgot-password')}
            className="font-medium text-indigo-600 hover:text-indigo-500 text-sm"
          >
            Request new link
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      toast.success('Password reset successful! Please log in.', { duration: 5000 });
      navigate('/login');
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail;
      toast.error(detail || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <p className="text-sm text-gray-600">
        Enter your new password below.
      </p>

      <Input
        label="New Password"
        id="new_password"
        type="password"
        required
        icon={Lock}
        placeholder="••••••••"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      <Input
        label="Confirm New Password"
        id="confirm_password"
        type="password"
        required
        icon={Lock}
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <div className="pt-1">
        <Button type="submit" isLoading={loading}>
          Reset password
        </Button>
      </div>
    </form>
  );
};

export default ResetPasswordForm;
