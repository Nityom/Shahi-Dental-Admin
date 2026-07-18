'use client'
import React, { useState } from 'react';
import { Lock, UserCircle, AlertCircle, ArrowRight, X } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

const DantsriAdminLogin: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call - replace with your actual auth logic
    try {
      // Mock login - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Login success logic would go here
      console.log('Login successful', formData);
      // Redirect to dashboard or other authenticated page
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-black items-center justify-center">
        <div className="px-12 max-w-lg text-center">
          <svg className="w-32 h-32 mx-auto mb-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="48" stroke="white" strokeWidth="2" />
            <path d="M30 65C30 48.4315 43.4315 35 60 35C76.5685 35 90 48.4315 90 65" stroke="white" strokeWidth="2" />
            <rect x="44" y="30" width="4" height="30" rx="2" fill="white" />
            <rect x="36" y="40" width="4" height="20" rx="2" fill="white" />
            <rect x="52" y="35" width="4" height="25" rx="2" fill="white" />
            <rect x="60" y="40" width="4" height="20" rx="2" fill="white" />
          </svg>
          <h1 className="text-4xl font-bold text-white mb-6">Shahi Dental Clinic</h1>
          <p className="text-gray-300 text-lg leading-relaxed mb-8">
            Welcome to the Shahi Dental Clinic administration portal. Manage appointments, patient records, and clinic operations with ease.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black p-4 rounded-lg border border-gray-800 shadow-lg transform transition-all duration-300 hover:scale-105 hover:border-white group">
              <h3 className="text-white text-lg font-medium mb-2 group-hover:text-gray-200">Appointments</h3>
              <p className="text-gray-400 text-sm group-hover:text-white transition-colors duration-300">Schedule and manage patient visits</p>
              <div className="w-0 h-1 bg-white mt-3 group-hover:w-full transition-all duration-500"></div>
            </div>
            <div className="bg-black p-4 rounded-lg border border-gray-800 shadow-lg transform transition-all duration-300 hover:scale-105 hover:border-white group">
              <h3 className="text-white text-lg font-medium mb-2 group-hover:text-gray-200">Records</h3>
              <p className="text-gray-400 text-sm group-hover:text-white transition-colors duration-300">Access patient histories and treatments</p>
              <div className="w-0 h-1 bg-white mt-3 group-hover:w-full transition-all duration-500"></div>
            </div>
            <div className="bg-black p-4 rounded-lg border border-gray-800 shadow-lg transform transition-all duration-300 hover:scale-105 hover:border-white group">
              <h3 className="text-white text-lg font-medium mb-2 group-hover:text-gray-200">Analytics</h3>
              <p className="text-gray-400 text-sm group-hover:text-white transition-colors duration-300">Track clinic performance metrics</p>
              <div className="w-0 h-1 bg-white mt-3 group-hover:w-full transition-all duration-500"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <div className="relative inline-block">
              <h2 className="text-4xl font-bold text-gray-900">Admin Login</h2>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-black rounded-full"></div>
            </div>
            <p className="text-gray-600 mt-4">Enter your credentials to access the dashboard</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-md shadow-md flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-xl border border-gray-100">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircle className="h-5 w-5 text-gray-400 group-hover:text-black transition-colors duration-200" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 py-3 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="admin@shahidentalclinic.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-hover:text-black transition-colors duration-200" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-10 py-3 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded transition-colors duration-200"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-200 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center">
                  {loading ? 'Authenticating...' : 'Sign in'}
                  <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
                </span>
                <span className="absolute bottom-0 left-0 h-1 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
              </button>
            </div>
          </form>

          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500 rounded-full">Need help?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className="text-sm text-gray-500">
                Contact system administrator at{' '}
                <a href="mailto:support@titanium.com" className="font-medium text-gray-700 hover:text-black transition-colors duration-200 border-b border-transparent hover:border-black">
                  support@shahidentalclinic.com
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DantsriAdminLogin;