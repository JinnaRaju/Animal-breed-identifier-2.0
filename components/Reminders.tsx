import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Reminder } from '../types';

interface RemindersProps {
  userId: string;
}

const Reminders: React.FC<RemindersProps> = ({ userId }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    animalName: '',
    type: 'Vaccination',
    date: '',
    completed: false
  });

  useEffect(() => {
    loadReminders();
    requestNotificationPermission();
  }, [userId]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const loadReminders = async () => {
    const data = await db.getUserReminders(userId);
    setReminders(data);
    checkDueReminders(data);
  };

  const checkDueReminders = (data: Reminder[]) => {
    const dueToday = data.filter(r => isToday(r.date) && !r.completed);
    
    if (dueToday.length > 0 && Notification.permission === 'granted') {
      new Notification("Pet Health Reminder", {
        body: `You have ${dueToday.length} vaccination(s) due today!`,
        icon: "/favicon.ico"
      });
    }
  };

  const handleAdd = async () => {
    if (!newReminder.animalName || !newReminder.date) return;
    const reminder: Reminder = {
      ...newReminder as Reminder,
      id: Math.random().toString(36).substr(2, 9),
      userId,
      completed: false
    };
    await db.saveReminder(reminder);
    setReminders(prev => [...prev, reminder]);
    setNewReminder({ animalName: '', type: 'Vaccination', date: '', completed: false });
  };

  const toggleComplete = async (reminder: Reminder) => {
    try {
      const updated = { ...reminder, completed: !reminder.completed };
      await db.saveReminder(updated);
      setReminders(prev => prev.map(r => r.id === reminder.id ? updated : r));
    } catch (err) {
      console.error("Failed to update reminder", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.deleteReminder(id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Failed to delete reminder", err);
    }
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-3xl border border-gray-100 p-12 space-y-12">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h3 className="text-4xl font-black text-gray-900 tracking-tighter">Vaccination Reminders</h3>
          <p className="text-gray-500 font-medium">Never miss a special day for your pet's health.</p>
        </div>
        <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-xl">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
        <input 
          type="text" 
          placeholder="Animal Name" 
          value={newReminder.animalName}
          onChange={(e) => setNewReminder({ ...newReminder, animalName: e.target.value })}
          className="p-4 bg-white border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
        />
        <select 
          value={newReminder.type}
          onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value as any })}
          className="p-4 bg-white border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
        >
          <option value="Vaccination">Vaccination</option>
          <option value="Deworming">Deworming</option>
          <option value="Checkup">Checkup</option>
          <option value="Other">Other</option>
        </select>
        <div className="flex space-x-4">
          <input 
            type="date" 
            value={newReminder.date}
            onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
            className="flex-grow p-4 bg-white border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            onClick={handleAdd}
            className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-xl"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {reminders.filter(r => isToday(r.date) && !r.completed).length > 0 && (
          <div className="bg-red-600 p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-red-200 animate-pulse-subtle">
            <div className="flex items-center space-x-6">
              <div className="h-16 w-16 bg-white text-red-600 rounded-3xl flex items-center justify-center shadow-xl">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div className="text-white">
                <h4 className="text-2xl font-black tracking-tight">Today is a Special Day!</h4>
                <p className="font-bold opacity-90">You have {reminders.filter(r => isToday(r.date) && !r.completed).length} important health tasks for your pets today.</p>
              </div>
            </div>
          </div>
        )}

        {reminders.length === 0 ? (
          <p className="text-center text-gray-400 font-black uppercase tracking-widest text-xs py-12">No active reminders</p>
        ) : (
          reminders.map((reminder) => {
            const dueToday = isToday(reminder.date) && !reminder.completed;
            return (
              <div key={reminder.id} className={`flex items-center justify-between p-8 rounded-[2rem] border-2 transition-all ${reminder.completed ? 'bg-green-50 border-green-100 opacity-60' : dueToday ? 'bg-red-50 border-red-200 shadow-xl scale-[1.02]' : 'bg-white border-gray-50 shadow-sm'}`}>
                <div className="flex items-center space-x-6">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${reminder.completed ? 'bg-green-600 text-white' : dueToday ? 'bg-red-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h4 className={`text-xl font-black ${reminder.completed ? 'text-green-900' : dueToday ? 'text-red-900' : 'text-gray-900'}`}>{reminder.animalName}</h4>
                      {dueToday && (
                        <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-bounce">Due Today</span>
                      )}
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{reminder.type} • {new Date(reminder.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => toggleComplete(reminder)}
                    className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${reminder.completed ? 'bg-green-100 text-green-700' : dueToday ? 'bg-red-600 text-white shadow-xl hover:bg-red-700' : 'bg-indigo-600 text-white shadow-xl hover:bg-indigo-700'}`}
                  >
                    {reminder.completed ? 'Completed' : 'Mark Done'}
                  </button>
                  <button 
                    onClick={() => handleDelete(reminder.id)}
                    className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Reminders;
