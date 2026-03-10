import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import RegisterHRForm from '../../components/auth/RegisterHRForm';

const HRRegister = () => {
  return (
    <AuthLayout 
      title="Join your company" 
      subtitle={
        <span>
          Register as an HR representative. Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </span>
      }
    >
      <RegisterHRForm />
    </AuthLayout>
  );
};

export default HRRegister;
