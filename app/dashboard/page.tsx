"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, LogOut, Award, CheckCircle2, 
  X, ChevronDown, GraduationCap, Building, Calendar, Users, 
  Sun, Moon, ChevronRight, Calculator
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type SearchMode = "Roll Number" | "Name";
type Theme = "light" | "dark";

interface FilterItem {
  id: number;
  label: string;
}

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
  
  // Dynamic Filter Data from Supabase
  const [filterOptions, setFilterOptions] = useState<{
    departments: FilterItem[];
    sessions: FilterItem[];
    sections: FilterItem[];
  }>({
    departments: [],
    sessions: [],
    sections: []
  });

  // Results & Expansion States
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  
  // Paywall set to true permanently as requested (no marks or GPAs will be hidden)
  const [isPremium, setIsPremium] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch true filter items on component mount
  useEffect(() => {
    async function fetchFilterData() {
      try {
        const [deptsRes, sessionsRes, sectionsRes] = await Promise.all([
          supabase.from("departments").select("id, depart_name, depart_code"),
          supabase.from("academic_sessions").select("id, session_code"),
          supabase.from("sections").select("id, section_name")
        ]);

        setFilterOptions({
          departments: (deptsRes.data || []).map(d => ({ id: d.id, label: `${d.depart_code} - ${d.depart_name}` })),
          sessions: (sessionsRes.data || []).map(s => ({ id: s.id, label: s.session_code })),
          sections: (sectionsRes.data || []).map(s => ({ id: s.id, label: s.section_name }))
        });
      } catch (error) {
        console.error("Error loading filter drop-downs:", error);
      }
    }
    fetchFilterData();
  }, []);

  // Toggle Theme
  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  // Helper to calculate Grade and Grade Points from total marks
  const getGradeDetails = (marks: number) => {
    if (marks >= 85) return { grade: "A", gp: 4.0 };
    if (marks >= 80) return { grade: "A-", gp: 3.7 };
    if (marks >= 75) return { grade: "B+", gp: 3.3 };
    if (marks >= 70) return { grade: "B", gp: 3.0 };
    if (marks >= 65) return { grade: "B-", gp: 2.7 };
    if (marks >= 60) return { grade: "C+", gp: 2.3 };
    if (marks >= 50) return { grade: "C", gp: 2.0 };
    return { grade: "F", gp: 0.0 };
  };

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
      : "bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-[#00173d] shadow-amber-500/20",
    tableHeader: theme === "light" ? "bg-[#0056b3] text-white" : "bg-[#00122a] text-blue-200",
    rowHover: theme === "light" ? "hover:bg-slate-50" : "hover:bg-[#00205b]/60"
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setExpandedReg(null);
    setStudentDetails(null);

    try {
      let query = supabase.from("students").select(`
        id,
        reg,
        name,
        academic_sessions ( session_code ),
        sections ( section_name )
      `);

      if (searchMode === "Roll Number") {
        query = query.ilike("reg", `%${searchQuery.trim()}%`);
      } else {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
        
        if (session !== "All") {
          query = query.eq("session_id", parseInt(session));
        }
        if (section !== "All") {
          query = query.eq("section_id", parseInt(section));
        }
        if (department !== "All") {
          const { data: matchingResults } = await supabase
            .from("results")
            .select("student_id")
            .eq("department_id", parseInt(department));
          
          const studentIds = Array.from(new Set(matchingResults?.map(r => r.student_id) || []));
          if (studentIds.length === 0) {
            setSearchResults([]);
            setIsSearching(false);
            return;
          }
          query = query.in("id", studentIds);
        }
      }

      const { data: studentsData, error } = await query;

      if (error) throw error;

      const formattedResults = (studentsData || []).map((student: any) => ({
        id: student.id,
        reg: student.reg,
        name: student.name,
        session: student.academic_sessions?.session_code || "Unknown Session",
        section: student.sections?.section_name || "Unknown Section"
      }));

      setSearchResults(formattedResults);

      // Auto-expand if single perfect match on Roll Number
      if (searchMode === "Roll Number" && formattedResults.length === 1) {
        handleExpandResult(formattedResults[0].reg, formattedResults[0].id);
      }

    } catch (err) {
      console.error("Search Pipeline Failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExpandResult = async (reg: string, studentId?: number) => {
    if (expandedReg === reg) {
      setExpandedReg(null);
      return;
    }
    setExpandedReg(reg);

    const targetId = studentId || searchResults?.find(s => s.reg === reg)?.id;
    if (!targetId) return;

    try {
      const { data: records, error } = await supabase
        .from("results")
        .select(`
          id,
          sessional_marks,
          mid_term_marks,
          end_term_marks,
          practical_sessional_marks,
          practical_final_marks,
          total_marks,
          subjects ( course_code, course_name, credit_hours )
        `)
        .eq("student_id", targetId);

      if (error) throw error;

      let totalPoints = 0;
      let totalCredits = 0;

      const coursesMapped = (records || []).map((rec: any) => {
        const marks = Number(rec.total_marks) || 0;
        const details = getGradeDetails(marks);
        const credits = rec.subjects?.credit_hours || 3;

        totalPoints += details.gp * credits;
        totalCredits += credits;

        return {
          code: rec.subjects?.course_code || "N/A",
          name: rec.subjects?.course_name || "Unknown Subject",
          mid: rec.mid_term_marks || 0,
          sessional: rec.sessional_marks || 0,
          final: rec.end_term_marks || 0,
          total: marks,
          grade: details.grade
        };
      });

      const calculatedCgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";

      // Display everything transparently under one complete academic transcript report
      setStudentDetails({
        cgpa: calculatedCgpa,
        semesters: [
          {
            semNum: "Complete",
            sgpa: calculatedCgpa,
            courses: coursesMapped
          }
        ]
      });

    } catch (err) {
      console.error("Failed to compile marks report:", err);
    }
  };

  return (
    <div className={`flex-1 w-full min-h-screen ${t.bg} ${t.text} font-sans transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 relative z-10">
        
        {/* HEADER */}
        <header className={`flex justify-between items-center mb-10 border-b ${t.border} pb-6`}>
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${theme === 'light' ? 'bg-[#0056b3] text-white shadow-[#0056b3]/20' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-[#00173D] shadow-amber-500/20'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                <path d="M8 7h6"/><path d="M8 11h8"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                IUB Analytics Portal
              </h1>
              <p className={`text-xs ${t.textMuted} font-medium`}>Academic Record Portal</p>
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
                      {filterOptions.sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <Building className={`absolute left-3.5 top-3 ${t.textMuted}`} size={16} />
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-xl pl-10 pr-10 py-2.5 focus:outline-none ${t.inputFocus} text-sm transition-colors`}>
                      <option value="All">All Departments</option>
                      {filterOptions.departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <Users className={`absolute left-3.5 top-3 ${t.textMuted}`} size={16} />
                    <select value={section} onChange={(e) => setSection(e.target.value)} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-xl pl-10 pr-10 py-2.5 focus:outline-none ${t.inputFocus} text-sm transition-colors`}>
                      <option value="All">All Sections</option>
                      {filterOptions.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
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
                          <Building size={14}/> {student.session} • {student.section}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleExpandResult(student.reg, student.id)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${expandedReg === student.reg ? (theme === 'light' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-[#00122a] text-white border border-[#00348c]') : t.btnPrimary}`}
                    >
                      {expandedReg === student.reg ? "Close Result" : "See Result"} 
                      <ChevronRight size={16} className={`transition-transform ${expandedReg === student.reg ? "rotate-90" : ""}`} />
                    </button>
                  </div>

                  {/* Expanded Academic Report Transcript */}
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
                                <Calculator size={24}/> {studentDetails.cgpa}
                              </div>
                            </div>
                          </div>

                          {/* Subject Assessment Ledger Rows */}
                          {studentDetails.semesters.map((sem: any, sIdx: number) => (
                            <div key={sIdx} className="space-y-3">
                              <div className={`flex justify-between items-end border-b-2 ${theme === 'light' ? 'border-[#0056b3]' : 'border-amber-500'} pb-2`}>
                                <h4 className={`font-bold text-lg ${theme === 'light' ? 'text-[#0056b3]' : 'text-amber-400'}`}>Academic Ledger Report</h4>
                                <div className={`text-sm font-bold ${t.text}`}>Cumulative Total GPA: <span className={t.primary}>{sem.sgpa}</span></div>
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
                                    {sem.courses.map((course: any, cIdx: number) => (
                                      <tr key={cIdx} className={t.rowHover}>
                                        <td className="px-4 py-3">
                                          <div className="font-bold">{course.name}</div>
                                          <div className={`text-xs ${t.textMuted} font-mono mt-0.5`}>{course.code}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono font-medium">{course.mid}</td>
                                        <td className="px-4 py-3 text-center font-mono">{course.sessional}</td>
                                        <td className="px-4 py-3 text-center font-mono">{course.final}</td>
                                        <td className={`px-4 py-3 text-center font-mono font-bold ${t.primary}`}>{course.total}</td>
                                        <td className="px-4 py-3 text-center">
                                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#00122a] border-[#00348c] text-white'}`}>
                                            {course.grade}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
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
                  <h2 className="text-2xl font-bold mb-1">Analytics Verification</h2>
                  <p className={`text-sm ${t.textMuted}`}>Premium status verified successfully.</p>
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
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}