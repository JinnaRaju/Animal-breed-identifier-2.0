import React, { useState, useEffect } from 'react';
import { getGovernmentSchemes } from '../services/geminiService';
import { GovernmentScheme } from '../types';

interface GovernmentSchemesProps {
  animalType: string;
  language: string;
}

const GovernmentSchemes: React.FC<GovernmentSchemesProps> = ({ animalType, language }) => {
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (animalType) {
      loadSchemes();
    }
  }, [animalType, language]);

  const loadSchemes = async () => {
    setIsLoading(true);
    try {
      const data = await getGovernmentSchemes(animalType, language);
      setSchemes(data);
    } catch (err) {
      console.error("Failed to load schemes", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-3xl border border-gray-100 p-12 space-y-12">
      <div className="flex items-center justify-between">
        <h3 className="text-4xl font-black text-gray-900 tracking-tighter">Government Schemes</h3>
        <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shadow-xl">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center py-12 space-y-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">Searching Database...</p>
        </div>
      ) : schemes.length === 0 ? (
        <p className="text-center text-gray-400 font-black uppercase tracking-widest text-xs py-12">No schemes found for {animalType}</p>
      ) : (
        <div className="space-y-8">
          {schemes.map((scheme) => (
            <div key={scheme.id} className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:border-amber-200 transition-all group">
              <h4 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-amber-600 transition-colors">{scheme.title}</h4>
              <p className="text-lg text-gray-600 font-medium leading-relaxed mb-6">{scheme.description}</p>
              <div className="p-6 bg-white rounded-2xl border border-gray-100 mb-6">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Eligibility</p>
                <p className="text-sm font-bold text-gray-700">{scheme.eligibility}</p>
              </div>
              <a 
                href={scheme.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-3 text-sm font-black text-amber-600 uppercase tracking-widest hover:translate-x-2 transition-transform"
              >
                <span>Official Portal</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GovernmentSchemes;
