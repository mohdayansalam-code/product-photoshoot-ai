'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function EmailInput({ label, name, placeholder, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label htmlFor={name} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="email"
        placeholder={placeholder}
        required
        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black w-full"
        {...props}
      />
    </div>
  );
}

export function PasswordInput({ label, name, placeholder, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label htmlFor={name} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="password"
        placeholder={placeholder}
        required
        minLength={6}
        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black w-full"
        {...props}
      />
    </div>
  );
}

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  formAction?: any;
  pendingText?: string;
}

export function AuthButton({ formAction, pendingText, children, ...props }: AuthButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      formAction={formAction}
      disabled={pending}
      className={`mt-4 px-4 py-2 text-white bg-black rounded-md font-semibold hover:bg-gray-800 transition-colors w-full ${
        pending ? 'opacity-70 cursor-not-allowed' : ''
      }`}
      {...props}
    >
      {pending ? pendingText : children}
    </button>
  );
}
