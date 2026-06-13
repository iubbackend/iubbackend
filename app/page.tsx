"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, LogOut, BookOpen, Layers, Award, ShieldCheck, 
  Lock, Unlock, CreditCard, CheckCircle2, X, ChevronDown, Sparkles 
} from "lucide-react";
import { useRouter } from "next/navigation";

// Types for our data structure
type SearchMode = "Roll Number" | "Name" | "Semester" | "Section";

export default function DashboardPage() {
  const router = useRouter();
  
  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("Roll Number");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  
  // Premium / Paywall States
  const [isPremium, setIsPremium] = useState(false); // Mock database premium flag
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Mock search execution
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    // Simulated API call fetching from TiDB
    setTimeout(() => {
      setResults([
        { code: "CS-101", name: "Programming Fundamentals", mid: 22, sessional: 18, final: 45, total: 85, grade: "A", gp: 4.0 },
        { code: "CS-102", name: "Digital Logic Design", mid: 18, sessional: 15, final: 38, total: 71, grade: "B", gp: 3.0 },
        { code: "ISL-101", name: "Islamic Studies", mid: 25, sessional: 20, final: 40, total: 85, grade: "A", gp: 4.0 },
        { code: "MATH-101", name: "Calculus & Geometry", mid: 12, sessional: 10, final: 28, total: 50, grade: "C", gp: 2.0 },
      ]);
      setIsSearching(false);
    }, 1200);
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-12 relative">
      {/* GLOBAL HEADER */}
      <header className="flex justify-between items-center mb-12 border-b border-slate-900 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/10">
            IUB
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Result Hub
              {isPremium && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] uppercase tracking-wider font-bold">PRO</span>}
            </h1>
            <p className="text-xs text-slate-400">Advanced Academic Tracking Matrix</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isPremium && (
            <button onClick={() => setShowUpgradeModal(true)} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 font-medium text-sm transition-all duration-200">
              <Unlock size={16} /> Unlock Full Access
            </button>
          )}
          <button onClick={() => router.push("/login")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/5 text-slate-400 hover:text-red-400 font-medium text-sm transition-all duration-200">
            <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Database Query Interface
          </h2>
          <p className="text-slate-400 text-sm md:text-base mt-2 max-w-xl">
            Search across the active TiDB cluster. Verify grading profiles, mid-term standings, and final transcript records instantly.
          </p>
        </div>
      </div>

      {/* SEARCH CONTROLLER */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 p-6 rounded-3xl shadow-xl mb-10">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          {/* Dropdown for Search Mode */}
          <div className="relative md:w-48">
            <select 
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as SearchMode)}
              className="w-full appearance-none bg-slate-950/80 border border-slate-800 text-slate-300 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-sm font-medium transition-all"
            >
              <option value="Roll Number">Roll Number</option>
              <option value="Name">Student Name</option>
              <option value="Semester">Semester</option>
              <option value="Section">Section</option>
            </select>
            <ChevronDown className="absolute right-4 top-4 text-slate-500 pointer-events-none" size={16} />
          </div>

          {/* Input Field */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />
            <input 
              type="text" 
              placeholder={`Enter ${searchMode} (e.g. ${searchMode === 'Roll Number' ? 'SP21-BCS-089' : searchMode === 'Semester' ? '8' : 'John Doe'})...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm font-medium"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSearching}
            className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-2xl px-8 py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Search Matrix <Sparkles size={16} /></>
            )}
          </button>
        </form>
      </div>

      {/* RESULTS RENDER ENGINE */}
      <AnimatePresence mode="wait">
        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Table Container */}
            <div className="bg-slate-900/20 border border-slate-900/60 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 font-semibold">
                      <th className="px-6 py-4">Course Name</th>
                      <th className="px-6 py-4 text-center text-emerald-400">Mid Marks</th>
                      <th className="px-6 py-4 text-center">Sessional</th>
                      <th className="px-6 py-4 text-center">Final Exam</th>
                      <th className="px-6 py-4 text-center">Total Marks</th>
                      <th className="px-6 py-4 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300 relative">
                    {results.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{item.code}</p>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-emerald-400 font-bold text-lg">{item.mid}</td>
                        
                        {/* Masked/Premium Columns */}
                        <td className={`px-6 py-4 text-center font-mono ${!isPremium && "blur-[6px] select-none opacity-50"}`}>{item.sessional}</td>
                        <td className={`px-6 py-4 text-center font-mono ${!isPremium && "blur-[6px] select-none opacity-50"}`}>{item.final}</td>
                        <td className={`px-6 py-4 text-center font-mono font-bold ${!isPremium && "blur-[6px] select-none opacity-50 text-white"}`}>{item.total}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold bg-slate-950 border border-slate-800 ${!isPremium ? "blur-[6px] select-none opacity-50" : "text-teal-400"}`}>
                            {item.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paywall Overlay inside the table if not premium */}
              {!isPremium && (
                <div className="absolute top-[60px] bottom-0 right-0 left-[30%] sm:left-[40%] bg-gradient-to-l from-slate-950 via-slate-950/90 to-transparent flex flex-col justify-center items-end pr-8 sm:pr-16 backdrop-blur-[1px]">
                  <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-xs animate-pulse hover:animate-none transition-all">
                    <Lock className="text-amber-400 mb-2" size={28} />
                    <h3 className="text-white font-bold text-lg">Results Locked</h3>
                    <p className="text-slate-400 text-xs mt-1 mb-4">You are viewing the basic tier. Upgrade to view final marks, sessionals, and exact GPAs.</p>
                    <button 
                      onClick={() => setShowUpgradeModal(true)}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-sm font-bold py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                    >
                      Upgrade to PRO
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPGRADE MODAL POPUP */}
      <AnimatePresence>
        {showUpgradeModal && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl z-50"
            >
              <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-full">
                <X size={18} />
              </button>

              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-4 text-amber-400 shadow-lg shadow-amber-500/10">
                  <Award size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Upgrade to PRO</h2>
                <p className="text-slate-400 text-sm">Unlock full academic transcripts instantly.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6">
                <ul className="space-y-3">
                  {['View Sessional Marks', 'View Final Exam Marks', 'Check Grades & GPAs', 'Download PDF Transcript'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="text-emerald-400" size={18} /> {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment Instructions (Adapt exactly to your old code logic) */}
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-wide mb-1">Subscription Fee</p>
                  <p className="text-3xl font-black text-white">Rs. 500<span className="text-sm font-normal text-slate-400"> / semester</span></p>
                </div>

                <div className="text-center text-sm text-slate-400 px-4">
                  Pay via EasyPaisa or JazzCash to the verified admin account below, then upload a screenshot.
                </div>

                {/* Mock Payment Details */}
                <div className="bg-slate-950 rounded-xl p-4 flex items-center justify-between border border-slate-800">
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-slate-500" size={20} />
                    <div className="text-left">
                      <p className="text-xs text-slate-500 font-medium">EasyPaisa Account</p>
                      <p className="text-sm font-mono text-white font-bold">03XX-XXXXXXX</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    // MOCK PAYMENT SUCCESS LOGIC
                    setIsPremium(true);
                    setShowUpgradeModal(false);
                    alert("Mock: Payment uploaded and approved! You are now Premium.");
                  }}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
                >
                  <Unlock size={18} /> I have paid, Verify Me
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
