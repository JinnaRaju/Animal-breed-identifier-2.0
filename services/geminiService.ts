
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PredictionResponse, HealthAnalysisResponse, EmotionResult, GovernmentScheme } from "../types";

// Default models - update these if newer versions are available. Use `ListModels` if you run into
// errors about a model being unsupported. The previous "gemini-3-flash-preview" name was not
// available in the v1beta API and caused the client library to fall back to a nonexistent
// "gemini-1.5-flash" model, hence the 404. Choosing a known-good model removes the error.
const TEXT_MODEL = "models/gemini-2.5-flash";
const IMAGE_MODEL = "models/gemini-2.5-flash";
const TTS_MODEL = "models/gemini-2.5-flash-preview-tts";

const getAI = () => {
  const apiKey = import.meta.env.VITE_API_KEY as string;
  if (!apiKey) {
    console.error("VITE_API_KEY not found in environment. Gemini operations will fail.");
  }
  return new GoogleGenAI({ apiKey: apiKey as string });
};

export const identifyBreed = async (base64Image: string, language: string = 'English'): Promise<PredictionResponse> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: `Identify the animal in this image. First, determine if the image contains an animal or pet. If it is NOT an animal (e.g., a person, an object, a landscape with no animals), set isAnimal to false and provide generic or empty values for other fields. If it IS an animal, set isAnimal to true and provide: animal type, breed name, confidence (0-100), short descriptive paragraph (3-4 sentences), 3 similar breeds, estimated market price in USD, primary uses (e.g. companionship, guard, farm), life expectancy (e.g. 10-15 years), a structured daily diet routine, an exercise plan, and smart suggestions (e.g., is this breed good for farming, urban living, or specific climates). Also, evaluate the image quality (score 0-100 and feedback). ALL text responses MUST be in ${language}. Use current global market estimates for pricing.`,
        },
      ],
    },
    config: {
      systemInstruction: "You are a specialized animal breed identification AI. Your ONLY purpose is to identify animals (pets, livestock, wildlife). If an image does NOT contain an animal (e.g., it is a human, a plant, a flower, a building, or an object), you MUST set 'isAnimal' to false. Do NOT attempt to find animal traits in non-animal subjects.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isAnimal: { type: Type.BOOLEAN },
          animalType: { type: Type.STRING },
          breedName: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          description: { type: Type.STRING },
          similarBreeds: { type: Type.ARRAY, items: { type: Type.STRING } },
          price: { type: Type.NUMBER },
          uses: { type: Type.ARRAY, items: { type: Type.STRING } },
          lifeExpectancy: { type: Type.STRING },
          dietRoutine: { type: Type.STRING },
          exercisePlan: { type: Type.STRING },
          smartSuggestions: { type: Type.STRING },
          imageQuality: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING }
            },
            required: ["score", "feedback"]
          }
        },
        required: ["isAnimal", "animalType", "breedName", "confidence", "description", "similarBreeds", "price", "uses", "lifeExpectancy", "dietRoutine", "exercisePlan", "smartSuggestions", "imageQuality"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("AI Neural Network returned an empty response.");
  return JSON.parse(text);
};

export const chatWithAI = async (message: string, history: {role: 'user' | 'model', text: string}[], language: string = 'English'): Promise<string> => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction: `You are an expert animal assistant. Answer questions about animal breeds, care, health, and farming. Keep responses concise and helpful. Respond in ${language}.`,
    },
    history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
  });

  const response = await chat.sendMessage({ message });
  return response.text || "I'm sorry, I couldn't process that.";
};

export const detectAnimalDiseases = async (base64Image: string, animalType: string): Promise<HealthAnalysisResponse> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: `Perform a deep clinical visual diagnostic for this ${animalType}. Analyze tissue quality, visible pathologies, dental alignment, and anatomical symmetry. If you find any issues, provide the name of the disease/condition, a description of the symptoms/signs visible, its severity (Low, Medium, High), and a professional clinical recommendation. If the animal looks healthy, provide a summary of its physical condition.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          potentialIssues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                issue: { type: Type.STRING },
                severity: { type: Type.STRING, description: "Must be Low, Medium, or High" },
                description: { type: Type.STRING },
                recommendedAction: { type: Type.STRING }
              },
              required: ["issue", "severity", "description", "recommendedAction"]
            }
          },
          summary: { type: Type.STRING },
          isHealthy: { type: Type.BOOLEAN }
        },
        required: ["potentialIssues", "summary", "isHealthy"]
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Health diagnostic engine failed.");
  return JSON.parse(text);
};

export const detectEmotion = async (base64Image: string): Promise<EmotionResult> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: "Analyze the animal's body language, facial expression, and posture to detect its current emotion and stress level. Provide an explanation for your findings and a recommendation for the owner.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          emotion: { type: Type.STRING },
          stressLevel: { type: Type.STRING, description: "Low, Moderate, or High" },
          explanation: { type: Type.STRING },
          recommendation: { type: Type.STRING }
        },
        required: ["emotion", "stressLevel", "explanation", "recommendation"]
      },
    },
  });
  return JSON.parse(response.text || "{}");
};

export const getGovernmentSchemes = async (animalType: string, language: string = 'English'): Promise<GovernmentScheme[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `List 3 current government schemes or subsidies available for ${animalType} farmers in India. Provide titles, descriptions, and eligibility criteria in ${language}.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            link: { type: Type.STRING },
            eligibility: { type: Type.STRING }
          },
          required: ["id", "title", "description", "link", "eligibility"]
        }
      }
    },
  });
  return JSON.parse(response.text || "[]");
};

export const getProfitEstimation = async (animalType: string, count: number, durationMonths: number): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `Estimate the potential profit for a farmer raising ${count} ${animalType}(s) over ${durationMonths} months. Include estimated costs (feed, medical, labor) and revenue (sales, products like milk/eggs). Provide a summary in Markdown.`,
  });
  return response.text || "Estimation unavailable.";
};

export const generateBreedAudio = async (text: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text: `Narrate the following animal care profile clearly and professionally: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed.");
  return base64Audio;
};

export const getBreedFacts = async (breed: string): Promise<{text: string, sources: any[]}> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `Tell me 3 unique, fascinating facts about the ${breed} animal breed. Focus on historical significance and biological traits.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return {
    text: response.text || "No insights found.",
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const generateSimilarBreedImage = async (breed: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [
        {
          text: `A professional, high-resolution portrait of a ${breed} animal in a natural lighting environment.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Image generation failed.");
};

// --- Custom Decoding Utilities ---

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};
