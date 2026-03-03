import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { VetLocation } from '../types';

const VetLocator: React.FC = () => {
  const [vets, setVets] = useState<VetLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findVets = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find 5 veterinary clinics near latitude ${lat}, longitude ${lng}. Provide their names, addresses, ratings, and phone numbers.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                name: { type: "STRING" },
                address: { type: "STRING" },
                distance: { type: "STRING" },
                phone: { type: "STRING" },
                rating: { type: "NUMBER" }
              },
              required: ["id", "name", "address", "distance", "phone", "rating"]
            }
          }
        },
      });

      const data = JSON.parse(response.text || "[]");
      setVets(data);
    } catch (err) {
      console.error("Failed to find vets", err);
      setError("Failed to locate nearby clinics.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        findVets(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setError("Location access denied. Please enable permissions.");
      }
    );
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-3xl border border-gray-100 p-12 space-y-12">
      <div className="flex items-center justify-between">
        <h3 className="text-4xl font-black text-gray-900 tracking-tighter">Nearby Veterinarians</h3>
        <div className="h-12 w-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-xl">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </div>
      </div>

      {vets.length === 0 && !isLoading && (
        <div className="text-center py-12 space-y-8">
          <p className="text-2xl text-gray-500 font-medium max-w-md mx-auto">Locate the nearest professional medical care for your animals instantly.</p>
          <button 
            onClick={handleLocate}
            className="px-16 py-6 bg-red-600 text-white text-xl font-black rounded-[2.5rem] hover:bg-red-700 shadow-3xl transition-all transform hover:-translate-y-2 flex items-center justify-center space-x-6 mx-auto"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            <span>Locate Nearest Vets</span>
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center py-12 space-y-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">Scanning Vicinity...</p>
        </div>
      )}

      {error && (
        <p className="text-center text-red-600 font-black uppercase tracking-widest text-xs py-12">{error}</p>
      )}

      {vets.length > 0 && (
        <div className="space-y-8">
          {vets.map((vet) => (
            <div key={vet.id} className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:border-red-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <h4 className="text-2xl font-black text-gray-900 tracking-tight">{vet.name}</h4>
                  <div className="flex items-center space-x-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span>{vet.rating}</span>
                  </div>
                </div>
                <p className="text-lg text-gray-500 font-medium">{vet.address}</p>
                <p className="text-xs font-black text-red-600 uppercase tracking-widest">{vet.distance} away</p>
              </div>
              <a 
                href={`tel:${vet.phone}`}
                className="px-10 py-4 bg-white border-2 border-red-100 text-red-600 font-black rounded-2xl hover:bg-red-50 transition-all text-center uppercase tracking-widest text-sm shadow-sm"
              >
                Call Clinic
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VetLocator;
