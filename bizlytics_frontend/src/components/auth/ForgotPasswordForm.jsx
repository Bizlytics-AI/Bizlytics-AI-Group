import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import Input from '../common/Input';
import Button from '../common/Button';
import authService from '../../services/authService';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
      toast.success('Reset link sent! Check your email.');
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail;
      toast.error(detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
          <Mail className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
        <p className="text-sm text-gray-600">
          If an account exists for <span className="font-medium text-gray-900">{email}</span>, 
          we've sent a password reset link.
        </p>
        <div className="pt-4">
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 text-sm"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <p className="text-sm text-gray-600">
        Enter the email address associated with your account and we'll send you 
        a link to reset your password.
      </p>

      <Input
        label="Email address"
        id="email"
        type="email"
        autoComplete="email"
        required
        icon={Mail}
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button type="submit" isLoading={loading}>
        Send reset link
      </Button>

      <div className="text-center">
        <Link
          to="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500 text-sm"
        >
          ← Back to login
        </Link>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;
