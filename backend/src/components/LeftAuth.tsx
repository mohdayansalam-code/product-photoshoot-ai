import React from 'react';

export default function LeftAuth() {
  return (
    <div className="hidden md:flex w-1/2 bg-gray-900 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
      <div className="relative z-10 max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-center md:text-left">
          Welcome to CVPHOTO
        </h1>
        <p className="text-lg text-gray-300 mb-8 text-center md:text-left">
          Get professional quality product photoshoot imagery dynamically generated using AI.
        </p>
      </div>
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-gray-800 to-black opacity-80" />
    </div>
  );
}
