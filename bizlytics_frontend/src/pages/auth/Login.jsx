import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';

const Login = () => {
  return (
    <AuthLayout 
      title="Sign in to your account" 
      subtitle={
        <span>
          Or{' '}
          <Link to="/register/company" className="font-semibold text-indigo-600 hover:underline">
            register a new company
          </Link>
        </span>
      }
    >
      <LoginForm />
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Are you an HR employee?{' '}
          <Link to="/register/hr" className="font-semibold text-indigo-600 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
