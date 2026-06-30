"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Building, Calendar, Users, 
  Sun, Moon, ChevronDown, Lock,
  Menu, CreditCard, History, Share2, Wallet,
  X, GraduationCap, Activity, TrendingUp, AlertCircle,
  ShieldAlert, Send, Download, Unlock, Check, CheckCheck, Edit2, CheckCircle2, ArrowRight, Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';
import Select from 'react-select'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
const ADMIN_REG = "S20BSCS1M01001"; // Target for contact support
const SEARCH_COST = 3000;

type SearchMode = "Roll Number" | "Name";
type Theme = "light" | "dark";
type TabState = "home" | "history" | "referral" | "credits" | "contact";

interface FilterItem {
  id: number;
  label: string;
  value: string;
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

interface ChatMessage {
  id: string;
  sender_reg: string;
  receiver_reg: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_delivered: boolean;
}

export default function UserDashboardPage() {
  const router = useRouter();
  
  const [theme, setTheme] = useState<Theme>("dark");
  const [currentUser, setCurrentUser] = useState({ reg: "", name: "Loading...", phone: "", email: "" });
  
  const [credits, setCredits] = useState(0);
  const [freeAttempts, setFreeAttempts] = useState(4);
  const isProMode = credits >= SEARCH_COST;
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabState>("home");
  const [toastMsg, setToastMsg] = useState<ToastMessage | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("Roll Number");
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [selectedDept, setSelectedDept] = useState<FilterItem | null>(null);
  const [selectedSession, setSelectedSession] = useState<FilterItem | null>(null);
  const [selectedSection, setSelectedSection] = useState<FilterItem | null>(null);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    departments: [], sessions: [], sections: []
  });

  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any[] | null>(null);
  const [unlockedRegs, setUnlockedRegs] = useState<Set<string>>(new Set());

  // Wallet & History State
  const [paymentForm, setPaymentForm] = useState({ package: "", amount: "", name: "", tid: "" });
  const [isPaymentSubmitted, setIsPaymentSubmitted] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<HistoryLogs>({ deposits: [], usage: [] });
  const [walletPage, setWalletPage] = useState(1);
  const [paidSearchHistory, setPaidSearchHistory] = useState<any[]>([]);
  const [creditsTabLoading, setCreditsTabLoading] = useState(false);

  // Chat State
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const chatStateRef = useRef({ currentUser });
  useEffect(() => { chatStateRef.current = { currentUser }; }, [currentUser]);

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("iub_theme") as Theme;
    if (savedTheme) setTheme(savedTheme);

    const cachedUser = localStorage.getItem("iub_currentUser_v2");
    if (cachedUser) setCurrentUser(JSON.parse(cachedUser));

    const cachedCredits = localStorage.getItem("iub_credits");
    if (cachedCredits) setCredits(Number(cachedCredits));

    const cachedAttempts = localStorage.getItem("iub_freeAttempts");
    if (cachedAttempts) setFreeAttempts(Number(cachedAttempts));

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("iub_theme", nextTheme);
      return nextTheme;
    });
  };

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const forceLogout = async () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.clear(); 
        router.push('/login');
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [router]);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const cachedFilters = localStorage.getItem('iub_filterOptions');
        if (cachedFilters) setFilterOptions(JSON.parse(cachedFilters));

        let userEmail: string | undefined;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.email) {
          userEmail = session.user.email;
        } else {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (!authError && user?.email) {
            userEmail = user.email;
          }
        }

        if (!userEmail) {
          router.push('/login');
          return;
        }

        const { data: userRecord } = await supabase
          .from("users")
          .select("reg, phone, email")
          .ilike("email", userEmail.trim())
          .maybeSingle();
        
        // Critical Security/Bugfix: Force logout if registration is missing or UNKNOWN
        if (!userRecord || !userRecord.reg || userRecord.reg.toUpperCase() === "UNKNOWN") {
          forceLogout();
          return;
        }

        const actualReg = userRecord.reg.toUpperCase().replace(/\s+/g, '').trim();

        const { data: studentNameRes } = await supabase
          .from("students")
          .select("name")
          .ilike("reg", actualReg) 
          .maybeSingle();
        
        // Critical Security/Bugfix: Force logout if valid student data isn't fetched
        const actualName = studentNameRes?.name;
        if (!actualName || actualName.trim() === "" || actualName.toLowerCase() === "student" || actualName === "Loading...") {
           forceLogout();
           return;
        }
        
        const newUserState = { 
          reg: actualReg, 
          name: actualName, 
          phone: userRecord?.phone || "", 
          email: userRecord?.email || "" 
        };
        
        setCurrentUser(newUserState);
        localStorage.setItem("iub_currentUser_v2", JSON.stringify(newUserState));

        // Fetch Credits
        const { data: userCreditsRes } = await supabase.from("user_credits").select("*").ilike("user_reg", actualReg).maybeSingle();
        // Replace the old userCreditsRes logic with this:
        if (userCreditsRes) {
          setCredits(userCreditsRes.credits || 0);
          localStorage.setItem("iub_credits", (userCreditsRes.credits || 0).toString());
          
          const resetDate = userCreditsRes.free_search_reset_at ? new Date(userCreditsRes.free_search_reset_at) : new Date();
          const isReset = new Date() > resetDate;
          
          const attempts = isReset ? 4 : Math.max(0, 4 - (userCreditsRes.free_searches_used || 0));
          setFreeAttempts(attempts);
          localStorage.setItem("iub_freeAttempts", attempts.toString());
        }
        
        // Setup real-time credit updates
        supabase.channel('credits_update')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_credits', filter: `user_reg=eq.${actualReg}` }, (payload) => {
             setCredits(payload.new.credits);
             localStorage.setItem("iub_credits", payload.new.credits.toString());
             setFreeAttempts(Math.max(0, 4 - (payload.new.free_searches_today || 0)));
          }).subscribe();

        // Fetch Filters safely
        const [deptsRes, sessionsRes, sectionsRes] = await Promise.all([
          supabase.from("departments").select("id, depart_name"),
          supabase.from("academic_sessions").select("id, session_code"),
          supabase.from("sections").select("id, section_name, session_id, department_id")
        ]);

        // Fix sections filter bug: Extract explicitly 1M, 2E, 7M, etc.
        const formattedSections = (sectionsRes.data || [])
          .map(s => {
            const m = s.section_name.match(/\b(\d+[A-Z])\b/i);
            return { id: s.id, value: s.id.toString(), label: m ? m[1].toUpperCase() : null, session_id: s.session_id, department_id: s.department_id };
          })
          .filter(s => s.label && /^\d+[A-Z]$/.test(s.label));

        const newFilters = {
          departments: (deptsRes.data || []).map(d => ({ id: d.id, value: d.id.toString(), label: d.depart_name })),
          sessions: (sessionsRes.data || []).map(s => ({ id: s.id, value: s.id.toString(), label: s.session_code })),
          sections: formattedSections
        };
        
        setFilterOptions(newFilters);
        localStorage.setItem('iub_filterOptions', JSON.stringify(newFilters));

        checkUnreadMessages(actualReg);

      } catch (error) {
        console.error("Critical error loading data:", error);
      }
    }
    
    fetchInitialData();
  }, [router]);

  // Real-time Chat Subscription
  useEffect(() => {
    if (!currentUser.reg) return;

    const channel = supabase.channel('messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        const state = chatStateRef.current;
        
        const isActiveChat = ((newMsg.sender_reg === state.currentUser.reg && newMsg.receiver_reg === ADMIN_REG) || (newMsg.sender_reg === ADMIN_REG && newMsg.receiver_reg === state.currentUser.reg));

        if (isActiveChat) {
          setChatMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          if (newMsg.receiver_reg === state.currentUser.reg && !newMsg.is_read) {
            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then(() => {});
          }
        } else if (newMsg.receiver_reg === state.currentUser.reg) {
          setHasUnreadMessages(true);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updatedMsg = payload.new as ChatMessage;
        setChatMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [currentUser.reg]);

  useEffect(() => {
    if (activeTab === "credits") loadCreditsHistory(1);
    if (activeTab === "history") loadPaidSearchHistory();
    if (activeTab === "contact") loadUserChat();
  }, [activeTab]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadCreditsHistory = async (page = 1) => {
    setCreditsTabLoading(true);
    setWalletPage(page);
    try {
      if (!currentUser.reg) return;
      const cachedHistory = localStorage.getItem('iub_historyLogs');
      if (cachedHistory && page === 1) setHistoryLogs(JSON.parse(cachedHistory));

      const limit = 7 + (page - 1) * 10;
      const [depRes, usageRes] = await Promise.all([
        supabase.from("payments_record").select("*").ilike("user_reg", currentUser.reg).order("created_at", { ascending: false }).limit(limit),
        supabase.from("user_search_log").select("*").ilike("searcher_reg", currentUser.reg).in("search_type", ["Paid", "Free"]).order("created_at", { ascending: false }).limit(limit)
      ]);
      const newLogs = { deposits: depRes.data || [], usage: usageRes.data || [] };
      setHistoryLogs(newLogs);
      if (page === 1) localStorage.setItem('iub_historyLogs', JSON.stringify(newLogs));
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setCreditsTabLoading(false);
    }
  };

 const loadPaidSearchHistory = async () => {
    try {
      if (!currentUser.reg) return;
      const { data } = await supabase.from("user_search_log")
        .select("*")
        .ilike("searcher_reg", currentUser.reg)
        .in("search_type", ["Paid", "Free"]) // FIX: Now grabs both types of history
        .order("created_at", { ascending: false });
      
      const uniqueHistory: any[] = [];
      const seenQueries = new Set();
      (data || []).forEach(log => {
        const queryUpper = log.search_query?.toUpperCase() || "";
        if (!seenQueries.has(queryUpper)) {
          seenQueries.add(queryUpper);
          uniqueHistory.push(log);
        }
      });
      setPaidSearchHistory(uniqueHistory);
    } catch (e) {}
  };

  // Chat logic
  const checkUnreadMessages = async (reg: string) => {
    try {
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_reg', reg).eq('is_read', false);
      if (count && count > 0) setHasUnreadMessages(true);
    } catch (e) {}
  };

  const loadUserChat = async () => {
    setHasUnreadMessages(false);
    try {
      const { data } = await supabase.from('messages').select('*')
        .in('sender_reg', [currentUser.reg, ADMIN_REG])
        .in('receiver_reg', [currentUser.reg, ADMIN_REG])
        .order('created_at', { ascending: true });
        
      setChatMessages(data || []);
      await supabase.from('messages').update({ is_read: true }).eq('receiver_reg', currentUser.reg).eq('is_read', false);
    } catch (e) {}
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !currentUser.reg) return;
    
    const textToSend = chatInput.trim();
    const temporaryId = 'temp-' + Date.now();
    const localOptimisticMsg: ChatMessage = {
      id: temporaryId,
      sender_reg: currentUser.reg,
      receiver_reg: ADMIN_REG,
      content: textToSend,
      created_at: new Date().toISOString(),
      is_read: false,
      is_delivered: false 
    };

    setChatMessages(prev => {
      if (prev.find(m => m.content === textToSend && m.id.startsWith('temp-'))) return prev;
      return [...prev, localOptimisticMsg];
    });
    setChatInput("");

    try {
      if (editingMsgId) {
        await supabase.from('messages').update({ content: textToSend }).eq('id', editingMsgId);
        setEditingMsgId(null);
        setChatMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, content: textToSend } : m));
      } else {
        const { data: serverMsg, error } = await supabase.from('messages').insert({
          sender_reg: currentUser.reg,
          receiver_reg: ADMIN_REG,
          content: textToSend,
          is_delivered: true,
          is_read: false
        }).select().maybeSingle();

        if (error) throw error;

        if (serverMsg) {
          setChatMessages(prev => 
            prev.map(m => m.id === temporaryId ? (serverMsg as ChatMessage) : m)
          );
        }
      }
    } catch(e) {
      setChatMessages(prev => prev.filter(m => m.id !== temporaryId));
      setChatInput(textToSend);
      showToast("Error", "Message transmission failed. Please retry.", "error");
    }
  };

  const showToast = (title: string, desc: string, type: 'error'|'info' = 'error') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const formatFirstName = (fullName: string) => {
    if (!fullName || fullName === "Loading...") return fullName;
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1 && parts[0].toLowerCase() === "muhammad") {
      return parts[1];
    }
    return parts[0];
  };

  // Convert "Spring 2025" -> "S25" to align search filter with actual registration numbers
  const parseSessionToPrefix = (label: string) => {
    if (!label) return "";
    const match = label.match(/(SPRING|FALL)\s+(\d{4})/i);
    if(!match) return "";
    return (match[1].charAt(0) + match[2].slice(-2)).toUpperCase(); 
  };

  const t = {
    bg: theme === "light" ? "bg-[#f4f7f6]" : "bg-[#00122a]",
    text: theme === "light" ? "text-slate-800" : "text-slate-100",
    textMuted: theme === "light" ? "text-slate-500" : "text-blue-300/70",
    cardBg: theme === "light" ? "bg-white border-slate-300/60 shadow-md" : "bg-[#001c4d]/80 border-[#00348c]/50",
    border: theme === "light" ? "border-slate-300/60" : "border-[#00348c]/50",
    primary: theme === "light" ? "text-[#0056b3]" : "text-amber-400",
    inputBg: theme === "light" ? "bg-slate-50 border-slate-300" : "bg-[#00122a]/50",
    inputFocus: theme === "light" ? "focus:border-[#0056b3] focus:ring-[#0056b3]/20" : "focus:border-amber-500 focus:ring-amber-500/30",
    btnPrimary: theme === "light" 
      ? "bg-[#0056b3] hover:bg-[#004494] text-white shadow-[#0056b3]/30" 
      : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#00122a] shadow-amber-500/20",
    rowHover: theme === "light" ? "hover:bg-slate-100" : "hover:bg-[#00205b]/40"
  };

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      background: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      cursor: 'pointer',
      paddingLeft: '1rem',
      minHeight: '2.5rem',
      fontSize: '0.8rem',
      color: theme === 'light' ? '#1e293b' : '#f1f5f9',
    }),
    singleValue: (base: any) => ({
      ...base,
      color: theme === 'light' ? '#1e293b' : '#f1f5f9',
    }),
    input: (base: any) => ({
      ...base,
      color: theme === 'light' ? '#1e293b' : '#f1f5f9',
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: theme === 'light' ? '#ffffff' : '#001c4d',
      border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#00348c'}`,
      zIndex: 999
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? (theme === 'light' ? '#f1f5f9' : '#00205b') : 'transparent',
      color: theme === 'light' ? '#1e293b' : '#f1f5f9',
      cursor: 'pointer',
      fontSize: '0.8rem'
    })
  };

  const logSearch = async (query: string, type: string) => {
    try {
      await supabase.from("user_search_log").insert({
        searcher_reg: currentUser.reg,
        searcher_name: currentUser.name,
        search_query: query,
        search_type: type
      });
    } catch (err) {}
  };

  const handleSearch = async (e?: React.FormEvent, newPage = 0, overrideQuery?: string, overrideMode?: SearchMode) => {
    if (e) e.preventDefault();
    const activeQuery = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const activeMode = overrideMode !== undefined ? overrideMode : searchMode;

    if (!activeQuery.trim()) return;

    // PRESERVED: Your exact original rate limit UI check
    try {
      const { data: isAllowed, error: rateError } = await supabase.rpc('check_rate_limit', {
        p_user_reg: currentUser.reg,
        p_max_actions: 10,        // <-- CHANGED FROM 5
        p_window_seconds: 86400   // <-- CHANGED FROM 60 (Now 1 Day)
      });

      if (rateError || !isAllowed) {
        showToast("Slow Down", "Daily search limit exceeded. Try again tomorrow.", "error"); // <-- OPTIONAL: Updated toast message
        setIsSearching(false);
        return;
      }
    } catch (limitErr) {
      console.error("Rate limit parsing error:", limitErr);
    }

    // PRESERVED: Your exact state resets
    setIsSearching(true);
    setExpandedReg(null);
    setStudentDetails(null);
    setPage(newPage);

    try {
      let mappedPrefix = "";
      // PRESERVED: Your exact session mapping logic
      if (activeMode === "Name" && selectedSession && selectedSession.label) {
        mappedPrefix = parseSessionToPrefix(selectedSession.label) || "";
      }

      // REPLACED: Direct table query is swapped for the secure RPC
      const { data, error } = await supabase.rpc('secure_student_search', {
        p_search_query: activeQuery.trim(),
        p_search_mode: activeMode,
        p_page: newPage,
        p_session_prefix: mappedPrefix || null,
        p_section_id: selectedSection ? selectedSection.id : null,
        p_dept_id: selectedDept ? selectedDept.id : null
      });

      // Handle the new Wallet error from the backend
      if (error) {
        if (error.message.includes('Insufficient balance')) {
          showToast("Out of Balance", "You need 3000 credits or free attempts to search the directory.", "error");
          setActiveTab('credits'); // Redirect them to top-up
        } else {
          throw error;
        }
        setIsSearching(false);
        return;
      }

      // PRESERVED: Your exact data mapping logic (adjusting slightly for the RPC's joined column names)
      setSearchResults((data.data || []).map((s: any) => ({
        id: s.id, 
        reg: s.reg, 
        name: s.name,
        session: s.session_code || "N/A",
        section: s.section_name || "N/A"
      })));
      
      setTotalRecords(data.total || 0);

    } catch (err) {
      showToast("Error", "Could not complete search.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const getGradeInfo = (marks: number | null) => {
    if (marks === null) return { gp: 0, grade: 'N/A' };
    if (marks >= 85) return { gp: 4.0, grade: 'A' };
    if (marks >= 80) return { gp: 3.7, grade: 'A-' };
    if (marks >= 75) return { gp: 3.3, grade: 'B+' };
    if (marks >= 70) return { gp: 3.0, grade: 'B' };
    if (marks >= 65) return { gp: 2.7, grade: 'B-' };
    if (marks >= 60) return { gp: 2.3, grade: 'C+' };
    if (marks >= 55) return { gp: 2.0, grade: 'C' };
    if (marks >= 50) return { gp: 1.7, grade: 'C-' };
    return { gp: 0.0, grade: 'F' };
  };

  const getSemesterNumber = (reg: string, currentSemName: string) => {
    if (!reg || !currentSemName) return "";
  
    const cleanReg = reg.trim().toUpperCase();
    const cleanSem = currentSemName.trim().toUpperCase();
  
    const regMatch = cleanReg.match(/^(S|F)(\d{2})/);
    const semMatch = cleanSem.match(/(SPRING|FALL)\s+(\d{4})/);
  
    if (!regMatch || !semMatch) return currentSemName; 
  
    const entryIsSpring = regMatch[1] === "S";
    const entryYear = 2000 + parseInt(regMatch[2]);
  
    const targetIsSpring = semMatch[1] === "SPRING";
    const targetYear = parseInt(semMatch[2]);
  
    const entrySequence = (entryYear * 2) + (entryIsSpring ? 0 : 1);
    const targetSequence = (targetYear * 2) + (targetIsSpring ? 0 : 1);
  
    const semesterNum = (targetSequence - entrySequence) + 1;
  
    if (semesterNum <= 0) return currentSemName; 
  
    const suffixes = ["th", "st", "nd", "rd"];
    const v = semesterNum % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  
    return `${semesterNum}${suffix} Semester • ${semMatch[1].charAt(0) + semMatch[1].slice(1).toLowerCase()} ${targetYear}`;
  };

  const parseSessionFromReg = (reg: string) => {
    if (!reg) return "N/A";
    const cleanReg = reg.trim().toUpperCase();
    const match = cleanReg.match(/^(S|F)(\d{2})/);
    if (!match) return "N/A";
    const semesterType = match[1] === "S" ? "Spring" : match[1] === "F" ? "Fall" : "Unknown";
    const year = `20${match[2]}`;
    return `${semesterType} ${year}`;
  };

  const handleExpandResult = async (reg: string, studentId: number) => {
    if (expandedReg === reg) {
      setExpandedReg(null);
      return;
    }

    const isUnlocked = unlockedRegs.has(reg);

    // Initial expand logic: Uses a Free Attempt
    if (!isUnlocked) {
      if (freeAttempts <= 0 && credits < SEARCH_COST) { // <-- ADDED CREDIT CHECK
        showToast("Out of Balance", "You have 0 free attempts left and insufficient credits.", "error");
        return;
      }
      // Optimistically deduct 1 free attempt ONLY if they are relying on free attempts
      if (freeAttempts > 0) {
        setFreeAttempts(prev => Math.max(0, prev - 1));
      }
    }

    setExpandedReg(reg);

    try {
      // p_is_pro is false because the initial view should ONLY show mid-terms
      const { data: records, error } = await supabase.rpc('unlock_semester', { 
        p_student_id: studentId, 
        p_semester_num: null,
        p_is_pro: false 
      });

      if (error) throw error;

      if (!isUnlocked) {
        setUnlockedRegs(prev => new Set(prev).add(reg));
      }

      if (!records || records.length === 0) {
        setStudentDetails([]);
        return;
      }

      const studentCard = searchResults?.find(s => s.id === studentId);
      const rawSection = studentCard?.section || "General Data";
      const semMatch = rawSection.match(/-(\d+)(ST|ND|RD|TH)/i);
      const calculatedSemester = semMatch ? `Semester ${semMatch[1]}` : "General Data";

      const uniqueCourses = new Map();
      records.forEach((rec: any) => {
        const sem = rec.semester || calculatedSemester;
        const courseCode = rec.subject_id?.course_code || "N/A";
        const key = `${sem}-${courseCode}`;
        const currentTotal = Number(rec.total_marks) || 0;
        if (!uniqueCourses.has(key) || Number(uniqueCourses.get(key).total_marks || 0) < currentTotal) {
          uniqueCourses.set(key, rec);
        }
      });

      const roundMark = (mark: any) => mark != null && mark !== "" ? Math.round(Number(mark)) : null;

      const grouped = Array.from(uniqueCourses.values()).reduce((acc: any, rec: any) => {
        const sem = rec.semester || calculatedSemester;
        if (!acc[sem]) acc[sem] = [];
        
        const totalMarks = roundMark(rec.total_marks);
        const gradeInfo = totalMarks !== null ? getGradeInfo(totalMarks) : { gp: 0, grade: '🔒' };
        const credits = Number(rec.subject_id?.credit_hours) || 3;

        acc[sem].push({
          code: rec.subject_id?.course_code || "N/A",
          name: rec.subject_id?.course_name || "Unknown",
          credits: credits,
          db_sem_num: rec.semester_num,
          mid: roundMark(rec.mid_term_marks),
          sess: roundMark(rec.sessional_marks),
          fin: roundMark(rec.end_term_marks),
          prSess: roundMark(rec.practical_sessional_marks),
          prFin: roundMark(rec.practical_final_marks),
          tot: totalMarks,
          gp: gradeInfo.gp,
          grade: gradeInfo.grade
        });
        return acc;
      }, {});

      const sortedSemesters = Object.keys(grouped).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numB - numA; 
      }).map(sem => {
        const courses = grouped[sem];
        let totalQualityPoints = 0, totalCr = 0, semTotalMarks = 0, semMaxMarks = 0;
        
        const canCalculate = courses.some((c: any) => c.tot !== null);
        const validSemNums = courses.map((c: any) => c.db_sem_num).filter((n: any) => n !== null && n !== undefined);
        const dbSemNum = validSemNums.length > 0 ? validSemNums[0] : (parseInt(sem.replace(/\D/g, '')) || -1);

        courses.forEach((c: any) => {
           if (canCalculate && c.tot !== null) {
             totalQualityPoints += (c.gp * c.credits);
             totalCr += c.credits;
             semTotalMarks += c.tot;
             semMaxMarks += 100;
           } else if (!canCalculate) {
             totalCr += c.credits;
           }
        });

        return {
          semNum: sem.replace("Semester ", ""), 
          dbSemNum: dbSemNum,
          courses: courses,
          sgpa: canCalculate && totalCr > 0 ? (totalQualityPoints / totalCr).toFixed(2) : "🔒",
          totalMarks: canCalculate ? semTotalMarks : "🔒",
          maxMarks: canCalculate ? semMaxMarks : "🔒",
          canCalculate
        };
      });

      setStudentDetails(sortedSemesters);
    } catch (err) {
      showToast("Error", "Could not fetch data.", "error");
      setExpandedReg(null);
      if (!isUnlocked) setFreeAttempts(prev => prev + 1); // Rollback free attempt on error
    }
  };

  const handleUnlockSpecificSemester = async (studentId: number, semesterNum: string, dbSemNum: number) => {
    if (credits < SEARCH_COST) {
      showToast("Out of Balance", `You need ${SEARCH_COST} credits to unlock previous semesters.`, "error");
      setActiveTab('credits');
      return;
    }

    try {
      // 1. Fetch using the EXACT database integer
      const { data: records, error } = await supabase.rpc('unlock_semester', { 
        p_student_id: studentId, 
        p_semester_num: dbSemNum, 
        p_is_pro: true 
      });

      if (error || !records) throw error;
      showToast("Unlocked", `Semester ${semesterNum} unlocked successfully.`, "info");
      
      // Optimistically deduct balance for UI snappy feel
      setCredits(prev => Math.max(0, prev - SEARCH_COST));

      // 2. Build lookup dictionary
      const unlockedDict = new Map();
      records.forEach((rec: any) => {
        const courseCode = rec.subject_id?.course_code || "N/A";
        const currentTotal = Number(rec.total_marks) || 0;
        if (!unlockedDict.has(courseCode) || Number(unlockedDict.get(courseCode).total_marks || 0) < currentTotal) {
          unlockedDict.set(courseCode, rec);
        }
      });

      const roundMark = (mark: any) => mark != null && mark !== "" ? Math.round(Number(mark)) : null;

      // 3. STRICT MERGE
      setStudentDetails((prev: any) => {
          if (!prev) return prev;
          
          return prev.map((sem: any) => {
              if (sem.semNum === semesterNum) {
                  let totalQualityPoints = 0, totalCr = 0, semTotalMarks = 0, semMaxMarks = 0;

                  const updatedCourses = sem.courses.map((existingCourse: any) => {
                      const unlockedRec = unlockedDict.get(existingCourse.code);
                      
                      if (unlockedRec) {
                          const totalMarks = roundMark(unlockedRec.total_marks);
                          const gradeInfo = getGradeInfo(totalMarks);
                          const creds = existingCourse.credits;

                          if (totalMarks !== null) {
                              totalQualityPoints += (gradeInfo.gp * creds);
                              semTotalMarks += totalMarks;
                              semMaxMarks += 100;
                          }
                          totalCr += creds;

                          return {
                              ...existingCourse,
                              mid: roundMark(unlockedRec.mid_term_marks),
                              sess: roundMark(unlockedRec.sessional_marks),
                              fin: roundMark(unlockedRec.end_term_marks),
                              prSess: roundMark(unlockedRec.practical_sessional_marks),
                              prFin: roundMark(unlockedRec.practical_final_marks),
                              tot: totalMarks,
                              gp: gradeInfo.gp,
                              grade: gradeInfo.grade
                          };
                      } else {
                          totalCr += existingCourse.credits;
                          return existingCourse;
                      }
                  });

                  const sgpa = totalCr > 0 ? (totalQualityPoints / totalCr).toFixed(2) : "0.00";

                  return {
                      ...sem,
                      courses: updatedCourses,
                      canCalculate: true,
                      sgpa: sgpa,
                      totalMarks: semTotalMarks,
                      maxMarks: semMaxMarks
                  };
              }
              return sem;
          });
      });

    } catch (err) {
       showToast("Error", "Failed to unlock semester. Please try again.", "error");
    }
  };

  const executeReSearch = (query: string) => {
    setActiveTab("home");
    const mode = (query.length >= 8 && query.match(/[0-9]/)) ? "Roll Number" : "Name";
    setSearchMode(mode);
    setSearchQuery(query);
    handleSearch(undefined, 0, query, mode);
  };

  const packages = [
    { id: 'pkg1', price: 'Rs 500', amount: 500, credits: '7500', label: 'Solo Student' },
    { id: 'pkg2', price: 'Rs 1000', amount: 1000, credits: '17,000', label: 'Friends Plan', pop: true },
    { id: 'pkg3', price: 'Rs 5000', amount: 5000, credits: '125,000', label: 'CR/GR Plan' },
    { id: 'custom', price: 'Custom', amount: 0, credits: 'Variable', label: 'Enter Amount' }
  ];

  const handlePaymentSubmit = async () => {
    if (!currentUser.reg || currentUser.reg === "UNKNOWN" || currentUser.name.includes("Loading")) {
        forceLogout();
        return;
    }

    if (!paymentForm.name || !paymentForm.tid || !paymentForm.package) return showToast("Missing Fields", "Fill all details", "error");
    
    const selectedPkg = packages.find(p => p.id === paymentForm.package);
    const finalAmount = paymentForm.package === 'custom' ? Number(paymentForm.amount) : selectedPkg?.amount;

    if (!finalAmount || isNaN(finalAmount)) {
      return showToast("Invalid Amount", "Please enter a valid amount", "error");
    }
    if (finalAmount < 300) {
      return showToast("Limit Enforced", "The minimum acceptable top-up amount is Rs. 300", "error");
    }

    try {
      await supabase.from("payments_record").insert({
        user_reg: currentUser.reg,
        package_id: paymentForm.package,
        amount: finalAmount,
        account_name: paymentForm.name,
        tid_number: paymentForm.tid
      });
      showToast("Success", "Payment submitted for approval!", "info");
      setIsPaymentSubmitted(true); 
      loadCreditsHistory(1);
    } catch(e) {
      showToast("Error", "Submission failed", "error");
    }
  };

  const shareToWhatsApp = () => {
    const selectedPkg = packages.find(p => p.id === paymentForm.package);
    const finalAmount = paymentForm.package === 'custom' ? paymentForm.amount : selectedPkg?.amount;
    
    if (!paymentForm.name || !paymentForm.tid || !finalAmount) {
      return showToast("Missing Data", "Fill out Name, TID, and Amount before sharing.", "error");
    }

    const message = `Hello Admin, I have submitted a deposit confirmation request.%0A%0A` +
                    `*Registration:* ${currentUser.reg}%0A` +
                    `*Name:* ${paymentForm.name}%0A` +
                    `*Amount:* Rs. ${finalAmount}%0A` +
                    `*TID Number:* ${paymentForm.tid}%0A%0A` +
                    `Please verify and approve my account credits. Thanks!`;
                    
    window.open(`https://wa.me/923119277832?text=${message}`, '_blank');
  };

  return (
    <div className={`flex flex-col min-h-screen ${t.bg} ${t.text} font-sans transition-colors duration-300 overflow-x-hidden text-[13px] sm:text-sm`}>     
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border ${toastMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'} backdrop-blur-md`}
          >
            <AlertCircle size={20} />
            <div>
              <p className="text-sm font-bold">{toastMsg.title}</p>
              <p className="text-[12px] opacity-90">{toastMsg.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${t.border} ${theme === 'light' ? 'bg-white/90' : 'bg-[#00122a]/90'} px-3 sm:px-5 py-3.5 flex justify-between items-center`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setSidebarOpen(true)} className={`relative p-1.5 rounded-lg border ${t.border} hover:bg-slate-500/10 transition-colors`}>
            <Menu size={20} className={t.primary} />
            {hasUnreadMessages && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-[#00122a]"></span>}
          </button>
          
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={t.primary}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-current opacity-20"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 14l3-3 2 2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-sm sm:text-lg font-black tracking-tight leading-none whitespace-nowrap">
              IUB Result<span className={theme === 'light' ? 'text-[#0056b3]' : 'text-amber-500'}>Portal</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border opacity-70 border-slate-500/30">
            <span className="text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
              {isProMode ? 'Pro Mode' : 'Free Mode'}
            </span>
          </div>

          <button 
            onClick={() => setActiveTab("credits")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${t.border} ${theme==='light'?'bg-white hover:bg-slate-50 shadow-sm':'bg-[#001c4d] hover:bg-[#002a70]'} transition-all text-xs font-bold`}
          >
            <Wallet size={14} className={t.primary} />
            <span>{credits.toLocaleString()}</span>
          </button>

          <button onClick={toggleTheme} className={`p-1.5 rounded-lg border ${t.border} ${theme === 'light' ? 'bg-white text-amber-500 shadow-sm' : 'bg-[#001c4d] text-blue-300'}`}>
            {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* THIN SUB-HEADER */}
      <div className={`w-full py-1.5 text-[10px] font-bold tracking-wide flex justify-center items-center gap-2 sm:gap-4 border-b ${t.border} ${theme === 'light' ? 'bg-slate-100/80 text-slate-600' : 'bg-[#000a1a]/80 text-blue-400/60'}`}>
        <span>Check Result Before Time</span>
        <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
        <span>Detailed Marks</span>
        <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
        <span>Directory Lookup</span>
      </div>

      {/* SIDEBAR DRAWER */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className={`fixed top-0 left-0 h-full w-64 ${theme==='light' ? 'bg-white' : 'bg-[#00173d]'} border-r ${t.border} z-50 flex flex-col shadow-2xl`}
            >
              <div className="p-5 border-b border-slate-500/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${t.btnPrimary}`}>
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-bold truncate max-w-[130px]">{formatFirstName(currentUser.name)}</div>
                    <div className={`text-[10px] font-mono ${t.textMuted}`}>{currentUser.reg}</div>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)}><X size={20} className={t.textMuted} /></button>
              </div>
              <div className="p-3 flex-1 space-y-1 overflow-y-auto">
                <button onClick={() => { setActiveTab('home'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'home' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <Search size={18} /> Search Portal
                </button>
                <button onClick={() => { setActiveTab('credits'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'credits' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <CreditCard size={18} /> Credits & Wallet
                </button>
                <button onClick={() => { setActiveTab('history'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'history' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <History size={18} /> Search History
                </button>
                <button onClick={() => { setActiveTab('referral'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'referral' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <Share2 size={18} /> Referral Program
                </button>
                <button onClick={() => { setActiveTab('contact'); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium ${activeTab === 'contact' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <div className="flex items-center gap-3"><ShieldAlert size={18} /> Contact Admin</div>
                  {hasUnreadMessages && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-5 py-6 z-10">
        
        {/* PWA Banner */}
        {deferredPrompt && activeTab === 'home' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`mb-6 p-4 rounded-[1.2rem] border shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 ${theme === 'light' ? 'bg-gradient-to-r from-[#0056b3] to-blue-500 text-white border-blue-400' : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 border-amber-400'}`}>
             <div className="flex items-center gap-3">
               <Download size={24} className="animate-bounce" />
               <div>
                 <h3 className="font-black text-base leading-tight">Install IUB Portal App</h3>
                 <p className="text-xs opacity-90">Get one-tap access directly from your home screen.</p>
               </div>
             </div>
             <button onClick={installPWA} className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all ${theme === 'light' ? 'bg-white text-[#0056b3] hover:bg-slate-100' : 'bg-[#00122a] text-amber-500 hover:bg-slate-900'}`}>
               Install Now
             </button>
          </motion.div>
        )}

        {/* TAB: CONTACT ADMIN (USER) */}
        {activeTab === "contact" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col h-[75vh] ${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
            <div className={`p-4 border-b ${t.border} bg-slate-500/5`}>
              <h3 className="font-bold flex items-center gap-2"><ShieldAlert className="text-amber-500" size={18}/> Contact Support</h3>
              <p className="text-[11px] opacity-70 mt-1">Sending as: <span className="font-semibold">{currentUser.name}</span> ({currentUser.reg}) | {currentUser.phone}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={chatScrollRef}>
              {chatMessages.length === 0 && <div className="text-center py-8 opacity-50">Send a message to admin. They usually reply within 24 hours.</div>}
              {chatMessages.map((msg) => {
                const isMe = msg.sender_reg === currentUser.reg;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl break-words whitespace-pre-wrap ${isMe ? t.btnPrimary + ' rounded-br-sm' : 'bg-slate-500/10 rounded-bl-sm border ' + t.border}`}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10px] opacity-50">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {isMe && (
                        <div className="flex items-center gap-1">
                          {msg.is_read ? <CheckCheck size={12} className="text-blue-400" /> : msg.is_delivered ? <CheckCheck size={12} className="text-gray-400" /> : <Check size={12} className="text-gray-400" />}
                          <button onClick={() => { setEditingMsgId(msg.id); setChatInput(msg.content); }}><Edit2 size={10} className="opacity-50 hover:opacity-100"/></button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className={`p-3 border-t ${t.border} flex items-center gap-2 bg-slate-500/5`}>
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="Type a message..." className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl px-4 py-2.5 focus:outline-none ${t.inputFocus} resize-none max-h-32 min-h-[44px]`} rows={1} />
              <button onClick={handleSendMessage} disabled={!chatInput.trim()} className={`${t.btnPrimary} p-2.5 rounded-xl disabled:opacity-50 transition-transform active:scale-95`}><Send size={18}/></button>
            </div>
          </motion.div>
        )}

        {/* TAB: HOME (SEARCH PORTAL) */}
        {activeTab === "home" && (
          <>
            <div className={`relative overflow-hidden rounded-[1.75rem] p-5 sm:p-7 shadow-xl mb-6 border ${theme === 'light' ? 'bg-gradient-to-br from-[#0056b3] to-[#00348c] text-white border-[#0056b3]/20 shadow-[#0056b3]/20' : 'bg-gradient-to-br from-[#001c4d] to-[#000a1a] text-blue-50 border-[#00348c]'}`}>
              <div className="absolute top-0 left-0 p-3 opacity-10 pointer-events-none transform -translate-x-3 -translate-y-3">
                <GraduationCap size={140} />
              </div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="text-xl sm:text-3xl font-black mb-1">Welcome back, {formatFirstName(currentUser.name)}!</h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${theme==='light' ? 'bg-white/20 border-white/30' : 'bg-[#00205b]/50 border-blue-400/20'} text-[9px] sm:text-[10px] font-bold tracking-widest uppercase shadow-sm`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 8px 1px #4ade80" }}></div>
                      Live Database
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-1 mt-3">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme==='light' ? 'bg-white/10 border-white/20' : 'bg-[#00205b]/40 border-blue-400/20'} font-bold`}>
                    <Activity size={14} className="opacity-70"/> Free Attempts: <span className={theme==='light' ? 'text-white font-black' : 'text-amber-400 font-black'}>{freeAttempts}/4</span>
                  </div>
                  <button onClick={() => setActiveTab('referral')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme==='light' ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-[#00205b]/40 border-blue-400/20 hover:bg-[#00205b]/60'} font-bold transition-colors`}>
                    <Share2 size={14} className="text-emerald-400"/> Earn by Sharing
                  </button>
                </div>

                {/* NEW LOW CREDIT REMINDER BAR ADDED HERE */}
                {!isProMode && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold backdrop-blur-sm shadow-sm ${theme === 'light' ? 'bg-amber-50/90 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
                    <Info size={14} className="shrink-0 text-amber-500" />
                    <span>You are low on balance. 3000 Credits are needed to view single semester's marks.</span>
                  </motion.div>
                )}
                {/* END OF NEW BAR */}

                {!isProMode && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="mt-5 bg-gradient-to-r from-red-500/10 to-amber-500/10 text-slate-800 dark:text-blue-200 border border-amber-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
                        <Lock size={18} className="animate-pulse" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Detailed Marks are Locked</p>
                        <p className="text-[11px] opacity-80">You are low in balance. Upgrade plan to unlock full mid, sessional, and final marks.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('credits')} 
                      className="w-full sm:w-auto text-center font-black text-xs uppercase tracking-wider px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#00122a] rounded-xl shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-all transform whitespace-nowrap"
                    >
                      Pay to See All Results &rarr;
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            <div className={`${t.cardBg} border ${t.border} p-4 sm:p-6 rounded-2xl mb-6 transition-all`}>
              <form onSubmit={(e) => handleSearch(e, 0)} className="flex flex-col gap-4">
                
                <div className="flex flex-col items-center mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest opacity-50 mb-2">Search By</span>
                  <div className={`flex p-1 rounded-xl w-full max-w-[300px] relative ${theme==='light'?'bg-slate-100 border border-slate-200 shadow-inner':'bg-[#00122a] border border-[#00348c]/30'}`}>
                    <div 
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-out shadow-sm ${t.btnPrimary}`}
                      style={{ left: searchMode === 'Roll Number' ? '4px' : 'calc(50%)' }}
                    />
                    <button type="button" onClick={() => {setSearchMode('Roll Number'); setSearchQuery(""); setSearchResults(null);}} className={`flex-1 py-2 font-bold z-10 transition-colors ${searchMode === 'Roll Number' ? (theme==='light'?'text-white':'text-black') : 'opacity-60 hover:opacity-100'}`}>
                      Reg Number
                    </button>
                    <button type="button" onClick={() => {setSearchMode('Name'); setSearchQuery(""); setSearchResults(null);}} className={`flex-1 py-2 font-bold z-10 transition-colors ${searchMode === 'Name' ? (theme==='light'?'text-white':'text-black') : 'opacity-60 hover:opacity-100'}`}>
                      Name
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {searchMode === "Name" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 overflow-visible pt-1"
                    >
                      <div className="relative z-[60]">
                        <Calendar className={`absolute left-3 top-2.5 ${t.textMuted} z-10`} size={14} />
                        <Select
                          options={filterOptions.sessions}
                          value={selectedSession}
                          onChange={(val) => { setSelectedSession(val); setSelectedSection(null); }}
                          styles={selectStyles}
                          placeholder="All Sessions"
                          isClearable
                          menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                        />
                      </div>
                      <div className="relative z-[50]">
                        <Building className={`absolute left-3 top-2.5 ${t.textMuted} z-10`} size={14} />
                        <Select
                          options={filterOptions.departments}
                          value={selectedDept}
                          onChange={(val) => { setSelectedDept(val); setSelectedSection(null); }}
                          styles={selectStyles}
                          placeholder="All Departments"
                          isClearable
                          menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                        />
                      </div>
                      <div className="relative z-[40]">
                        <Users className={`absolute left-3 top-2.5 ${t.textMuted} z-10`} size={14} />
                        <Select
                          options={filterOptions.sections.filter(s => 
                            (!selectedSession || s.session_id === parseInt(selectedSession.value)) && 
                            (!selectedDept || s.department_id === parseInt(selectedDept.value))
                          )}
                          value={selectedSection}
                          onChange={(val) => setSelectedSection(val)}
                          styles={selectStyles}
                          placeholder="All Sections"
                          isClearable
                          menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1 relative">
                    <Search className={`absolute left-3.5 top-3 ${t.textMuted}`} size={18} />
                    <input type="text" placeholder={searchMode === 'Roll Number' ? "e.g. F20BSCS1M010" : "e.g. Ali"} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-2.5 pl-10 pr-3 focus:outline-none ${t.inputFocus}`}
                    />
                  </div>
                  <button type="submit" disabled={isSearching || !searchQuery.trim()} className={`${t.btnPrimary} font-bold rounded-xl px-8 py-2.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md`}>
                    {isSearching ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Search"}
                  </button>
                </div>
              </form>
            </div>

            {searchResults && (
              <div className={`font-bold mb-3 px-1.5 ${t.textMuted}`}>
                Showing {searchResults.length} of {totalRecords} records found
              </div>
            )}

            <div className="space-y-3">
              <AnimatePresence>
                {searchResults?.map((student, idx) => (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
                    <div className="p-3 sm:p-4 flex justify-between items-center gap-2 cursor-pointer hover:bg-slate-500/5 transition-colors" onClick={() => handleExpandResult(student.reg, student.id)}>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded border font-mono font-semibold ${theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-[#00122a] border-[#00348c]'}`}>{student.reg}</span>
                          <h3 className="font-bold">{student.name}</h3>
                        </div>
                        <div className={`text-[12px] ${t.textMuted} font-medium`}>
                          Session: {parseSessionFromReg(student.reg)} • {student.section?.replace(/[- ]?\d+(st|nd|rd|th)[- ]?/i, ' • ')}
                        </div>
                      </div>
                      <button className={`p-1.5 rounded-full ${t.textMuted} hover:${t.primary} bg-slate-500/5 transition-colors`}>
                        <motion.div
                           animate={{ rotate: expandedReg === student.reg ? 180 : 0 }}
                           transition={{ duration: 0.3 }}
                        >
                          <ChevronDown size={20} />
                        </motion.div>
                      </button>
                    </div>

                    <AnimatePresence>
                      {expandedReg === student.reg && studentDetails && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className={`border-t ${t.border} overflow-hidden ${theme === 'light' ? 'bg-slate-50/50' : 'bg-[#00122a]/30'}`}>
                          <div className="p-3 sm:p-5 space-y-4">
                            {studentDetails.length === 0 ? (
                              <div className="text-center py-6 opacity-60 font-medium">
                                No Records found.
                              </div>
                            ) : (
                              <>
                                {studentDetails.map((sem: any, sIdx: number) => (
                                  <div key={sIdx} className={`rounded-[1rem] border ${t.border} ${t.cardBg} overflow-hidden shadow-sm`}>
                                    <div className={`px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-widest ${theme === 'light' ? 'bg-[#0056b3]/5 text-[#0056b3]' : 'bg-[#00122a] text-amber-400'}`}>
                                      {getSemesterNumber(student.reg, sem.semNum)}
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left whitespace-nowrap">
                                        <thead className={`border-b ${t.border} text-opacity-80`}>
                                          <tr>
                                            <th className="px-2 py-2 font-bold">Subject</th>
                                            <th className="px-2 py-2 text-center font-bold">Mid</th>
                                            <th className="px-2 py-2 text-center font-bold">Sess</th>
                                            <th className="px-2 py-2 text-center font-bold">Fin</th>
                                            <th className="px-2 py-2 text-center font-bold">Pr.S</th>
                                            <th className="px-2 py-2 text-center font-bold">Pr.F</th>
                                            <th className="px-2 py-2 text-center font-bold">Tot</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                          {sem.courses.map((course: any, cIdx: number) => (
                                            <tr key={cIdx} className={t.rowHover}>
                                              <td className="px-2 py-2 max-w-[120px] sm:max-w-[180px] truncate" title={course.name}>
                                                <span className="font-semibold block">{course.name}</span>
                                                <span className="block text-[10px] opacity-70 font-mono mt-0.5">
                                                  {course.code} • {course.credits}
                                                </span>
                                              </td>
                                              <td className="px-2 py-2 text-center font-mono">{course.mid ?? "-"}</td>
                                              <td className="px-2 py-2 text-center font-mono">{sem.canCalculate ? (course.sess ?? "-") : <Lock size={12} className="mx-auto opacity-50"/>}</td>
                                              <td className="px-2 py-2 text-center font-mono">{sem.canCalculate ? (course.fin ?? "-") : <Lock size={12} className="mx-auto opacity-50"/>}</td>
                                              <td className="px-2 py-2 text-center font-mono">{sem.canCalculate ? (course.prSess ?? "-") : <Lock size={12} className="mx-auto opacity-50"/>}</td>
                                              <td className="px-2 py-2 text-center font-mono">{sem.canCalculate ? (course.prFin ?? "-") : <Lock size={12} className="mx-auto opacity-50"/>}</td>
                                              <td className={`px-2 py-2 text-center font-mono font-bold ${sem.canCalculate ? t.primary : ''}`}>{sem.canCalculate ? (course.tot ?? "-") : <Lock size={12} className="mx-auto opacity-50"/>}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className={`px-3 py-3 sm:px-4 flex justify-between items-center text-xs border-t ${t.border} ${theme === 'light' ? 'bg-slate-100/50' : 'bg-[#00205b]/30'}`}>
                                      <div className="font-bold opacity-80">
                                        Total Credits: {sem.courses.reduce((acc: number, c: any) => acc + c.credits, 0)}
                                      </div>
                                      <div className="flex items-center gap-4 sm:gap-6">
                                        <div className="font-bold">
                                          Marks: <span className={t.primary}>{sem.totalMarks}</span> {sem.maxMarks !== "🔒" && <span className="opacity-70">/ {sem.maxMarks}</span>}
                                        </div>
                                        <div className="font-black text-[13px] sm:text-sm bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                          SGPA: {sem.sgpa}
                                        </div>
                                      </div>
                                    </div>
                                    {!sem.canCalculate && (
                                      <div className="p-3 bg-black/5 dark:bg-white/5 border-t border-slate-200 dark:border-[#00348c]">
                                        <motion.button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              handleUnlockSpecificSemester(student.id, sem.semNum, sem.dbSemNum); // <-- UPDATE HERE
                                          }}
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.98 }}
                                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-black text-sm uppercase tracking-wide transition-all shadow-md ${theme === 'light' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 border-amber-300' : 'bg-gradient-to-r from-amber-500 to-amber-600 text-[#00122a] border-amber-400'}`}
                                        >
                                          <Unlock size={18} />
                                          Unlock Semester {sem.semNum} (3,000 Credits)
                                        </motion.button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>

              {searchResults && searchResults.length > 0 && totalRecords > searchResults.length && (
                <button onClick={(e) => handleSearch(e, page + 1)} className={`w-full py-3 rounded-xl border ${t.border} ${t.cardBg} hover:bg-slate-500/5 font-bold transition-colors shadow-sm`}>
                  Load Next 10 Records
                </button>
              )}
            </div>
          </>
        )}

        {/* TAB: CREDITS (WALLET) */}
        {activeTab === "credits" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
            <div className={`p-6 rounded-[1.75rem] text-center border ${theme === 'light' ? 'bg-gradient-to-b from-white to-slate-50 border-slate-200 shadow-sm' : 'bg-gradient-to-b from-[#001c4d] to-[#00122a] border-[#00348c]'}`}>
               <Wallet size={40} className={`mx-auto mb-3 ${t.primary}`}/>
               <h3 className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Available Balance</h3>
               <div className="text-4xl sm:text-5xl font-black">{credits.toLocaleString()} <span className="text-xl font-medium opacity-50">Credits</span></div>
              {/* NEW BAR ADDED HERE */}
               <div className={`inline-flex items-center justify-center gap-2 mt-5 px-4 py-2 rounded-xl border text-[11px] sm:text-xs font-bold shadow-sm transition-all ${theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                 <Info size={14} className="shrink-0 animate-pulse" />
                 <span>3000 Credits required to view a single detailed result</span>
               </div>
               {/* END OF NEW BAR */}
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><TrendingUp size={20}/> Top-up Plans</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {packages.map(pkg => (
                  <div key={pkg.id} onClick={() => { setPaymentForm({ ...paymentForm, package: pkg.id }); setIsPaymentSubmitted(false); }}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative overflow-hidden shadow-sm ${paymentForm.package === pkg.id ? "border-amber-500 bg-amber-500/10" : t.border + " " + t.cardBg}`}
                  >
                    {pkg.pop && <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg shadow-sm">Popular</div>}
                    <div className="text-[12px] font-bold opacity-70 mb-1.5">{pkg.label}</div>
                    <div className="text-lg sm:text-xl font-black mb-2">{pkg.price}</div>
                    <div className={`inline-block text-[11px] font-black px-2 py-1 rounded-md bg-amber-500 text-black shadow-sm`}>{pkg.credits} Credits</div>
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {paymentForm.package && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`p-5 sm:p-6 rounded-[1.5rem] border ${t.border} ${t.cardBg} space-y-4 shadow-md`}>
                  <h4 className="font-bold">Complete Your Payment</h4>
                  <div className={`p-3 rounded-xl text-[12px] font-mono border ${t.border} bg-slate-500/5`}>
                    <p className="opacity-70 mb-1.5">Transfer exact amount and fill details below:</p>
                    <p className={`font-bold text-base ${t.primary}`}>Easypaisa: 03119277832</p>
                    <p>Account Title: Sabil</p>
                  </div>
                  
                  {paymentForm.package === 'custom' && (
                    <div className="mb-2">
                      <input type="number" placeholder="Enter Custom Amount (Rs)" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-3 px-4 focus:outline-none ${t.inputFocus}`} />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="Your Name on Bank Account" value={paymentForm.name} onChange={(e) => setPaymentForm({...paymentForm, name: e.target.value})}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-3 px-4 focus:outline-none ${t.inputFocus}`} />
                    <input type="text" placeholder="TID Number of Receipt" value={paymentForm.tid} onChange={(e) => setPaymentForm({...paymentForm, tid: e.target.value})}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-3 px-4 focus:outline-none ${t.inputFocus}`} />
                  </div>

                  <div className="mt-3 mb-2 flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[12px] sm:text-xs font-semibold">
                    <ShieldAlert size={16} className="shrink-0 animate-pulse" />
                    <p>Warning: Submitting fake or unpaid requests will result in an immediate account blockage.</p>
                  </div>
                  
                  <div className="flex justify-end items-center pt-2 w-full">
                    {!isPaymentSubmitted ? (
                      <button 
                        onClick={handlePaymentSubmit} 
                        className={`w-full sm:w-auto px-8 py-3.5 ${t.btnPrimary} font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md`}
                      >
                        <CheckCircle2 size={18}/> I have Paid!
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                        <p className="text-xs font-semibold text-emerald-500 animate-pulse bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-center w-full sm:w-auto">
                          ✓ Recorded in Ledger!
                        </p>
                        <button 
                          type="button"
                          onClick={shareToWhatsApp} 
                          className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 border border-emerald-400/30"
                        >
                          <svg width="18" height="18" viewBox="0 0 448 512" fill="currentColor">
                            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                          </svg>
                          Share on WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`rounded-[1.5rem] border ${t.border} ${t.cardBg} overflow-hidden shadow-sm`}>
               <div className={`p-4 border-b ${t.border} flex justify-between items-center bg-slate-500/5`}>
                 <h3 className="font-bold flex items-center gap-2"><History size={16}/> Transactions & Usage</h3>
                 {creditsTabLoading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />}
               </div>
               
               <div className="p-0 overflow-x-auto">
                 <table className="w-full text-left whitespace-nowrap">
                   <thead className={`bg-slate-500/5 text-opacity-80`}>
                     <tr>
                       <th className="px-4 py-2.5 font-bold">Date</th>
                       <th className="px-4 py-2.5 font-bold">Type</th>
                       <th className="px-4 py-2.5 font-bold">Details</th>
                       <th className="px-4 py-2.5 text-right font-bold">Status/Cost</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-500/10">
                     {historyLogs.deposits.length === 0 && historyLogs.usage.length === 0 && !creditsTabLoading && (
                       <tr><td colSpan={4} className="px-4 py-8 text-center opacity-50">No recent activity found.</td></tr>
                     )}
                     {historyLogs.deposits.map((dep, i) => (
                       <tr key={`dep-${i}`} className={t.rowHover}>
                         <td className="px-4 py-3 font-mono opacity-70 text-[11px]">{new Date(dep.created_at).toLocaleDateString()}</td>
                         <td className="px-4 py-3 font-semibold text-emerald-500 flex items-center gap-1.5">
                           <ArrowRight size={12} className="rotate-45"/> 
                           {dep.package_id === 'referral_reward' ? 'Referral Reward' : 'Deposit'}
                         </td>
                         <td className="px-4 py-3 opacity-80">
                           {dep.package_id === 'referral_reward' 
                             ? `Earned 400 credits via registration invite bonus.` 
                             : `Rs ${dep.amount} via ${dep.account_name}`}
                         </td>
                         <td className={`px-4 py-3 text-right font-bold ${dep.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                           {dep.package_id === 'referral_reward' ? '+ 400 Credits' : `Rs ${dep.amount}`}
                         </td>
                       </tr>
                     ))}
                     {historyLogs.usage.map((usg, i) => (
                       <tr key={`usg-${i}`} className={t.rowHover}>
                         <td className="px-4 py-3 font-mono opacity-70 text-[11px]">{new Date(usg.created_at).toLocaleDateString()}</td>
                         <td className="px-4 py-3 font-semibold text-red-400 flex items-center gap-1.5"><Search size={12}/> Paid Search</td>
                         <td className="px-4 py-3 opacity-80">Searched: {usg.search_query}</td>
                         <td className="px-4 py-3 text-right font-bold text-red-400">- {SEARCH_COST} Credits</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {(historyLogs.deposits.length + historyLogs.usage.length) >= (7 + (walletPage - 1) * 10) && (
                  <div className="p-3 border-t border-slate-500/10 bg-slate-500/5 flex justify-center">
                    <button onClick={() => loadCreditsHistory(walletPage + 1)} disabled={creditsTabLoading} className={`text-xs font-bold px-4 py-2 rounded-lg border ${t.border} bg-transparent hover:bg-slate-500/10 transition-colors`}>
                      Load More
                    </button>
                  </div>
               )}
            </div>
          </motion.div>
        )}

        {/* TAB: SEARCH HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-5">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2.5"><History className={t.primary} size={24}/> Paid Search History</h3>
            <p className="opacity-70 mb-5 max-w-2xl">A complete record of your executed paid searches. Clicking 'See Result' will re-run the search in the portal.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paidSearchHistory.length === 0 && (
                 <div className={`col-span-full p-8 text-center rounded-2xl border ${t.border} ${t.cardBg} opacity-60`}>
                   No paid searches executed yet.
                 </div>
              )}
              {paidSearchHistory.map((log) => (
                <div key={log.id} className={`${t.cardBg} border ${t.border} p-4 rounded-2xl shadow-sm flex flex-col justify-between`}>
                  <div className="mb-3 border-l-4 border-amber-500 pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">{new Date(log.created_at).toLocaleDateString()}</p>
                    <p className="font-bold text-base leading-tight">{log.search_query}</p>
                  </div>
                  <button onClick={() => executeReSearch(log.search_query)} className={`w-full py-2 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black font-bold transition-colors`}>
                    See Result
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: REFERRAL */}
        {activeTab === "referral" && (
          <div className={`${t.cardBg} border ${t.border} p-8 rounded-[1.5rem] text-center shadow-md`}>
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-[#0056b3] to-[#00348c] shadow-lg text-white`}>
              <Share2 size={30} />
            </div>
            <h3 className="font-black text-xl mb-2">Invite & Earn Credits</h3>
            <p className="opacity-70 mb-6 max-w-md mx-auto">Share your link with classmates. If they sign up, you instantly earn 400 reward credits added to your wallet balance! You can invite up to 4 Students per Day.</p>
            <div className={`max-w-md mx-auto p-2 rounded-xl border ${t.border} bg-slate-500/5 font-mono flex justify-between items-center pl-4 shadow-inner`}>
              <span className="truncate opacity-80 font-semibold text-[12px]">https://iubbackend.vercel.app/ref/{currentUser.reg}</span>
              <button onClick={() => { navigator.clipboard.writeText(`https://iubbackend.vercel.app/ref/${currentUser.reg}`); showToast("Copied!", "Referral link copied to clipboard", "info"); }} className={`${t.btnPrimary} px-5 py-2 rounded-lg font-bold shadow-md active:scale-95 transition-transform`}>Copy</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
