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
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
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
