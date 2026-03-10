import React from 'react';
import { Activity } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Hidden on mobile, shows gradient on desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-900 overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-indigo-600 mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 rounded-full bg-purple-600 mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 rounded-full bg-blue-600 mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        
        <div className="relative z-10 w-full flex flex-col justify-center px-16 text-white text-left h-full backdrop-blur-sm bg-black/10">
          <div className="flex items-center space-x-3 mb-12">
            <Activity className="w-10 h-10 text-indigo-300" />
            <span className="text-3xl font-bold tracking-tight">Bizlytics</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold mb-6 leading-tight">
            Unlock the hidden <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
              potential
            </span> of your data.
          </h1>
          <p className="text-lg text-indigo-100 max-w-md font-light">
            The intelligent business analytics platform designed to scale with your organization. 
            Connect, analyze, and automate instantly.
          </p>
          
          <div className="mt-16 flex items-center space-x-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-indigo-200 flex items-center justify-center text-xs text-indigo-800 font-bold">
                  {i}
                </div>
              ))}
            </div>
            <div className="text-sm text-indigo-200">
              <span className="font-semibold text-white">500+</span> companies onboarded
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Container */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24 bg-gray-50/50">
        <div className="mx-auto w-full max-w-md lg:max-w-sm">
          {/* Mobile Logo Logo */}
          <div className="flex items-center lg:hidden mb-10 text-indigo-600">
            <Activity className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold tracking-tight">Bizlytics</span>
          </div>
          
          <div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm text-gray-600">
                {subtitle}
              </p>
            )}
          </div>

          <div className="mt-8">
            <div className="mt-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
