import React, { useState, useEffect, useRef } from 'react';
import { Mail, Building2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Input from '../common/Input';
import Button from '../common/Button';
import authService from '../../services/authService';

const RegisterHRForm = () => {
  useEffect(() => {
    console.log('--- Bizlytics Frontend: VERSION 2.2 (Stability Mode) ---');
  }, []);
  const [formData, setFormData] = useState({
    email: '',
    company_email: '',
    password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || isSubmitting.current) return;
    
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    isSubmitting.current = true;
    try {
      const response = await authService.registerHR({
        email: formData.email.toLowerCase().trim(),
        company_email: formData.company_email.toLowerCase().trim(),
        password: formData.password
      });
      
      toast.success(response.message || 'Registration submitted! Awaiting company approval.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      const detail = error.response?.data?.detail;
      toast.error(detail || 'Failed to complete registration');
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        label="Your HR Email"
        id="email"
        type="email"
        required
        icon={Mail}
        placeholder="hr@acmecorp.com"
        value={formData.email}
        onChange={handleChange}
      />

      <Input
        label="Company (Admin) Email"
        id="company_email"
        type="email"
        required
        icon={Building2}
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
          Register HR Account
        </Button>
      </div>
    </form>
  );
};

export default RegisterHRForm;
