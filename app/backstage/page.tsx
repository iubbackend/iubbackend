"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Building, Calendar, Users, 
  Sun, Moon, ChevronDown, Lock,
  Menu, CreditCard, History, Share2, Wallet,
  CheckCircle2, X, GraduationCap, Activity, TrendingUp, AlertCircle,
  ShieldAlert, DollarSign, UsersRound, Crown, ArrowRight, ArrowLeft, MessageSquare, Check, CheckCheck, Edit2, Trash2, Send, Download, Unlock, BookOpen, UserCog, MoreVertical, Phone, ArrowUpRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

const PRIMARY_ADMIN_REG = "S20BSCS1M01001";

type Theme = "light" | "dark";
type TabState = "home" | "approvals" | "leaderboard" | "admin_chats" | "users_management" | "search";

export default function AdminDashboardPage() {
  const router = useRouter();
  
  const [theme, setTheme] = useState<Theme>("dark");
  const [currentUser, setCurrentUser] = useState({ reg: "", name: "Loading...", phone: "", email: "" });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabState>("home");
  const [toastMsg, setToastMsg] = useState<{title: string, desc: string, type: 'error'|'info'} | null>(null);

  // Search States (Home & Search Tab)
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Admin Data
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [approvedHistory, setApprovedHistory] = useState<any[]>([]);
  const [approvedPage, setApprovedPage] = useState(0);
  const [adminStats, setAdminStats] = useState({ sales: 0, pending: 0, totalUsers: 0, premiumUsers: 0, profit: 0, searches: 0 });
  const [manualPay, setManualPay] = useState({ reg: "", amount: "" });
  const [expandedPending, setExpandedPending] = useState<string | null>(null);
  
  // Users Management
  const [allUsersList, setAllUsersList] = useState<any[]>([]);

  // Chat Data
  const [adminChatList, setAdminChatList] = useState<any[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [activeAdminChatUser, setActiveAdminChatUser] = useState<any>(null);
  const [chatFeed, setChatFeed] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [userChatStats, setUserChatStats] = useState({ credits: 0, totalSpent: 0, pendingCount: 0 });
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initialization & Security
  useEffect(() => {
    const savedTheme = localStorage.getItem("iub_theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
      localStorage.setItem("iub_theme", "dark");
    }

    async function verifyAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        forceLogout();
        return;
      }

      const { data: userRecord } = await supabase.from("users").select("reg, phone, email").ilike("email", session.user.email!).maybeSingle();
      
      if (!userRecord || userRecord.reg.toUpperCase() !== PRIMARY_ADMIN_REG) {
        router.push('/dashboard'); 
        return;
      }
      
      setCurrentUser({ reg: userRecord.reg.toUpperCase(), name: "System Admin", phone: userRecord.phone, email: userRecord.email });
      loadRealAdminData();
      loadAdminChatList();
      loadAllUsers();
    }
    verifyAdmin();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatFeed]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("iub_theme", newTheme);
  };

  const forceLogout = async () => {
    localStorage.clear();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const loadRealAdminData = async (appPage = 0) => {
    // Stats
    const { data: approvedAll } = await supabase.from('payments_record').select('amount, user_reg').eq('status', 'approved');
    const totalProfit = approvedAll?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    
    // Pending
    const { data: pending } = await supabase.from('payments_record').select('*, users(email, phone)').eq('status', 'pending').order('created_at', { ascending: false });
    setPendingApprovals(pending || []);
    
    // Approved History (Paginated 10)
    const { data: approvedPaginated } = await supabase.from('payments_record').select('*, users(email, phone)').eq('status', 'approved').order('created_at', { ascending: false }).range(appPage * 10, (appPage + 1) * 10 - 1);
    
    if (appPage === 0) setApprovedHistory(approvedPaginated || []);
    else setApprovedHistory(prev => [...prev, ...(approvedPaginated || [])]);
    setApprovedPage(appPage);

    // Counts
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    setAdminStats({ sales: approvedAll?.length || 0, pending: pending?.length || 0, totalUsers: userCount || 0, premiumUsers: 0, profit: totalProfit, searches: 0 });
  };

  const loadAllUsers = async () => {
    const { data } = await supabase.from('users').select('reg, email, phone').order('reg', { ascending: true }).limit(50);
    setAllUsersList(data || []);
  };

  const loadAdminChatList = async () => {
    // Using the RPC from your schema to get accurate names and unread counts
    const { data, error } = await supabase.rpc('get_admin_chat_list');
    if (!error && data) {
      setAdminChatList(data);
    }
  };

  const loadAdminSingleChat = async (reg: string, name: string) => {
    setActiveAdminChatUser({ reg, name });
    
    const [msgsRes, payRes, credRes, totalSpentRes, pendRes] = await Promise.all([
      supabase.from('messages').select('*').or(`and(sender_reg.eq.${reg},receiver_reg.eq.${PRIMARY_ADMIN_REG}),and(sender_reg.eq.${PRIMARY_ADMIN_REG},receiver_reg.eq.${reg})`),
      supabase.from('payments_record').select('*').eq('user_reg', reg),
      supabase.from('user_credits').select('credits').eq('user_reg', reg).maybeSingle(),
      supabase.from('payments_record').select('amount').eq('user_reg', reg).eq('status', 'approved'),
      supabase.from('payments_record').select('id', { count: 'exact' }).eq('user_reg', reg).eq('status', 'pending')
    ]);

    const feed = [
        ...(msgsRes.data || []).map(m => ({ ...m, feedType: 'msg' })),
        ...(payRes.data || []).map(p => ({ ...p, feedType: 'payment' }))
    ].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    setChatFeed(feed);
    setUserChatStats({
        credits: credRes.data?.credits || 0,
        totalSpent: (totalSpentRes.data || []).reduce((sum, p) => sum + p.amount, 0),
        pendingCount: pendRes.count || 0
    });

    // Mark as read
    await supabase.from('messages').update({ is_read: true }).eq('sender_reg', reg).eq('receiver_reg', PRIMARY_ADMIN_REG);
    loadAdminChatList();
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeAdminChatUser) return;
    const textToSend = chatInput.trim();
    setChatInput("");

    await supabase.from('messages').insert({
      sender_reg: PRIMARY_ADMIN_REG, receiver_reg: activeAdminChatUser.reg, content: textToSend, is_delivered: true, is_read: false
    });
    loadAdminSingleChat(activeAdminChatUser.reg, activeAdminChatUser.name);
  };

  // Search user in chat
  const handleSearchUserInChat = async () => {
    if (!chatSearchQuery.trim()) return;
    
    // Check students table for better name matching
    const { data: studentData } = await supabase.from('students')
      .select('reg, name')
      .or(`reg.ilike.%${chatSearchQuery}%,name.ilike.%${chatSearchQuery}%`)
      .limit(5);

    if (studentData && studentData.length > 0) {
        const u = studentData[0];
        setChatSearchQuery("");
        loadAdminSingleChat(u.reg, u.name);
    } else {
        // Fallback to users table
        const { data: userData } = await supabase.from('users').select('reg, email').or(`reg.ilike.%${chatSearchQuery}%,email.ilike.%${chatSearchQuery}%`).limit(1);
        if (userData && userData.length > 0) {
            setChatSearchQuery("");
            loadAdminSingleChat(userData[0].reg, userData[0].email);
        } else {
            showToast("Not Found", "No user found in database.", "error");
        }
    }
  };

  // Global Home Search
  const handleGlobalSearch = async () => {
    if (!globalSearchQuery.trim()) return;
    setIsSearching(true);
    
    const { data } = await supabase.from('students')
      .select('reg, name, father_name, department_id')
      .or(`reg.ilike.%${globalSearchQuery}%,name.ilike.%${globalSearchQuery}%`)
      .limit(20);
      
    setSearchResults(data || []);
    setIsSearching(false);
  };

  // Payment Actions
  const handleAdminApprove = async (paymentId: string, reg: string, amount: number) => {
    try {
      await supabase.rpc('approve_payment_and_credit', { p_payment_id: paymentId, p_user_reg: reg.toUpperCase(), p_amount: amount });
      showToast("Approved", `Approved Rs ${amount}`, "info");
      loadRealAdminData(0);
      if (activeAdminChatUser?.reg === reg) loadAdminSingleChat(reg, activeAdminChatUser.name);
    } catch (e: any) {
       // Manual approvals might be disabled by RPC logic, handle fallback
       await supabase.from('payments_record').update({ status: 'approved' }).eq('id', paymentId);
       let calcCredits = amount >= 500 ? 10000 : amount * 20;
       
       const { data: existing } = await supabase.from('user_credits').select('credits').eq('user_reg', reg).maybeSingle();
       if (existing) {
           await supabase.from('user_credits').update({ credits: existing.credits + calcCredits }).eq('user_reg', reg);
       } else {
           await supabase.from('user_credits').insert({ user_reg: reg, credits: calcCredits, free_searches_today: 0 });
       }
       showToast("Approved (Fallback)", `Approved Rs ${amount}`, "info");
       loadRealAdminData(0);
    }
  };

  const handleAdminReject = async (paymentId: string, reg: string, amount: number) => {
    if (window.confirm("Reject this payment? (Wipes pending status)")) {
        await supabase.from('payments_record').update({ status: 'rejected' }).eq('id', paymentId);
        showToast("Rejected", "Payment rejected.", "info");
        loadRealAdminData(0);
        if (activeAdminChatUser?.reg === reg) loadAdminSingleChat(reg, activeAdminChatUser.name);
    }
  };

  const handleManualAward = async (saveRecord: boolean) => {
    if(!manualPay.reg || !manualPay.amount) return showToast("Error", "Enter Reg and Amount", "error");
    
    const cleanReg = manualPay.reg.toUpperCase().trim();
    
    if (saveRecord) {
        const { data: pending } = await supabase.from('payments_record').insert({
            user_reg: cleanReg, amount: Number(manualPay.amount), account_name: 'Admin Manual', tid_number: 'MANUAL-' + Date.now(), package_id: 'custom'
        }).select().single();
        if(pending) await handleAdminApprove(pending.id, pending.user_reg, pending.amount);
    } else {
        let calcCredits = Number(manualPay.amount) >= 500 ? 10000 : Number(manualPay.amount) * 20;
        const { data: existing } = await supabase.from('user_credits').select('credits').eq('user_reg', cleanReg).maybeSingle();
        if (existing) {
            await supabase.from('user_credits').update({ credits: existing.credits + calcCredits }).eq('user_reg', cleanReg);
        } else {
            await supabase.from('user_credits').insert({ user_reg: cleanReg, credits: calcCredits, free_searches_today: 0 });
        }
        showToast("Awarded", "Silent credits awarded successfully.", "info");
    }
    setManualPay({ reg: "", amount: "" });
  };

  const getWaLink = (phone: string) => {
    if (!phone) return '#';
    return `https://wa.me/${phone.replace(/^0/, '92').replace(/\D/g, '')}`;
  };

  const showToast = (title: string, desc: string, type: 'error'|'info' = 'error') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // UI Theme Vars
  const t = {
    bg: theme === "light" ? "bg-[#f4f7f6]" : "bg-[#00122a]",
    text: theme === "light" ? "text-slate-800" : "text-slate-100",
    textMuted: theme === "light" ? "text-slate-500" : "text-blue-300/70",
    cardBg: theme === "light" ? "bg-white border-slate-300/60 shadow-md" : "bg-[#001c4d]/80 border-[#00348c]/50",
    border: theme === "light" ? "border-slate-300/60" : "border-[#00348c]/50",
    primary: theme === "light" ? "text-[#0056b3]" : "text-amber-400",
    inputBg: theme === "light" ? "bg-slate-50 border-slate-300" : "bg-[#00122a]/50",
    btnPrimary: theme === "light" ? "bg-[#0056b3] text-white" : "bg-amber-500 text-black",
  };

  return (
    <div className={`flex flex-col min-h-screen ${t.bg} ${t.text} font-sans text-sm transition-colors duration-300`}>
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border ${toastMsg.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-emerald-500/10 border-emerald-500 text-emerald-500'} backdrop-blur-md`}
          >
            <AlertCircle size={20} />
            <div>
              <p className="font-bold">{toastMsg.title}</p>
              <p className="text-xs opacity-90">{toastMsg.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${t.border} ${theme === 'light' ? 'bg-white/90' : 'bg-[#00122a]/90'} px-5 py-3.5 flex justify-between items-center transition-colors duration-300`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className={`p-1.5 rounded-lg border ${t.border} hover:bg-black/5`}>
            <Menu size={20} className={t.primary} />
          </button>
          {/* Logo navigates home */}
          <div onClick={() => { setActiveTab("home"); router.push('/'); }} className="flex items-center gap-1.5 font-black text-lg cursor-pointer">
            IUB Result<span className={t.primary}>Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20">
            <ShieldAlert size={14} /> SYSTEM ADMIN
          </div>
          <button onClick={toggleTheme} className={`p-1.5 rounded-lg border ${t.border} hover:bg-black/5 transition-colors`}>
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
            <motion.div 
              initial={{ x: "-100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "-100%" }} 
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className={`fixed top-0 left-0 h-full w-64 ${theme==='light' ? 'bg-white' : 'bg-[#00173d]'} z-50 flex flex-col shadow-2xl`}
            >
              <div className="p-5 border-b border-slate-500/10 flex justify-between items-center">
                <div className="font-bold text-lg text-amber-500 flex items-center gap-2"><Crown size={18}/> Controls</div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-black/5"><X size={20} /></button>
              </div>
              <div className="p-3 space-y-1 flex-1 overflow-y-auto">
                {[
                  { id: 'home', icon: Activity, label: 'Dashboard Stats' },
                  { id: 'search', icon: Search, label: 'Search Portal' },
                  { id: 'approvals', icon: CheckCircle2, label: 'Payment Approvals', badge: pendingApprovals.length },
                  { id: 'admin_chats', icon: MessageSquare, label: 'User Chats', badge: adminChatList.reduce((sum, c) => sum + (c.unread || 0), 0) },
                  { id: 'users_management', icon: UserCog, label: 'Manage Users' },
                ].map(item => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${activeTab === item.id ? t.btnPrimary + ' shadow-lg scale-[0.98]' : "hover:bg-slate-500/10"}`}>
                    <div className="flex items-center gap-3"><item.icon size={18}/> {item.label}</div>
                    {item.badge > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md">{item.badge}</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        
        {/* TAB: DASHBOARD (HOME) */}
        {activeTab === "home" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            
            {/* Global Search inside Home */}
            <div className={`p-4 rounded-2xl border ${t.border} ${t.cardBg} flex items-center gap-3`}>
                <Search className={t.textMuted} size={20} />
                <input 
                    type="text" 
                    placeholder="Search any user by Reg Number or Name..." 
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                    className={`flex-1 bg-transparent border-none outline-none font-medium ${t.text}`}
                />
                <button onClick={handleGlobalSearch} className={`px-4 py-2 rounded-xl text-xs font-bold ${t.btnPrimary} transition-transform active:scale-95`}>
                    {isSearching ? 'Searching...' : 'Search DB'}
                </button>
            </div>

            {/* Display Home Search Results inline if exist */}
            {searchResults.length > 0 && (
                <div className={`p-4 rounded-2xl border ${t.border} ${t.cardBg}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold">Search Results ({searchResults.length})</h3>
                        <button onClick={() => setSearchResults([])} className="text-xs text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-lg">Clear</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResults.map((res, i) => (
                            <div key={i} className={`p-3 rounded-xl border ${t.border} flex justify-between items-center bg-black/5`}>
                                <div>
                                    <div className="font-bold">{res.name}</div>
                                    <div className={`text-xs font-mono mt-1 px-2 py-0.5 rounded inline-block ${t.bg}`}>{res.reg}</div>
                                </div>
                                <button onClick={() => { setActiveAdminChatUser({reg: res.reg, name: res.name}); setActiveTab('admin_chats'); loadAdminSingleChat(res.reg, res.name); }} className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors">
                                    <MessageSquare size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-2">
                <h2 className="text-2xl font-black">Admin Overview</h2>
                {pendingApprovals.length > 0 && (
                     <button onClick={() => setActiveTab('approvals')} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                         <AlertCircle size={16}/> {pendingApprovals.length} Pending Requests <ArrowRight size={16}/>
                     </button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg}`}>
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><DollarSign size={14}/> Total Profit</div>
                <div className="text-2xl font-black text-emerald-500">Rs {adminStats.profit.toLocaleString()}</div>
              </div>
              <div onClick={() => setActiveTab('approvals')} className={`p-5 rounded-2xl border ${t.border} ${t.cardBg} cursor-pointer hover:border-amber-500 transition-colors`}>
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><CheckCircle2 size={14}/> Pending Tasks</div>
                <div className="text-2xl font-black text-amber-500 flex justify-between items-center">
                    {adminStats.pending} <ArrowUpRight size={18} className="opacity-50"/>
                </div>
              </div>
              <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg}`}>
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><UsersRound size={14}/> Total Users</div>
                <div className="text-2xl font-black">{adminStats.totalUsers}</div>
              </div>
              <div onClick={() => setActiveTab('admin_chats')} className={`p-5 rounded-2xl border ${t.border} ${t.cardBg} cursor-pointer hover:border-blue-500 transition-colors`}>
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><MessageSquare size={14}/> Unread Chats</div>
                <div className="text-2xl font-black text-blue-500 flex justify-between items-center">
                    {adminChatList.reduce((sum, c) => sum + c.unread, 0)} <ArrowUpRight size={18} className="opacity-50"/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: APPROVALS & PAYMENTS */}
        {activeTab === "approvals" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-black flex items-center gap-2 text-amber-500"><CheckCircle2 /> Manage Approvals</h2>
            
            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl border-l-4 border-l-amber-500`}>
              <h3 className="font-bold mb-3 flex items-center gap-2"><CreditCard size={18}/> Manual Credit Award</h3>
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <input type="text" placeholder="User Registration" value={manualPay.reg} onChange={e=>setManualPay({...manualPay, reg:e.target.value})} className={`w-full md:flex-1 ${t.inputBg} border ${t.border} rounded-xl p-3 outline-none`} />
                <input type="number" placeholder="Equivalent Rs" value={manualPay.amount} onChange={e=>setManualPay({...manualPay, amount:e.target.value})} className={`w-full md:w-32 ${t.inputBg} border ${t.border} rounded-xl p-3 outline-none`} />
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => handleManualAward(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5 py-3 transition-colors">Award & Save</button>
                    <button onClick={() => handleManualAward(false)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5 py-3 transition-colors">Award Only</button>
                </div>
              </div>
            </div>

            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
              <h3 className="font-bold mb-4">Pending Requests ({pendingApprovals.length})</h3>
              {pendingApprovals.length === 0 ? (
                  <div className={`p-8 text-center rounded-xl border ${t.border} border-dashed opacity-50 font-bold`}>No pending payment requests.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingApprovals.map(p => (
                    <div key={p.id} className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-2xl shadow-sm relative transition-all hover:border-amber-500/60">
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button onClick={() => setExpandedPending(expandedPending === p.id ? null : p.id)} className="p-1 rounded-full bg-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors"><ChevronDown size={16} /></button>
                        </div>
                        <div className="mb-2">
                        <h4 className="font-black text-lg text-amber-500">{p.user_reg}</h4>
                        <span className="text-xs font-bold bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full uppercase">Rs {p.amount}</span>
                        </div>
                        <div className="text-sm space-y-1 opacity-80 mt-3">
                        <p><strong>Name:</strong> {p.account_name}</p>
                        <p><strong>Phone:</strong> {p?.users?.phone || 'N/A'}</p>
                        <p><strong>TID:</strong> <span className="font-mono">{p.tid_number}</span></p>
                        </div>
                        
                        {expandedPending === p.id && (
                            <motion.div initial={{ height: 0, opacity: 0}} animate={{ height: 'auto', opacity: 1}} className="mt-3 flex gap-2 p-2 bg-black/5 rounded-xl overflow-hidden">
                                <a href={getWaLink(p?.users?.phone)} target="_blank" className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 transition-colors"><Phone size={14}/> WhatsApp</a>
                                <button onClick={() => { setActiveAdminChatUser({reg: p.user_reg, name: p.account_name}); setActiveTab('admin_chats'); loadAdminSingleChat(p.user_reg, p.account_name); }} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"><MessageSquare size={14}/> Open Chat</button>
                            </motion.div>
                        )}

                        <div className="flex gap-2 mt-4">
                        <button onClick={() => handleAdminApprove(p.id, p.user_reg, p.amount)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold transition-colors">Approve</button>
                        <button onClick={() => handleAdminReject(p.id, p.user_reg, p.amount)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-bold transition-colors">Reject</button>
                        </div>
                    </div>
                    ))}
                </div>
              )}
            </div>

            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
              <h3 className="font-bold mb-3">Recently Approved (Last {approvedHistory.length})</h3>
              <div className="space-y-2">
                {approvedHistory.map(p => (
                  <div key={p.id} className={`flex justify-between items-center p-3 border ${t.border} rounded-xl bg-black/5`}>
                    <div>
                      <p className="font-bold text-emerald-500">{p.user_reg}</p>
                      <p className="text-[11px] opacity-70 font-mono">{new Date(p.created_at).toLocaleString()} | Rs {p.amount} | {p?.users?.phone || 'No Phone'}</p>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold uppercase border border-emerald-500/20">Approved</span>
                  </div>
                ))}
                <button onClick={() => loadRealAdminData(approvedPage + 1)} className={`w-full mt-2 py-3 text-xs font-bold border ${t.border} rounded-xl hover:bg-black/5 transition-colors`}>Load Next 10</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ADMIN CHATS */}
        {activeTab === "admin_chats" && (
          <div className={`flex flex-col h-[80vh] md:h-[85vh] ${t.cardBg} border ${t.border} rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300`}>
            {!activeAdminChatUser ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-500/10 bg-black/5">
                  <h3 className="font-black text-lg mb-3 flex items-center gap-2 text-blue-500"><MessageSquare/> Chat System</h3>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Search by Reg or Name..." value={chatSearchQuery} onChange={e => setChatSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUserInChat()} className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl px-4 py-2 text-sm outline-none`} />
                    <button onClick={handleSearchUserInChat} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl text-xs font-bold transition-colors">Find</button>
                  </div>
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                  {adminChatList.length === 0 ? (
                      <div className="p-10 text-center opacity-50 font-bold">No active conversations found.</div>
                  ) : (
                      adminChatList.map((u) => (
                        <div key={u.reg} onClick={() => loadAdminSingleChat(u.reg, u.name)} className={`flex justify-between items-center p-4 border-b ${t.border} cursor-pointer hover:bg-black/5 transition-colors`}>
                          <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded text-[10px] font-black font-mono border border-amber-500/30">{u.reg}</span>
                                <p className="font-bold text-sm truncate">{u.name}</p>
                            </div>
                            <p className="text-xs opacity-60 truncate">Open to view messages...</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] opacity-50 font-mono">{new Date(u.last_msg_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                            {u.unread > 0 && <span className="bg-emerald-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-md">{u.unread}</span>}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#000a1a]">
                <div className="p-3 border-b border-slate-500/20 bg-white dark:bg-[#001c4d]">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setActiveAdminChatUser(null); loadAdminChatList(); }} className="mr-2 p-2 bg-black/5 hover:bg-black/10 rounded-lg transition-colors">
                          <ArrowRight size={18} className="md:hidden"/>
                          <ArrowLeft size={18} className="hidden md:block"/>
                      </button>
                      <div>
                        <div className="font-black flex items-center gap-2">{activeAdminChatUser.name} <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded text-[10px] font-mono border border-blue-500/20">{activeAdminChatUser.reg}</span></div>
                      </div>
                    </div>
                  </div>
                  {/* Chat Sub-Bar */}
                  <div className="flex justify-between items-center bg-slate-100 dark:bg-[#00122a] p-2 rounded-xl text-xs border border-slate-500/10">
                    <div className="flex items-center gap-1.5 font-bold"><Wallet size={14} className="text-amber-500"/> {userChatStats.credits} Cr</div>
                    <div className="flex items-center gap-1.5 font-bold"><DollarSign size={14} className="text-emerald-500"/> Rs {userChatStats.totalSpent}</div>
                    <div className="flex items-center gap-1.5 font-bold text-red-400"><Activity size={14}/> {userChatStats.pendingCount} Pending</div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatScrollRef}>
                  {chatFeed.map((item) => {
                    if (item.feedType === 'msg') {
                        const isMe = item.sender_reg === PRIMARY_ADMIN_REG;
                        return (
                            <div key={item.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] md:max-w-[70%] p-3 text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white dark:bg-[#00205b] border border-slate-200 dark:border-blue-900 rounded-2xl rounded-tl-sm'}`}>
                                    {item.content}
                                </div>
                                <div className="flex items-center mt-1 gap-1">
                                    <span className="text-[10px] opacity-50">{new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                    {isMe && (
                                        <span className="ml-1">
                                            {item.is_read ? <CheckCheck size={14} className="text-blue-400" /> : <Check size={14} className="text-gray-400" />}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    } else if (item.feedType === 'payment') {
                        return (
                            <div key={item.id} className="my-4 mx-auto w-full max-w-[90%] md:max-w-[75%] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#002a4d] dark:to-[#001a33] p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black"><CreditCard size={16}/> Deposit Request</div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${item.status === 'approved' ? 'bg-emerald-500/20 text-emerald-600' : item.status==='rejected' ? 'bg-red-500/20 text-red-600' : 'bg-amber-500/20 text-amber-600'}`}>{item.status}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                    <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5">Amount: <b className="text-emerald-500">Rs {item.amount}</b></div>
                                    <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5">Name: <b className="truncate block">{item.account_name}</b></div>
                                    <div className="col-span-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5">TID: <b className="font-mono">{item.tid_number}</b></div>
                                </div>
                                {item.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAdminApprove(item.id, item.user_reg, item.amount)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-md">Approve</button>
                                        <button onClick={() => handleAdminReject(item.id, item.user_reg, item.amount)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-md">Reject</button>
                                    </div>
                                )}
                            </div>
                        );
                    }
                  })}
                </div>
                
                <div className="p-3 bg-white dark:bg-[#001c4d] border-t border-slate-200 dark:border-slate-800 flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendMessage()} placeholder="Type your message..." className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors`} />
                  <button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl transition-transform active:scale-95"><Send size={18}/></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: USERS MANAGEMENT */}
        {activeTab === "users_management" && (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black flex items-center gap-2 text-blue-500"><UserCog /> Manage Users</h2>
                    <button onClick={loadAllUsers} className="text-xs font-bold bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-colors">Refresh</button>
                </div>

                <div className={`${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`bg-black/5 border-b ${t.border} font-bold`}>
                                <tr>
                                    <th className="p-4">Reg Number</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Phone</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allUsersList.map(u => (
                                    <tr key={u.reg} className={`border-b ${t.border} hover:bg-black/5 transition-colors`}>
                                        <td className="p-4 font-mono font-bold text-blue-500">{u.reg}</td>
                                        <td className="p-4 opacity-80">{u.email}</td>
                                        <td className="p-4 opacity-80">{u.phone || 'N/A'}</td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => { setActiveAdminChatUser({reg: u.reg, name: u.email}); setActiveTab('admin_chats'); loadAdminSingleChat(u.reg, u.email); }} className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors" title="Message User"><MessageSquare size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* TAB: SEARCH PORTAL (Fallback specific tab) */}
        {activeTab === "search" && (
             <div className="space-y-6 animate-in fade-in duration-300">
             <h2 className="text-2xl font-black flex items-center gap-2 text-emerald-500"><Search /> Search Portal</h2>
             <div className={`p-6 rounded-2xl border ${t.border} ${t.cardBg} text-center`}>
                <Search className="mx-auto mb-4 opacity-20" size={48}/>
                <p className="font-bold opacity-70 mb-4">The global search feature is now integrated directly into the Dashboard Home tab for quicker access.</p>
                <button onClick={() => setActiveTab('home')} className={`px-6 py-2 rounded-xl font-bold ${t.btnPrimary}`}>Go to Home Search</button>
             </div>
           </div>
        )}

      </main>
    </div>
  );
}
