import React, { useRef, useEffect, useState } from 'react';
import { identifyBreed } from '../services/geminiService';
import { BreedResult } from '../types';

interface LiveCameraProps {
  onResult: (result: BreedResult) => void;
  language: string;
}

const LiveCamera: React.FC<LiveCameraProps> = ({ onResult, language }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualityFeedback, setQualityFeedback] = useState<string>('Adjusting camera...');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied. Please enable permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndAnalyze = async () => {
    if (isAnalyzing || !videoRef.current || !canvasRef.current) return;

    setIsAnalyzing(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.7);

    try {
      const result = await identifyBreed(base64Image, language);
      if (result.isAnimal && result.confidence > 60) {
        onResult({
          ...result,
          id: Math.random().toString(36).substr(2, 9),
          userId: 'live-session',
          imageUrl: base64Image,
          timestamp: new Date().toISOString()
        });
      }
      setQualityFeedback(result.imageQuality.feedback);
    } catch (err) {
      console.error("Live analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnalyzing) {
        captureAndAnalyze();
      }
    }, 3000); // Analyze every 3 seconds
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  return (
    <div className="relative w-full h-[500px] bg-black rounded-[3rem] overflow-hidden shadow-3xl border-4 border-white/10">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Overlay */}
      <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20 flex items-center justify-center">
        <div className="w-64 h-64 border-2 border-white/50 rounded-[3rem] animate-pulse flex items-center justify-center">
          <div className="w-4 h-4 bg-red-500 rounded-full animate-ping" />
        </div>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center text-center">
        <div className="flex items-center space-x-3 mb-2">
          <div className={`h-3 w-3 rounded-full ${isAnalyzing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-white font-black uppercase tracking-widest text-xs">
            {isAnalyzing ? 'Neural Processing...' : 'Live Feed Active'}
          </span>
        </div>
        <p className="text-white/70 text-sm font-medium">{qualityFeedback}</p>
      </div>

      {error && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-12 text-center">
          <p className="text-white font-bold">{error}</p>
        </div>
      )}
    </div>
  );
};

export default LiveCamera;
