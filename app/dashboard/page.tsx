"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Building, Calendar, Users, 
  Sun, Moon, ChevronDown, ChevronUp, Lock,
  Menu, CreditCard, History, Share2, Wallet,
  CheckCircle2, X, GraduationCap, Activity, TrendingUp, AlertCircle,
  ShieldAlert, DollarSign, UsersRound, Crown, ArrowRight, MessageSquare, Check, CheckCheck, Edit2, Trash2, Send
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';
import Select from 'react-select'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

const ADMIN_REG = "S25BARIN1M01118";
const SEARCH_COST = 1500; // Credits per paid search execution

type SearchMode = "Roll Number" | "Name";
type Theme = "light" | "dark";
type TabState = "home" | "history" | "referral" | "credits" | "admin" | "approvals" | "leaderboard" | "contact" | "admin_chats";

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

export default function DashboardPage() {
  const router = useRouter();
  
  const [theme, setTheme] = useState<Theme>("dark");
  const [currentUser, setCurrentUser] = useState({ reg: "", name: "Loading...", phone: "", email: "" });
  
  const isAdmin = currentUser.reg === ADMIN_REG;

  const [credits, setCredits] = useState(0);
  const [useCredits, setUseCredits] = useState(false);
  const [freeAttempts, setFreeAttempts] = useState(4);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabState>("home");
  const [toastMsg, setToastMsg] = useState<ToastMessage | null>(null);

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

  const [paymentForm, setPaymentForm] = useState({ package: "", amount: "", name: "", tid: "" });
  const [historyLogs, setHistoryLogs] = useState<HistoryLogs>({ deposits: [], usage: [] });
  const [paidSearchHistory, setPaidSearchHistory] = useState<any[]>([]);
  const [creditsTabLoading, setCreditsTabLoading] = useState(false);

  // ADMIN STATES
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [approvedHistory, setApprovedHistory] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState({ sales: 0, pending: 0, totalUsers: 0, premiumUsers: 0, profit: 0, searches: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // CHAT STATES
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [adminChatList, setAdminChatList] = useState<{reg: string, name: string, unread: number}[]>([]);
  const [activeAdminChatUser, setActiveAdminChatUser] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          router.push('/login');
          return;
        }

        let actualReg = "UNKNOWN";
        const { data: userRecord } = await supabase.from("users").select("reg, phone, email").eq("email", session.user.email).maybeSingle();
        if (userRecord?.reg) {
          actualReg = userRecord.reg.toUpperCase();
        }

        let actualName = "Student";
        if (actualReg !== "UNKNOWN") {
          const { data: studentNameRes } = await supabase.from("students").select("name").ilike("reg", actualReg).maybeSingle();
          if (studentNameRes?.name) actualName = studentNameRes.name;
        }

        setCurrentUser({ reg: actualReg, name: actualName, phone: userRecord?.phone || "", email: userRecord?.email || "" });

        if (actualReg !== "UNKNOWN") {
          // This safely calculates attempts based on backend data so it survives refreshes
          const { data: userCreditsRes } = await supabase.from("user_credits").select("*").ilike("user_reg", actualReg).maybeSingle();
          if (userCreditsRes) {
            setCredits(userCreditsRes.credits || 0);
            setFreeAttempts(Math.max(0, 4 - (userCreditsRes.free_searches_today || 0)));
          } else {
            setCredits(0);
            setFreeAttempts(4);
          }
        }

        const [deptsRes, sessionsRes, sectionsRes] = await Promise.all([
          supabase.from("departments").select("id, depart_name, depart_code"),
          supabase.from("academic_sessions").select("id, session_code"),
          supabase.from("sections").select("id, section_name, session_id, department_id")
        ]);

        setFilterOptions({
          departments: (deptsRes.data || []).map(d => ({ id: d.id, value: d.id.toString(), label: `${d.depart_code} - ${d.depart_name}` })),
          sessions: (sessionsRes.data || []).map(s => ({ id: s.id, value: s.id.toString(), label: s.session_code })),
          sections: (sectionsRes.data || []).map(s => ({ id: s.id, value: s.id.toString(), label: s.section_name, session_id: s.session_id, department_id: s.department_id }))
        });

        if (actualReg === ADMIN_REG) {
          loadRealAdminData();
          loadAdminChatList();
        } else {
          checkUnreadMessages(actualReg);
        }

      } catch (error) {
        console.error("Critical error loading data:", error);
      }
    }
    
    fetchInitialData();
  }, [router]);

  useEffect(() => {
    if (activeTab === "credits") loadCreditsHistory();
    if (activeTab === "history") loadPaidSearchHistory();
    if (activeTab === "contact" && !isAdmin) loadUserChat();
    if (activeTab === "admin_chats" && isAdmin) loadAdminChatList();
  }, [activeTab]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadRealAdminData = async () => {
    try {
      const { data: pendingData } = await supabase.from('payments_record').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      setPendingApprovals(pendingData || []);

      const { data: approvedData } = await supabase.from('payments_record').select('*').eq('status', 'approved').order('created_at', { ascending: false });
      setApprovedHistory(approvedData || []);

      const totalProfit = approvedData?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
      const totalSales = approvedData?.length || 0;

      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: premiumCount } = await supabase.from('user_credits').select('*', { count: 'exact', head: true }).gt('credits', 0);
      const { count: searchCount } = await supabase.from('user_search_log').select('*', { count: 'exact', head: true });

      setAdminStats({
        sales: totalSales,
        pending: pendingData?.length || 0,
        totalUsers: userCount || 0,
        premiumUsers: premiumCount || 0,
        profit: totalProfit,
        searches: searchCount || 0
      });

      const { data: topUsers } = await supabase.from('user_credits').select('user_reg, credits').order('credits', { ascending: false }).limit(10);
      setLeaderboard(topUsers || []);
    } catch (e) {
      console.error("Failed to load admin stats", e);
    }
  };

  const loadCreditsHistory = async () => {
    setCreditsTabLoading(true);
    try {
      if (!currentUser.reg) return;
      // Only fetch Deposits and PAID Searches for the Wallet
      const [depRes, usageRes] = await Promise.all([
        supabase.from("payments_record").select("*").ilike("user_reg", currentUser.reg).order("created_at", { ascending: false }),
        supabase.from("user_search_log").select("*").ilike("searcher_reg", currentUser.reg).eq("search_type", "Paid Search").order("created_at", { ascending: false }).limit(20)
      ]);
      setHistoryLogs({ deposits: depRes.data || [], usage: usageRes.data || [] });
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
        .eq("search_type", "Paid Search")
        .order("created_at", { ascending: false });
      setPaidSearchHistory(data || []);
    } catch (e) {}
  };

  const handleAdminApprove = async (paymentId: string, reg: string, amount: number) => {
    try {
      const { error } = await supabase.rpc('approve_payment_and_credit', { p_payment_id: paymentId, p_user_reg: reg.toUpperCase(), p_amount: amount });
      if (error) throw error;
      showToast("Approved", `Approved Rs ${amount} for ${reg}.`, "info");
      loadRealAdminData();
    } catch (e) {
      showToast("Error", "Failed to approve payment.", "error");
    }
  };

  const handleAdminReverse = async (paymentId: string, reg: string, amount: number) => {
    try {
      const { error } = await supabase.rpc('reverse_payment_and_credit', { p_payment_id: paymentId, p_user_reg: reg.toUpperCase(), p_amount: amount });
      if (error) throw error;
      showToast("Reversed", `Reversed Rs ${amount} for ${reg}.`, "info");
      loadRealAdminData();
    } catch (e) {
      showToast("Error", "Failed to reverse payment.", "error");
    }
  };

  // --- CHAT LOGIC ---
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
        .or(`sender_reg.eq.${currentUser.reg},receiver_reg.eq.${currentUser.reg}`)
        .order('created_at', { ascending: true });
      setChatMessages(data || []);
      await supabase.from('messages').update({ is_read: true }).eq('receiver_reg', currentUser.reg).eq('is_read', false);
    } catch (e) {}
  };

  const loadAdminChatList = async () => {
    try {
      const { data } = await supabase.rpc('get_admin_chat_list'); 
      if (data) {
        setAdminChatList(data);
        const totalUnread = data.reduce((sum: number, u: any) => sum + u.unread, 0);
        setHasUnreadMessages(totalUnread > 0);
      }
    } catch(e) {}
  };

  const loadAdminSingleChat = async (reg: string) => {
    setActiveAdminChatUser(reg);
    try {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_reg.eq.${reg},receiver_reg.eq.${ADMIN_REG}),and(sender_reg.eq.${ADMIN_REG},receiver_reg.eq.${reg})`)
        .order('created_at', { ascending: true });
      setChatMessages(data || []);
      await supabase.from('messages').update({ is_read: true }).eq('sender_reg', reg).eq('receiver_reg', ADMIN_REG);
      loadAdminChatList();
    } catch (e) {}
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    try {
      const receiver = isAdmin ? activeAdminChatUser : ADMIN_REG;
      if (!receiver) return;

      if (editingMsgId) {
        await supabase.from('messages').update({ content: chatInput }).eq('id', editingMsgId);
        setEditingMsgId(null);
      } else {
        await supabase.from('messages').insert({
          sender_reg: currentUser.reg,
          receiver_reg: receiver,
          content: chatInput,
          is_delivered: true,
          is_read: false
        });
      }
      setChatInput("");
      isAdmin ? loadAdminSingleChat(receiver) : loadUserChat();
    } catch(e) {}
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await supabase.from('messages').delete().eq('id', id);
      isAdmin && activeAdminChatUser ? loadAdminSingleChat(activeAdminChatUser) : loadUserChat();
    } catch(e) {}
  };

  const showToast = (title: string, desc: string, type: 'error'|'info' = 'error') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const formatFirstName = (fullName: string) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1 && parts[0].toLowerCase() === "muhammad") {
      return parts[1];
    }
    return parts[0];
  };

  // Upgraded Theme Classes for better Light Mode contrast & Scaling
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
    tableHeader: theme === "light" ? "bg-[#0056b3]/10 text-[#0056b3]" : "bg-[#00122a] text-amber-400/90",
    rowHover: theme === "light" ? "hover:bg-slate-100" : "hover:bg-[#00205b]/40"
  };

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      background: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      cursor: 'pointer',
      paddingLeft: '1.5rem',
      minHeight: '2.75rem',
      fontSize: '0.875rem', // Text-sm equivalent
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
      zIndex: 50
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? (theme === 'light' ? '#f1f5f9' : '#00205b') : 'transparent',
      color: theme === 'light' ? '#1e293b' : '#f1f5f9',
      cursor: 'pointer',
      fontSize: '0.875rem'
    })
  };

  const logSearch = async (query: string, type: string) => {
    try {
      await supabase.from("user_search_log").insert({
        searcher_reg: currentUser.reg.toUpperCase(),
        searcher_name: currentUser.name,
        search_query: query,
        search_type: type
      });
    } catch (err) {}
  };

  // CORE FIX: Execution Deduction Logic 
  const handleSearch = async (e?: React.FormEvent, newPage = 0, overrideQuery?: string, overrideMode?: SearchMode) => {
    if (e) e.preventDefault();
    const activeQuery = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const activeMode = overrideMode !== undefined ? overrideMode : searchMode;

    if (!activeQuery.trim()) return;
    
    // Check and deduct credits ONLY upon executing the search
    if (newPage === 0 && !isAdmin) {
      if (useCredits) {
        if (credits < SEARCH_COST) {
          showToast("Insufficient Credits", `You need ${SEARCH_COST} credits to search.`, "error");
          setActiveTab("credits");
          return;
        }
        setCredits(p => p - SEARCH_COST);
        await supabase.rpc('deduct_credits', { p_user_reg: currentUser.reg, p_cost: SEARCH_COST });
        logSearch(activeQuery, "Paid Search");
      } else {
        if (freeAttempts <= 0) {
          showToast("Limits Exhausted", "Turn on Use Credits or wait until tomorrow.", "error");
          return;
        }
        setFreeAttempts(p => p - 1);
        await supabase.rpc('deduct_free_attempt', { p_user_reg: currentUser.reg });
        logSearch(activeQuery, "Free Search");
      }
    } else if (newPage === 0 && isAdmin) {
      logSearch(activeQuery, "Admin Search");
    }

    setIsSearching(true);
    setExpandedReg(null);
    setStudentDetails(null);
    setPage(newPage);

    try {
      let query = supabase.from("students").select(`id, reg, name, academic_sessions(session_code), sections(section_name)`, { count: 'exact' });

      if (activeMode === "Roll Number") {
        query = query.ilike("reg", `%${activeQuery.trim()}%`);
      } else {
        query = query.ilike("name", `%${activeQuery.trim()}%`);
        
        if (selectedSession) query = query.eq("session_id", selectedSession.id);
        if (selectedSection) query = query.eq("section_id", selectedSection.id);
        
        if (selectedDept) {
          const { data: matchingResults } = await supabase.from("results").select("student_id").eq("department_id", selectedDept.id);
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

      setSearchResults((data || []).map((s: any) => ({
        id: s.id, reg: s.reg, name: s.name,
        session: s.academic_sessions?.session_code || "N/A",
        section: s.sections?.section_name || "N/A"
      })));
      setTotalRecords(count || 0);

    } catch (err) {
      showToast("Error", "Could not complete search.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  // Expanding is now Free (Paid during the search phase above)
  const handleExpandResult = async (reg: string, studentId: number) => {
    if (expandedReg === reg) {
      setExpandedReg(null);
      return;
    }
    const targetRegUpper = reg.toUpperCase();
    setExpandedReg(reg);

    try {
      const columns = (isAdmin || useCredits)
        ? "id, semester, semester_num, sessional_marks, mid_term_marks, end_term_marks, practical_sessional_marks, practical_final_marks, total_marks, subject_id (course_code, course_name, credit_hours)"
        : "id, semester, semester_num, mid_term_marks, subject_id (course_code, course_name)";

      const { data: records, error } = await supabase.from("results").select(columns).eq("student_id", studentId); 
      if (error) throw error;

      if (!records || records.length === 0) {
        setStudentDetails([]);
        return;
      }

      const grouped = records.reduce((acc: any, rec: any) => {
        const sem = rec.semester || rec.semester_num || "General";
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

      const sortedSemesters = Object.keys(grouped).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numB - numA;
      }).map(sem => ({
        semNum: sem,
        courses: grouped[sem]
      }));

      setStudentDetails(sortedSemesters);
    } catch (err) {
      setStudentDetails([]);
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
    { id: 'pkg1', price: 'Rs 500', amount: 500, credits: '10,000', label: 'Basic' },
    { id: 'pkg2', price: 'Rs 1000', amount: 1000, credits: '25,000', label: 'Pro', pop: true },
    { id: 'pkg3', price: 'Rs 5000', amount: 5000, credits: 'Lifetime', label: 'Max (10/day)' },
    { id: 'custom', price: 'Custom', amount: 0, credits: 'Variable', label: 'Enter Amount' }
  ];

  const handlePaymentSubmit = async () => {
    if (!paymentForm.name || !paymentForm.tid || !paymentForm.package) return showToast("Missing Fields", "Fill all details", "error");
    if (paymentForm.package === 'custom' && (!paymentForm.amount || isNaN(Number(paymentForm.amount)))) return showToast("Invalid Amount", "Enter valid amount", "error");
    
    const selectedPkg = packages.find(p => p.id === paymentForm.package);
    const finalAmount = paymentForm.package === 'custom' ? Number(paymentForm.amount) : selectedPkg?.amount;

    try {
      await supabase.from("payments_record").insert({
        user_reg: currentUser.reg.toUpperCase(),
        package_id: paymentForm.package,
        amount: finalAmount,
        account_name: paymentForm.name,
        tid_number: paymentForm.tid
      });
      showToast("Success", "Payment submitted for approval!", "info");
      setPaymentForm({ package: "", amount: "", name: "", tid: "" });
      loadCreditsHistory();
    } catch(e) {
      showToast("Error", "Submission failed", "error");
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${t.bg} ${t.text} font-sans transition-colors duration-300 overflow-x-hidden text-sm sm:text-base`}>
      
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-xl border ${toastMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'} backdrop-blur-md`}
          >
            <AlertCircle size={22} />
            <div>
              <p className="text-base font-bold">{toastMsg.title}</p>
              <p className="text-sm opacity-90">{toastMsg.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${t.border} ${theme === 'light' ? 'bg-white/90' : 'bg-[#00122a]/90'} px-3 sm:px-6 py-4 flex justify-between items-center`}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setSidebarOpen(true)} className={`relative p-2 rounded-lg border ${t.border} hover:bg-slate-500/10 transition-colors`}>
            <Menu size={22} className={t.primary} />
            {hasUnreadMessages && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-[#00122a]"></span>}
          </button>
          
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={t.primary}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-current opacity-20"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 14l3-3 2 2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-sm sm:text-xl font-black tracking-tight leading-none whitespace-nowrap">
              IUB Result<span className={theme === 'light' ? 'text-[#0056b3]' : 'text-amber-500'}>Portal</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          
          {isAdmin && (
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 text-[#00122a] transition-all text-sm font-black shadow-md border border-amber-500`}>
              <ShieldAlert size={16} />
              <span>ADMIN MODE</span>
            </div>
          )}

          {!isAdmin && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-sm font-semibold tracking-wide uppercase opacity-70">
                  Use Credits
                </span>
                <button 
                  onClick={() => setUseCredits(!useCredits)}
                  className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full p-0.5 transition-colors duration-300 ease-in-out ${useCredits ? (theme==='light'?'bg-[#0056b3]':'bg-amber-500') : 'bg-slate-400/40'}`}
                >
                  <motion.div animate={{ x: useCredits ? (typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 24) : 0 }} className="bg-white w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow-sm"/>
                </button>
              </div>

              <button 
                onClick={() => setActiveTab("credits")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${t.border} ${theme==='light'?'bg-white hover:bg-slate-50 shadow-sm':'bg-[#001c4d] hover:bg-[#002a70]'} transition-all text-sm font-bold`}
              >
                <Wallet size={16} className={t.primary} />
                <span>{credits.toLocaleString()}</span>
              </button>
            </>
          )}

          <button onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")} className={`p-2 rounded-lg border ${t.border} ${theme === 'light' ? 'bg-white text-amber-500 shadow-sm' : 'bg-[#001c4d] text-blue-300'}`}>
            {theme === "light" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* THIN NANO SUB-HEADER */}
      <div className={`w-full py-2 text-[10px] sm:text-xs font-bold tracking-wide flex justify-center items-center gap-2 sm:gap-4 border-b ${t.border} ${theme === 'light' ? 'bg-slate-100/80 text-slate-600' : 'bg-[#000a1a]/80 text-blue-400/60'}`}>
        <span>Check Result Before time</span>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span>
        <span>Marks</span>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span>
        <span>Other's Result</span>
      </div>

      {/* SIDEBAR DRAWER */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className={`fixed top-0 left-0 h-full w-72 ${theme==='light' ? 'bg-white' : 'bg-[#00173d]'} border-r ${t.border} z-50 flex flex-col shadow-2xl`}
            >
              <div className="p-6 border-b border-slate-500/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isAdmin ? 'bg-amber-400 text-black' : t.btnPrimary}`}>
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="leading-tight">
                    <div className="text-base font-bold truncate max-w-[140px]">{formatFirstName(currentUser.name)}</div>
                    <div className={`text-xs font-mono ${t.textMuted}`}>{currentUser.reg}</div>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)}><X size={24} className={t.textMuted} /></button>
              </div>
              <div className="p-4 flex-1 space-y-2">
                <button onClick={() => { setActiveTab('home'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-base font-medium ${activeTab === 'home' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <Search size={20} /> Search Portal
                </button>
                
                {isAdmin && (
                  <>
                    <button onClick={() => { setActiveTab('approvals'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-base font-medium ${activeTab === 'approvals' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <CheckCircle2 size={20} /> Approvals
                    </button>
                    <button onClick={() => { setActiveTab('leaderboard'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-base font-medium ${activeTab === 'leaderboard' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <Crown size={20} /> Leaderboards
                    </button>
                    <button onClick={() => { setActiveTab('admin_chats'); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-5 py-4 rounded-xl text-base font-medium ${activeTab === 'admin_chats' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <div className="flex items-center gap-3"><MessageSquare size={20} /> User Chats</div>
                      {hasUnreadMessages && <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>}
                    </button>
                  </>
                )}

                {!isAdmin && (
                  <>
                    <button onClick={() => { setActiveTab('credits'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-base font-medium ${activeTab === 'credits' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <CreditCard size={20} /> Credits & Wallet
                    </button>
                    <button onClick={() => { setActiveTab('history'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-base font-medium ${activeTab === 'history' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <History size={20} /> Search History
                    </button>
                    <button onClick={() => { setActiveTab('referral'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-base font-medium ${activeTab === 'referral' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <Share2 size={20} /> Referral Program
                    </button>
                    <button onClick={() => { setActiveTab('contact'); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-5 py-4 rounded-xl text-base font-medium ${activeTab === 'contact' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <div className="flex items-center gap-3"><MessageSquare size={20} /> Contact Admin</div>
                      {hasUnreadMessages && <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 z-10">
        
        {/* TAB: ADMIN APPROVALS PAGE */}
        {isAdmin && activeTab === "approvals" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
             <h2 className="text-3xl font-black mb-4 flex items-center gap-2 text-amber-500"><CheckCircle2 /> Manage Approvals</h2>
             
             <div className={`${t.cardBg} border ${t.border} p-6 rounded-3xl`}>
                <h3 className="font-bold text-lg mb-4">Pending Payment Approvals</h3>
                <div className="space-y-3">
                  {pendingApprovals.length === 0 && <p className="text-sm opacity-50">No pending approvals.</p>}
                  {pendingApprovals.map((p) => (
                    <div key={p.id} className={`flex justify-between items-center p-4 border ${t.border} rounded-xl hover:bg-slate-500/5`}>
                      <div>
                        <p className="font-bold text-base">{p.user_reg}</p>
                        <p className="text-xs opacity-70 font-mono">TID: {p.tid_number} | Amount: Rs {p.amount}</p>
                      </div>
                      <button onClick={() => handleAdminApprove(p.id, p.user_reg, p.amount)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors">Approve</button>
                    </div>
                  ))}
                </div>
             </div>

             <div className={`${t.cardBg} border ${t.border} p-6 rounded-3xl`}>
                <h3 className="font-bold text-lg mb-4">Approved History</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {approvedHistory.length === 0 && <p className="text-sm opacity-50">No approved history.</p>}
                  {approvedHistory.map((p) => (
                    <div key={p.id} className={`flex justify-between items-center p-4 border ${t.border} rounded-xl hover:bg-slate-500/5`}>
                      <div>
                        <p className="font-bold text-base">{p.user_reg}</p>
                        <p className="text-xs opacity-70 font-mono">Date: {new Date(p.created_at).toLocaleDateString()} | Rs {p.amount}</p>
                      </div>
                      <button onClick={() => handleAdminReverse(p.id, p.user_reg, p.amount)} className="bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-500 hover:text-white transition-colors">Reverse</button>
                    </div>
                  ))}
                </div>
             </div>
          </motion.div>
        )}

        {/* TAB: ADMIN LEADERBOARD PAGE */}
        {isAdmin && activeTab === "leaderboard" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <h2 className="text-3xl font-black mb-4 flex items-center gap-2 text-amber-500"><Crown /> Leaderboards</h2>
            <div className={`${t.cardBg} border ${t.border} p-6 rounded-3xl`}>
              <h3 className="font-bold text-lg mb-4">Top Credit Holders</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className={`bg-slate-500/5 text-opacity-80`}>
                    <tr>
                      <th className="px-4 py-3 font-bold rounded-tl-xl">Rank</th>
                      <th className="px-4 py-3 font-bold">Registration</th>
                      <th className="px-4 py-3 font-bold text-right rounded-tr-xl">Credits Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-500/10">
                    {leaderboard.length === 0 && <tr><td colSpan={3} className="text-center py-6 opacity-50">No records found.</td></tr>}
                    {leaderboard.map((user, i) => (
                      <tr key={user.user_reg} className={t.rowHover}>
                        <td className={`px-4 py-3 font-black ${i===0 ? 'text-amber-500 text-base' : 'opacity-70'}`}>#{i+1}</td>
                        <td className="px-4 py-3 font-semibold text-base">{user.user_reg}</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-500">{user.credits?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: ADMIN CHATS */}
        {isAdmin && activeTab === "admin_chats" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col h-[75vh] ${t.cardBg} border ${t.border} rounded-3xl overflow-hidden`}>
            {!activeAdminChatUser ? (
              <div className="p-6 overflow-y-auto">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><MessageSquare/> User Messages</h3>
                {adminChatList.length === 0 && <p className="text-sm opacity-50">No messages yet.</p>}
                {adminChatList.map((u) => (
                  <div key={u.reg} onClick={() => loadAdminSingleChat(u.reg)} className={`flex justify-between items-center p-5 border ${t.border} rounded-2xl mb-3 cursor-pointer transition-colors ${t.rowHover}`}>
                    <div>
                      <p className="font-bold text-base mb-1">{u.name}</p>
                      <p className={`text-xs font-mono font-semibold ${t.primary}`}>{u.reg}</p>
                    </div>
                    {u.unread > 0 && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">{u.unread} New</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className={`p-5 border-b ${t.border} flex justify-between items-center bg-slate-500/5`}>
                  <div>
                    <span className="font-bold text-lg">{activeAdminChatUser}</span>
                  </div>
                  <button onClick={() => { setActiveAdminChatUser(null); loadAdminChatList(); }} className="text-sm font-bold underline opacity-70 hover:opacity-100">Back to List</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={chatScrollRef}>
                  {chatMessages.map((msg) => {
                    const isMe = msg.sender_reg === currentUser.reg;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[75%] p-4 rounded-2xl text-base ${isMe ? t.btnPrimary + ' rounded-br-sm' : 'bg-slate-500/10 rounded-bl-sm border ' + t.border}`}>
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 px-2">
                          <span className="text-xs opacity-50">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {isMe && (
                            <div className="flex items-center gap-1.5">
                              {msg.is_read ? <CheckCheck size={14} className="text-blue-400" /> : msg.is_delivered ? <CheckCheck size={14} className="text-gray-400" /> : <Check size={14} className="text-gray-400" />}
                              <button onClick={() => { setEditingMsgId(msg.id); setChatInput(msg.content); }}><Edit2 size={12} className="opacity-50 hover:opacity-100"/></button>
                              <button onClick={() => handleDeleteMessage(msg.id)}><Trash2 size={12} className="text-red-400 opacity-50 hover:opacity-100"/></button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className={`p-4 border-t ${t.border} flex items-center gap-3 bg-slate-500/5`}>
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendMessage()} placeholder="Type a message..." className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl px-5 py-3 text-base focus:outline-none ${t.inputFocus}`} />
                  <button onClick={handleSendMessage} disabled={!chatInput.trim()} className={`${t.btnPrimary} p-3 rounded-xl disabled:opacity-50 transition-transform active:scale-95`}><Send size={20}/></button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: CONTACT ADMIN (USER) */}
        {!isAdmin && activeTab === "contact" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col h-[75vh] ${t.cardBg} border ${t.border} rounded-3xl overflow-hidden`}>
            <div className={`p-5 border-b ${t.border} bg-slate-500/5`}>
              <h3 className="font-bold text-lg flex items-center gap-2"><ShieldAlert className="text-amber-500" size={22}/> Contact Support</h3>
              <p className="text-xs opacity-70 mt-1">Sending as: <span className="font-semibold">{currentUser.name}</span> ({currentUser.reg}) | {currentUser.phone}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={chatScrollRef}>
              {chatMessages.length === 0 && <div className="text-center py-10 opacity-50 text-sm">Send a message to admin. They usually reply within 24 hours.</div>}
              {chatMessages.map((msg) => {
                const isMe = msg.sender_reg === currentUser.reg;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] p-4 rounded-2xl text-base ${isMe ? t.btnPrimary + ' rounded-br-sm' : 'bg-slate-500/10 rounded-bl-sm border ' + t.border}`}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 px-2">
                      <span className="text-xs opacity-50">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {isMe && (
                        <div className="flex items-center gap-1.5">
                          {msg.is_read ? <CheckCheck size={14} className="text-blue-400" /> : msg.is_delivered ? <CheckCheck size={14} className="text-gray-400" /> : <Check size={14} className="text-gray-400" />}
                          <button onClick={() => { setEditingMsgId(msg.id); setChatInput(msg.content); }}><Edit2 size={12} className="opacity-50 hover:opacity-100"/></button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className={`p-4 border-t ${t.border} flex items-center gap-3 bg-slate-500/5`}>
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendMessage()} placeholder="Type a message..." className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl px-5 py-3 text-base focus:outline-none ${t.inputFocus}`} />
              <button onClick={handleSendMessage} disabled={!chatInput.trim()} className={`${t.btnPrimary} p-3 rounded-xl disabled:opacity-50 transition-transform active:scale-95`}><Send size={20}/></button>
            </div>
          </motion.div>
        )}

        {/* TAB: HOME (SEARCH PORTAL) */}
        {activeTab === "home" && (
          <>
            {isAdmin && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg}`}>
                  <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-1.5"><CreditCard size={14}/> Sales</div>
                  <div className="text-2xl font-black">{adminStats.sales}</div>
                </div>
                <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg} relative`}>
                  {pendingApprovals.length > 0 && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>}
                  <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-1.5"><CheckCircle2 size={14}/> Pending</div>
                  <div className="text-2xl font-black">{pendingApprovals.length}</div>
                </div>
                <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg}`}>
                  <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-1.5"><UsersRound size={14}/> Total Users</div>
                  <div className="text-2xl font-black">{adminStats.totalUsers}</div>
                </div>
                <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg}`}>
                  <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-1.5"><DollarSign size={14}/> Profit Earned</div>
                  <div className="text-2xl font-black text-emerald-500">Rs {adminStats.profit.toLocaleString()}</div>
                </div>
              </motion.div>
            )}

            {isAdmin && pendingApprovals.length > 0 && (
              <div className={`mb-8 ${t.cardBg} border ${t.border} p-6 rounded-3xl`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Recent Pending Approvals</h3>
                  <button onClick={() => setActiveTab('approvals')} className="text-sm font-bold underline opacity-70 hover:opacity-100">View All</button>
                </div>
                <div className="space-y-3">
                  {pendingApprovals.slice(0,3).map((p) => (
                    <div key={p.id} className={`flex justify-between items-center p-4 border ${t.border} rounded-xl hover:bg-slate-500/5`}>
                      <div>
                        <p className="font-bold text-base">{p.user_reg}</p>
                        <p className="text-xs opacity-70 font-mono">TID: {p.tid_number} | Rs {p.amount}</p>
                      </div>
                      <button onClick={() => handleAdminApprove(p.id, p.user_reg, p.amount)} className="bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-5 py-2 rounded-lg font-bold text-sm">Approve</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`relative overflow-hidden rounded-[2rem] p-6 sm:p-8 shadow-2xl mb-8 border ${theme === 'light' ? 'bg-gradient-to-br from-[#0056b3] to-[#00348c] text-white border-[#0056b3]/20 shadow-[#0056b3]/20' : 'bg-gradient-to-br from-[#001c4d] to-[#000a1a] text-blue-50 border-[#00348c] shadow-amber-500/5'}`}>
              <div className="absolute top-0 left-0 p-4 opacity-10 pointer-events-none transform -translate-x-4 -translate-y-4">
                <GraduationCap size={160} />
              </div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl sm:text-4xl font-black mb-2">Welcome back, {formatFirstName(currentUser.name)}!</h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${theme==='light' ? 'bg-white/20 border-white/30' : 'bg-[#00205b]/50 border-blue-400/20'} text-[10px] sm:text-xs font-bold tracking-widest uppercase shadow-sm`}>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 8px 1px #4ade80" }}></div>
                      Live Database
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-2 mt-4">
                  {!isAdmin && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${theme==='light' ? 'bg-white/10 border-white/20' : 'bg-[#00205b]/40 border-blue-400/20'} text-xs sm:text-sm font-bold`}>
                      <Activity size={16} className="opacity-70"/> Free Attempts: <span className={theme==='light' ? 'text-white font-black' : 'text-amber-400 font-black'}>{freeAttempts}/4</span>
                    </div>
                  )}
                  {!isAdmin && (
                    <button onClick={() => setActiveTab('referral')} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${theme==='light' ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-[#00205b]/40 border-blue-400/20 hover:bg-[#00205b]/60'} text-xs sm:text-sm font-bold transition-colors`}>
                      <Share2 size={16} className="text-emerald-400"/> Earn by Sharing
                    </button>
                  )}
                </div>

                {/* Free attempts limit CTA block */}
                {(freeAttempts <= 0) && !useCredits && !isAdmin && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                    className="mt-6 bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 p-4 sm:p-5 rounded-2xl text-sm font-medium flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-full"><Lock size={20}/></div>
                      <span className="leading-snug">Your free attempts for today have ended. Buy credits to execute searches without limits.</span>
                    </div>
                    <button onClick={() => setActiveTab('credits')} className={`${theme==='light' ? 'bg-[#001c4d] text-amber-400' : 'bg-amber-500 text-[#00122a]'} px-6 py-2.5 rounded-xl font-bold whitespace-nowrap shadow-lg active:scale-95 transition-transform`}>
                      Buy Credits
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            <div className={`${t.cardBg} border ${t.border} p-5 sm:p-7 rounded-3xl mb-8 transition-all`}>
              <form onSubmit={(e) => handleSearch(e, 0)} className="flex flex-col gap-5">
                
                {/* UPGRADED SEARCH TOGGLE UI */}
                <div className="flex flex-col items-center mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">Search By</span>
                  <div className={`flex p-1.5 rounded-2xl w-full max-w-sm relative ${theme==='light'?'bg-slate-100 border border-slate-200 shadow-inner':'bg-[#00122a] border border-[#00348c]/30'}`}>
                    <div 
                      className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-300 ease-out shadow-md ${t.btnPrimary}`}
                      style={{ left: searchMode === 'Roll Number' ? '6px' : 'calc(50%)' }}
                    />
                    <button type="button" onClick={() => {setSearchMode('Roll Number'); setSearchQuery(""); setSearchResults(null);}} className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${searchMode === 'Roll Number' ? (theme==='light'?'text-white':'text-black') : 'opacity-60 hover:opacity-100'}`}>
                      Reg Number
                    </button>
                    <button type="button" onClick={() => {setSearchMode('Name'); setSearchQuery(""); setSearchResults(null);}} className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${searchMode === 'Name' ? (theme==='light'?'text-white':'text-black') : 'opacity-60 hover:opacity-100'}`}>
                      Name
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {searchMode === "Name" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 overflow-hidden pt-2"
                    >
                      <div className="relative z-30">
                        <Calendar className={`absolute left-3 top-3 ${t.textMuted} z-10`} size={16} />
                        <Select
                          options={filterOptions.sessions}
                          value={selectedSession}
                          onChange={(val) => { setSelectedSession(val); setSelectedSection(null); }}
                          styles={selectStyles}
                          placeholder="All Sessions"
                          isClearable
                        />
                      </div>
                      <div className="relative z-20">
                        <Building className={`absolute left-3 top-3 ${t.textMuted} z-10`} size={16} />
                        <Select
                          options={filterOptions.departments}
                          value={selectedDept}
                          onChange={(val) => { setSelectedDept(val); setSelectedSection(null); }}
                          styles={selectStyles}
                          placeholder="All Departments"
                          isClearable
                        />
                      </div>
                      <div className="relative z-10">
                        <Users className={`absolute left-3 top-3 ${t.textMuted} z-10`} size={16} />
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
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className={`absolute left-4 top-3.5 ${t.textMuted}`} size={20} />
                    <input type="text" placeholder={searchMode === 'Roll Number' ? "e.g. F20BSCS1M010" : "e.g. Ali"} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-2xl py-3 pl-12 pr-4 focus:outline-none ${t.inputFocus} text-base`}
                    />
                  </div>
                  <button type="submit" disabled={isSearching || !searchQuery.trim()} className={`${t.btnPrimary} font-bold rounded-2xl px-10 py-3 flex items-center justify-center gap-2 text-base disabled:opacity-70 disabled:cursor-not-allowed shadow-lg`}>
                    {isSearching ? <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Search"}
                  </button>
                </div>
              </form>
            </div>

            {searchResults && (
              <div className={`text-sm font-bold mb-4 px-2 ${t.textMuted}`}>
                Showing {searchResults.length} of {totalRecords} records found
              </div>
            )}

            <div className="space-y-4">
              <AnimatePresence>
                {searchResults?.map((student, idx) => (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`${t.cardBg} border ${t.border} rounded-3xl overflow-hidden`}>
                    <div className="p-4 sm:p-5 flex justify-between items-center gap-3 cursor-pointer hover:bg-slate-500/5 transition-colors" onClick={() => handleExpandResult(student.reg, student.id)}>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-md border font-mono font-semibold ${theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-[#00122a] border-[#00348c]'}`}>{student.reg}</span>
                          <h3 className="text-base sm:text-lg font-bold">{student.name}</h3>
                        </div>
                        <div className={`text-xs ${t.textMuted} font-medium`}>{student.session} • {student.section}</div>
                      </div>
                      <button className={`p-2 rounded-full ${t.textMuted} hover:${t.primary} bg-slate-500/5 transition-colors`}>
                        {expandedReg === student.reg ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {expandedReg === student.reg && studentDetails && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className={`border-t ${t.border} overflow-hidden ${theme === 'light' ? 'bg-slate-50/50' : 'bg-[#00122a]/30'}`}>
                          <div className="p-4 sm:p-6 space-y-5">
                            {studentDetails.length === 0 ? (
                              <div className="text-center py-8 opacity-60 font-medium text-base">
                                No Records found.
                              </div>
                            ) : (
                              <>
                                {studentDetails.map((sem: any, sIdx: number) => (
                                  <div key={sIdx} className={`rounded-[1.5rem] border ${t.border} ${t.cardBg} overflow-hidden shadow-sm`}>
                                    <div className={`px-4 py-3 text-xs sm:text-sm font-black uppercase tracking-widest ${theme === 'light' ? 'bg-[#0056b3]/5 text-[#0056b3]' : 'bg-[#00122a] text-amber-400'}`}>
                                      Semester {sem.semNum}
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
                                        <thead className={`border-b ${t.border} text-opacity-80`}>
                                          <tr>
                                            <th className="px-3 py-2.5 font-bold">Sub</th>
                                            <th className="px-3 py-2.5 text-center font-bold">Mid</th>
                                            <th className="px-3 py-2.5 text-center font-bold">Sess</th>
                                            <th className="px-3 py-2.5 text-center font-bold">Fin</th>
                                            <th className="px-3 py-2.5 text-center font-bold">Pr.S</th>
                                            <th className="px-3 py-2.5 text-center font-bold">Pr.F</th>
                                            <th className="px-3 py-2.5 text-center font-bold">Tot</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                          {sem.courses.map((course: any, cIdx: number) => (
                                            <tr key={cIdx} className={t.rowHover}>
                                              <td className="px-3 py-2.5 max-w-[120px] sm:max-w-[200px] truncate" title={course.name}>
                                                <span className="font-semibold block text-sm">{course.name}</span>
                                                <span className="block text-[10px] sm:text-xs opacity-70 font-mono mt-0.5">{course.code}</span>
                                              </td>
                                              <td className="px-3 py-2.5 text-center font-mono">{course.mid ?? "-"}</td>
                                              <td className="px-3 py-2.5 text-center font-mono">{(isAdmin || useCredits) ? (course.sess ?? "-") : <Lock size={14} className="mx-auto opacity-50"/>}</td>
                                              <td className="px-3 py-2.5 text-center font-mono">{(isAdmin || useCredits) ? (course.fin ?? "-") : <Lock size={14} className="mx-auto opacity-50"/>}</td>
                                              <td className="px-3 py-2.5 text-center font-mono">{(isAdmin || useCredits) ? (course.prSess ?? "-") : <Lock size={14} className="mx-auto opacity-50"/>}</td>
                                              <td className="px-3 py-2.5 text-center font-mono">{(isAdmin || useCredits) ? (course.prFin ?? "-") : <Lock size={14} className="mx-auto opacity-50"/>}</td>
                                              <td className={`px-3 py-2.5 text-center font-mono font-bold text-sm ${(isAdmin || useCredits) ? t.primary : ''}`}>{(isAdmin || useCredits) ? (course.tot ?? "-") : <Lock size={14} className="mx-auto opacity-50"/>}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
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
                <button onClick={(e) => handleSearch(e, page + 1)} className={`w-full py-4 rounded-2xl border ${t.border} ${t.cardBg} hover:bg-slate-500/5 text-base font-bold transition-colors shadow-sm`}>
                  Load Next 10 Records
                </button>
              )}
            </div>
          </>
        )}

        {/* TAB: CREDITS (ONLY SHOWN TO NORMAL USERS) */}
        {!isAdmin && activeTab === "credits" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl mx-auto">
            <div className={`p-8 rounded-[2rem] text-center border ${theme === 'light' ? 'bg-gradient-to-b from-white to-slate-50 border-slate-200 shadow-md' : 'bg-gradient-to-b from-[#001c4d] to-[#00122a] border-[#00348c]'}`}>
               <Wallet size={48} className={`mx-auto mb-4 ${t.primary}`}/>
               <h3 className={`text-sm font-bold uppercase tracking-widest ${t.textMuted} mb-2`}>Available Balance</h3>
               <div className="text-5xl sm:text-6xl font-black">{credits.toLocaleString()} <span className="text-2xl font-medium opacity-50">Credits</span></div>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><TrendingUp size={22}/> Top-up Plans</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {packages.map(pkg => (
                  <div key={pkg.id} onClick={() => setPaymentForm({ ...paymentForm, package: pkg.id })}
                    className={`cursor-pointer p-5 rounded-2xl border-2 transition-all relative overflow-hidden shadow-sm ${paymentForm.package === pkg.id ? "border-amber-500 bg-amber-500/10" : t.border + " " + t.cardBg}`}
                  >
                    {pkg.pop && <div className="absolute top-0 right-0 bg-amber-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-sm">Popular</div>}
                    <div className="text-sm font-bold opacity-70 mb-2">{pkg.label}</div>
                    <div className="text-xl sm:text-2xl font-black mb-3">{pkg.price}</div>
                    <div className={`inline-block text-xs font-black px-3 py-1.5 rounded-lg bg-amber-500 text-black shadow-sm`}>{pkg.credits} Credits</div>
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {paymentForm.package && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`p-6 sm:p-8 rounded-[2rem] border ${t.border} ${t.cardBg} space-y-5 shadow-lg`}>
                  <h4 className="font-bold text-lg">Complete Your Payment</h4>
                  <div className={`p-4 rounded-xl text-sm font-mono border ${t.border} bg-slate-500/5`}>
                    <p className="opacity-70 mb-2">Transfer exact amount via EasyPaisa/JazzCash/Bank to:</p>
                    <p className={`font-bold text-lg ${t.primary}`}>Meezan Bank: 01234567890</p>
                    <p>Account Title: IUB Portal Technologies</p>
                  </div>
                  
                  {paymentForm.package === 'custom' && (
                    <div className="mb-2">
                      <input type="number" placeholder="Enter Custom Amount (Rs)" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-3.5 px-5 text-base focus:outline-none ${t.inputFocus}`} />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Your Name on Bank Account" value={paymentForm.name} onChange={(e) => setPaymentForm({...paymentForm, name: e.target.value})}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-3.5 px-5 text-base focus:outline-none ${t.inputFocus}`} />
                    <input type="text" placeholder="TID Number of Receipt" value={paymentForm.tid} onChange={(e) => setPaymentForm({...paymentForm, tid: e.target.value})}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-3.5 px-5 text-base focus:outline-none ${t.inputFocus}`} />
                  </div>
                  <button onClick={handlePaymentSubmit} className={`w-full sm:w-auto ml-auto px-10 py-4 ${t.btnPrimary} font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-base shadow-xl`}>
                    <CheckCircle2 size={20}/> Submit Payment Verification
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`rounded-[2rem] border ${t.border} ${t.cardBg} overflow-hidden shadow-sm`}>
               <div className={`p-5 border-b ${t.border} flex justify-between items-center bg-slate-500/5`}>
                 <h3 className="font-bold text-base flex items-center gap-2"><History size={18}/> Transactions & Usage</h3>
                 {creditsTabLoading && <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />}
               </div>
               
               <div className="p-0 overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className={`bg-slate-500/5 text-opacity-80`}>
                     <tr>
                       <th className="px-5 py-3 font-bold">Date</th>
                       <th className="px-5 py-3 font-bold">Type</th>
                       <th className="px-5 py-3 font-bold">Details</th>
                       <th className="px-5 py-3 text-right font-bold">Status/Cost</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-500/10">
                     {historyLogs.deposits.length === 0 && historyLogs.usage.length === 0 && !creditsTabLoading && (
                       <tr><td colSpan={4} className="px-5 py-10 text-center opacity-50 text-base">No recent activity found.</td></tr>
                     )}
                     {historyLogs.deposits.map((dep, i) => (
                       <tr key={`dep-${i}`} className={t.rowHover}>
                         <td className="px-5 py-4 font-mono opacity-70 text-xs">{new Date(dep.created_at).toLocaleDateString()}</td>
                         <td className="px-5 py-4 font-semibold text-emerald-500 flex items-center gap-1.5"><ArrowRight size={14} className="rotate-45"/> Deposit</td>
                         <td className="px-5 py-4 opacity-80">Rs {dep.amount} via {dep.account_name}</td>
                         <td className={`px-5 py-4 text-right font-bold ${dep.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                           {dep.status.toUpperCase()}
                         </td>
                       </tr>
                     ))}
                     {historyLogs.usage.map((usg, i) => (
                       <tr key={`usg-${i}`} className={t.rowHover}>
                         <td className="px-5 py-4 font-mono opacity-70 text-xs">{new Date(usg.created_at).toLocaleDateString()}</td>
                         <td className="px-5 py-4 font-semibold text-red-400 flex items-center gap-1.5"><Search size={14}/> Paid Search</td>
                         <td className="px-5 py-4 opacity-80">Searched: {usg.search_query}</td>
                         <td className="px-5 py-4 text-right font-bold text-red-400">- {SEARCH_COST} Credits</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        )}

        {/* TAB: SEARCH HISTORY (ONLY SHOWN TO NORMAL USERS) */}
        {!isAdmin && activeTab === "history" && (
          <div className="space-y-6">
            <h3 className="font-bold text-2xl mb-6 flex items-center gap-3"><History className={t.primary} size={28}/> Paid Search History</h3>
            <p className="text-sm opacity-70 mb-6 max-w-2xl">A complete record of your executed paid searches. Clicking 'See Result' will automatically re-run the search in the portal.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paidSearchHistory.length === 0 && (
                 <div className={`col-span-full p-10 text-center rounded-3xl border ${t.border} ${t.cardBg} opacity-60`}>
                    No paid searches executed yet.
                 </div>
              )}
              {paidSearchHistory.map((log) => (
                <div key={log.id} className={`${t.cardBg} border ${t.border} p-5 rounded-3xl shadow-sm flex flex-col justify-between`}>
                  <div className="mb-4 border-l-4 border-amber-500 pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">{new Date(log.created_at).toLocaleDateString()}</p>
                    <p className="font-bold text-lg leading-tight">{log.search_query}</p>
                  </div>
                  <button onClick={() => executeReSearch(log.search_query)} className={`w-full py-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black font-bold text-sm transition-colors`}>
                    See Result
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: REFERRAL (ONLY SHOWN TO NORMAL USERS) */}
        {!isAdmin && activeTab === "referral" && (
          <div className={`${t.cardBg} border ${t.border} p-10 rounded-[2rem] text-center shadow-lg`}>
            <div className={`w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-[#0056b3] to-[#00348c] shadow-xl text-white`}>
              <Share2 size={36} />
            </div>
            <h3 className="font-black text-2xl mb-3">Invite & Earn Credits</h3>
            <p className="text-base opacity-70 mb-8 max-w-md mx-auto">Share your link with classmates. If they sign up and buy credits, you instantly get a 20% bonus of their purchase added to your wallet!</p>
            <div className={`max-w-md mx-auto p-2.5 rounded-2xl border ${t.border} bg-slate-500/5 font-mono text-sm flex justify-between items-center pl-5 shadow-inner`}>
              <span className="truncate opacity-80 font-semibold">https://iubbackend.vercel.app/ref/{currentUser.reg}</span>
              <button onClick={() => { navigator.clipboard.writeText(`https://iubbackend.vercel.app/ref/${currentUser.reg}`); showToast("Copied!", "Referral link copied to clipboard", "info"); }} className={`${t.btnPrimary} px-6 py-2.5 rounded-xl font-bold shadow-md active:scale-95 transition-transform`}>Copy</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
