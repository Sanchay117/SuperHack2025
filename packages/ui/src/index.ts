import React from 'react';

export function Button({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={("inline-flex items-center justify-center rounded px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 " + className).trim()} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={("bg-zinc-900 rounded p-4 " + className).trim()}>{children}</div>;
}

