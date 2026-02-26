/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  BookOpen, 
  GraduationCap, 
  Settings2, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  ChevronRight,
  School,
  Trophy,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Key,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Question {
  id: number;
  text: string;
  options: {
    key: string; // A, B, C, D
    text: string;
  }[];
  correctAnswer: string; // A, B, C, or D
  explanation: string;
}

interface QuestionParams {
  subject: string;
  grade: string;
  count: number;
  difficulty: string;
  topic: string;
  cognitiveLevel: string;
  subTopic: string;
}

const SUBJECTS = [
  "Matematika",
  "IPA",
  "IPS",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Pendidikan Pancasila",
  "Informatika"
];

const COGNITIVE_LEVELS = [
  "Semua Level",
  "Pengetahuan & Pemahaman (L1)",
  "Aplikasi (L2)",
  "Penalaran (L3)"
];

const MATH_SUB_TOPICS = [
  "Umum",
  "Bilangan: Bilangan Real (Operasi, Rasio, Skala)",
  "Bilangan: Bilangan Berpangkat & Akar",
  "Aljabar: Persamaan & Pertidaksamaan Linear",
  "Aljabar: Sistem Persamaan Linear Dua Variabel (SPLDV)",
  "Aljabar: Fungsi & Relasi",
  "Aljabar: Barisan & Deret",
  "Geometri: Hubungan Antar Sudut",
  "Geometri: Teorema Pythagoras",
  "Geometri: Kekongruenan & Kesebangunan",
  "Geometri: Bangun Ruang (Jaring-jaring & Volume)",
  "Geometri: Transformasi (Refleksi, Rotasi, dll)",
  "Pengukuran: Keliling & Luas Bangun Datar",
  "Data: Statistika (Mean, Median, Modus, Diagram)",
  "Peluang: Kejadian Tunggal"
];

const GRADES = ["7", "8", "9"];
const DIFFICULTIES = ["Mudah", "Sedang", "Sulit"];

export default function App() {
  const [params, setParams] = useState<QuestionParams>({
    subject: "Matematika",
    grade: "7",
    count: 5,
    difficulty: "Sedang",
    topic: "",
    cognitiveLevel: "Semua Level",
    subTopic: "Umum"
  });

  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('gensoal_api_key') || '';
  });
  const [showApiMenu, setShowApiMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('gensoal_api_key', key);
    setShowApiMenu(false);
  };

  const generateQuestions = async () => {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setIsSubmitted(false);
    setUserAnswers({});
    setCheckedQuestions({});
    setCurrentQuestionIndex(0);

    try {
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key tidak ditemukan. Silakan masukkan API Key di menu Pengaturan (ikon kunci di pojok kanan atas).");

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview"; 

      const prompt = `
        Anda adalah Master TKA SMP untuk UPT SMPN 4 Mappedeceng.
        Buatkan soal simulasi TKA dalam format JSON.
        
        Mata Pelajaran: ${params.subject}
        Kelas: ${params.grade}
        Sub-Materi: ${params.subject === 'Matematika' ? params.subTopic : (params.topic || 'Umum')}
        Level Kognitif: ${params.cognitiveLevel}
        Jumlah Soal: ${params.count}
        Tingkat Kesulitan: ${params.difficulty}
        
        Panduan Penting:
        - Gunakan konteks lokal Mappedeceng/Luwu Utara jika memungkinkan.
        - Pastikan soal menantang nalar (HOTS).
        - WAJIB memberikan penjelasan logika yang sangat mendetail, langkah demi langkah, agar siswa paham mengapa jawaban tersebut benar.
        - Output HARUS berupa valid JSON array of objects.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                text: { type: Type.STRING, description: "Teks pertanyaan dalam Markdown" },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING, description: "A, B, C, atau D" },
                      text: { type: Type.STRING }
                    },
                    required: ["key", "text"]
                  }
                },
                correctAnswer: { type: Type.STRING, description: "A, B, C, atau D" },
                explanation: { type: Type.STRING, description: "Penjelasan logika jawaban yang sangat detail" }
              },
              required: ["id", "text", "options", "correctAnswer", "explanation"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Model tidak mengembalikan teks. Pastikan API Key Anda aktif dan memiliki kuota.");
      }

      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Data soal kosong atau format tidak valid.");
        }
        setQuestions(data);
      } catch (parseErr) {
        console.error("JSON Parse Error:", parseErr, "Raw Text:", text);
        throw new Error("Gagal membaca format data soal. Silakan coba lagi.");
      }
    } catch (err: any) {
      console.error("Generation Error:", err);
      let errorMessage = "Gagal memuat simulasi.";
      if (err.message?.includes("API_KEY_INVALID")) {
        errorMessage = "API Key tidak valid. Silakan periksa kembali di menu Pengaturan.";
      } else if (err.message?.includes("quota")) {
        errorMessage = "Kuota API Key Anda telah habis.";
      } else {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionKey: string) => {
    if (isSubmitted || checkedQuestions[questions[currentQuestionIndex].id]) return;
    setUserAnswers({
      ...userAnswers,
      [questions[currentQuestionIndex].id]: optionKey
    });
  };

  const checkCurrentAnswer = () => {
    const currentId = questions[currentQuestionIndex].id;
    if (!userAnswers[currentId]) return;
    setCheckedQuestions({
      ...checkedQuestions,
      [currentId]: true
    });
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const resetQuiz = () => {
    setQuestions([]);
    setIsSubmitted(false);
    setUserAnswers({});
    setCheckedQuestions({});
    setCurrentQuestionIndex(0);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <School className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Simulator TKA</h1>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">UPT SMPN 4 Mappedeceng</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowApiMenu(!showApiMenu)}
              className={cn(
                "p-2 rounded-lg transition-all",
                customApiKey ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
              title="Pengaturan API Key"
            >
              <Key className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-600">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mode Siswa</span>
              <span className="flex items-center gap-1.5 font-bold text-indigo-600">Gemini 3 Flash</span>
            </div>
          </div>
        </div>
      </header>

      {/* API Key Modal */}
      <AnimatePresence>
        {showApiMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800">Pengaturan API Key</h3>
                </div>
                <button onClick={() => setShowApiMenu(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Google Gemini API Key</label>
                  <input 
                    type="password"
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-mono"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    API Key Anda disimpan secara lokal di browser ini. Kami tidak pernah mengirimkan kunci Anda ke server kami.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      localStorage.removeItem('gensoal_api_key');
                      setCustomApiKey('');
                      setShowApiMenu(false);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all text-sm"
                  >
                    Hapus Kunci
                  </button>
                  <button 
                    onClick={() => saveApiKey(customApiKey)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all text-sm"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Configuration Panel - Only visible when not in quiz */}
          {questions.length === 0 && !loading && (
            <aside className="lg:col-span-4 lg:col-start-5 space-y-6">
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-200 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-800">Mulai Simulasi Baru</h2>
                </div>
                
                <div className="p-8 space-y-6">
                  {/* Subject */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" /> Mata Pelajaran
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                      value={params.subject}
                      onChange={(e) => setParams({...params, subject: e.target.value})}
                    >
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Grade & Difficulty */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5" /> Kelas
                      </label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                        value={params.grade}
                        onChange={(e) => setParams({...params, grade: e.target.value})}
                      >
                        {GRADES.map(g => <option key={g} value={g}>Kelas {g}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" /> Kesulitan
                      </label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                        value={params.difficulty}
                        onChange={(e) => setParams({...params, difficulty: e.target.value})}
                      >
                        {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Cognitive Level */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" /> Level Kognitif
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                      value={params.cognitiveLevel}
                      onChange={(e) => setParams({...params, cognitiveLevel: e.target.value})}
                    >
                      {COGNITIVE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  {/* Sub Topic for Math or Generic Topic */}
                  {params.subject === 'Matematika' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <ChevronRight className="w-3.5 h-3.5" /> Sub-Materi
                      </label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                        value={params.subTopic}
                        onChange={(e) => setParams({...params, subTopic: e.target.value})}
                      >
                        {MATH_SUB_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Topik Spesifik</label>
                      <input 
                        type="text"
                        placeholder="Contoh: Aljabar, Fotosintesis..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                        value={params.topic}
                        onChange={(e) => setParams({...params, topic: e.target.value})}
                      />
                    </div>
                  )}

                  {/* Count */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Jumlah Soal</label>
                      <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{params.count}</span>
                    </div>
                    <input 
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      value={params.count}
                      onChange={(e) => setParams({...params, count: parseInt(e.target.value)})}
                    />
                  </div>

                  <button
                    onClick={generateQuestions}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        Mulai Simulasi
                      </>
                    )}
                  </button>
                </div>
              </motion.section>
            </aside>
          )}

          {/* Quiz Area */}
          {(loading || questions.length > 0) && (
            <section className="lg:col-span-8 lg:col-start-3">
              <AnimatePresence mode="wait">
                {loading && (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm"
                  >
                    <div className="relative mb-8">
                      <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                      <School className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Menyiapkan Ruang Ujian...</h3>
                    <p className="text-slate-500 max-w-sm">
                      Master TKA sedang menyusun soal-soal HOTS terbaik untuk Anda. Mohon tunggu sebentar.
                    </p>
                  </motion.div>
                )}

                {questions.length > 0 && !isSubmitted && (
                  <motion.div 
                    key="quiz"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    {/* Progress Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-indigo-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-500">
                        Soal {currentQuestionIndex + 1} dari {questions.length}
                      </span>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-8 md:p-12">
                        <div className="prose prose-slate prose-indigo max-w-none mb-10 text-lg font-medium leading-relaxed">
                          <ReactMarkdown>{questions[currentQuestionIndex].text}</ReactMarkdown>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {questions[currentQuestionIndex].options.map((option) => {
                            const isSelected = userAnswers[questions[currentQuestionIndex].id] === option.key;
                            const isChecked = checkedQuestions[questions[currentQuestionIndex].id];
                            const isCorrect = option.key === questions[currentQuestionIndex].correctAnswer;
                            
                            return (
                              <button
                                key={option.key}
                                onClick={() => handleAnswerSelect(option.key)}
                                disabled={isChecked}
                                className={cn(
                                  "flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all group",
                                  isChecked 
                                    ? isCorrect 
                                      ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" 
                                      : isSelected 
                                        ? "bg-red-50 border-red-500 ring-1 ring-red-500"
                                        : "bg-slate-50 border-slate-100 opacity-60"
                                    : isSelected
                                      ? "bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600"
                                      : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                                )}
                              >
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors",
                                  isChecked
                                    ? isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : isSelected
                                        ? "bg-red-600 text-white"
                                        : "bg-slate-200 text-slate-400"
                                    : isSelected
                                      ? "bg-indigo-600 text-white"
                                      : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                                )}>
                                  {option.key}
                                </div>
                                <span className={cn(
                                  "font-medium",
                                  isChecked
                                    ? isCorrect
                                      ? "text-emerald-900"
                                      : isSelected
                                        ? "text-red-900"
                                        : "text-slate-400"
                                    : isSelected ? "text-indigo-900" : "text-slate-700"
                                )}>
                                  {option.text}
                                </span>
                                {isChecked && isCorrect && <CheckCircle2 className="w-5 h-5 ml-auto text-emerald-600" />}
                                {isChecked && isSelected && !isCorrect && <XCircle className="w-5 h-5 ml-auto text-red-600" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Immediate Explanation */}
                        <AnimatePresence>
                          {checkedQuestions[questions[currentQuestionIndex].id] && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-8 p-6 bg-indigo-50 rounded-2xl border border-indigo-100"
                            >
                              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" /> Pembahasan
                              </h4>
                              <p className="text-sm text-indigo-900 leading-relaxed">
                                {questions[currentQuestionIndex].explanation}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex gap-2">
                          <button
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-white disabled:opacity-30 transition-all"
                          >
                            <ArrowLeft className="w-4 h-4" /> Sebelumnya
                          </button>
                        </div>

                        <div className="flex gap-3">
                          {!checkedQuestions[questions[currentQuestionIndex].id] && userAnswers[questions[currentQuestionIndex].id] && (
                            <button
                              onClick={checkCurrentAnswer}
                              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-100 transition-all flex items-center gap-2"
                            >
                              Periksa Jawaban <AlertCircle className="w-4 h-4" />
                            </button>
                          )}

                          {currentQuestionIndex === questions.length - 1 ? (
                            <button
                              onClick={() => setIsSubmitted(true)}
                              disabled={Object.keys(userAnswers).length < questions.length}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                            >
                              Selesaikan Ujian <CheckCircle2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                            >
                              Selanjutnya <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isSubmitted && (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    {/* Score Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-12 relative">
                      <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                      <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-6" />
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">Simulasi Selesai!</h2>
                      <p className="text-slate-500 mb-8">Hasil pengerjaan Anda untuk {params.subject} Kelas {params.grade}</p>
                      
                      <div className="inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border-8 border-indigo-50 bg-indigo-50/30 mb-8">
                        <span className="text-5xl font-black text-indigo-600">{calculateScore()}</span>
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Skor Akhir</span>
                      </div>

                      <div className="flex justify-center gap-4">
                        <button 
                          onClick={resetQuiz}
                          className="flex items-center gap-2 px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all"
                        >
                          <RotateCcw className="w-4 h-4" /> Ulangi Simulasi
                        </button>
                        <button 
                          onClick={() => window.print()}
                          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all"
                        >
                          Cetak Hasil
                        </button>
                      </div>
                    </div>

                    {/* Review Section */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Pembahasan Soal
                      </h3>
                      
                      {questions.map((q, idx) => {
                        const isCorrect = userAnswers[q.id] === q.correctAnswer;
                        return (
                          <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 md:p-8">
                              <div className="flex items-start gap-4 mb-6">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
                                  isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                )}>
                                  {idx + 1}
                                </div>
                                <div className="prose prose-slate max-w-none text-slate-800">
                                  <ReactMarkdown>{q.text}</ReactMarkdown>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 ml-12">
                                {q.options.map(opt => (
                                  <div 
                                    key={opt.key}
                                    className={cn(
                                      "p-3 rounded-xl border text-sm flex items-center gap-3",
                                      opt.key === q.correctAnswer 
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-bold"
                                        : opt.key === userAnswers[q.id]
                                          ? "bg-red-50 border-red-200 text-red-900"
                                          : "bg-slate-50 border-slate-100 text-slate-500"
                                    )}
                                  >
                                    <span className="w-6 h-6 rounded bg-white border border-inherit flex items-center justify-center text-xs">{opt.key}</span>
                                    {opt.text}
                                    {opt.key === q.correctAnswer && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                                    {opt.key === userAnswers[q.id] && !isCorrect && <XCircle className="w-4 h-4 ml-auto" />}
                                  </div>
                                ))}
                              </div>

                              <div className="ml-12 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5" /> Penjelasan Logika
                                </h4>
                                <p className="text-sm text-indigo-900 leading-relaxed">{q.explanation}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-500 tracking-tight">UPT SMPN 4 Mappedeceng</span>
          </div>
          <p className="text-xs text-slate-400">© 2024 Sistem Simulator TKA AI</p>
        </div>
      </footer>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          header, aside, footer, .no-print, button { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          .lg\\:col-span-8 { width: 100% !important; grid-column: span 12 / span 12 !important; }
          .bg-white { border: none !important; box-shadow: none !important; }
          .prose { max-width: none !important; font-size: 12pt !important; }
          .max-h-\\[800px\\] { max-height: none !important; overflow: visible !important; }
        }
      `}} />
    </div>
  );
}
