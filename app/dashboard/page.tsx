"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Building, Calendar, Users, 
  Sun, Moon, ChevronDown, Lock,
  Menu, CreditCard, History, Share2, Wallet,
  CheckCircle2, X, GraduationCap, Activity, TrendingUp, AlertCircle,
  ShieldAlert, DollarSign, UsersRound, Crown, ArrowRight, MessageSquare, Check, CheckCheck, Edit2, Trash2, Send, Download, Unlock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';
import Select from 'react-select'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

const ADMIN_REG = "S25BARIN1M01118";
const SEARCH_COST = 850; 

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
  const [freeAttempts, setFreeAttempts] = useState(4);
  const isProMode = isAdmin || credits >= SEARCH_COST;
  
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
  const [unlockedRegs, setUnlockedRegs] = useState<Set<string>>(new Set());

  const [paymentForm, setPaymentForm] = useState({ package: "", amount: "", name: "", tid: "" });
  const [historyLogs, setHistoryLogs] = useState<HistoryLogs>({ deposits: [], usage: [] });
  const [walletPage, setWalletPage] = useState(1);
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
  const [adminChatList, setAdminChatList] = useState<{reg: string, name: string, unread: number, last_msg_time: string}[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [activeAdminChatUser, setActiveAdminChatUser] = useState<{reg: string, name: string} | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // PWA STATE
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // PERSISTENT STRUCTURAL MOUNT LOGIC
  useEffect(() => {
    const savedTheme = localStorage.getItem("iub_theme") as Theme;
    if (savedTheme) setTheme(savedTheme);

    const cachedUser = localStorage.getItem("iub_currentUser");
    if (cachedUser) setCurrentUser(JSON.parse(cachedUser));

    const cachedCredits = localStorage.getItem("iub_credits");
    if (cachedCredits) setCredits(Number(cachedCredits));

    const cachedAttempts = localStorage.getItem("iub_freeAttempts");
    if (cachedAttempts) setFreeAttempts(Number(cachedAttempts));
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("iub_theme", nextTheme);
      return nextTheme;
    });
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  // STRICT FORCE-DROPOUT INTERCEPTOR
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        localStorage.removeItem("iub_currentUser");
        localStorage.removeItem("iub_credits");
        localStorage.removeItem("iub_freeAttempts");
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

        const cachedStats = localStorage.getItem('iub_adminStats');
        if (cachedStats && isAdmin) setAdminStats(JSON.parse(cachedStats));

        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          router.push('/login');
          return;
        }

        // 1. Fetch user record based on the authenticated email session
        let actualReg = "UNKNOWN";
        const { data: userRecord } = await supabase
          .from("users")
          .select("reg, phone, email")
          .eq("email", session.user.email)
          .maybeSingle();
        
        if (userRecord?.reg) {
          // Ensure we keep the exact string case from the database for mapping calculations
          actualReg = userRecord.reg; 
        } else {
          localStorage.removeItem("iub_currentUser");
          router.push('/login');
          return;
        }
        
        // 2. Fetch the student name matching the exact casing or using an insensitive fallback balance
        let actualName = "Student";
        if (actualReg !== "UNKNOWN") {
          // Try matching directly first to satisfy strict case policies, then fallback
          let { data: studentNameRes } = await supabase
            .from("students")
            .select("name")
            .eq("reg", actualReg) // Casing-safe match to clear RLS policy restrictions
            .maybeSingle();
        
          // Alternative fallback if casing differences live in the source imports
          if (!studentNameRes?.name) {
            const { data: lowerCaseRes } = await supabase
              .from("students")
              .select("name")
              .ilike("reg", actualReg.trim())
              .maybeSingle();
            studentNameRes = lowerCaseRes;
          }
        
          if (studentNameRes?.name) actualName = studentNameRes.name;
        }
        
        // 4. Save clean uppercase representations directly for frontend rendering consistency
        const newUserState = { 
          reg: actualReg.toUpperCase(), 
          name: actualName, 
          phone: userRecord?.phone || "", 
          email: userRecord?.email || "" 
        };
        setCurrentUser(newUserState);
        localStorage.setItem("iub_currentUser", JSON.stringify(newUserState));

        if (actualReg !== "UNKNOWN") {
          const { data: userCreditsRes } = await supabase.from("user_credits").select("*").ilike("user_reg", actualReg).maybeSingle();
          if (userCreditsRes) {
            setCredits(userCreditsRes.credits || 0);
            localStorage.setItem("iub_credits", (userCreditsRes.credits || 0).toString());
            
            const attempts = Math.max(0, 4 - (userCreditsRes.free_searches_today || 0));
            setFreeAttempts(attempts);
            localStorage.setItem("iub_freeAttempts", attempts.toString());
          }
          
          if (actualReg !== ADMIN_REG) {
             const channel = supabase.channel('credits_update')
               .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_credits', filter: `user_reg=eq.${actualReg}` }, (payload) => {
                  setCredits(payload.new.credits);
                  localStorage.setItem("iub_credits", payload.new.credits.toString());
                  setFreeAttempts(Math.max(0, 4 - (payload.new.free_searches_today || 0)));
               }).subscribe();
          }
        }

        const [deptsRes, sessionsRes, sectionsRes] = await Promise.all([
          supabase.from("departments").select("id, depart_name, depart_code"),
          supabase.from("academic_sessions").select("id, session_code"),
          supabase.from("sections").select("id, section_name, session_id, department_id")
        ]);

        const newFilters = {
          departments: (deptsRes.data || []).map(d => ({ id: d.id, value: d.id.toString(), label: `${d.depart_code} - ${d.depart_name}` })),
          sessions: (sessionsRes.data || []).map(s => ({ id: s.id, value: s.id.toString(), label: s.session_code })),
          sections: (sectionsRes.data || []).map(s => ({ id: s.id, value: s.id.toString(), label: s.section_name, session_id: s.session_id, department_id: s.department_id }))
        };
        setFilterOptions(newFilters);
        localStorage.setItem('iub_filterOptions', JSON.stringify(newFilters));

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

  // REALTIME REAL-TIME CHAT & BLUE TICK HANDLER
  useEffect(() => {
    if (!currentUser.reg) return;

    const channel = supabase.channel('messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        
        const isActiveChat = isAdmin 
          ? (activeAdminChatUser && ((newMsg.sender_reg === activeAdminChatUser.reg && newMsg.receiver_reg === ADMIN_REG) || (newMsg.sender_reg === ADMIN_REG && newMsg.receiver_reg === activeAdminChatUser.reg)))
          : ((newMsg.sender_reg === currentUser.reg && newMsg.receiver_reg === ADMIN_REG) || (newMsg.sender_reg === ADMIN_REG && newMsg.receiver_reg === currentUser.reg));

        if (isActiveChat) {
          setChatMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          if (newMsg.receiver_reg === currentUser.reg && !newMsg.is_read) {
            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then(() => {
              if (isAdmin && activeAdminChatUser) {
                loadAdminSingleChat(activeAdminChatUser.reg, activeAdminChatUser.name);
              } else if (!isAdmin) {
                loadUserChat();
              }
            });
          }
        } else if (newMsg.receiver_reg === currentUser.reg) {
          setHasUnreadMessages(true);
        }

        if (isAdmin) loadAdminChatList();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updatedMsg = payload.new as ChatMessage;
        setChatMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        if (isAdmin) loadAdminChatList();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [currentUser.reg, activeAdminChatUser, isAdmin]);

  // REALTIME INSTANT ADMIN REQUESTS & APPROVAL RE-FETCH SCRIPT
  useEffect(() => {
    if (isAdmin) {
      const adminChannel = supabase.channel('admin_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments_record' }, () => {
          loadRealAdminData();
        }).subscribe();
      return () => { supabase.removeChannel(adminChannel); }
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === "credits") loadCreditsHistory(1);
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

      const stats = {
        sales: totalSales,
        pending: pendingData?.length || 0,
        totalUsers: userCount || 0,
        premiumUsers: premiumCount || 0,
        profit: totalProfit,
        searches: searchCount || 0
      };
      setAdminStats(stats);
      localStorage.setItem('iub_adminStats', JSON.stringify(stats));

      const { data: topUsers } = await supabase.from('user_credits').select('user_reg, credits').order('credits', { ascending: false }).limit(10);
      setLeaderboard(topUsers || []);
    } catch (e) {
      console.error("Failed to load admin stats", e);
    }
  };

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
        supabase.from("user_search_log").select("*").ilike("searcher_reg", currentUser.reg).eq("search_type", "Paid Search").order("created_at", { ascending: false }).limit(limit)
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
        .eq("search_type", "Paid Search")
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

  const loadAdminSingleChat = async (reg: string, name: string) => {
    setActiveAdminChatUser({ reg, name });
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
      const receiver = isAdmin ? activeAdminChatUser?.reg : ADMIN_REG;
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
    } catch(e) {}
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await supabase.from('messages').delete().eq('id', id);
      setChatMessages(prev => prev.filter(m => m.id !== id));
      isAdmin && activeAdminChatUser ? loadAdminSingleChat(activeAdminChatUser.reg, activeAdminChatUser.name) : loadUserChat();
    } catch(e) {}
  };

  const handleAdminDeleteEntireChat = async () => {
    if (!activeAdminChatUser) return;
    try {
      await supabase.from('messages').delete().or(`and(sender_reg.eq.${activeAdminChatUser.reg},receiver_reg.eq.${ADMIN_REG}),and(sender_reg.eq.${ADMIN_REG},receiver_reg.eq.${activeAdminChatUser.reg})`);
      setActiveAdminChatUser(null);
      loadAdminChatList();
      showToast("Deleted", "Entire chat deleted.", "info");
    } catch (e) {}
  };

  const maskEmail = (email: string) => {
    if (!email) return "Unknown";
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const [name, domain] = parts;
    if (name.length <= 4) return `${name.slice(0, 1)}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-2)}@${domain}`;
  };

  const searchAdminChatUser = async () => {
    if (!chatSearchQuery.trim()) return;
    try {
      const { data } = await supabase.from('users').select('reg, email, phone').or(`reg.ilike.%${chatSearchQuery}%,email.ilike.%${chatSearchQuery}%`).limit(5);
      if (data && data.length > 0) {
        const mapped = data.map(u => ({ reg: u.reg, name: maskEmail(u.email), unread: 0, last_msg_time: new Date().toISOString() }));
        setAdminChatList(prev => {
          const combined = [...mapped, ...prev];
          const unique = Array.from(new Map(combined.map(item => [item.reg, item])).values());
          return unique;
        });
      }
    } catch (e) {}
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
      zIndex: 50
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
        searcher_reg: currentUser.reg.toUpperCase(),
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

    if (newPage === 0 && isAdmin) {
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

 const handleExpandResult = async (reg: string, studentId: number, forcePro = false) => {
    if (expandedReg === reg && !forcePro) {
      setExpandedReg(null);
      return;
    }

    const isPro = forcePro || isProMode;
    const isUnlocked = unlockedRegs.has(reg);

    if (!isAdmin && !isUnlocked) {
      if (!isPro && freeAttempts <= 0) {
        showToast("Out of Attempts", "Redirecting to wallet to top up.", "error");
        setActiveTab('credits');
        return;
      }

      if (isPro) {
        await supabase.rpc('deduct_credits', { p_user_reg: currentUser.reg, p_cost: SEARCH_COST });
        setCredits(p => p - SEARCH_COST);
        logSearch(reg, "Paid Search");
      } else {
        await supabase.rpc('deduct_free_attempt', { p_user_reg: currentUser.reg });
        setFreeAttempts(p => p - 1);
        logSearch(reg, "Free Search");
      }
      setUnlockedRegs(prev => new Set(prev).add(reg));
    }

    setExpandedReg(reg);

    try {
      const columns = isPro
        ? "id, sessional_marks, mid_term_marks, end_term_marks, practical_sessional_marks, practical_final_marks, total_marks, subject_id (course_code, course_name, credit_hours), semester_num, semester"
        : "id, mid_term_marks, subject_id (course_code, course_name, credit_hours), semester_num, semester";

      const { data: records, error } = await supabase.from("results").select(columns).eq("student_id", studentId); 
      if (error) throw error;

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
        
        const totalMarks = isPro ? roundMark(rec.total_marks) : null;
        const gradeInfo = isPro ? getGradeInfo(totalMarks) : { gp: 0, grade: '🔒' };
        const credits = Number(rec.subject_id?.credit_hours) || 3;

        acc[sem].push({
          code: rec.subject_id?.course_code || "N/A",
          name: rec.subject_id?.course_name || "Unknown",
          credits: credits,
          mid: roundMark(rec.mid_term_marks),
          sess: isPro ? roundMark(rec.sessional_marks) : null,
          fin: isPro ? roundMark(rec.end_term_marks) : null,
          prSess: isPro ? roundMark(rec.practical_sessional_marks) : null,
          prFin: isPro ? roundMark(rec.practical_final_marks) : null,
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
        let totalQualityPoints = 0;
        let totalCr = 0;
        let semTotalMarks = 0;
        let semMaxMarks = 0;
        let canCalculate = isPro;

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

        const sgpa = canCalculate && totalCr > 0 ? (totalQualityPoints / totalCr).toFixed(2) : (canCalculate ? "0.00" : "🔒");

        return {
          semNum: sem.replace("Semester ", ""), 
          courses: courses,
          sgpa: sgpa,
          totalMarks: canCalculate ? semTotalMarks : "🔒",
          maxMarks: canCalculate ? semMaxMarks : "🔒",
          canCalculate
        };
      });

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
    { id: 'pkg1', price: 'Rs 500', amount: 500, credits: '10,000', label: 'Solo Student' },
    { id: 'pkg2', price: 'Rs 1000', amount: 1000, credits: '25,000', label: 'Friends Plan', pop: true },
    { id: 'pkg3', price: 'Rs 5000', amount: 5000, credits: '125,000', label: 'CR/GR Plan' },
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
      loadCreditsHistory(1);
    } catch(e) {
      showToast("Error", "Submission failed", "error");
    }
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
          
          {isAdmin && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400 text-[#00122a] transition-all text-xs font-black shadow-md border border-amber-500`}>
              <ShieldAlert size={14} />
              <span>ADMIN MODE</span>
            </div>
          )}

          {!isAdmin && (
            <>
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
            </>
          )}

          <button onClick={toggleTheme} className={`p-1.5 rounded-lg border ${t.border} ${theme === 'light' ? 'bg-white text-amber-500 shadow-sm' : 'bg-[#001c4d] text-blue-300'}`}>
            {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* THIN NANO SUB-HEADER */}
      <div className={`w-full py-1.5 text-[10px] font-bold tracking-wide flex justify-center items-center gap-2 sm:gap-4 border-b ${t.border} ${theme === 'light' ? 'bg-slate-100/80 text-slate-600' : 'bg-[#000a1a]/80 text-blue-400/60'}`}>
        <span>Check Result Before time</span>
        <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
        <span>Marks</span>
        <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
        <span>Other's Result</span>
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isAdmin ? 'bg-amber-400 text-black' : t.btnPrimary}`}>
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-bold truncate max-w-[130px]">{formatFirstName(currentUser.name)}</div>
                    <div className={`text-[10px] font-mono ${t.textMuted}`}>{currentUser.reg}</div>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)}><X size={20} className={t.textMuted} /></button>
              </div>
              <div className="p-3 flex-1 space-y-1">
                <button onClick={() => { setActiveTab('home'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'home' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                  <Search size={18} /> Search Portal
                </button>
                
                {isAdmin && (
                  <>
                    <button onClick={() => { setActiveTab('approvals'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'approvals' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <CheckCircle2 size={18} /> Approvals
                    </button>
                    <button onClick={() => { setActiveTab('leaderboard'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeTab === 'leaderboard' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <Crown size={18} /> Leaderboards
                    </button>
                    <button onClick={() => { setActiveTab('admin_chats'); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium ${activeTab === 'admin_chats' ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                      <div className="flex items-center gap-3"><MessageSquare size={18} /> User Chats</div>
                      {hasUnreadMessages && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                    </button>
                  </>
                )}

                {!isAdmin && (
                  <>
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
                      <div className="flex items-center gap-3"><MessageSquare size={18} /> Contact Admin</div>
                      {hasUnreadMessages && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                    </button>
                  </>
                )}
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

        {/* TAB: ADMIN APPROVALS PAGE */}
        {isAdmin && activeTab === "approvals" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <h2 className="text-2xl font-black mb-2 flex items-center gap-2 text-amber-500"><CheckCircle2 /> Manage Approvals</h2>
             
             <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
                <h3 className="font-bold text-base mb-3">Pending Payment Approvals</h3>
                <div className="space-y-2">
                  {pendingApprovals.length === 0 && <p className="opacity-50">No pending approvals.</p>}
                  {pendingApprovals.map((p) => (
                    <div key={p.id} className={`flex justify-between items-center p-3 border ${t.border} rounded-xl hover:bg-slate-500/5`}>
                      <div>
                        <p className="font-bold">{p.user_reg}</p>
                        <p className="text-[11px] opacity-70 font-mono">TID: {p.tid_number} | Amount: Rs {p.amount}</p>
                      </div>
                      <button onClick={() => handleAdminApprove(p.id, p.user_reg, p.amount)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg font-bold transition-colors">Approve</button>
                    </div>
                  ))}
                </div>
             </div>

             <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
                <h3 className="font-bold text-base mb-3">Approved History</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {approvedHistory.length === 0 && <p className="opacity-50">No approved history.</p>}
                  {approvedHistory.map((p) => (
                    <div key={p.id} className={`flex justify-between items-center p-3 border ${t.border} rounded-xl hover:bg-slate-500/5`}>
                      <div>
                        <p className="font-bold">{p.user_reg}</p>
                        <p className="text-[11px] opacity-70 font-mono">Date: {new Date(p.created_at).toLocaleDateString()} | Rs {p.amount}</p>
                      </div>
                      <button onClick={() => handleAdminReverse(p.id, p.user_reg, p.amount)} className="bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-colors">Reverse</button>
                    </div>
                  ))}
                </div>
             </div>
          </motion.div>
        )}

        {/* TAB: ADMIN LEADERBOARD PAGE */}
        {isAdmin && activeTab === "leaderboard" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-2xl font-black mb-2 flex items-center gap-2 text-amber-500"><Crown /> Leaderboards</h2>
            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
              <h3 className="font-bold text-base mb-3">Top Credit Holders</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className={`bg-slate-500/5 text-opacity-80`}>
                    <tr>
                      <th className="px-3 py-2 font-bold rounded-tl-lg">Rank</th>
                      <th className="px-3 py-2 font-bold">Registration</th>
                      <th className="px-3 py-2 font-bold text-right rounded-tr-lg">Credits Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-500/10">
                    {leaderboard.length === 0 && <tr><td colSpan={3} className="text-center py-5 opacity-50">No records found.</td></tr>}
                    {leaderboard.map((user, i) => (
                      <tr key={user.user_reg} className={t.rowHover}>
                        <td className={`px-3 py-2 font-black ${i===0 ? 'text-amber-500 text-sm' : 'opacity-70'}`}>#{i+1}</td>
                        <td className="px-3 py-2 font-semibold">{user.user_reg}</td>
                        <td className="px-3 py-2 text-right font-black text-emerald-500">{user.credits?.toLocaleString()}</td>
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col h-[75vh] ${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
            {!activeAdminChatUser ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-500/10">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><MessageSquare/> User Messages</h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className={`absolute left-3 top-2.5 ${t.textMuted}`} size={16} />
                      <input type="text" placeholder="Search Reg or Email..." value={chatSearchQuery} onChange={e => setChatSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchAdminChatUser()} className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-2 pl-9 pr-3 focus:outline-none ${t.inputFocus} text-sm`} />
                    </div>
                    <button onClick={searchAdminChatUser} className={`${t.btnPrimary} px-4 rounded-xl text-xs font-bold`}>Find</button>
                  </div>
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                  {adminChatList.filter(u => u.reg.toLowerCase().includes(chatSearchQuery.toLowerCase()) || u.name.toLowerCase().includes(chatSearchQuery.toLowerCase())).length === 0 && <p className="opacity-50 p-3 text-center">No messages matching query.</p>}
                  {adminChatList.filter(u => u.reg.toLowerCase().includes(chatSearchQuery.toLowerCase()) || u.name.toLowerCase().includes(chatSearchQuery.toLowerCase())).map((u) => (
                    <div key={u.reg} onClick={() => loadAdminSingleChat(u.reg, u.name)} className={`flex justify-between items-center p-4 border ${t.border} rounded-xl mb-2 cursor-pointer transition-colors ${t.rowHover}`}>
                      <div>
                        <p className="font-bold mb-0.5">{u.name}</p>
                        <p className={`text-[11px] font-mono font-semibold ${t.primary}`}>{u.reg}</p>
                      </div>
                      {u.unread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{u.unread} New</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className={`p-4 border-b ${t.border} flex justify-between items-center bg-slate-500/5`}>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{activeAdminChatUser.name}</span>
                    <span className="text-[10px] font-mono opacity-70">{activeAdminChatUser.reg}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleAdminDeleteEntireChat} className="text-red-500 p-1.5 rounded-md hover:bg-red-500/10 transition-colors" title="Delete Entire Chat">
                      <Trash2 size={16}/>
                    </button>
                    <button onClick={() => { setActiveAdminChatUser(null); loadAdminChatList(); }} className="font-bold text-sm underline opacity-70 hover:opacity-100">Back</button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={chatScrollRef}>
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
                              <button onClick={() => handleDeleteMessage(msg.id)}><Trash2 size={10} className="text-red-400 opacity-50 hover:opacity-100"/></button>
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
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: CONTACT ADMIN (USER) */}
        {!isAdmin && activeTab === "contact" && (
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
            {isAdmin && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-4 rounded-xl border ${t.border} ${t.cardBg}`}>
                  <div className="text-[11px] font-bold opacity-70 mb-1.5 flex items-center gap-1.5"><CreditCard size={12}/> Sales</div>
                  <div className="text-xl font-black">{adminStats.sales}</div>
                </div>
                <div className={`p-4 rounded-xl border ${t.border} ${t.cardBg} relative`}>
                  {pendingApprovals.length > 0 && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                  <div className="text-[11px] font-bold opacity-70 mb-1.5 flex items-center gap-1.5"><CheckCircle2 size={12}/> Pending</div>
                  <div className="text-xl font-black">{pendingApprovals.length}</div>
                </div>
                <div className={`p-4 rounded-xl border ${t.border} ${t.cardBg}`}>
                  <div className="text-[11px] font-bold opacity-70 mb-1.5 flex items-center gap-1.5"><UsersRound size={12}/> Total Users</div>
                  <div className="text-xl font-black">{adminStats.totalUsers}</div>
                </div>
                <div className={`p-4 rounded-xl border ${t.border} ${t.cardBg}`}>
                  <div className="text-[11px] font-bold opacity-70 mb-1.5 flex items-center gap-1.5"><DollarSign size={12}/> Profit Earned</div>
                  <div className="text-xl font-black text-emerald-500">Rs {adminStats.profit.toLocaleString()}</div>
                </div>
              </motion.div>
            )}

            {isAdmin && pendingApprovals.length > 0 && (
              <div className={`mb-6 ${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">Recent Pending Approvals</h3>
                  <button onClick={() => setActiveTab('approvals')} className="text-[11px] font-bold underline opacity-70 hover:opacity-100">View All</button>
                </div>
                <div className="space-y-2">
                  {pendingApprovals.slice(0,3).map((p) => (
                    <div key={p.id} className={`flex justify-between items-center p-3 border ${t.border} rounded-xl hover:bg-slate-500/5`}>
                      <div>
                        <p className="font-bold">{p.user_reg}</p>
                        <p className="text-[11px] opacity-70 font-mono">TID: {p.tid_number} | Rs {p.amount}</p>
                      </div>
                      <button onClick={() => handleAdminApprove(p.id, p.user_reg, p.amount)} className="bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-1.5 rounded-lg font-bold">Approve</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  {!isAdmin && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme==='light' ? 'bg-white/10 border-white/20' : 'bg-[#00205b]/40 border-blue-400/20'} font-bold`}>
                      <Activity size={14} className="opacity-70"/> Free Attempts: <span className={theme==='light' ? 'text-white font-black' : 'text-amber-400 font-black'}>{freeAttempts}/4</span>
                    </div>
                  )}
                  {!isAdmin && (
                    <button onClick={() => setActiveTab('referral')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme==='light' ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-[#00205b]/40 border-blue-400/20 hover:bg-[#00205b]/60'} font-bold transition-colors`}>
                      <Share2 size={14} className="text-emerald-400"/> Earn by Sharing
                    </button>
                  )}
                </div>

                {!isAdmin && !isProMode && (
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
                      className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 overflow-hidden pt-1"
                    >
                      <div className="relative z-30">
                        <Calendar className={`absolute left-3 top-2.5 ${t.textMuted} z-10`} size={14} />
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
                        <Building className={`absolute left-3 top-2.5 ${t.textMuted} z-10`} size={14} />
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
                                            <th className="px-2 py-2 font-bold">Sub</th>
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
                                  </div>
                                ))}

                                {/* Upsell Lock Button for Free mode users */}
                                {!studentDetails[0]?.canCalculate && (
                                   <motion.button 
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        if(credits >= SEARCH_COST) {
                                            handleExpandResult(student.reg, student.id, true);
                                        } else {
                                            setActiveTab('credits');
                                        }
                                     }}
                                     initial={{ scale: 0.95, opacity: 0 }}
                                     animate={{ scale: 1, opacity: 1 }}
                                     className={`mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-black text-sm uppercase tracking-wide transition-all shadow-md active:scale-95 ${theme === 'light' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 border-amber-300' : 'bg-gradient-to-r from-amber-500 to-amber-600 text-[#00122a] border-amber-400 hover:from-amber-400 hover:to-amber-500'}`}
                                   >
                                      <Unlock size={18} />
                                      {credits >= SEARCH_COST ? `See Full Result (${SEARCH_COST} Credits)` : `Unlock Full Result (Top Up)`}
                                   </motion.button>
                                )}
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

        {/* TAB: CREDITS (ONLY SHOWN TO NORMAL USERS) */}
        {!isAdmin && activeTab === "credits" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
            <div className={`p-6 rounded-[1.75rem] text-center border ${theme === 'light' ? 'bg-gradient-to-b from-white to-slate-50 border-slate-200 shadow-sm' : 'bg-gradient-to-b from-[#001c4d] to-[#00122a] border-[#00348c]'}`}>
               <Wallet size={40} className={`mx-auto mb-3 ${t.primary}`}/>
               <h3 className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Available Balance</h3>
               <div className="text-4xl sm:text-5xl font-black">{credits.toLocaleString()} <span className="text-xl font-medium opacity-50">Credits</span></div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><TrendingUp size={20}/> Top-up Plans</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {packages.map(pkg => (
                  <div key={pkg.id} onClick={() => setPaymentForm({ ...paymentForm, package: pkg.id })}
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
                  <button onClick={handlePaymentSubmit} className={`w-full sm:w-auto ml-auto px-8 py-3.5 ${t.btnPrimary} font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md`}>
                    <CheckCircle2 size={18}/> I have Paid!
                  </button>
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
                         <td className="px-4 py-3 font-semibold text-emerald-500 flex items-center gap-1.5"><ArrowRight size={12} className="rotate-45"/> Deposit</td>
                         <td className="px-4 py-3 opacity-80">Rs {dep.amount} via {dep.account_name}</td>
                         <td className={`px-4 py-3 text-right font-bold ${dep.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                           {dep.status.toUpperCase()}
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
               
               {/* Load More Button */}
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

        {/* TAB: SEARCH HISTORY (ONLY SHOWN TO NORMAL USERS) */}
        {!isAdmin && activeTab === "history" && (
          <div className="space-y-5">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2.5"><History className={t.primary} size={24}/> Paid Search History</h3>
            <p className="opacity-70 mb-5 max-w-2xl">A complete record of your executed paid searches. Clicking 'See Result' will automatically re-run the search in the portal.</p>
            
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

        {/* TAB: REFERRAL (ONLY SHOWN TO NORMAL USERS) */}
        {!isAdmin && activeTab === "referral" && (
          <div className={`${t.cardBg} border ${t.border} p-8 rounded-[1.5rem] text-center shadow-md`}>
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-[#0056b3] to-[#00348c] shadow-lg text-white`}>
              <Share2 size={30} />
            </div>
            <h3 className="font-black text-xl mb-2">Invite & Earn Credits</h3>
            <p className="opacity-70 mb-6 max-w-md mx-auto">Share your link with classmates. If they sign up and buy credits, you instantly get a 20% bonus of their purchase added to your wallet!</p>
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
