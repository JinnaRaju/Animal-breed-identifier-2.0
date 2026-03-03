
import React from 'react';
import { User, UserRole } from '../types';

interface NavigationProps {
  user: User | null;
  onLogout: () => void;
  setView: (view: any) => void;
  currentView: string;
}

const Navigation: React.FC<NavigationProps> = ({ user, onLogout, setView, currentView }) => {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button onClick={() => setView('landing')} className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">BreedFinder</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <button 
                  onClick={() => setView(user.role === UserRole.ADMIN ? 'admin' : 'dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${currentView === 'dashboard' || currentView === 'admin' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-indigo-600'}`}
                >
                  Dashboard
                </button>
                <div className="h-6 w-px bg-gray-200 mx-2" />
                <div className="flex items-center space-x-3">
                  <span className="hidden md:block text-sm font-medium text-gray-700">{user.name}</span>
                  <button 
                    onClick={onLogout}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setView('login')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  Log In
                </button>
                <button 
                  onClick={() => setView('signup')}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
