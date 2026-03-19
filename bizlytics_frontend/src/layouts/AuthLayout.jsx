import React from 'react';
import { Activity } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex bg-[#F9FAFB]">
      {/* Left Panel - Hidden on mobile, shows premium gradient on desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 overflow-hidden">
        {/* Subtle glow / blur circles */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-indigo-500/20 mix-blend-screen filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-purple-500/20 mix-blend-screen filter blur-3xl animate-pulse delay-700"></div>
        
        {/* Faint abstract pattern (simplified with CSS grid or just depth) */}
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }}>
        </div>

        <div className="relative z-10 w-full flex flex-col justify-center px-16 text-white text-left h-full">
          <div className="flex items-center space-x-3 mb-10">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <Activity className="w-8 h-8 text-indigo-300" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Bizlytics</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Unlock the hidden <br/>
            <span className="text-indigo-300">potential</span> of your data.
          </h1>
          <p className="text-lg text-gray-300 max-w-md font-light leading-relaxed">
            The intelligent business analytics platform designed to scale with your organization. 
            Clean, minimal, and modern.
          </p>
          
          <div className="mt-16 flex items-center space-x-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-indigo-400/30 backdrop-blur-sm flex items-center justify-center text-xs text-white font-bold">
                  {i}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-400">
              <span className="font-semibold text-white">500+</span> companies onboarded
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Clean White Card Container */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center lg:hidden mb-10 text-indigo-600">
            <Activity className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold tracking-tight">Bizlytics</span>
          </div>
          
          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-3 text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>

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
