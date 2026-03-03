
import React, { useState, useEffect, useRef } from 'react';
import { User, BreedResult, HealthAnalysisResponse } from '../types';
import { 
  identifyBreed, 
  getBreedFacts, 
  generateBreedAudio, 
  decodeBase64, 
  decodeAudioData,
  generateSimilarBreedImage,
  detectAnimalDiseases,
  detectEmotion
} from '../services/geminiService';
import { db } from '../services/db';
import Chatbot from './Chatbot';
import LiveCamera from './LiveCamera';
import Reminders from './Reminders';
import ProfitCalculator from './ProfitCalculator';
import GovernmentSchemes from './GovernmentSchemes';
import VetLocator from './VetLocator';
import Community from './Community';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'id' | 'shop' | 'history' | 'chat' | 'tools' | 'community'>('id');
  const [isUploading, setIsUploading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isFetchingFacts, setIsFetchingFacts] = useState(false);
  const [isAnalyzingHealth, setIsAnalyzingHealth] = useState(false);
  const [isAnalyzingEmotion, setIsAnalyzingEmotion] = useState(false);
  const [loadingSimilarBreed, setLoadingSimilarBreed] = useState<string | null>(null);
  const [language, setLanguage] = useState('English');
  const [isFarmerMode, setIsFarmerMode] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<BreedResult | null>(null);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysisResponse | null>(null);
  const [emotionAnalysis, setEmotionAnalysis] = useState<any | null>(null);
  const [funFacts, setFunFacts] = useState<{text: string, sources: any[]} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [similarBreedImages, setSimilarBreedImages] = useState<Record<string, string>>({});
  const [shoppingCart, setShoppingCart] = useState<BreedResult[]>([]);
  const [history, setHistory] = useState<BreedResult[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const scans = await db.getUserScans(user.id);
      setShoppingCart(scans.filter(s => s.isPurchased));
      setHistory(scans);
    };
    loadData();
    return () => { if (audioContextRef.current) audioContextRef.current.close(); };
  }, [user.id]);

  const saveScanToDB = async (result: BreedResult) => {
    try {
      await db.saveScan(result);
      setHistory(prev => [result, ...prev.filter(s => s.id !== result.id)]);
    } catch (err) {
      console.error("Failed to save scan", err);
    }
  };

  const handleIdentify = async () => {
    if (!selectedImage) return;
    setIsUploading(true);
    setError(null);
    setCurrentResult(null);
    setFunFacts(null);
    setHealthAnalysis(null);
    setSimilarBreedImages({});

    try {
      const prediction = await identifyBreed(selectedImage, language);
      
      if (!prediction.isAnimal) {
        setError("The uploaded image does not appear to be an animal or pet. This application is strictly for animal breed identification.");
        setIsUploading(false);
        return;
      }

      // Perform emotion analysis in parallel
      setIsAnalyzingEmotion(true);
      const emotion = await detectEmotion(selectedImage);
      setEmotionAnalysis(emotion);
      setIsAnalyzingEmotion(false);

      const newResult: BreedResult = {
        ...prediction,
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        imageUrl: selectedImage,
        timestamp: new Date().toISOString(),
        emotionAnalysis: emotion
      };
      setCurrentResult(newResult);
      await saveScanToDB(newResult);

      // Auto-load images for similar breeds
      prediction.similarBreeds.forEach(breed => {
        handleVisualizeBreed(breed);
      });
    } catch (err: any) {
      setError(err.message || "Identification failed. Ensure API_KEY is set in your VS Code environment.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleShare = async (result: BreedResult) => {
    const shareText = `Check out this ${result.breedName} I identified! Market value: $${result.price.toLocaleString()}. ${result.description}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Animal Breed Identifier',
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleVisualizeBreed = async (breed: string) => {
    if (similarBreedImages[breed]) return;
    setLoadingSimilarBreed(breed);
    try {
      const url = await generateSimilarBreedImage(breed);
      setSimilarBreedImages(prev => ({ ...prev, [breed]: url }));
    } catch (err) {
      console.error("Failed to visualize breed", err);
    } finally {
      setLoadingSimilarBreed(null);
    }
  };

  const handlePurchase = async () => {
    if (!currentResult) return;
    const purchased = { ...currentResult, isPurchased: true };
    await saveScanToDB(purchased);
    setShoppingCart(prev => [purchased, ...prev]);
    setCurrentResult(purchased);
    alert(`Success! ${currentResult.breedName} ecosystem ownership secured.`);
  };

  const handleReturn = async (id: string) => {
    if (window.confirm("Return this asset for a full refund?")) {
      await db.deleteScan(id);
      setShoppingCart(prev => prev.filter(s => s.id !== id));
      if (currentResult?.id === id) setCurrentResult(prev => prev ? { ...prev, isPurchased: false } : null);
    }
  };

  const handleExchange = (breed: string) => {
    alert(`Exchange request initiated for ${breed}. A biological coordinator will contact you.`);
  };

  const handleListen = async () => {
    if (!currentResult || isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const textToSpeak = `Identified: ${currentResult.breedName}. Description: ${currentResult.description}. Typical life expectancy is ${currentResult.lifeExpectancy}. Optimal diet consists of ${currentResult.dietRoutine}, with an exercise plan of ${currentResult.exercisePlan}.`;
      const base64 = await generateBreedAudio(textToSpeak);
      const buffer = await decodeAudioData(decodeBase64(base64), audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlayingAudio(false);
      source.start();
    } catch (e) { 
      console.error("Audio playback error", e);
      setIsPlayingAudio(false); 
    }
  };

  const handleHealthCheck = async () => {
    if (!selectedImage || !currentResult) return;
    setIsAnalyzingHealth(true);
    try {
      const analysis = await detectAnimalDiseases(selectedImage, currentResult.animalType);
      setHealthAnalysis(analysis);
      const updatedResult = { ...currentResult, healthAnalysis: analysis };
      setCurrentResult(updatedResult);
      await saveScanToDB(updatedResult);
    } catch { setError("AI Diagnostic sequence failed."); }
    finally { setIsAnalyzingHealth(false); }
  };

  const handleGetFacts = async () => {
    if (!currentResult) return;
    setIsFetchingFacts(true);
    try {
      const facts = await getBreedFacts(currentResult.breedName);
      setFunFacts(facts);
    } catch { console.error("Facts fetch failed"); }
    finally { setIsFetchingFacts(false); }
  };

  const resetAll = () => {
    setSelectedImage(null);
    setCurrentResult(null);
    setFunFacts(null);
    setHealthAnalysis(null);
    setSimilarBreedImages({});
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      {/* Header with Language and Farmer Mode */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div className="flex items-center space-x-4 bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Language</span>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
          >
            {['English', 'Telugu', 'Kannada', 'Marathi', 'Hindi', 'Tamil', 'Malayalam', 'Bengali', 'Gujarati'].map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4 bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Farmer Mode</span>
          <button 
            onClick={() => setIsFarmerMode(!isFarmerMode)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${isFarmerMode ? 'bg-green-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${isFarmerMode ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap justify-center mb-16 bg-white/60 backdrop-blur-3xl p-2 rounded-[3rem] w-fit mx-auto border border-white shadow-2xl gap-2">
        <button 
          onClick={() => setActiveTab('id')} 
          className={`flex items-center space-x-3 px-8 py-4 rounded-[2.5rem] text-sm font-black transition-all duration-500 ${activeTab === 'id' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-gray-400 hover:text-indigo-600'}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="uppercase tracking-widest">Discovery</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`flex items-center space-x-3 px-8 py-4 rounded-[2.5rem] text-sm font-black transition-all duration-500 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-gray-400 hover:text-indigo-600'}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="uppercase tracking-widest">History</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')} 
          className={`flex items-center space-x-3 px-8 py-4 rounded-[2.5rem] text-sm font-black transition-all duration-500 ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-gray-400 hover:text-indigo-600'}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <span className="uppercase tracking-widest">Assistant</span>
        </button>
        <button 
          onClick={() => setActiveTab('tools')} 
          className={`flex items-center space-x-3 px-8 py-4 rounded-[2.5rem] text-sm font-black transition-all duration-500 ${activeTab === 'tools' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-gray-400 hover:text-indigo-600'}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
          <span className="uppercase tracking-widest">Tools</span>
        </button>
        <button 
          onClick={() => setActiveTab('community')} 
          className={`flex items-center space-x-3 px-8 py-4 rounded-[2.5rem] text-sm font-black transition-all duration-500 ${activeTab === 'community' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-gray-400 hover:text-indigo-600'}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span className="uppercase tracking-widest">Community</span>
        </button>
        <button 
          onClick={() => setActiveTab('shop')} 
          className={`flex items-center space-x-3 px-8 py-4 rounded-[2.5rem] text-sm font-black transition-all duration-500 ${activeTab === 'shop' ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-gray-400 hover:text-indigo-600'}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <span className="uppercase tracking-widest">Market</span>
        </button>
      </div>

      {error && (
        <div className="mb-12 p-8 bg-red-50 border-4 border-red-100 rounded-[3rem] flex items-center space-x-6 animate-fade-in shadow-2xl">
          <div className="p-4 bg-red-600 text-white rounded-[1.5rem] shadow-lg">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-red-700 font-black text-xl">{error}</p>
        </div>
      )}

      {activeTab === 'id' ? (
        <div className="space-y-16 animate-fade-in">
          {/* Live Camera Toggle */}
          <div className="flex justify-center">
            <button 
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`px-12 py-5 rounded-[2.5rem] font-black text-sm uppercase tracking-widest transition-all flex items-center space-x-4 shadow-2xl ${isLiveMode ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-gray-900 border-2 border-gray-100'}`}
            >
              <div className={`h-4 w-4 rounded-full ${isLiveMode ? 'bg-white animate-ping' : 'bg-red-600'}`} />
              <span>{isLiveMode ? 'Terminate Live Feed' : 'Initialize Live Detection'}</span>
            </button>
          </div>

          {isLiveMode && (
            <div className="max-w-3xl mx-auto">
              <LiveCamera 
                language={language} 
                onResult={(result) => {
                  setCurrentResult(result);
                  saveScanToDB(result);
                  setIsLiveMode(false);
                }} 
              />
            </div>
          )}

          {/* Main Content Section */}
          <section className="bg-white rounded-[4rem] shadow-3xl border border-gray-50 overflow-hidden relative">
            <div className="p-10 lg:p-20">
              {!selectedImage ? (
                <div className="border-[6px] border-dashed border-indigo-50 bg-indigo-50/5 rounded-[4rem] p-32 text-center hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden">
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setSelectedImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                  <div className="space-y-8 relative z-10">
                    <div className="mx-auto w-32 h-32 bg-white text-indigo-600 rounded-[3rem] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-700">
                      <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <h2 className="text-5xl font-black text-gray-900 tracking-tighter">Species Analysis</h2>
                      <p className="text-xl text-gray-500 mt-4 font-medium max-w-lg mx-auto leading-relaxed">Instantly decode identity, health state, and ecosystem value.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-20">
                  {/* Result Header & Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="relative rounded-[4rem] overflow-hidden shadow-3xl bg-gray-900 aspect-square flex items-center justify-center">
                      <img src={selectedImage} alt="Selected Asset" className="h-full w-full object-cover transition-transform duration-[2s] hover:scale-110" />
                      <button onClick={resetAll} className="absolute top-10 right-10 bg-black/40 backdrop-blur-3xl text-white p-6 rounded-full hover:bg-red-600 transition-all"><svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>

                    {!currentResult ? (
                      <div className="space-y-12">
                        <div className="space-y-6">
                           <h2 className="text-6xl font-black text-gray-900 leading-none tracking-tighter">Asset Initialized</h2>
                           <p className="text-2xl text-gray-500 font-medium leading-relaxed">The AI is ready to execute breed recognition and biological data extraction.</p>
                        </div>
                        <button onClick={handleIdentify} disabled={isUploading} className="w-full py-10 bg-indigo-600 text-white font-black rounded-[3rem] hover:bg-indigo-700 shadow-3xl transition-all disabled:opacity-50 text-3xl flex items-center justify-center space-x-6 group">
                          {isUploading ? <><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div><span>Analyzing Neural Fields...</span></> : <><span>Execute Scan</span><svg className="h-10 w-10 group-hover:translate-x-3 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-12 animate-fade-in">
                        <div className="space-y-6">
                          <div className="flex items-center space-x-4">
                            <span className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-2xl text-[12px] font-black uppercase tracking-widest">{currentResult.animalType}</span>
                            <span className={`px-6 py-2 rounded-2xl text-[12px] font-black uppercase tracking-widest ${isFarmerMode ? 'bg-green-600 text-white animate-pulse' : 'bg-green-100 text-green-700'}`}>
                              Market Index: ${currentResult.price.toLocaleString()}
                            </span>
                          </div>
                          <h2 className="text-7xl font-black text-gray-900 tracking-tighter leading-none">{currentResult.breedName}</h2>
                        </div>
                        
                        {/* Breed Description Section with AI Voice */}
                        <div className="bg-gray-50 p-12 rounded-[4rem] border border-gray-100 relative group overflow-hidden">
                           <div className="flex justify-between items-start mb-8 relative z-10">
                              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">Species Bio Profile</h3>
                              <button onClick={handleListen} disabled={isPlayingAudio} className={`flex items-center space-x-3 px-10 py-4 rounded-3xl text-sm font-black transition-all ${isPlayingAudio ? 'bg-indigo-600 text-white animate-pulse' : 'bg-white text-indigo-600 shadow-2xl hover:scale-105'}`}>
                                 <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                                 <span>{isPlayingAudio ? "AI Narrating..." : "Listen to Bio"}</span>
                              </button>
                           </div>
                           <p className="text-2xl text-gray-700 leading-relaxed font-medium italic relative z-10">"{currentResult.description}"</p>
                           <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-100 rounded-full blur-[100px] opacity-40"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                           <div className="bg-white border-2 border-gray-100 p-12 rounded-[3.5rem] shadow-sm">
                              <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-4">Life Span</p>
                              <p className="text-5xl font-black text-gray-900">{currentResult.lifeExpectancy}</p>
                           </div>
                           <div className="bg-white border-2 border-gray-100 p-12 rounded-[3.5rem] shadow-sm">
                              <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-4">Neural Certainty</p>
                              <p className="text-5xl font-black text-indigo-600">{currentResult.confidence}%</p>
                           </div>
                        </div>

                        {/* Emotion Analysis Section */}
                        {currentResult.emotionAnalysis && (
                          <div className="bg-amber-50 p-12 rounded-[4rem] border border-amber-100 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.4em]">Emotion & Stress Analysis</h3>
                              <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase ${currentResult.emotionAnalysis.stressLevel === 'Low' ? 'bg-green-100 text-green-700' : currentResult.emotionAnalysis.stressLevel === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                Stress: {currentResult.emotionAnalysis.stressLevel}
                              </span>
                            </div>
                            <div className="space-y-4">
                              <p className="text-3xl font-black text-gray-900 tracking-tight">Detected: {currentResult.emotionAnalysis.emotion}</p>
                              <p className="text-lg text-gray-600 font-medium leading-relaxed">{currentResult.emotionAnalysis.explanation}</p>
                              <div className="p-6 bg-white/60 rounded-3xl border border-amber-200">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Recommendation</p>
                                <p className="text-gray-900 font-bold italic">"{currentResult.emotionAnalysis.recommendation}"</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Image Quality & Smart Suggestions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-white border-2 border-gray-100 p-10 rounded-[3rem] shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Image Quality</p>
                              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${currentResult.imageQuality.score > 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {currentResult.imageQuality.score}%
                              </span>
                            </div>
                            <p className="text-lg font-medium text-gray-700 leading-relaxed">{currentResult.imageQuality.feedback}</p>
                          </div>
                          <div className={`border-2 p-10 rounded-[3rem] shadow-sm transition-all ${isFarmerMode ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                            <p className={`text-[12px] font-black uppercase tracking-widest mb-4 ${isFarmerMode ? 'text-green-600' : 'text-gray-400'}`}>
                              {isFarmerMode ? 'Farmer Mode: Smart Suggestions' : 'Smart Suggestions'}
                            </p>
                            <p className="text-lg font-medium text-gray-700 leading-relaxed">{currentResult.smartSuggestions}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {currentResult && (
                    <div className="space-y-32 animate-fade-in pt-24 border-t border-gray-100">
                      
                      {/* Share Option */}
                      <div className="flex justify-end">
                        <button 
                          onClick={() => handleShare(currentResult)}
                          className="flex items-center space-x-3 px-10 py-4 bg-indigo-50 text-indigo-600 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-lg"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9.316a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg>
                          <span>Share Result</span>
                        </button>
                      </div>
                      
                      {/* MEDICAL DIAGNOSTIC HUB - ENHANCED */}
                      <section className="space-y-12">
                         <div className="flex flex-col md:flex-row items-end justify-between gap-8">
                            <div className="space-y-4">
                               <h3 className="text-6xl font-black text-gray-900 tracking-tighter">Medical Diagnostic Hub</h3>
                               <p className="text-2xl text-gray-500 font-medium">Real-time pathology scan and clinical care advice.</p>
                            </div>
                            {!healthAnalysis && (
                               <button onClick={handleHealthCheck} disabled={isAnalyzingHealth} className="px-16 py-8 bg-red-600 text-white font-black rounded-[2.5rem] hover:bg-red-700 shadow-3xl transition-all transform hover:-translate-y-2 text-xl">
                                  {isAnalyzingHealth ? "Scanning Bio-Tissue..." : "Perform Health Scan"}
                               </button>
                            )}
                         </div>

                         {healthAnalysis && (
                           <div className="space-y-12 animate-fade-in">
                              <div className={`p-12 rounded-[4.5rem] flex flex-col md:flex-row items-center gap-12 border-4 ${healthAnalysis.isHealthy ? 'bg-green-50 border-green-100 text-green-900' : 'bg-red-50 border-red-100 text-red-900'}`}>
                                 <div className={`p-10 rounded-[3rem] ${healthAnalysis.isHealthy ? 'bg-green-600 shadow-green-100' : 'bg-red-600 shadow-red-100'} text-white shadow-3xl`}>
                                    <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                 </div>
                                 <div className="flex-1 text-center md:text-left">
                                    <h4 className="text-5xl font-black uppercase tracking-tight leading-none mb-4">{healthAnalysis.isHealthy ? "Health Integrity Optimal" : "Diagnostics Alert"}</h4>
                                    <p className="text-2xl opacity-80 font-medium leading-relaxed">{healthAnalysis.summary}</p>
                                 </div>
                              </div>

                              {healthAnalysis.potentialIssues.length > 0 && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                   {healthAnalysis.potentialIssues.map((issue, idx) => (
                                      <div key={idx} className="bg-white p-14 rounded-[4.5rem] border-2 border-gray-50 shadow-3xl relative overflow-hidden group hover:border-red-500/20 transition-all duration-700">
                                         <div className={`absolute top-0 right-0 px-12 py-5 rounded-bl-[3rem] text-[12px] font-black uppercase tracking-[0.4em] ${issue.severity === 'High' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                                            {issue.severity} Priority
                                         </div>
                                         <h5 className="text-4xl font-black text-gray-900 mb-6 flex items-center">
                                            <span className="w-5 h-5 rounded-full bg-red-600 mr-5 animate-ping"></span>
                                            {issue.issue}
                                         </h5>
                                         <p className="text-2xl text-gray-500 mb-12 font-medium leading-relaxed">{issue.description}</p>
                                         <div className="p-12 bg-indigo-50/50 rounded-[3.5rem] border border-indigo-100 relative shadow-inner">
                                            <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-4">Professional Advice</p>
                                            <p className="text-gray-900 font-bold italic text-2xl leading-relaxed">"{issue.recommendedAction}"</p>
                                            <svg className="absolute bottom-8 right-10 h-16 w-16 text-indigo-100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                              )}
                           </div>
                         )}

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="bg-white border-2 border-gray-50 p-16 rounded-[4rem] shadow-3xl hover:shadow-indigo-50 transition-all">
                               <h4 className="text-3xl font-black text-gray-900 mb-10 flex items-center">
                                  <div className="p-4 bg-green-100 text-green-600 rounded-[2rem] mr-6 shadow-sm"><svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg></div>
                                  Nutrition Matrix
                               </h4>
                               <p className="text-2xl text-gray-600 leading-relaxed font-medium italic bg-gray-50/50 p-12 rounded-[3rem] border border-gray-100 whitespace-pre-line shadow-inner">{currentResult.dietRoutine}</p>
                            </div>
                            <div className="bg-white border-2 border-gray-50 p-16 rounded-[4rem] shadow-3xl hover:shadow-orange-50 transition-all">
                               <h4 className="text-3xl font-black text-gray-900 mb-10 flex items-center">
                                  <div className="p-4 bg-orange-100 text-orange-600 rounded-[2rem] mr-6 shadow-sm"><svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                                  Performance Plan
                               </h4>
                               <p className="text-2xl text-gray-600 leading-relaxed font-medium italic bg-gray-50/50 p-12 rounded-[3rem] border border-gray-100 whitespace-pre-line shadow-inner">{currentResult.exercisePlan}</p>
                            </div>
                         </div>
                      </section>

                      {/* Genetic Relatives */}
                      <section className="space-y-12">
                         <div className="flex items-center justify-between">
                            <h3 className="text-5xl font-black text-gray-900 tracking-tighter">Genetic Relatives</h3>
                            <button onClick={handleGetFacts} className="px-12 py-5 bg-indigo-50 text-indigo-600 font-black rounded-3xl hover:bg-indigo-100 transition-all text-sm uppercase tracking-widest shadow-lg">Grounded Insights</button>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
                            {currentResult.similarBreeds.map((breed) => (
                               <div key={breed} className="bg-white rounded-[4rem] border border-gray-100 shadow-3xl overflow-hidden group hover:-translate-y-8 transition-all duration-1000 hover:shadow-indigo-100/50">
                                  <div className="h-80 bg-gray-900 relative flex items-center justify-center overflow-hidden">
                                     {similarBreedImages[breed] ? (
                                        <img src={similarBreedImages[breed]} alt={breed} className="w-full h-full object-cover opacity-90 group-hover:scale-125 transition-transform duration-[3s]" />
                                     ) : (
                                        <div className="text-center p-10">
                                           <button 
                                             onClick={() => handleVisualizeBreed(breed)}
                                             disabled={loadingSimilarBreed === breed}
                                             className="px-12 py-6 bg-indigo-600 text-white text-xs font-black rounded-[2.5rem] hover:bg-indigo-700 transition-all shadow-3xl"
                                           >
                                              {loadingSimilarBreed === breed ? "Streaming Pixels..." : "AI Visual Render"}
                                           </button>
                                        </div>
                                     )}
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                                     <p className="absolute bottom-10 left-12 text-white font-black text-4xl tracking-tighter group-hover:translate-x-4 transition-transform">{breed}</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </section>

                      {/* Final Action Interface */}
                      <div className="flex flex-col xl:flex-row gap-12">
                        {!currentResult.isPurchased ? (
                           <button onClick={handlePurchase} className="flex-grow py-14 bg-indigo-600 text-white text-4xl font-black rounded-[4rem] hover:bg-indigo-700 shadow-3xl transition-all transform hover:-translate-y-3 flex items-center justify-center space-x-10 px-24">
                              <svg className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                              <span>Acquire to Ecosystem • ${currentResult.price.toLocaleString()}</span>
                           </button>
                        ) : (
                           <div className="flex-grow py-14 bg-indigo-50 border-[8px] border-white text-indigo-700 font-black rounded-[4rem] shadow-3xl flex items-center justify-center space-x-10">
                              <svg className="h-14 w-14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                              <span className="text-5xl tracking-tighter uppercase">Ownership Verified</span>
                           </div>
                        )}
                        <button onClick={resetAll} className="px-24 py-14 border-4 border-gray-100 text-gray-400 font-black text-sm uppercase tracking-[0.5em] rounded-[4rem] hover:bg-gray-50 transition-all">Reset Sync</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : activeTab === 'history' ? (
        <div className="space-y-12 animate-fade-in">
          <div className="text-center space-y-4">
            <h2 className="text-6xl font-black text-gray-900 tracking-tighter">Scan History</h2>
            <p className="text-xl text-gray-500 font-medium">Your personal archive of biological discoveries.</p>
          </div>
          {history.length === 0 ? (
            <div className="bg-white rounded-[4rem] p-32 text-center border-4 border-dashed border-gray-100 shadow-3xl">
              <p className="text-2xl font-black text-gray-300 uppercase tracking-widest">No history found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {history.map((item) => (
                <div key={item.id} className="bg-white rounded-[4rem] overflow-hidden shadow-3xl border border-gray-100 group hover:-translate-y-4 transition-all duration-700">
                  <div className="h-64 relative bg-gray-900 overflow-hidden">
                    <img src={item.imageUrl} alt={item.breedName} className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-3xl px-6 py-2 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest">{item.animalType}</div>
                  </div>
                  <div className="p-10 space-y-6">
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{item.breedName}</h3>
                    <p className="text-gray-500 font-medium text-sm line-clamp-2">{item.description}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                      <button 
                        onClick={() => {
                          setSelectedImage(item.imageUrl);
                          setCurrentResult(item);
                          setActiveTab('id');
                        }}
                        className="text-xs font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'chat' ? (
        <div className="animate-fade-in max-w-4xl mx-auto">
          <Chatbot language={language} />
        </div>
      ) : activeTab === 'tools' ? (
        <div className="space-y-16 animate-fade-in">
          <div className="text-center space-y-4">
            <h2 className="text-6xl font-black text-gray-900 tracking-tighter">Advanced Bio-Tools</h2>
            <p className="text-xl text-gray-500 font-medium">Precision instruments for modern animal management.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Reminders userId={user.id} />
            <ProfitCalculator />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <GovernmentSchemes animalType={currentResult?.animalType || 'Livestock'} language={language} />
            <VetLocator />
          </div>
          {/* Offline Mode Indicator */}
          <div className="bg-indigo-900 p-12 rounded-[4rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-3xl">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse" />
                <h3 className="text-3xl font-black tracking-tight uppercase">Offline Sync Active</h3>
              </div>
              <p className="text-indigo-200 font-medium max-w-xl">All biological data is cached locally using IndexedDB. You can access your history and tools even without an active neural link.</p>
            </div>
            <div className="px-10 py-4 bg-white/10 backdrop-blur-3xl rounded-3xl border border-white/20 font-black text-xs uppercase tracking-widest">
              Local Storage: 100% Operational
            </div>
          </div>
        </div>
      ) : activeTab === 'community' ? (
        <Community user={user} />
      ) : (
        /* MARKETPLACE Tab - Premium Module */
        <div className="space-y-24 animate-fade-in">
           <div className="text-center space-y-8">
              <h2 className="text-8xl font-black text-gray-900 tracking-tighter">Species Marketplace</h2>
              <p className="text-3xl text-gray-500 font-medium max-w-4xl mx-auto leading-relaxed">Global asset management for your identified species. Liquidate, exchange, or monitor bio-metrics in real-time.</p>
           </div>

           {shoppingCart.length === 0 ? (
              <div className="bg-white rounded-[6rem] p-64 text-center border-[8px] border-dashed border-gray-50 shadow-3xl flex flex-col items-center group relative overflow-hidden">
                 <div className="h-48 w-48 bg-indigo-50 rounded-[4rem] flex items-center justify-center text-indigo-200 mb-16 transition-transform group-hover:scale-125 duration-1000 relative z-10 shadow-2xl"><svg className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></div>
                 <p className="font-black text-gray-400 uppercase tracking-[0.8em] text-sm relative z-10">Marketplace Portfolio Void</p>
                 <button onClick={() => setActiveTab('id')} className="mt-20 px-24 py-10 bg-indigo-600 text-white font-black rounded-[3rem] shadow-3xl hover:bg-indigo-700 transition-all text-2xl relative z-10 group flex items-center space-x-6">
                    <span>Perform First Acquisition</span>
                    <svg className="h-8 w-8 group-hover:translate-x-3 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                 </button>
              </div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
                 {shoppingCart.map((item) => (
                    <div key={item.id} className="bg-white rounded-[5rem] overflow-hidden shadow-3xl border border-gray-100 flex flex-col group hover:-translate-y-8 transition-all duration-1000 hover:shadow-indigo-100/60">
                       <div className="h-96 relative bg-gray-900 overflow-hidden">
                          <img src={item.imageUrl} alt={item.breedName} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[3s] opacity-90" />
                          <div className="absolute top-12 left-12 bg-white/95 backdrop-blur-3xl shadow-3xl px-10 py-4 rounded-full text-[14px] font-black text-indigo-600 uppercase tracking-widest border border-white/50">Secured Asset</div>
                          <div className="absolute bottom-12 right-12 bg-green-600 text-white px-12 py-5 rounded-[2.5rem] text-2xl font-black shadow-3xl ring-[20px] ring-white/10 tracking-tight">${item.price.toLocaleString()}</div>
                       </div>
                       <div className="p-16 flex-grow">
                          <h3 className="font-black text-gray-900 text-5xl mb-6 tracking-tighter">{item.breedName}</h3>
                          <p className="text-[14px] text-gray-400 font-black uppercase mb-12 tracking-[0.4em]">{item.animalType} • Bio-Span {item.lifeExpectancy}</p>
                          
                          <div className="grid grid-cols-2 gap-10 mb-14">
                             <div className="p-8 bg-gray-50 rounded-[3rem] border border-gray-100 text-center shadow-inner">
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Health Status</p>
                                <p className="text-xl font-black text-indigo-600">Sync Active</p>
                             </div>
                             <div className="p-8 bg-gray-50 rounded-[3rem] border border-gray-100 text-center shadow-inner">
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Asset Key</p>
                                <p className="text-xl font-black text-gray-900">#{item.id.toUpperCase().slice(0, 6)}</p>
                             </div>
                          </div>

                          <div className="flex flex-wrap gap-4">
                             {item.uses.map(u => <span key={u} className="px-6 py-2.5 bg-indigo-50 text-indigo-600 text-[12px] font-black rounded-2xl uppercase tracking-tighter">{u}</span>)}
                          </div>
                       </div>
                       <div className="p-12 bg-gray-50/50 border-t border-gray-100 grid grid-cols-2 gap-10">
                          <button onClick={() => handleExchange(item.breedName)} className="py-8 bg-white text-gray-800 text-[12px] font-black rounded-[2.5rem] border border-gray-200 hover:bg-gray-100 transition-all uppercase tracking-widest shadow-xl">Swap Sync</button>
                          <button onClick={() => handleReturn(item.id)} className="py-8 bg-white text-red-600 text-[12px] font-black rounded-[2.5rem] border border-red-100 hover:bg-red-50 transition-all uppercase tracking-widest shadow-xl">Liquidate</button>
                       </div>
                    </div>
                 ))}
              </div>
           )}

           <div className="bg-gradient-to-br from-indigo-950 to-black text-white p-32 rounded-[6rem] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.6)] relative overflow-hidden group">
              <div className="relative z-10 flex flex-col 2xl:flex-row items-center justify-between gap-24">
                 <div className="max-w-5xl text-center 2xl:text-left space-y-12">
                    <h3 className="text-7xl font-black leading-none tracking-tighter">Professional Bio-Ecosystem Governance</h3>
                    <p className="text-indigo-200 leading-relaxed font-medium text-3xl">Every species asset acquired through our neural network includes biological heritage signatures, real-time market value indexing, and prioritized genetic swap protocols. Your management is absolute.</p>
                 </div>
                 <div className="flex flex-wrap justify-center gap-16">
                    <div className="p-16 bg-white/5 backdrop-blur-3xl rounded-[5rem] text-center border border-white/10 w-72 transition-transform hover:scale-110 duration-700">
                       <p className="text-7xl font-black mb-4 tracking-tighter">0%</p>
                       <p className="text-[13px] font-black uppercase tracking-[0.4em] opacity-60">Buyback Fee</p>
                    </div>
                    <div className="p-16 bg-indigo-600/30 backdrop-blur-3xl rounded-[5rem] text-center border border-white/10 w-72 transition-transform hover:scale-110 duration-700">
                       <p className="text-7xl font-black mb-4 tracking-tighter">24h</p>
                       <p className="text-[13px] font-black uppercase tracking-[0.4em] opacity-60">Swap Window</p>
                    </div>
                 </div>
              </div>
              <div className="absolute top-0 right-0 -mr-96 -mt-96 h-[1000px] w-[1000px] bg-indigo-500/10 rounded-full blur-[200px]"></div>
              <div className="absolute bottom-0 left-0 -ml-96 -mb-96 h-[1000px] w-[1000px] bg-indigo-800/30 rounded-full blur-[200px]"></div>
           </div>
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(80px); } to { opacity: 1; transform: translateY(0); } }
        .shadow-3xl { box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.12), 0 30px 60px -30px rgba(0, 0, 0, 0.15); }
      `}</style>
    </div>
  );
};

export default Dashboard;
