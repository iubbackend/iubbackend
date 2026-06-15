"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Building, Calendar, Users, 
  Sun, Moon, ChevronDown, ChevronUp, Lock,
  Menu, CreditCard, History, Share2, Wallet,
  CheckCircle2, X
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
  
  // App & User States
  const [currentUser, setCurrentUser] = useState({ reg: "F20BSCS1M001", name: "Current Student" }); // Mock logged-in user
  const [credits, setCredits] = useState(0);
  const [useCredits, setUseCredits] = useState(false);
  const [freeAttempts, setFreeAttempts] = useState({ name: 3, result: 3 });
  
  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "history" | "referral">("home");

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("Roll Number");
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filter States
  const [department, setDepartment] = useState("All");
  const [session, setSession] = useState("All");
  const [section, setSection] = useState("All");
  const [filterOptions, setFilterOptions] = useState<{ departments: FilterItem[]; sessions: FilterItem[]; sections: FilterItem[]; }>({
    departments: [], sessions: [], sections: []
  });

  // Results & Expansion States
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({ package: "", name: "", tid: "" });

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [deptsRes, sessionsRes, sectionsRes, userCreditsRes] = await Promise.all([
          supabase.from("departments").select("id, depart_name, depart_code"),
          supabase.from("academic_sessions").select("id, session_code"),
          supabase.from("sections").select("id, section_name"),
          supabase.from("user_credits").select("*").eq("user_reg", currentUser.reg).single()
        ]);

        setFilterOptions({
          departments: (deptsRes.data || []).map(d => ({ id: d.id, label: `${d.depart_code} - ${d.depart_name}` })),
          sessions: (sessionsRes.data || []).map(s => ({ id: s.id, label: s.session_code })),
          sections: (sectionsRes.data || []).map(s => ({ id: s.id, label: s.section_name }))
        });

        if (userCreditsRes.data) {
          setCredits(userCreditsRes.data.credits);
          setFreeAttempts({
            name: Math.max(0, 3 - userCreditsRes.data.free_name_searches_today),
            result: Math.max(0, 3 - userCreditsRes.data.free_reg_searches_today)
          });
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    }
    fetchInitialData();
  }, [currentUser.reg]);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  const t = {
    bg: theme === "light" ? "bg-[#f8fafc]" : "bg-[#00122a]",
    text: theme === "light" ? "text-slate-800" : "text-slate-100",
    textMuted: theme === "light" ? "text-slate-500" : "text-blue-300/70",
    cardBg: theme === "light" ? "bg-white" : "bg-[#001c4d]/80",
    border: theme === "light" ? "border-slate-200" : "border-[#00348c]/50",
    primary: theme === "light" ? "text-[#0056b3]" : "text-amber-400",
    inputBg: theme === "light" ? "bg-slate-50" : "bg-[#00122a]/50",
    inputFocus: theme === "light" ? "focus:border-[#0056b3] focus:ring-[#0056b3]/20" : "focus:border-amber-500 focus:ring-amber-500/30",
    btnPrimary: theme === "light" 
      ? "bg-[#0056b3] hover:bg-[#004494] text-white shadow-[#0056b3]/20" 
      : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#00122a] shadow-amber-500/20",
    tableHeader: theme === "light" ? "bg-[#0056b3]/5 text-[#0056b3]" : "bg-[#00122a] text-amber-400/90",
    rowHover: theme === "light" ? "hover:bg-slate-50/50" : "hover:bg-[#00205b]/40"
  };

  const logSearch = async (query: string, type: string, targetReg?: string) => {
    await supabase.from("user_search_log").insert({
      searcher_reg: currentUser.reg,
      searcher_name: currentUser.name,
      search_query: query,
      search_type: type,
      viewed_target_reg: targetReg || null
    });
  };

  const handleSearch = async (e?: React.FormEvent, newPage = 0) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Check limits
    if (!useCredits && searchMode === "Name" && freeAttempts.name <= 0) {
      alert("No free name searches left today. Please use credits.");
      return;
    }

    setIsSearching(true);
    setExpandedReg(null);
    setStudentDetails(null);
    setPage(newPage);

    try {
      let query = supabase.from("students").select(`id, reg, name, academic_sessions(session_code), sections(section_name)`, { count: 'exact' });

      if (searchMode === "Roll Number") {
        query = query.ilike("reg", `%${searchQuery.trim()}%`);
      } else {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
        if (session !== "All") query = query.eq("session_id", parseInt(session));
        if (section !== "All") query = query.eq("section_id", parseInt(section));
      }

      // Pagination 
      query = query.range(newPage * 10, (newPage + 1) * 10 - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      if (searchMode === "Name" && !useCredits && newPage === 0) {
        setFreeAttempts(p => ({ ...p, name: p.name - 1 }));
        // mock deducting attempt in db
      }

      setSearchResults((data || []).map((s: any) => ({
        id: s.id, reg: s.reg, name: s.name,
        session: s.academic_sessions?.session_code || "N/A",
        section: s.sections?.section_name || "N/A"
      })));
      setTotalRecords(count || 0);

      if (newPage === 0) logSearch(searchQuery, searchMode);

    } catch (err) {
      console.error("Search Failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExpandResult = async (reg: string, studentId: number) => {
    if (expandedReg === reg) {
      setExpandedReg(null);
      return;
    }

    const isOwnResult = reg.toLowerCase() === currentUser.reg.toLowerCase();
    const cost = isOwnResult ? 100 : 200;

    if (useCredits) {
      if (credits < cost) {
        alert(`Insufficient credits. You need ${cost} credits.`);
        setPaymentModalOpen(true);
        return;
      }
      setCredits(p => p - cost);
    } else {
      if (freeAttempts.result <= 0) {
        alert("No free result views left today. Please turn on credits.");
        return;
      }
      setFreeAttempts(p => ({ ...p, result: p.result - 1 }));
    }

    setExpandedReg(reg);
    logSearch(searchQuery, "View Result", reg);

    try {
      // Secure Fetching: Omit columns if not using credits
      const columns = useCredits 
        ? "id, semester_num, sessional_marks, mid_term_marks, end_term_marks, practical_sessional_marks, practical_final_marks, total_marks, subject_id (course_code, course_name, credit_hours)"
        : "id, semester_num, mid_term_marks, total_marks, subject_id (course_code, course_name)";

      const { data: records, error } = await supabase.from("results").select(columns).eq("student_id", studentId);
      if (error) throw error;

      // Group by Semester
      const grouped = (records || []).reduce((acc: any, rec: any) => {
        const sem = rec.semester_num || "General";
        if (!acc[sem]) acc[sem] = [];
        acc[sem].push({
          code: rec.subject_id?.course_code || "N/A",
          name: rec.subject_id?.course_name || "Unknown",
          mid: rec.mid_term_marks,
          sess: rec.sessional_marks,
          fin: rec.end_term_marks,
          prSess: rec.practical_sessional_marks,
          prFin: rec.practical_final_marks,
          tot: rec.total_marks
        });
        return acc;
      }, {});

      // Sort semesters descending
      const sortedSemesters = Object.keys(grouped).sort((a, b) => Number(b) - Number(a)).map(sem => ({
        semNum: sem,
        courses: grouped[sem]
      }));

      setStudentDetails(sortedSemesters);
    } catch (err) {
      console.error("Failed to compile marks:", err);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentForm.name || !paymentForm.tid || !paymentForm.package) return alert("Fill all fields");
    await supabase.from("payments_record").insert({
      user_reg: currentUser.reg,
      package_id: paymentForm.package,
      account_name: paymentForm.name,
      tid_number: paymentForm.tid
    });
    alert("Payment submitted for approval!");
    setPaymentModalOpen(false);
    setPaymentForm({ package: "", name: "", tid: "" });
  };

  return (
    <div className={`flex flex-col min-h-screen ${t.bg} ${t.text} font-sans transition-colors duration-300 overflow-x-hidden`}>
      
      {/* HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${t.border} ${theme === 'light' ? 'bg-white/80' : 'bg-[#00122a]/80'} px-4 py-3 flex justify-between items-center`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className={`p-1.5 rounded-lg border ${t.border} hover:bg-slate-500/10 transition-colors`}>
            <Menu size={20} className={t.primary} />
          </button>
          
          <div className="flex items-center gap-2">
            {/* Custom SVG Logo */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={t.primary}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-base sm:text-lg font-bold tracking-tight hidden sm:block">IUB Result Portal</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Use Credits Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-semibold tracking-wide uppercase opacity-70">
              Use Credits
            </span>
            <button 
              onClick={() => setUseCredits(!useCredits)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ease-in-out ${useCredits ? (theme==='light'?'bg-[#0056b3]':'bg-amber-500') : 'bg-slate-400/40'}`}
            >
              <motion.div 
                animate={{ x: useCredits ? 16 : 0 }} 
                className="bg-white w-4 h-4 rounded-full shadow-sm"
              />
            </button>
          </div>

          {/* Credits Badge */}
          <button 
            onClick={() => setPaymentModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${t.border} ${theme==='light'?'bg-slate-50 hover:bg-slate-100':'bg-[#001c4d] hover:bg-[#002a70]'} transition-all text-xs font-bold shadow-sm`}
          >
            <Wallet size={14} className={t.primary} />
            <span>{credits.toLocaleString()}</span>
          </button>

          <button onClick={toggleTheme} className={`p-1.5 rounded-lg border ${t.border} ${theme === 'light' ? 'bg-white text-amber-500' : 'bg-[#001c4d] text-blue-300'}`}>
            {theme === "light" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* SIDEBAR DRAWER */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className={`fixed top-0 left-0 h-full w-64 ${t.cardBg} border-r ${t.border} z-50 flex flex-col shadow-2xl`}
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center">
                <h2 className="font-bold text-lg">Menu</h2>
                <button onClick={() => setSidebarOpen(false)}><X size={20} className={t.textMuted} /></button>
              </div>
              <div className="p-3 flex-1 space-y-1">
                <button onClick={() => { setActiveTab('home'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeTab === 'home' ? t.btnPrimary : `hover:bg-slate-500/10`}`}>
                  <Search size={18} /> Search Portal
                </button>
                <button onClick={() => setPaymentModalOpen(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-slate-500/10`}>
                  <CreditCard size={18} /> Deposit Credits
                </button>
                <button onClick={() => { setActiveTab('history'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeTab === 'history' ? t.btnPrimary : `hover:bg-slate-500/10`}`}>
                  <History size={18} /> Search History
                </button>
                <button onClick={() => { setActiveTab('referral'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeTab === 'referral' ? t.btnPrimary : `hover:bg-slate-500/10`}`}>
                  <Share2 size={18} /> Referral Program
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 z-10">
        
        {/* Welcome Text */}
        {activeTab === "home" && (
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Welcome, {currentUser.name}</h2>
            <p className={`text-xs sm:text-sm ${t.textMuted} font-medium mt-1`}>
              Free attempts today: <span className="font-bold">{freeAttempts.name} Name</span> | <span className="font-bold">{freeAttempts.result} Result</span>
            </p>
          </div>
        )}

        {/* MAIN SEARCH PORTAL */}
        {activeTab === "home" && (
          <>
            <div className={`${t.cardBg} border ${t.border} p-4 sm:p-5 rounded-[1.25rem] shadow-sm mb-6 transition-all`}>
              <form onSubmit={(e) => handleSearch(e, 0)} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <div className="relative">
                    <select value={searchMode} onChange={(e) => { setSearchMode(e.target.value as SearchMode); setSearchQuery(""); setSearchResults(null); }}
                      className={`appearance-none ${t.inputBg} border ${t.border} ${t.primary} rounded-lg px-3 py-1.5 focus:outline-none ${t.inputFocus} text-xs font-bold cursor-pointer pr-8`}
                    >
                      <option value="Roll Number">By Reg No</option>
                      <option value="Name">By Name</option>
                    </select>
                    <ChevronDown className={`absolute right-2.5 top-2 pointer-events-none ${t.primary}`} size={12} />
                  </div>
                </div>

                <AnimatePresence>
                  {searchMode === "Name" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 overflow-hidden"
                    >
                      {/* Nano Dropdowns */}
                      <div className="relative">
                        <Calendar className={`absolute left-2.5 top-2.5 ${t.textMuted}`} size={14} />
                        <select value={session} onChange={(e) => setSession(e.target.value)} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-lg pl-8 pr-6 py-2 text-xs focus:outline-none ${t.inputFocus}`}>
                          <option value="All">All Sessions</option>
                          {filterOptions.sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                      <div className="relative">
                        <Building className={`absolute left-2.5 top-2.5 ${t.textMuted}`} size={14} />
                        <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-lg pl-8 pr-6 py-2 text-xs focus:outline-none ${t.inputFocus}`}>
                          <option value="All">All Departments</option>
                          {filterOptions.departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                      </div>
                      <div className="relative">
                        <Users className={`absolute left-2.5 top-2.5 ${t.textMuted}`} size={14} />
                        <select value={section} onChange={(e) => setSection(e.target.value)} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-lg pl-8 pr-6 py-2 text-xs focus:outline-none ${t.inputFocus}`}>
                          <option value="All">All Sections</option>
                          {filterOptions.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Search className={`absolute left-3 top-2.5 ${t.textMuted}`} size={16} />
                    <input type="text" placeholder={searchMode === 'Roll Number' ? "e.g. F20BSCS1M010" : "e.g. Ali"} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-2.5 pl-9 pr-3 focus:outline-none ${t.inputFocus} text-sm shadow-sm`}
                    />
                  </div>
                  <button type="submit" disabled={isSearching || !searchQuery.trim()} className={`${t.btnPrimary} font-bold rounded-xl px-6 py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed`}>
                    {isSearching ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Search"}
                  </button>
                </div>
              </form>
            </div>

            {/* Total Results Count */}
            {searchResults && (
              <div className={`text-xs font-bold mb-3 px-1 ${t.textMuted}`}>
                Showing {searchResults.length} of {totalRecords} records found
              </div>
            )}

            {/* RESULTS LIST */}
            <div className="space-y-3">
              <AnimatePresence>
                {searchResults?.map((student, idx) => (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`${t.cardBg} border ${t.border} rounded-2xl shadow-sm overflow-hidden`}>
                    <div className="p-3 sm:p-4 flex justify-between items-center gap-2 cursor-pointer hover:bg-slate-500/5 transition-colors" onClick={() => handleExpandResult(student.reg, student.id)}>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold">{student.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded border font-mono ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#00122a] border-[#00348c]'}`}>{student.reg}</span>
                          <span className={`text-[10px] ${t.textMuted}`}>{student.session} • {student.section}</span>
                        </div>
                      </div>
                      <button className={`p-1.5 rounded-full ${t.textMuted} hover:${t.primary} transition-colors`}>
                        {expandedReg === student.reg ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {/* EXPANDED ACADEMIC LEDGER */}
                    <AnimatePresence>
                      {expandedReg === student.reg && studentDetails && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className={`border-t ${t.border} overflow-hidden ${theme === 'light' ? 'bg-slate-50/50' : 'bg-[#00122a]/30'}`}>
                          <div className="p-3 sm:p-4 space-y-4">
                            {!useCredits && (
                              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                                <Lock size={12} /> Free View: Detailed marks hidden. Turn on credits for full transcript.
                              </div>
                            )}

                            {studentDetails.map((sem: any, sIdx: number) => (
                              <div key={sIdx} className={`rounded-[1rem] border ${t.border} ${theme === 'light' ? 'bg-white' : 'bg-[#001c4d]'} overflow-hidden shadow-sm`}>
                                <div className={`px-3 py-2 text-xs font-black uppercase tracking-wider ${theme === 'light' ? 'bg-[#0056b3]/5 text-[#0056b3]' : 'bg-[#00122a] text-amber-400'}`}>
                                  Semester {sem.semNum}
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-[11px] sm:text-xs whitespace-nowrap">
                                    <thead className={`border-b ${t.border} text-opacity-80`}>
                                      <tr>
                                        <th className="px-2 py-1.5 font-bold">Sub</th>
                                        <th className="px-2 py-1.5 text-center font-bold">Mid</th>
                                        <th className="px-2 py-1.5 text-center font-bold">Sess</th>
                                        <th className="px-2 py-1.5 text-center font-bold">Fin</th>
                                        <th className="px-2 py-1.5 text-center font-bold">Pr.S</th>
                                        <th className="px-2 py-1.5 text-center font-bold">Pr.F</th>
                                        <th className="px-2 py-1.5 text-center font-bold">Tot</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                      {sem.courses.map((course: any, cIdx: number) => (
                                        <tr key={cIdx} className={t.rowHover}>
                                          <td className="px-2 py-1.5 max-w-[100px] sm:max-w-[150px] truncate" title={course.name}>
                                            <span className="font-semibold">{course.name}</span>
                                            <span className="block text-[9px] opacity-70 font-mono mt-0.5">{course.code}</span>
                                          </td>
                                          <td className="px-2 py-1.5 text-center font-mono">{course.mid ?? "-"}</td>
                                          <td className="px-2 py-1.5 text-center font-mono">{useCredits ? (course.sess ?? "-") : <Lock size={10} className="mx-auto opacity-50"/>}</td>
                                          <td className="px-2 py-1.5 text-center font-mono">{useCredits ? (course.fin ?? "-") : <Lock size={10} className="mx-auto opacity-50"/>}</td>
                                          <td className="px-2 py-1.5 text-center font-mono">{useCredits ? (course.prSess ?? "-") : <Lock size={10} className="mx-auto opacity-50"/>}</td>
                                          <td className="px-2 py-1.5 text-center font-mono">{useCredits ? (course.prFin ?? "-") : <Lock size={10} className="mx-auto opacity-50"/>}</td>
                                          <td className={`px-2 py-1.5 text-center font-mono font-bold ${useCredits ? t.primary : ''}`}>{useCredits ? (course.tot ?? "-") : <Lock size={10} className="mx-auto opacity-50"/>}</td>
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
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Next Button Pagination */}
              {searchResults && searchResults.length > 0 && searchResults.length < totalRecords && (
                <button onClick={(e) => handleSearch(e, page + 1)} className={`w-full py-2.5 rounded-xl border ${t.border} ${t.cardBg} hover:bg-slate-500/5 text-sm font-bold transition-colors`}>
                  Load Next 10 Records
                </button>
              )}
            </div>
          </>
        )}

        {/* MOCK TABS: History & Referral */}
        {activeTab === "history" && (
          <div className={`${t.cardBg} border ${t.border} p-6 rounded-2xl`}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><History size={20}/> Search History</h3>
            <p className="text-sm opacity-70">Saved unlocks will appear here. You don't spend credits to view already unlocked results (unless checking for updates via "See Latest").</p>
            {/* Map through a history state here in future */}
          </div>
        )}

        {activeTab === "referral" && (
          <div className={`${t.cardBg} border ${t.border} p-6 rounded-2xl text-center`}>
            <Share2 size={32} className={`mx-auto mb-3 ${t.primary}`} />
            <h3 className="font-bold text-xl mb-2">Invite & Earn Credits</h3>
            <p className="text-sm opacity-70 mb-6">Share your link. If a friend signs up and buys credits, you get 20% of their purchase value added to your wallet!</p>
            <div className={`p-3 rounded-lg border ${t.border} bg-slate-500/5 font-mono text-xs flex justify-between items-center`}>
              <span>https://iubresults.com/ref/{currentUser.reg}</span>
              <button className={`${t.btnPrimary} px-3 py-1.5 rounded-md text-xs`}>Copy</button>
            </div>
          </div>
        )}
      </main>

      {/* DEPOSIT CREDITS MODAL */}
      <AnimatePresence>
        {paymentModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPaymentModalOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm ${t.cardBg} border ${t.border} p-5 rounded-[1.5rem] shadow-2xl z-50 max-h-[90vh] overflow-y-auto`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black flex items-center gap-2"><Wallet size={18} className={t.primary}/> Top-up Credits</h2>
                <button onClick={() => setPaymentModalOpen(false)} className={`p-1.5 rounded-full bg-slate-500/10 hover:bg-slate-500/20`}><X size={16}/></button>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-5">
                {[
                  { id: 'pkg1', price: 'Rs 500', credits: '10,000', label: 'Basic' },
                  { id: 'pkg2', price: 'Rs 1000', credits: '25,000', label: 'Pro' },
                  { id: 'pkg3', price: 'Rs 5000', credits: 'Lifetime', label: 'Max (10/day)' },
                ].map(pkg => (
                  <div key={pkg.id} onClick={() => setPaymentForm({ ...paymentForm, package: pkg.id })}
                    className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${paymentForm.package === pkg.id ? `border-amber-500 bg-amber-500/10` : `${t.border} bg-slate-500/5`}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{pkg.price}</span>
                      <span className={`text-xs font-black px-2 py-1 rounded bg-amber-500 text-black`}>{pkg.credits} Crd</span>
                    </div>
                  </div>
                ))}
              </div>

              {paymentForm.package && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                  <div className={`p-3 rounded-lg text-xs font-mono border ${t.border} bg-slate-500/5 text-center`}>
                    <p className="opacity-70 mb-1">Transfer exact amount to:</p>
                    <p className="font-bold text-sm">Meezan Bank: 01234567890</p>
                    <p>Account Title: IUB Portal</p>
                  </div>
                  
                  <div>
                    <input type="text" placeholder="Your Name on Bank Account" value={paymentForm.name} onChange={(e) => setPaymentForm({...paymentForm, name: e.target.value})}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-2.5 px-3 mb-2 text-sm focus:outline-none ${t.inputFocus}`} />
                    <input type="text" placeholder="TID Number of Receipt" value={paymentForm.tid} onChange={(e) => setPaymentForm({...paymentForm, tid: e.target.value})}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-2.5 px-3 text-sm focus:outline-none ${t.inputFocus}`} />
                  </div>
                  <button onClick={handlePaymentSubmit} className={`w-full ${t.btnPrimary} font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm`}>
                    <CheckCircle2 size={16}/> I have Paid
                  </button>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
