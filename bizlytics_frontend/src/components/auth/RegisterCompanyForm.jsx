import React, { useState } from 'react';
import { Building2, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Input from '../common/Input';
import Button from '../common/Button';
import authService from '../../services/authService';

const RegisterCompanyForm = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    company_email: '',
    password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { password, ...submitData } = formData;
      await authService.registerCompany({
        company_name: formData.company_name,
        company_email: formData.company_email,
        password: formData.password
      });
      
      toast.success('Registration submitted!', {
        description: 'Your company registration is pending admin approval.',
        duration: 5000
      });
      navigate('/login');
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail;
      toast.error(detail || 'Failed to register company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        label="Company Name"
        id="company_name"
        type="text"
        required
        icon={Building2}
        placeholder="Acme Corp"
        value={formData.company_name}
        onChange={handleChange}
      />

      <Input
        label="Company Email"
        id="company_email"
        type="email"
        autoComplete="email"
        required
        icon={Mail}
        placeholder="admin@acmecorp.com"
        value={formData.company_email}
        onChange={handleChange}
      />

      <Input
        label="Password"
        id="password"
        type="password"
        required
        icon={Lock}
        placeholder="••••••••"
        value={formData.password}
        onChange={handleChange}
      />

      <Input
        label="Confirm Password"
        id="confirm_password"
        type="password"
        required
        icon={Lock}
        placeholder="••••••••"
        value={formData.confirm_password}
        onChange={handleChange}
      />

      <div className="pt-2">
        <Button type="submit" isLoading={loading}>
          Register Company
        </Button>
      </div>
    </form>
  );
};

export default RegisterCompanyForm;
