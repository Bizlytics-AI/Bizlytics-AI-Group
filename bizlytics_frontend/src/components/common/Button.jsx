import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({ children, isLoading, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]";
  
  const variants = {
    primary: "text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 focus:ring-indigo-500",
    secondary: "text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:ring-indigo-500",
    outline: "text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-indigo-500"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
