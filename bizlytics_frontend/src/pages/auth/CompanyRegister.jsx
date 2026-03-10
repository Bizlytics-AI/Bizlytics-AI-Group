import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import RegisterCompanyForm from '../../components/auth/RegisterCompanyForm';

const CompanyRegister = () => {
  return (
    <AuthLayout 
      title="Register your company" 
      subtitle={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </span>
      }
    >
      <RegisterCompanyForm />
    </AuthLayout>
  );
};

export default CompanyRegister;
