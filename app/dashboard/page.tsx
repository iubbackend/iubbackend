"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Building, Calendar, Users, 
  Sun, Moon, ChevronDown, ChevronUp, Lock,
  Menu, CreditCard, History, Share2, Wallet,
  CheckCircle2, X, GraduationCap, Activity, TrendingUp, AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr'; // Upgraded to match login/page.tsx

// Initialize Supabase Client via SSR to read auth cookies properly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

type SearchMode = "Roll Number" | "Name";
type Theme = "light" | "dark";

interface FilterItem {
  id: number;
  label: string;
  session_id?: number;
  department_id?: number;
}

interface FilterOptions {
  departments: FilterItem[];
  sessions: FilterItem[];
  sections: FilterItem[];
}

interface ToastMessage {
  title: string;
  desc: string;
  type: 'error' | 'info';
}

interface HistoryLogs {
  deposits: any[];
  usage: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  
  // Theme State - Default to Dark
  const [theme, setTheme] = useState<Theme>("dark");
  
  // App & User States
  const [currentUser, setCurrentUser] = useState({ reg: "", name: "Loading..." });
  const [credits, setCredits] = useState(0);
  const [useCredits, setUseCredits] = useState(false);
  const [freeAttempts, setFreeAttempts] = useState({ name: 3, result: 3 });
  
  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "history" | "referral" | "credits">("home");
  const [toastMsg, setToastMsg] = useState<ToastMessage | null>(null);

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
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    departments: [], sessions: [], sections: []
  });

  // Results & Expansion States
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);

  // Credits Page States
  const [paymentForm, setPaymentForm] = useState({ package: "", name: "", tid: "" });
  const [historyLogs, setHistoryLogs] = useState<HistoryLogs>({ deposits: [], usage: [] });
  const [creditsTabLoading, setCreditsTabLoading] = useState(false);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        // 1. GET AUTH SESSION via Cookies
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          router.push('/login');
          return;
        }

        // 2. GET REG NUMBER Safely
        let actualReg = "UNKNOWN";
        const { data: userRecord } = await supabase.from("users").select("reg").eq("email", session.user.email).single();
        if (userRecord?.reg) {
          actualReg = userRecord.reg;
        }

        // 3. GET STUDENT NAME Safely (Does not crash if missing)
        let actualName = "Student";
        if (actualReg !== "UNKNOWN") {
          const { data: studentNameRes } = await supabase.from("students").select("name").eq("reg", actualReg).single();
          if (studentNameRes?.name) actualName = studentNameRes.name;
        }

        setCurrentUser({ reg: actualReg, name: actualName });

        // 4. FETCH CREDITS Safely
        if (actualReg !== "UNKNOWN") {
          const { data: userCreditsRes } = await supabase.from("user_credits").select("*").eq("user_reg", actualReg).single();
          if (userCreditsRes) {
            setCredits(userCreditsRes.credits || 0);
            setFreeAttempts({
              name: Math.max(0, 3 - (userCreditsRes.free_name_searches_today || 0)),
              result: Math.max(0, 3 - (userCreditsRes.free_reg_searches_today || 0))
            });
          }
        }

        // 5. FETCH FILTERS Safely (Include session_id and department_id for cascading)
        const [deptsRes, sessionsRes, sectionsRes] = await Promise.all([
          supabase.from("departments").select("id, depart_name, depart_code"),
          supabase.from("academic_sessions").select("id, session_code"),
          supabase.from("sections").select("id, section_name, session_id, department_id") // Fetching keys for cascading dropdowns
        ]);

        setFilterOptions({
          departments: (deptsRes.data || []).map(d => ({ id: d.id, label: `${d.depart_code} - ${d.depart_name}` })),
          sessions: (sessionsRes.data || []).map(s => ({ id: s.id, label: s.session_code })),
          sections: (sectionsRes.data || []).map(s => ({ id: s.id, label: s.section_name, session_id: s.session_id, department_id: s.department_id }))
        });

      } catch (error) {
        console.error("Critical error loading data:", error);
      }
    }
    
    fetchInitialData();
  }, [router]);

  useEffect(() => {
    if (activeTab === "credits") {
      loadCreditsHistory();
    }
  }, [activeTab]);

  const loadCreditsHistory = async () => {
    setCreditsTabLoading(true);
    try {
      if (!currentUser.reg) return;
      const [depRes, usageRes] = await Promise.all([
        supabase.from("payments_record").select("*").eq("user_reg", currentUser.reg).order("created_at", { ascending: false }),
        supabase.from("user_search_log").select("*").eq("searcher_reg", currentUser.reg).order("created_at", { ascending: false }).limit(20)
      ]);
      setHistoryLogs({ deposits: depRes.data || [], usage: usageRes.data || [] });
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setCreditsTabLoading(false);
    }
  };

  const showToast = (title: string, desc: string, type: 'error'|'info' = 'error') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

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
    try {
      await supabase.from("user_search_log").insert({
        searcher_reg: currentUser.reg,
        searcher_name: currentUser.name,
        search_query: query,
        search_type: type,
        viewed_target_reg: targetReg || null
      });
    } catch (err) {
      console.error("Search Log Exception:", err);
    }
  };

  const handleSearch = async (e?: React.FormEvent, newPage = 0) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    if (!useCredits && searchMode === "Name" && freeAttempts.name <= 0) {
      showToast("Limits Exhausted", "Use credits or check tomorrow for free attempts.", "error");
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
        
        // Department Filter Logic (Subquery via results table)
        if (department !== "All") {
          const { data: matchingResults } = await supabase
            .from("results")
            .select("student_id")
            .eq("department_id", parseInt(department));
            
          const studentIds = Array.from(new Set(matchingResults?.map(r => r.student_id) || []));
          if (studentIds.length === 0) {
            setSearchResults([]);
            setTotalRecords(0);
            setIsSearching(false);
            return;
          }
          query = query.in("id", studentIds);
        }
      }

      query = query.range(newPage * 10, (newPage + 1) * 10 - 1);
      const { data, count, error } = await query;
      
      if (error) throw error;

      if (searchMode === "Name" && !useCredits && newPage === 0) {
        setFreeAttempts(p => ({ ...p, name: p.name - 1 }));
        await supabase
          .from("user_credits")
          .update({ free_name_searches_today: 3 - (freeAttempts.name - 1) })
          .eq("user_reg", currentUser.reg);
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
      showToast("Error", "Could not complete search.", "error");
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
        showToast("Insufficient Credits", `You need ${cost} credits to view this result.`, "error");
        setActiveTab("credits");
        return;
      }
      setCredits(p => p - cost);
    } else {
      if (freeAttempts.result <= 0) {
        showToast("Limits Exhausted", "Use credits or check tomorrow for free attempts.", "error");
        return;
      }
    }

    setExpandedReg(reg);
    logSearch(searchQuery, "View Result", reg);

    if (!useCredits) {
      setFreeAttempts(p => ({ ...p, result: p.result - 1 }));
      await supabase
        .from("user_credits")
        .update({ free_reg_searches_today: 3 - (freeAttempts.result - 1) })
        .eq("user_reg", currentUser.reg);
    }

    try {
      const columns = useCredits 
        ? "id, semester_num, sessional_marks, mid_term_marks, end_term_marks, practical_sessional_marks, practical_final_marks, total_marks, subject_id (course_code, course_name, credit_hours)"
        : "id, semester_num, mid_term_marks, total_marks, subject_id (course_code, course_name)";

      const { data: records, error } = await supabase.from("results").select(columns).eq("student_id", studentId);
      if (error) throw error;

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
    if (!paymentForm.name || !paymentForm.tid || !paymentForm.package) return showToast("Missing Fields", "Please fill all payment details", "error");
    if (!currentUser.reg || currentUser.reg === "UNKNOWN") return showToast("Session Error", "Could not verify your registration number. Please login again.", "error");

    try {
      await supabase.from("payments_record").insert({
        user_reg: currentUser.reg,
        package_id: paymentForm.package,
        account_name: paymentForm.name,
        tid_number: paymentForm.tid
      });
      showToast("Success", "Payment submitted for approval!", "info");
      setPaymentForm({ package: "", name: "", tid: "" });
      loadCreditsHistory();
    } catch(e) {
      showToast("Error", "Submission failed", "error");
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${t.bg} ${t.text} font-sans transition-colors duration-300 overflow-x-hidden`}>
      
      {/* GLOBAL TOAST */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border ${toastMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'} backdrop-blur-md`}
          >
            <AlertCircle size={20} />
            <div>
              <p className="text-sm font-bold">{toastMsg.title}</p>
              <p className="text-xs opacity-90">{toastMsg.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${t.border} ${theme === 'light' ? 'bg-white/80' : 'bg-[#00122a]/80'} px-3 sm:px-4 py-3 flex justify-between items-center`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setSidebarOpen(true)} className={`p-1.5 rounded-lg border ${t.border} hover:bg-slate-500/10 transition-colors`}>
            <Menu size={20} className={t.primary} />
          </button>
          
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={t.primary}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-current opacity-20"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 14l3-3 2 2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-[13px] sm:text-lg font-black tracking-tight leading-none whitespace-nowrap">
              IUB Result<span className={theme === 'light' ? 'text-[#0056b3]' : 'text-amber-500'}>Portal</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* COMPACT ATTEMPTS BADGE */}
          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${t.border} ${theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-[#001c4d] text-blue-200'} text-xs font-bold shadow-sm`}>
            <Activity size={14} className={t.primary} />
            <span>Attempts: {freeAttempts.name} Name | {freeAttempts.result} Result</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-1">
            <span className="text-[9px] sm:text-xs font-semibold tracking-wide uppercase opacity-70 hidden sm:block">
              Use Credits
            </span>
            <button 
              onClick={() => setUseCredits(!useCredits)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ease-in-out ${useCredits ? (theme==='light'?'bg-[#0056b3]':'bg-amber-500') : 'bg-slate-400/40'}`}
            >
              <motion.div animate={{ x: useCredits ? 16 : 0 }} className="bg-white w-4 h-4 rounded-full shadow-sm"/>
            </button>
          </div>

          <button 
            onClick={() => setActiveTab("credits")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${t.border} ${theme==='light'?'bg-slate-50 hover:bg-slate-100':'bg-[#001c4d] hover:bg-[#002a70]'} transition-all text-xs font-bold shadow-sm`}
          >
            <Wallet size={14} className={t.primary} />
            <span>{credits.toLocaleString()}</span>
          </button>

          <button onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")} className={`p-1.5 rounded-lg border ${t.border} ${theme === 'light' ? 'bg-white text-amber-500' : 'bg-[#001c4d] text-blue-300'} hidden sm:block`}>
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
              <div className="p-5 border-b border-slate-500/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${t.btnPrimary}`}>
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-bold truncate max-w-[120px]">{currentUser.name}</div>
                    <div className={`text-[10px] font-mono ${t.textMuted}`}>{currentUser.reg}</div>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)}><X size={20} className={t.textMuted} /></button>
              </div>
              <div className="p-3 flex-1 space-y-1">
                <button onClick={() => { setActiveTab('home'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeTab === 'home' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <Search size={18} /> Search Portal
                </button>
                <button onClick={() => { setActiveTab('credits'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeTab === 'credits' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <CreditCard size={18} /> Credits & Wallet
                </button>
                <button onClick={() => { setActiveTab('history'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeTab === 'history' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <History size={18} /> Unlock History
                </button>
                <button onClick={() => { setActiveTab('referral'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeTab === 'referral' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <Share2 size={18} /> Referral Program
                </button>
              </div>
              <div className="p-4 border-t border-slate-500/10 flex justify-between items-center">
                <span className="text-xs font-medium">Theme</span>
                <button onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")} className={`p-2 rounded-lg border ${t.border}`}>
                  {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 z-10">
        
        {/* TAB: HOME (SEARCH PORTAL) */}
        {activeTab === "home" && (
          <>
            <div className={`relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6 shadow-xl mb-6 border ${theme === 'light' ? 'bg-gradient-to-br from-[#0056b3] to-[#00348c] text-white border-[#0056b3]/20 shadow-[#0056b3]/20' : 'bg-gradient-to-br from-[#001c4d] to-[#000a1a] text-blue-50 border-[#00348c] shadow-amber-500/5'}`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                <GraduationCap size={140} />
              </div>
              
              <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl font-black mb-1">Welcome back, {currentUser.name}!</h2>
                <p className="text-sm opacity-80 mb-2 max-w-sm">Use the search portal below to find and review academic records. Toggle 'Use Credits' in the header to bypass your daily free limits and unlock detailed marks.</p>
                
                {(freeAttempts.name <= 0 || freeAttempts.result <= 0) && !useCredits && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                    className="mt-4 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex flex-wrap items-center gap-2 max-w-fit"
                  >
                    <Lock size={14}/> <span>Free attempts ended. Turn on <b>Use Credits</b> or check tomorrow.</span>
                    <button onClick={() => setActiveTab('credits')} className="ml-2 underline decoration-amber-500/50 hover:text-white transition-colors">Buy Credits</button>
                  </motion.div>
                )}
              </div>
            </div>

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
                      <div className="relative">
                        <Calendar className={`absolute left-2.5 top-2.5 ${t.textMuted}`} size={14} />
                        <select value={session} onChange={(e) => { setSession(e.target.value); setSection("All"); }} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-lg pl-8 pr-6 py-2 text-xs focus:outline-none ${t.inputFocus}`}>
                          <option value="All">All Sessions</option>
                          {filterOptions.sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                      <div className="relative">
                        <Building className={`absolute left-2.5 top-2.5 ${t.textMuted}`} size={14} />
                        <select value={department} onChange={(e) => { setDepartment(e.target.value); setSection("All"); }} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-lg pl-8 pr-6 py-2 text-xs focus:outline-none ${t.inputFocus}`}>
                          <option value="All">All Departments</option>
                          {filterOptions.departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                      </div>
                      <div className="relative">
                        <Users className={`absolute left-2.5 top-2.5 ${t.textMuted}`} size={14} />
                        <select value={section} onChange={(e) => setSection(e.target.value)} className={`w-full appearance-none ${t.inputBg} border ${t.border} rounded-lg pl-8 pr-6 py-2 text-xs focus:outline-none ${t.inputFocus}`}>
                          <option value="All">All Sections</option>
                          {/* DYNAMIC CASCADING SECTIONS */}
                          {filterOptions.sections
                            .filter(s => 
                              (session === "All" || s.session_id === parseInt(session)) && 
                              (department === "All" || s.department_id === parseInt(department))
                            )
                            .map((s) => <option key={s.id} value={s.id}>{s.label}</option>)
                          }
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

            {searchResults && (
              <div className={`text-xs font-bold mb-3 px-1 ${t.textMuted}`}>
                Showing {searchResults.length} of {totalRecords} records found
              </div>
            )}

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

              {searchResults && searchResults.length > 0 && totalRecords > searchResults.length && (
                <button onClick={(e) => handleSearch(e, page + 1)} className={`w-full py-2.5 rounded-xl border ${t.border} ${t.cardBg} hover:bg-slate-500/5 text-sm font-bold transition-colors`}>
                  Load Next 10 Records
                </button>
              )}
            </div>
          </>
        )}

        {/* TAB: CREDITS */}
        {activeTab === "credits" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
            <div className={`p-6 rounded-[1.5rem] text-center border ${theme === 'light' ? 'bg-gradient-to-b from-white to-slate-50 border-slate-200 shadow-sm' : 'bg-gradient-to-b from-[#001c4d] to-[#00122a] border-[#00348c]'}`}>
               <Wallet size={36} className={`mx-auto mb-3 ${t.primary}`}/>
               <h3 className={`text-sm font-bold uppercase tracking-widest ${t.textMuted} mb-1`}>Available Balance</h3>
               <div className="text-4xl sm:text-5xl font-black">{credits.toLocaleString()} <span className="text-xl font-medium opacity-50">CRD</span></div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><TrendingUp size={18}/> Top-up Plans</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'pkg1', price: 'Rs 500', credits: '10,000', label: 'Basic' },
                  { id: 'pkg2', price: 'Rs 1000', credits: '25,000', label: 'Pro', pop: true },
                  { id: 'pkg3', price: 'Rs 5000', credits: 'Lifetime', label: 'Max (10/day)' },
                ].map(pkg => (
                  <div key={pkg.id} onClick={() => setPaymentForm({ ...paymentForm, package: pkg.id })}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative overflow-hidden ${paymentForm.package === pkg.id ? "border-amber-500 bg-amber-500/10" : t.border + " " + t.cardBg}`}
                  >
                    {pkg.pop && <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg">Popular</div>}
                    <div className="text-xs font-bold opacity-70 mb-1">{pkg.label}</div>
                    <div className="text-xl font-black mb-2">{pkg.price}</div>
                    <div className={`inline-block text-xs font-black px-2 py-1 rounded bg-amber-500 text-black`}>{pkg.credits} Crd</div>
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {paymentForm.package && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`p-5 rounded-[1.25rem] border ${t.border} ${t.cardBg} space-y-4`}>
                  <h4 className="font-bold text-sm">Complete Your Payment</h4>
                  <div className={`p-3 rounded-lg text-xs font-mono border ${t.border} bg-slate-500/5`}>
                    <p className="opacity-70 mb-1">Transfer exact amount via EasyPaisa/JazzCash/Bank to:</p>
                    <p className={`font-bold text-sm ${t.primary}`}>Meezan Bank: 01234567890</p>
                    <p>Account Title: IUB Portal Technologies</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="Your Name on Bank Account" value={paymentForm.name} onChange={(e) => setPaymentForm({...paymentForm, name: e.target.value})}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-2.5 px-4 text-sm focus:outline-none ${t.inputFocus}`} />
                    <input type="text" placeholder="TID Number of Receipt" value={paymentForm.tid} onChange={(e) => setPaymentForm({...paymentForm, tid: e.target.value})}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-2.5 px-4 text-sm focus:outline-none ${t.inputFocus}`} />
                  </div>
                  <button onClick={handlePaymentSubmit} className={`w-full sm:w-auto ml-auto px-8 py-3 ${t.btnPrimary} font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm`}>
                    <CheckCircle2 size={16}/> Submit Payment Verification
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`rounded-[1.25rem] border ${t.border} ${t.cardBg} overflow-hidden`}>
               <div className={`p-4 border-b ${t.border} flex justify-between items-center`}>
                 <h3 className="font-bold text-sm flex items-center gap-2"><History size={16}/> Transactions & Usage</h3>
                 {creditsTabLoading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />}
               </div>
               
               <div className="p-0 overflow-x-auto">
                 <table className="w-full text-left text-xs whitespace-nowrap">
                   <thead className={`bg-slate-500/5 text-opacity-80`}>
                     <tr>
                       <th className="px-4 py-2 font-bold">Date</th>
                       <th className="px-4 py-2 font-bold">Type</th>
                       <th className="px-4 py-2 font-bold">Details</th>
                       <th className="px-4 py-2 text-right font-bold">Status/Cost</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-500/10">
                     {historyLogs.deposits.length === 0 && historyLogs.usage.length === 0 && !creditsTabLoading && (
                       <tr><td colSpan={4} className="px-4 py-8 text-center opacity-50">No recent activity found.</td></tr>
                     )}
                     {historyLogs.deposits.map((dep, i) => (
                       <tr key={`dep-${i}`} className="hover:bg-slate-500/5">
                         <td className="px-4 py-3 font-mono opacity-70">{new Date(dep.created_at).toLocaleDateString()}</td>
                         <td className="px-4 py-3 font-semibold text-emerald-500">Deposit</td>
                         <td className="px-4 py-3 opacity-80">{dep.package_id} via {dep.account_name}</td>
                         <td className={`px-4 py-3 text-right font-bold ${dep.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                           {dep.status.toUpperCase()}
                         </td>
                       </tr>
                     ))}
                     {historyLogs.usage.filter(u => u.search_type === 'View Result').map((usg, i) => (
                       <tr key={`usg-${i}`} className="hover:bg-slate-500/5">
                         <td className="px-4 py-3 font-mono opacity-70">{new Date(usg.created_at).toLocaleDateString()}</td>
                         <td className="px-4 py-3 font-semibold text-red-400">Usage</td>
                         <td className="px-4 py-3 opacity-80">Unlocked Reg: {usg.viewed_target_reg}</td>
                         <td className="px-4 py-3 text-right font-bold opacity-70">-</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === "history" && (
          <div className={`${t.cardBg} border ${t.border} p-6 rounded-[1.5rem]`}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><History size={20}/> Unlocked Records</h3>
            <p className="text-sm opacity-70">Saved unlocks will appear here. Re-viewing them does not cost credits unless you are fetching a newly updated semester.</p>
          </div>
        )}

        {/* TAB: REFERRAL */}
        {activeTab === "referral" && (
          <div className={`${t.cardBg} border ${t.border} p-8 rounded-[1.5rem] text-center`}>
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-[#0056b3] to-[#00348c] shadow-lg text-white`}>
              <Share2 size={28} />
            </div>
            <h3 className="font-black text-xl mb-2">Invite & Earn Credits</h3>
            <p className="text-sm opacity-70 mb-6 max-w-md mx-auto">Share your link with classmates. If they sign up and buy credits, you get 20% of their purchase value added instantly to your wallet!</p>
            <div className={`max-w-sm mx-auto p-2 rounded-xl border ${t.border} bg-slate-500/5 font-mono text-xs sm:text-sm flex justify-between items-center pl-4`}>
              <span className="truncate opacity-80">iubresults.com/ref/{currentUser.reg}</span>
              <button onClick={() => showToast("Copied!", "Referral link copied to clipboard", "info")} className={`${t.btnPrimary} px-4 py-2 rounded-lg font-bold shadow-md`}>Copy</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
