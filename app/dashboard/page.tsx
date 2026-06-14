"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, LogOut, Award, Lock, Unlock, CreditCard, CheckCircle2, 
  X, ChevronDown, Sparkles, GraduationCap, Building, Calendar, Users, 
  Sun, Moon, ChevronRight, Calculator
} from "lucide-react";
import { useRouter } from "next/navigation";

// Assumes the grading utility is created in the utils folder
// import { calculateGPA, processStudentRecords, CourseRecord } from '@/app/utils/grading';

type SearchMode = "Roll Number" | "Name";
type Theme = "light" | "dark";

export default function DashboardPage() {
  const router = useRouter();
  
  // Theme State
  const [theme, setTheme] = useState<Theme>("light");
  
  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("Roll Number");
  const [isSearching, setIsSearching] = useState(false);
  
  // Filter States (Visible only in 'Name' mode)
  const [department, setDepartment] = useState("All");
  const [session, setSession] = useState("All");
  const [section, setSection] = useState("All");
  
  const [filterOptions, setFilterOptions] = useState({
    departments: ["BS Computer Science", "BS Software Engineering", "BS Information Technology"],
    sessions: ["Fall 2020", "Spring 2021", "Fall 2021", "Spring 2022"],
    sections: ["F20-BSCS-1", "F20-BSCS-2", "SP21-BSSE-1"]
  });

  // Results & Expansion States
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  
  // Paywall States
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Toggle Theme
  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  // Dynamic Theme Classes
  const t = {
    bg: theme === "light" ? "bg-[#f8fafc]" : "bg-[#00122a]",
    text: theme === "light" ? "text-slate-800" : "text-slate-100",
    textMuted: theme === "light" ? "text-slate-500" : "text-blue-300",
    cardBg: theme === "light" ? "bg-white" : "bg-[#001c4d]/80",
    border: theme === "light" ? "border-slate-200" : "border-[#00348c]",
    primary: theme === "light" ? "text-[#0056b3]" : "text-amber-400",
    inputBg: theme === "light" ? "bg-white" : "bg-[#00122a]",
    inputFocus: theme === "light" ? "focus:border-[#0056b3] focus:ring-[#0056b3]/20" : "focus:border-amber-500 focus:ring-amber-500/50",
    btnPrimary: theme === "light" 
      ? "bg-[#0056b3] hover:bg-[#004494] text-white shadow-[#0056b3]/20" 
      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-[#00173d] shadow-amber-500/20",
    tableHeader: theme === "light" ? "bg-[#0056b3] text-white" : "bg-[#00122a] text-blue-200",
    rowHover: theme === "light" ? "hover:bg-slate-50" : "hover:bg-[#00205b]/60"
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setExpandedReg(null);
    setStudentDetails(null);

    // Mock Database Fetch Logic
    setTimeout(() => {
      if (searchMode === "Name") {
        setSearchResults([
          { reg: "F20-BSCS-001", name: "Ahmed Ali", session: "Fall 2020", section: "F20-BSCS-1", latestSem: 8 },
          { reg: "F20-BSCS-089", name: "Ahmed Khan", session: "Fall 2020", section: "F20-BSCS-2", latestSem: 8 }
        ]);
      } else {
        // Roll Number Direct Search - Auto Expand
        setSearchResults([{ reg: searchQuery.toUpperCase(), name: "John Doe", session: "Fall 2020", section: "F20-BSCS-1", latestSem: 8 }]);
        handleExpandResult(searchQuery.toUpperCase());
      }
      setIsSearching(false);
    }, 800);
  };

  const handleExpandResult = (reg: string) => {
    if (expandedReg === reg) {
      setExpandedReg(null); // Collapse if already open
      return;
    }
    setExpandedReg(reg);
    
    // Mock Fetch Detailed Semester Records
    // In production: Process with calculateGPA & processStudentRecords from grading.ts
    setStudentDetails({
      cgpa: 3.84,
      semesters: [
        {
          semNum: 8,
          sgpa: 3.91,
          courses: [
            { code: "CS401", name: "Final Year Project II", mid: 28, sessional: 18, final: 45, total: 91, grade: "A" },
            { code: "CS405", name: "Information Security", mid: 25, sessional: 16, final: 40, total: 81, grade: "B+" },
          ]
        },
        {
          semNum: 7,
          sgpa: 3.75,
          courses: [
            { code: "CS400", name: "Final Year Project I", mid: 26, sessional: 19, final: 42, total: 87, grade: "A" },
            { code: "CS311", name: "Artificial Intelligence", mid: 22, sessional: 15, final: 38, total: 75, grade: "B" },
          ]
        }
      ]
    });
  };

  return (
    <div className={`flex-1 w-full min-h-screen ${t.bg} ${t.text} font-sans transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 relative z-10">
        
        {/* HEADER */}
        <header className={`flex justify-between items-center mb-10 border-b ${t.border} pb-6`}>
          <div className="flex items-center gap-3">
            {/* SVG Logo */}
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${theme === 'light' ? 'bg-[#0056b3] text-white shadow-[#0056b3]/20' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-[#00173D] shadow-amber-500/20'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                <path d="M8 7h6"/><path d="M8 11h8"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                IUB Backend
                {isPremium && <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold border ${theme === 'light' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>PRO</span>}
              </h1>
              <p className={`text-xs ${t.textMuted} font-medium`}>Academic Result Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className={`p-2.5 rounded-full border ${t.border} ${theme === 'light' ? 'bg-white hover:bg-slate-100 text-amber-500' : 'bg-[#001c4d] hover:bg-[#002a70] text-blue-300'} transition-all`}>
              {theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => router.push("/login")} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${t.border} ${t.cardBg} hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 font-medium text-sm transition-all shadow-sm`}>
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* SEARCH CONTROLLER */}
        <div className={`${t.cardBg} backdrop-blur-md border ${t.border} p-6 rounded-2xl shadow-xl mb-8 transition-all`}>
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            
            <div className="flex items-center gap-4 mb-2">
              <label className={`text-sm font-bold ${theme === 'light' ? 'text-slate-700' : 'text-blue-200'}`}>Search By:</label>
              <div className="relative w-48">
                <select 
                  value={searchMode}
                  onChange={(e) => {
                    setSearchMode(e.target.value as SearchMode);
                    setSearchQuery("");
                    setSearchResults(null);
                  }}
                  className={`w-full appearance-none ${t.inputBg} border ${t.border} ${t.primary} rounded-xl px-4 py-2 focus:outline-none ${t.inputFocus} text-sm font-semibold transition-all cursor-pointer`}
                >
                  <option value="Roll Number">Roll Number</option>
                  <option value="Name">Student Name</option>
                </select>
                <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${t.primary}`} size={16} />
              </div>
            </div>

            {/* DYNAMIC FILTERS FOR "NAME" MODE */}
            <AnimatePresence>
              {searchMode === "Name" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col sm:flex-row gap-4 overflow-hidden pt-2"
                >
                  <div className="flex-1 relative">
                    <Calendar className={`absolute left-3.5 top-3 ${t.textMuted}`} size={16} />
                    <select value={session} onChange={(e) => setSession(e.target.value)} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-xl pl-10 pr-10 py-2.5 focus:outline-none ${t.inputFocus} text-sm transition-colors`}>
                      <option value="All">All Sessions</option>
                      {filterOptions.sessions.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <Building className={`absolute left-3.5 top-3 ${t.textMuted}`} size={16} />
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-xl pl-10 pr-10 py-2.5 focus:outline-none ${t.inputFocus} text-sm transition-colors`}>
                      <option value="All">All Departments</option>
                      {filterOptions.departments.map((d, i) => <option key={i} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <Users className={`absolute left-3.5 top-3 ${t.textMuted}`} size={16} />
                    <select value={section} onChange={(e) => setSection(e.target.value)} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-xl pl-10 pr-10 py-2.5 focus:outline-none ${t.inputFocus} text-sm transition-colors`}>
                      <option value="All">All Sections</option>
                      {filterOptions.sections.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MAIN SEARCH BAR */}
            <div className="flex flex-col md:flex-row gap-4 mt-2">
              <div className="flex-1 relative">
                <Search className={`absolute left-4 top-3.5 ${t.textMuted}`} size={20} />
                <input 
                  type="text" 
                  placeholder={searchMode === 'Roll Number' ? "Enter Registration No (e.g. F20BSCS1M010)" : "Enter Student Name (e.g. Ali)"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-3.5 pl-12 pr-4 focus:outline-none ${t.inputFocus} transition-all text-sm font-medium shadow-sm`}
                />
              </div>
              <button 
                type="submit" 
                disabled={isSearching || !searchQuery.trim()}
                className={`${t.btnPrimary} font-bold rounded-xl px-8 py-3.5 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {isSearching ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Search size={16} /> Search</>}
              </button>
            </div>
          </form>
        </div>

        {/* RESULTS RENDER ENGINE */}
        <AnimatePresence>
          {searchResults && searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {searchResults.map((student, idx) => (
                <div key={idx} className={`${t.cardBg} border ${t.border} rounded-2xl shadow-sm overflow-hidden`}>
                  
                  {/* Student Summary Card */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${t.border} ${theme === 'light' ? 'bg-slate-100 text-[#0056b3]' : 'bg-[#00122a] text-blue-300'}`}>
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          {student.name}
                          <span className={`text-xs px-2 py-0.5 rounded border font-mono ${theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#00122a] border-[#00348c] text-blue-300'}`}>{student.reg}</span>
                        </h3>
                        <p className={`text-sm ${t.textMuted} mt-0.5 flex items-center gap-1.5`}>
                          <Building size={14}/> {student.session} • {student.section} <span className="mx-1">|</span> Semester {student.latestSem}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleExpandResult(student.reg)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${expandedReg === student.reg ? (theme === 'light' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-[#00122a] text-white border border-[#00348c]') : t.btnPrimary}`}
                    >
                      {expandedReg === student.reg ? "Close Result" : "See Result"} 
                      <ChevronRight size={16} className={`transition-transform ${expandedReg === student.reg ? "rotate-90" : ""}`} />
                    </button>
                  </div>

                  {/* Expanded Semester-Wise Result */}
                  <AnimatePresence>
                    {expandedReg === student.reg && studentDetails && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className={`border-t ${t.border} overflow-hidden bg-opacity-50 ${theme === 'light' ? 'bg-slate-50' : 'bg-[#00122a]/50'}`}
                      >
                        <div className="p-5 sm:p-6 space-y-6">
                          
                          {/* CGPA Header */}
                          <div className={`flex justify-center items-center p-4 rounded-xl border ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#001c4d] border-[#00348c]'}`}>
                            <div className="text-center">
                              <span className={`text-xs font-bold uppercase tracking-widest ${t.textMuted}`}>Cumulative GPA</span>
                              <div className={`text-3xl font-black mt-1 ${t.primary} flex items-center justify-center gap-2`}>
                                <Calculator size={24}/> {isPremium ? studentDetails.cgpa : "🔒.🔒🔒"}
                              </div>
                            </div>
                          </div>

                          {!isPremium && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
                              <div className="flex items-center gap-3">
                                <Lock size={20} className="text-amber-500" />
                                <p className="text-sm font-medium">Standard Access: Sessional & Final marks are hidden.</p>
                              </div>
                              <button onClick={() => setShowUpgradeModal(true)} className="whitespace-nowrap px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
                                Upgrade to Unlock All Marks
                              </button>
                            </div>
                          )}

                          {/* Semester Tables */}
                          {studentDetails.semesters.map((sem: any, sIdx: number) => (
                            <div key={sIdx} className="space-y-3">
                              <div className={`flex justify-between items-end border-b-2 ${theme === 'light' ? 'border-[#0056b3]' : 'border-amber-500'} pb-2`}>
                                <h4 className={`font-bold text-lg ${theme === 'light' ? 'text-[#0056b3]' : 'text-amber-400'}`}>Semester {sem.semNum}</h4>
                                <div className={`text-sm font-bold ${t.text}`}>SGPA: <span className={t.primary}>{isPremium || sem.semNum !== student.latestSem ? sem.sgpa : "🔒"}</span></div>
                              </div>
                              
                              <div className={`overflow-x-auto rounded-xl border ${t.border} ${theme === 'light' ? 'bg-white shadow-sm' : 'bg-[#001c4d]'}`}>
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                  <thead className={t.tableHeader}>
                                    <tr>
                                      <th className="px-4 py-3 font-semibold">Course</th>
                                      <th className="px-4 py-3 text-center font-semibold">Mid</th>
                                      <th className="px-4 py-3 text-center font-semibold">Sessional</th>
                                      <th className="px-4 py-3 text-center font-semibold">Final</th>
                                      <th className="px-4 py-3 text-center font-semibold">Total</th>
                                      <th className="px-4 py-3 text-center font-semibold">Grade</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 dark:divide-[#00348c]">
                                    {sem.courses.map((course: any, cIdx: number) => {
                                      const isLatest = sem.semNum === student.latestSem;
                                      const hideDetail = !isPremium && isLatest;

                                      return (
                                        <tr key={cIdx} className={t.rowHover}>
                                          <td className="px-4 py-3">
                                            <div className="font-bold">{course.name}</div>
                                            <div className={`text-xs ${t.textMuted} font-mono mt-0.5`}>{course.code}</div>
                                          </td>
                                          <td className="px-4 py-3 text-center font-mono font-medium">{course.mid}</td>
                                          <td className={`px-4 py-3 text-center font-mono ${hideDetail ? 'blur-sm select-none opacity-50' : ''}`}>{course.sessional}</td>
                                          <td className={`px-4 py-3 text-center font-mono ${hideDetail ? 'blur-sm select-none opacity-50' : ''}`}>{course.final}</td>
                                          <td className={`px-4 py-3 text-center font-mono font-bold ${hideDetail ? 'blur-sm select-none opacity-50' : t.primary}`}>{course.total}</td>
                                          <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#00122a] border-[#00348c] text-white'} ${hideDetail ? 'blur-sm select-none opacity-50' : ''}`}>
                                              {course.grade}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}

          {searchResults && searchResults.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center py-16 border ${t.border} rounded-2xl ${t.cardBg}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${t.border} ${theme === 'light' ? 'bg-slate-50 text-slate-400' : 'bg-[#00205b] text-blue-400'}`}>
                <Search size={24} />
              </div>
              <h3 className="text-lg font-bold mb-1">No Records Found</h3>
              <p className={`text-sm ${t.textMuted}`}>Please verify your search parameters and try again.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PREMIUM UPGRADE MODAL */}
        <AnimatePresence>
          {showUpgradeModal && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowUpgradeModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md ${t.cardBg} border ${t.border} p-6 sm:p-8 rounded-2xl shadow-2xl z-50`}
              >
                <button onClick={() => setShowUpgradeModal(false)} className={`absolute top-4 right-4 ${t.textMuted} hover:${t.text} transition-colors p-1.5 rounded-full border ${t.border}`}>
                  <X size={18} />
                </button>

                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 text-[#00173d] shadow-lg shadow-amber-500/20">
                    <Award size={32} />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">IUB Premium</h2>
                  <p className={`text-sm ${t.textMuted}`}>Unlock your full academic transcript instantly.</p>
                </div>

                <div className={`border ${t.border} rounded-xl p-4 mb-6 ${theme === 'light' ? 'bg-slate-50' : 'bg-[#00122a]'}`}>
                  <ul className="space-y-3">
                    {['View Sessional Marks', 'View Final Exam Marks', 'Check Grades & Exact GPAs', 'Download Official PDF Transcript'].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium">
                        <CheckCircle2 className="text-amber-500" size={18} /> {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-amber-500 font-bold uppercase tracking-wide mb-1">Subscription Fee</p>
                    <p className="text-3xl font-black">Rs. 500<span className={`text-sm font-normal ${t.textMuted}`}> / semester</span></p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsPremium(true);
                      setShowUpgradeModal(false);
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-[#00173d] font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    <Unlock size={18} /> Verify Payment
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}