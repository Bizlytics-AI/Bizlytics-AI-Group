import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';

const ForgotPassword = () => {
  return (
    <AuthLayout 
      title="Forgot your password?" 
      subtitle={
        <span>
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </span>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
};

export default ForgotPassword;
