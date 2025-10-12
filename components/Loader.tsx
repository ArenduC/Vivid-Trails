
import React from 'react';

interface LoaderProps {
  message: string;
  type?: 'fullscreen' | 'inline';
}

const Loader: React.FC<LoaderProps> = ({ message, type = 'fullscreen' }) => {
  if (type === 'inline') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-white font-medium">{message}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-xl text-white font-medium animate-pulse">{message}</p>
    </div>
  );
};

export default Loader;
