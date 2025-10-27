import Link from 'next/link';
import { useRouter } from 'next/router';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <AlertCircle className="mx-auto text-gray-400" size={80} />
        <h1 className="mt-6 text-4xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-lg text-gray-600">Page not found</p>
        <p className="mt-2 text-sm text-gray-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 space-x-4">
          <button
            onClick={() => router.back()}
            className="btn btn-secondary inline-flex items-center space-x-2"
          >
            <span>Go Back</span>
          </button>
          <Link
            href="/dashboard"
            className="btn btn-primary inline-flex items-center space-x-2"
          >
            <Home size={16} />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

