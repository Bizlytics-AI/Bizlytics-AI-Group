import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-gray-600 font-medium animate-pulse">Loading Bizlytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center p-4">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );
};

export default Loader;
