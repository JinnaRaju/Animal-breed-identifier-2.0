
import React, { useState, useEffect } from 'react';
import { User, UserRole, BreedResult } from '../types';
import { db } from '../services/db';

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allUploads, setAllUploads] = useState<BreedResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'uploads'>('users');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [allUsers, allScans] = await Promise.all([
          db.getAllUsers(),
          db.getAllScans()
        ]);
        setUsers(allUsers);
        setAllUploads(allScans);
      } catch (err) {
        console.error("Failed to fetch admin data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const getStats = () => {
    const breeds = allUploads.map(u => u.breedName);
    const mostCommon = breeds.length > 0 ? [...breeds].sort((a,b) => breeds.filter(v => v===a).length - breeds.filter(v => v===b).length).pop() : 'N/A';
    return {
      totalUsers: users.length,
      totalScans: allUploads.length,
      mostCommon,
      avgConfidence: allUploads.length > 0 ? (allUploads.reduce((acc, u) => acc + u.confidence, 0) / allUploads.length).toFixed(1) : '0'
    };
  };

  const handleDeleteScan = async (id: string) => {
    if (!window.confirm("Purge this record from DBMS?")) return;
    try {
      await db.deleteScan(id);
      setAllUploads(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert("Failed to delete scan.");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Compiling statistics...</p>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Intelligence</h1>
        <p className="text-gray-500 mt-2">Platform performance and user governance (DBMS Powered).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard label="Total Community" value={stats.totalUsers} color="indigo" />
        <StatCard label="Successful Scans" value={stats.totalScans} color="green" />
        <StatCard label="Avg. Confidence" value={`${stats.avgConfidence}%`} color="blue" />
        <StatCard label="Top Breed" value={stats.mostCommon} color="purple" />
      </div>

      <div className="flex space-x-2 p-1 bg-gray-100 rounded-2xl w-fit mb-8">
        <button onClick={() => setActiveTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>User Directory</button>
        <button onClick={() => setActiveTab('uploads')} className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'uploads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Scan Activity</button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identity</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Credentials</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Privileges</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enrolled</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">{u.name.charAt(0)}</div>
                        <div className="ml-4 font-bold text-gray-900">{u.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium">{u.email}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 text-[10px] font-bold rounded-full ${u.role === UserRole.ADMIN ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-400 font-medium">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <button disabled={u.id === user.id} className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-30">Suspend</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reference</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Result</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Match Score</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timeline</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allUploads.map((upload) => (
                  <tr key={upload.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <img src={upload.imageUrl} className="h-12 w-12 rounded-xl object-cover ring-2 ring-gray-100" />
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <p className="font-bold text-gray-900">{upload.breedName}</p>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">{upload.animalType}</p>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{width: `${upload.confidence}%`}}></div>
                        </div>
                        <span className="text-xs font-bold text-indigo-600">{upload.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-400 font-medium">{new Date(upload.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <button 
                        onClick={() => handleDeleteScan(upload.id)}
                        className="text-xs font-bold text-gray-400 hover:text-red-500"
                      >
                        Purge Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string, value: any, color: string }) => {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600'
  };
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black ${color === 'indigo' ? 'text-indigo-600' : color === 'green' ? 'text-green-600' : color === 'blue' ? 'text-blue-600' : color === 'purple' ? 'text-purple-600' : ''}`}>{value}</p>
      <div className={`mt-2 h-1 w-1/4 rounded-full ${colors[color] || 'bg-gray-100'}`}></div>
    </div>
  );
};

export default AdminDashboard;
