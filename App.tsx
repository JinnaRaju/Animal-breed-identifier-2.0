
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import Navigation from './components/Navigation';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'signup' | 'dashboard' | 'admin'>('landing');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        await db.init();
        await db.seedAdmin();
        
        const storedUserId = localStorage.getItem('animal_id_uid');
        if (storedUserId) {
          const user = await db.getUser(storedUserId);
          if (user) {
            setCurrentUser(user);
            setView(user.role === UserRole.ADMIN ? 'admin' : 'dashboard');
          }
        }
      } catch (err) {
        console.error("Failed to initialize database", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initApp();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('animal_id_uid', user.id);
    setView(user.role === UserRole.ADMIN ? 'admin' : 'dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('animal_id_uid');
    setView('landing');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 font-medium">Waking up the database...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case 'landing':
        return <LandingPage onGetStarted={() => setView('login')} />;
      case 'login':
        return <Login onLogin={handleLogin} onSwitchToSignup={() => setView('signup')} onBack={() => setView('landing')} />;
      case 'signup':
        return <Signup onSignup={handleLogin} onSwitchToLogin={() => setView('login')} onBack={() => setView('landing')} />;
      case 'dashboard':
        return currentUser ? <Dashboard user={currentUser} /> : <Login onLogin={handleLogin} onSwitchToSignup={() => setView('signup')} onBack={() => setView('landing')} />;
      case 'admin':
        return currentUser?.role === UserRole.ADMIN ? <AdminDashboard user={currentUser} /> : <Dashboard user={currentUser!} />;
      default:
        return <LandingPage onGetStarted={() => setView('login')} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation 
        user={currentUser} 
        onLogout={handleLogout} 
        setView={setView} 
        currentView={view}
      />
      <main className="flex-grow">
        {renderContent()}
      </main>
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-gray-500 text-sm">
        <p>© 2024 Animal Breed Identifier. Powered by AI Intelligence & DBMS.</p>
      </footer>
    </div>
  );
};

export default App;
