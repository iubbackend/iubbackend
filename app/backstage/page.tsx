"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Building, Calendar, Users, 
  Sun, Moon, ChevronDown, Lock,
  Menu, CreditCard, History, Share2, Wallet,
  CheckCircle2, X, GraduationCap, Activity, TrendingUp, AlertCircle,
  ShieldAlert, DollarSign, UsersRound, Crown, ArrowRight, MessageSquare, Check, CheckCheck, Edit2, Trash2, Send, Download, Unlock, BookOpen, UserCog, MoreVertical, Phone
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';
import Select from 'react-select'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// SINGLE ADMIN IDENTITY
const PRIMARY_ADMIN_REG = "S20BSCS1M01001"; // Change to your exact admin reg

type Theme = "light" | "dark";
type TabState = "home" | "approvals" | "leaderboard" | "admin_chats" | "users_management" | "search";

export default function AdminDashboardPage() {
  const router = useRouter();
  
  const [theme, setTheme] = useState<Theme>("dark");
  const [currentUser, setCurrentUser] = useState({ reg: "", name: "Loading...", phone: "", email: "" });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabState>("home");
  const [toastMsg, setToastMsg] = useState<{title: string, desc: string, type: 'error'|'info'} | null>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"Roll Number" | "Name">("Roll Number");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  
  const [filterOptions, setFilterOptions] = useState({ departments: [], sessions: [], sections: [] });
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);

  // Admin Data
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [approvedHistory, setApprovedHistory] = useState<any[]>([]);
  const [approvedPage, setApprovedPage] = useState(0);
  const [adminStats, setAdminStats] = useState({ sales: 0, pending: 0, totalUsers: 0, premiumUsers: 0, profit: 0, searches: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [manualPay, setManualPay] = useState({ reg: "", amount: "" });
  const [expandedPending, setExpandedPending] = useState<string | null>(null);

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
    if (savedTheme) setTheme(savedTheme);

    async function verifyAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        forceLogout();
        return;
      }

      const { data: userRecord } = await supabase.from("users").select("reg, phone, email").ilike("email", session.user.email!).maybeSingle();
      
      if (!userRecord || userRecord.reg.toUpperCase() !== PRIMARY_ADMIN_REG) {
        router.push('/dashboard'); // Kick normal users back to user dashboard
        return;
      }
      
      setCurrentUser({ reg: userRecord.reg.toUpperCase(), name: "System Admin", phone: userRecord.phone, email: userRecord.email });
      loadRealAdminData();
      loadAdminChatList();
      loadFilters();
    }
    verifyAdmin();
  }, []);

  const forceLogout = async () => {
    localStorage.clear();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const loadFilters = async () => {
    const [deptsRes, sessionsRes, sectionsRes] = await Promise.all([
      supabase.from("departments").select("id, depart_name, depart_code"),
      supabase.from("academic_sessions").select("id, session_code"),
      supabase.from("sections").select("id, section_name, session_id, department_id")
    ]);

    // Format sections to only show 1M, 2E, 7M etc.
    const formattedSections = (sectionsRes.data || [])
      .map(s => {
        const m = s.section_name.match(/(\d+[A-Z])/i);
        return { id: s.id, value: s.id.toString(), label: m ? m[1].toUpperCase() : s.section_name, session_id: s.session_id, department_id: s.department_id, original: s.section_name };
      })
      .filter(s => /^\d+[A-Z]$/.test(s.label));

    setFilterOptions({
      departments: (deptsRes.data || []).map(d => ({ id: d.id, value: d.id.toString(), label: `${d.depart_code} - ${d.depart_name}` })),
      sessions: (sessionsRes.data || []).map(s => ({ id: s.id, value: s.id.toString(), label: s.session_code })),
      sections: formattedSections
    });
  };

  const loadRealAdminData = async (appPage = 0) => {
    // Stats
    const { data: approvedAll } = await supabase.from('payments_record').select('amount, user_reg').eq('status', 'approved');
    const totalProfit = approvedAll?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    
    // Pending
    const { data: pending } = await supabase.from('payments_record').select('*, users(email, phone)').eq('status', 'pending').order('created_at', { ascending: false });
    setPendingApprovals(pending || []);
    
    // Approved History (Paginated 10)
    const { data: approvedPaginated } = await supabase.from('payments_record').select('*, users(email, phone, students(name))').eq('status', 'approved').order('created_at', { ascending: false }).range(appPage * 10, (appPage + 1) * 10 - 1);
    
    if (appPage === 0) setApprovedHistory(approvedPaginated || []);
    else setApprovedHistory(prev => [...prev, ...(approvedPaginated || [])]);
    setApprovedPage(appPage);

    // Counts
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    setAdminStats({ sales: approvedAll?.length || 0, pending: pending?.length || 0, totalUsers: userCount || 0, premiumUsers: 0, profit: totalProfit, searches: 0 });
  };

  const loadAdminChatList = async () => {
    // JS Aggregation to get last message and unread count
    const { data: allMsgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (!allMsgs) return;

    const chatMap = new Map();
    allMsgs.forEach(m => {
      const isMe = m.sender_reg === PRIMARY_ADMIN_REG;
      const otherUser = isMe ? m.receiver_reg : m.sender_reg;
      
      if (!chatMap.has(otherUser)) {
        chatMap.set(otherUser, { 
            reg: otherUser, 
            last_msg: m.content, 
            last_msg_time: m.created_at, 
            unread: 0 
        });
      }
      if (!isMe && !m.is_read) {
        chatMap.get(otherUser).unread += 1;
      }
    });

    const { data: users } = await supabase.from('users').select('reg, email, students(name)').in('reg', Array.from(chatMap.keys()));
    
    const formattedList = Array.from(chatMap.values()).map(c => {
        const uMatch = users?.find(u => u.reg === c.reg);
        return { ...c, name: uMatch?.students?.[0]?.name || uMatch?.email || "Unknown User" };
    });

    setAdminChatList(formattedList.sort((a,b) => new Date(b.last_msg_time).getTime() - new Date(a.last_msg_time).getTime()));
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

  const handleSearchUserInChat = async () => {
    if (!chatSearchQuery.trim()) return;
    const { data } = await supabase.from('users').select('reg, email, students(name)').or(`reg.ilike.%${chatSearchQuery}%,email.ilike.%${chatSearchQuery}%`).limit(5);
    if (data && data.length > 0) {
        const u = data[0];
        setChatSearchQuery("");
        loadAdminSingleChat(u.reg, u.students?.[0]?.name || u.email);
    } else {
        showToast("Not Found", "No registered user found.", "error");
    }
  };

  // Payment Actions
  const handleAdminApprove = async (paymentId: string, reg: string, amount: number) => {
    await supabase.rpc('approve_payment_and_credit', { p_payment_id: paymentId, p_user_reg: reg.toUpperCase(), p_amount: amount });
    showToast("Approved", `Approved Rs ${amount}`, "info");
    loadRealAdminData(0);
    if (activeAdminChatUser?.reg === reg) loadAdminSingleChat(reg, activeAdminChatUser.name);
  };

  const handleAdminReject = async (paymentId: string, reg: string, amount: number) => {
    if (window.confirm("Reject this and wipe user credits as punishment?")) {
        await supabase.from('payments_record').update({ status: 'rejected' }).eq('id', paymentId);
        await supabase.rpc('deduct_credits', { p_user_reg: reg, p_cost: amount });
        showToast("Rejected", "Payment rejected and credits wiped.", "info");
        loadRealAdminData(0);
        if (activeAdminChatUser?.reg === reg) loadAdminSingleChat(reg, activeAdminChatUser.name);
    }
  };

  const handleAdminModify = async (paymentId: string, currentAmount: number) => {
    const newAmount = window.prompt("Modify Amount:", currentAmount.toString());
    if (newAmount && !isNaN(Number(newAmount))) {
        await supabase.from('payments_record').update({ amount: Number(newAmount) }).eq('id', paymentId);
        showToast("Modified", `Updated to Rs ${newAmount}`, "info");
        loadRealAdminData(0);
        if (activeAdminChatUser) loadAdminSingleChat(activeAdminChatUser.reg, activeAdminChatUser.name);
    }
  };

  // Manual Award
  const handleManualAward = async (saveRecord: boolean) => {
    if(!manualPay.reg || !manualPay.amount) return showToast("Error", "Enter Reg and Amount", "error");
    if (saveRecord) {
        const { data: pending } = await supabase.from('payments_record').insert({
            user_reg: manualPay.reg.toUpperCase(), amount: Number(manualPay.amount), account_name: 'Admin Manual', tid_number: 'MANUAL-' + Date.now(), package_id: 'custom'
        }).select().single();
        if(pending) await handleAdminApprove(pending.id, pending.user_reg, pending.amount);
    } else {
        // Direct Credit Injection (No payment record)
        let calcCredits = Number(manualPay.amount) >= 500 ? 10000 : Number(manualPay.amount) * 20;
        const { data: existing } = await supabase.from('user_credits').select('credits').eq('user_reg', manualPay.reg.toUpperCase()).maybeSingle();
        if (existing) {
            await supabase.from('user_credits').update({ credits: existing.credits + calcCredits }).eq('user_reg', manualPay.reg.toUpperCase());
        } else {
            await supabase.from('user_credits').insert({ user_reg: manualPay.reg.toUpperCase(), credits: calcCredits, free_searches_today: 0 });
        }
        showToast("Awarded", "Silent credits awarded successfully.", "info");
    }
    setManualPay({ reg: "", amount: "" });
  };

  // Ban User
  const handleBanUser = async (reg: string) => {
    const days = window.prompt("Enter number of days to ban this user:", "7");
    if (days && !isNaN(Number(days))) {
        const banUntil = new Date();
        banUntil.setDate(banUntil.getDate() + parseInt(days));
        await supabase.from('users').update({ banned_until: banUntil.toISOString() }).eq('reg', reg);
        showToast("Banned", `User suspended for ${days} days.`, "info");
    }
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
    <div className={`flex flex-col min-h-screen ${t.bg} ${t.text} font-sans text-sm`}>
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

      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${t.border} ${theme === 'light' ? 'bg-white/90' : 'bg-[#00122a]/90'} px-5 py-3.5 flex justify-between items-center`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className={`p-1.5 rounded-lg border ${t.border}`}><Menu size={20} className={t.primary} /></button>
          <div className="flex items-center gap-1.5 font-black text-lg">
            IUB Result<span className={t.primary}>Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20">
            <ShieldAlert size={14} /> SYSTEM ADMIN
          </div>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className={`p-1.5 rounded-lg border ${t.border}`}>
            {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-50" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className={`fixed top-0 left-0 h-full w-64 ${theme==='light' ? 'bg-white' : 'bg-[#00173d]'} z-50 flex flex-col shadow-2xl`}>
              <div className="p-5 border-b border-slate-500/10 flex justify-between items-center">
                <div className="font-bold text-lg text-amber-500">Admin Controls</div>
                <button onClick={() => setSidebarOpen(false)}><X size={20} /></button>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { id: 'home', icon: Activity, label: 'Dashboard Stats' },
                  { id: 'search', icon: Search, label: 'Search Portal' },
                  { id: 'approvals', icon: CheckCircle2, label: 'Payment Approvals' },
                  { id: 'admin_chats', icon: MessageSquare, label: 'User Chats', badge: pendingApprovals.length },
                  { id: 'users_management', icon: UserCog, label: 'Manage Users' },
                ].map(item => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium ${activeTab === item.id ? t.btnPrimary : "hover:bg-slate-500/10"}`}>
                    <div className="flex items-center gap-3"><item.icon size={18}/> {item.label}</div>
                    {item.badge > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{item.badge}</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-5xl w-full mx-auto p-5">
        {/* TAB: DASHBOARD */}
        {activeTab === "home" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black mb-4">Admin Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg}`}>
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><DollarSign size={14}/> Total Profit</div>
                <div className="text-2xl font-black text-emerald-500">Rs {adminStats.profit.toLocaleString()}</div>
              </div>
              <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg}`}>
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><CheckCircle2 size={14}/> Pending Tasks</div>
                <div className="text-2xl font-black text-amber-500">{adminStats.pending}</div>
              </div>
              <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg}`}>
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><UsersRound size={14}/> Total Users</div>
                <div className="text-2xl font-black">{adminStats.totalUsers}</div>
              </div>
              <div className={`p-5 rounded-2xl border ${t.border} ${t.cardBg}`}>
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><MessageSquare size={14}/> Unread Chats</div>
                <div className="text-2xl font-black text-blue-500">{adminChatList.reduce((sum, c) => sum + c.unread, 0)}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: APPROVALS & PAYMENTS */}
        {activeTab === "approvals" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black flex items-center gap-2 text-amber-500"><CheckCircle2 /> Manage Approvals</h2>
            
            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl border-l-4 border-l-amber-500`}>
              <h3 className="font-bold mb-3 flex items-center gap-2"><CreditCard size={18}/> Manual Credit Award</h3>
              <div className="flex gap-3 items-center">
                <input type="text" placeholder="User Registration" value={manualPay.reg} onChange={e=>setManualPay({...manualPay, reg:e.target.value})} className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl p-3 outline-none`} />
                <input type="number" placeholder="Equivalent Rs" value={manualPay.amount} onChange={e=>setManualPay({...manualPay, amount:e.target.value})} className={`w-32 ${t.inputBg} border ${t.border} rounded-xl p-3 outline-none`} />
                <button onClick={() => handleManualAward(true)} className="bg-emerald-600 text-white font-bold rounded-xl px-5 py-3">Award & Save</button>
                <button onClick={() => handleManualAward(false)} className="bg-blue-600 text-white font-bold rounded-xl px-5 py-3">Award Only</button>
              </div>
            </div>

            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
              <h3 className="font-bold mb-4">Pending Requests ({pendingApprovals.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.map(p => (
                  <div key={p.id} className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-2xl shadow-sm relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => setExpandedPending(expandedPending === p.id ? null : p.id)} className="p-1 rounded-full bg-amber-500/20 text-amber-600"><ChevronDown size={16} /></button>
                        <button onClick={() => handleBanUser(p.user_reg)} className="p-1 rounded-full bg-red-500/10 text-red-500"><MoreVertical size={16}/></button>
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
                        <div className="mt-3 flex gap-2 p-2 bg-white/10 rounded-xl">
                            <a href={getWaLink(p?.users?.phone)} target="_blank" className="flex-1 bg-green-500 text-white py-1.5 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1"><Phone size={14}/> WhatsApp</a>
                            <button onClick={() => { setActiveAdminChatUser({reg: p.user_reg, name: p.account_name}); setActiveTab('admin_chats'); loadAdminSingleChat(p.user_reg, p.account_name); }} className="flex-1 bg-blue-500 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><MessageSquare size={14}/> Open Chat</button>
                        </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button onClick={() => handleAdminApprove(p.id, p.user_reg, p.amount)} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold">Approve</button>
                      <button onClick={() => handleAdminModify(p.id, p.amount)} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold">Modify</button>
                      <button onClick={() => handleAdminReject(p.id, p.user_reg, p.amount)} className="flex-1 bg-red-600 text-white py-2 rounded-xl text-xs font-bold">Reject (Wipe)</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
              <h3 className="font-bold mb-3">Recently Approved (Last 10)</h3>
              <div className="space-y-2">
                {approvedHistory.map(p => (
                  <div key={p.id} className={`flex justify-between items-center p-3 border ${t.border} rounded-xl bg-slate-500/5`}>
                    <div>
                      <p className="font-bold text-emerald-500">{p.user_reg} <span className="text-xs text-slate-500 ml-2">{p?.users?.students?.[0]?.name || p.account_name}</span></p>
                      <p className="text-[11px] opacity-70 font-mono">{new Date(p.created_at).toLocaleString()} | Rs {p.amount} | {p?.users?.phone || 'No Phone'}</p>
                    </div>
                  </div>
                ))}
                <button onClick={() => loadRealAdminData(approvedPage + 1)} className="w-full mt-2 py-2 text-xs font-bold bg-slate-500/10 rounded-xl">Load Next 10</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ADMIN CHATS */}
        {activeTab === "admin_chats" && (
          <div className={`flex flex-col h-[85vh] ${t.cardBg} border ${t.border} rounded-2xl overflow-hidden shadow-xl`}>
            {!activeAdminChatUser ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-500/10">
                  <h3 className="font-black text-lg mb-3 flex items-center gap-2 text-blue-500"><MessageSquare/> Chat System</h3>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Search registered user..." value={chatSearchQuery} onChange={e => setChatSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUserInChat()} className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl px-4 py-2 text-sm outline-none`} />
                    <button onClick={handleSearchUserInChat} className="bg-blue-600 text-white px-4 rounded-xl text-xs font-bold">Search DB</button>
                  </div>
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                  {adminChatList.map((u) => (
                    <div key={u.reg} onClick={() => loadAdminSingleChat(u.reg, u.name)} className="flex justify-between items-center p-4 border-b border-slate-500/10 cursor-pointer hover:bg-slate-500/5 transition-colors">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded text-[10px] font-black font-mono">{u.reg}</span>
                            <p className="font-bold text-sm truncate">{u.name}</p>
                        </div>
                        <p className="text-xs opacity-60 truncate">{u.last_msg}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] opacity-50 font-mono">{new Date(u.last_msg_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                        {u.unread > 0 && <span className="bg-emerald-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-md shadow-emerald-500/30">{u.unread}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#000a1a]">
                <div className="p-3 border-b border-slate-500/20 bg-white dark:bg-[#001c4d]">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setActiveAdminChatUser(null); loadAdminChatList(); }} className="mr-2 p-1 bg-slate-500/10 rounded-lg"><X size={16}/></button>
                      <div>
                        <div className="font-black flex items-center gap-2">{activeAdminChatUser.name} <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded text-[10px] font-mono">{activeAdminChatUser.reg}</span></div>
                      </div>
                    </div>
                  </div>
                  {/* Chat Sub-Bar */}
                  <div className="flex justify-between items-center bg-slate-100 dark:bg-[#00122a] p-2 rounded-xl text-xs">
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
                                <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-[#00205b] border border-slate-200 dark:border-blue-900 rounded-bl-sm'}`}>
                                    {item.content}
                                </div>
                                <span className="text-[10px] opacity-50 mt-1">{new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                        );
                    } else if (item.feedType === 'payment') {
                        return (
                            <div key={item.id} className="my-4 mx-auto max-w-[85%] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#002a4d] dark:to-[#001a33] p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black"><CreditCard size={16}/> Deposit Request</div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${item.status === 'approved' ? 'bg-emerald-500/20 text-emerald-600' : item.status==='rejected' ? 'bg-red-500/20 text-red-600' : 'bg-amber-500/20 text-amber-600'}`}>{item.status}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                    <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">Amount: <b className="text-emerald-500">Rs {item.amount}</b></div>
                                    <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">Name: <b>{item.account_name}</b></div>
                                    <div className="col-span-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg">TID: <b className="font-mono">{item.tid_number}</b></div>
                                </div>
                                {item.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAdminApprove(item.id, item.user_reg, item.amount)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-bold transition-colors">Approve</button>
                                        <button onClick={() => handleAdminReject(item.id, item.user_reg, item.amount)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1.5 rounded-lg text-xs font-bold transition-colors">Reject</button>
                                    </div>
                                )}
                            </div>
                        );
                    }
                  })}
                </div>
                
                <div className="p-3 bg-white dark:bg-[#001c4d] border-t border-slate-200 dark:border-slate-800 flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendMessage()} placeholder="Type a message..." className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl px-4 py-2.5 outline-none`} />
                  <button onClick={handleSendMessage} className="bg-blue-600 text-white p-3 rounded-xl"><Send size={18}/></button>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
