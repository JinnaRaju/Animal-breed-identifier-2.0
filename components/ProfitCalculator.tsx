import React, { useState } from 'react';
import { getProfitEstimation } from '../services/geminiService';
import Markdown from 'react-markdown';

const ProfitCalculator: React.FC = () => {
  const [animalType, setAnimalType] = useState('Cow');
  const [count, setCount] = useState(1);
  const [duration, setDuration] = useState(12);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const estimation = await getProfitEstimation(animalType, count, duration);
      setResult(estimation);
    } catch (err) {
      console.error("Calculation failed", err);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-3xl border border-gray-100 p-12 space-y-12">
      <div className="flex items-center justify-between">
        <h3 className="text-4xl font-black text-gray-900 tracking-tighter">Profit Estimator</h3>
        <div className="h-12 w-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow-xl">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-gray-50 p-10 rounded-[3rem] border border-gray-100">
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Animal Type</label>
          <input 
            type="text" 
            value={animalType}
            onChange={(e) => setAnimalType(e.target.value)}
            className="w-full p-5 bg-white border-none rounded-2xl text-lg font-bold focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Count</label>
          <input 
            type="number" 
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="w-full p-5 bg-white border-none rounded-2xl text-lg font-bold focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Duration (Months)</label>
          <input 
            type="number" 
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full p-5 bg-white border-none rounded-2xl text-lg font-bold focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <button 
        onClick={handleCalculate}
        disabled={isCalculating}
        className="w-full py-8 bg-green-600 text-white text-2xl font-black rounded-[3rem] hover:bg-green-700 shadow-3xl transition-all disabled:opacity-50 flex items-center justify-center space-x-6"
      >
        {isCalculating ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div> : <span>Calculate ROI</span>}
      </button>

      {result && (
        <div className="bg-gray-50 p-12 rounded-[3.5rem] border border-gray-100 shadow-inner animate-fade-in">
          <div className="markdown-body prose prose-indigo max-w-none text-gray-700 font-medium leading-relaxed">
            <Markdown>{result}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitCalculator;
