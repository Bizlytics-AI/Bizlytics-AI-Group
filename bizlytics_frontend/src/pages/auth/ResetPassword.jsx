import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';

const ResetPassword = () => {
  return (
    <AuthLayout 
      title="Set a new password" 
      subtitle={
        <span>
          Back to{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
};

export default ResetPassword;
