import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import Input from '../common/Input';
import Button from '../common/Button';

const ChangePasswordForm = () => {
    const [formData, setFormData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.new_password !== formData.confirm_password) {
            toast.error('New passwords do not match');
            return;
        }

        if (formData.new_password.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await authService.changePassword(formData.current_password, formData.new_password);
            toast.success('Password changed successfully!');
            setFormData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
        } catch (error) {
            const detail = error.response?.data?.detail;
            toast.error(detail || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Current Password"
                id="current_password"
                type="password"
                required
                icon={Lock}
                placeholder="••••••••"
                value={formData.current_password}
                onChange={handleChange}
            />

            <Input
                label="New Password"
                id="new_password"
                type="password"
                required
                icon={Lock}
                placeholder="••••••••"
                value={formData.new_password}
                onChange={handleChange}
            />

            <Input
                label="Confirm New Password"
                id="confirm_password"
                type="password"
                required
                icon={ShieldCheck}
                placeholder="••••••••"
                value={formData.confirm_password}
                onChange={handleChange}
            />

            <div className="pt-2">
                <Button type="submit" isLoading={loading} className="w-full sm:w-auto px-8">
                    Update Password
                </Button>
            </div>
        </form>
    );
};

export default ChangePasswordForm;
