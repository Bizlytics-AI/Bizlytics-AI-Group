import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, id, error, icon: Icon, ...props }, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <input
          id={id}
          ref={ref}
          className={`
            block w-full text-sm rounded-xl py-3 border-gray-300
            ${Icon ? 'pl-11' : 'pl-4'}
            ${error 
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}
            transition-all duration-200
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 animate-pulse">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
