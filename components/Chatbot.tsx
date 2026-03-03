
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { chatWithAI } from '../services/geminiService';

interface ChatbotProps {
  language: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Hello! I am your AI Animal Assistant. How can I help you today? (Language: ${language})` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(input, messages, language);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-[3rem] shadow-3xl border border-gray-100 overflow-hidden">
      <div className="bg-indigo-600 p-8 text-white">
        <h3 className="text-2xl font-black tracking-tighter uppercase">AI Animal Assistant</h3>
        <p className="text-indigo-100 text-sm font-medium">Ask me anything about breeds, care, or farming.</p>
      </div>

      <div ref={scrollRef} className="flex-grow p-8 overflow-y-auto space-y-6 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-6 rounded-[2rem] text-lg font-medium shadow-sm ${
              msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-6 rounded-[2rem] rounded-tl-none border border-gray-100 shadow-sm flex items-center space-x-3">
              <div className="animate-bounce h-2 w-2 bg-indigo-400 rounded-full"></div>
              <div className="animate-bounce h-2 w-2 bg-indigo-400 rounded-full delay-75"></div>
              <div className="animate-bounce h-2 w-2 bg-indigo-400 rounded-full delay-150"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-white border-t border-gray-100 flex items-center space-x-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your question..."
          className="flex-grow p-6 bg-gray-50 rounded-[2rem] border-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="p-6 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-xl disabled:opacity-50"
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
