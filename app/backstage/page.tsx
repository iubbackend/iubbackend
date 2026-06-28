"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Building, Calendar, Users, 
  Sun, Moon, ChevronDown, Lock,
  Menu, CreditCard, History, Share2, Wallet,
  CheckCircle2, X, GraduationCap, Activity, TrendingUp, AlertCircle,
  ShieldAlert, DollarSign, UsersRound, Crown, ArrowRight, ArrowLeft, MessageSquare, Check, CheckCheck, Edit2, Trash2, Send, Phone, ArrowUpRight, Info, User, UserCog
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';
import Select from 'react-select'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

const PRIMARY_ADMIN_REG = "S20BSCS1M01001"; 

type Theme = "light" | "dark";
type TabState = "home" | "approvals" | "admin_chats" | "users_management";
type SearchMode = "Roll Number" | "Name";

interface FilterItem {
  id: number;
  label: string;
  value: string;
  session_id?: number;
  department_id?: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  
  const [theme, setTheme] = useState<Theme>("dark");
  const [currentUser, setCurrentUser] = useState({ reg: "", name: "Loading...", phone: "", email: "" });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabState>("home");
  const [toastMsg, setToastMsg] = useState<{title: string, desc: string, type: 'error'|'info'} | null>(null);

  // === SEARCH PORTAL STATES (From User Dashboard) ===
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("Roll Number");
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedDept, setSelectedDept] = useState<FilterItem | null>(null);
  const [selectedSession, setSelectedSession] = useState<FilterItem | null>(null);
  const [selectedSection, setSelectedSection] = useState<FilterItem | null>(null);
  const [filterOptions, setFilterOptions] = useState({ departments: [] as FilterItem[], sessions: [] as FilterItem[], sections: [] as FilterItem[] });
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any[] | null>(null);

  // === ADMIN DATA STATES ===
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [approvedHistory, setApprovedHistory] = useState<any[]>([]);
  const [approvedPage, setApprovedPage] = useState(0);
  const [adminStats, setAdminStats] = useState({ sales: 0, pending: 0, totalUsers: 0, premiumUsers: 0, profit: 0 });
  const [manualPay, setManualPay] = useState({ reg: "", amount: "" });
  const [expandedPending, setExpandedPending] = useState<string | null>(null);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);

  // === CHAT STATES ===
  const [adminChatList, setAdminChatList] = useState<any[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatSearchResults, setChatSearchResults] = useState<any[]>([]);
  const [activeAdminChatUser, setActiveAdminChatUser] = useState<any>(null);
  const [showChatProfile, setShowChatProfile] = useState(false);
  const [chatFeed, setChatFeed] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [userChatStats, setUserChatStats] = useState({ credits: 0, totalSpent: 0, pendingCount: 0, phone: '', email: '' });
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initialization & Security
  useEffect(() => {
    const savedTheme = localStorage.getItem("iub_theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    async function verifyAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      
      // SECURE CHECK: Kick them out if there's no session OR if they lack the 'admin' badge
      if (!session || session.user.app_metadata?.role !== 'admin') {
        return forceLogout();
      }

      // If they pass the secure check, fetch their profile data for the UI
      const { data: userRecord } = await supabase
        .from("users")
        .select("reg, phone, email")
        .ilike("email", session.user.email!)
        .maybeSingle();
      
      setCurrentUser({ 
        reg: userRecord?.reg.toUpperCase() || "ADMIN", 
        name: "System Admin", 
        phone: userRecord?.phone || "", 
        email: session.user.email! 
      });
      
      loadFilters();
      loadRealAdminData();
      loadAdminChatList();
      loadAllUsers();
    }
    
    verifyAdmin();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatFeed]);

  // === REAL-TIME CHAT SUBSCRIPTION ===
  // 1. Keep track of the currently open chat so the live-listener knows who we are talking to
  const activeChatRef = useRef(activeAdminChatUser);
  useEffect(() => { activeChatRef.current = activeAdminChatUser; }, [activeAdminChatUser]);

  // 2. Listen to the database live for incoming messages
  useEffect(() => {
    const channel = supabase.channel('admin_messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
         const newMsg = payload.new;
         const currentActive = activeChatRef.current;
         
         // Only trigger if the message involves the admin
         if (newMsg.receiver_reg === PRIMARY_ADMIN_REG || newMsg.sender_reg === PRIMARY_ADMIN_REG) {
             // Refresh the global chat list (Updates unread counters and bumps recent chats)
             loadAdminChatList();
             
             // If the admin is actively viewing this specific conversation, refresh the feed
             if (currentActive && (currentActive.reg === newMsg.sender_reg || currentActive.reg === newMsg.receiver_reg)) {
                 loadAdminSingleChat(currentActive.reg, currentActive.name);
             }
         }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
          // If a message updates (like a read receipt), refresh the UI
          loadAdminChatList();
          const currentActive = activeChatRef.current;
          if (currentActive) loadAdminSingleChat(currentActive.reg, currentActive.name);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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

  // === SEARCH LOGIC (Admin Bypass) ===
  const loadFilters = async () => {
    const [deptsRes, sessionsRes, sectionsRes] = await Promise.all([
      supabase.from("departments").select("id, depart_name"),
      supabase.from("academic_sessions").select("id, session_code"),
      supabase.from("sections").select("id, section_name, session_id, department_id")
    ]);

    const formattedSections = (sectionsRes.data || [])
      .map(s => {
        const m = s.section_name.match(/\b(\d+[A-Z])\b/i);
        return { id: s.id, value: s.id.toString(), label: m ? m[1].toUpperCase() : null, session_id: s.session_id, department_id: s.department_id };
      })
      .filter(s => s.label && /^\d+[A-Z]$/.test(s.label));

    setFilterOptions({
      departments: (deptsRes.data || []).map(d => ({ id: d.id, value: d.id.toString(), label: d.depart_name })),
      sessions: (sessionsRes.data || []).map(s => ({ id: s.id, value: s.id.toString(), label: s.session_code })),
      sections: formattedSections
    });
  };

  const parseSessionToPrefix = (label: string) => {
    if (!label) return "";
    const match = label.match(/(SPRING|FALL)\s+(\d{4})/i);
    if(!match) return "";
    return (match[1].charAt(0) + match[2].slice(-2)).toUpperCase(); 
  };

  const handleSearch = async (e?: React.FormEvent, newPage = 0) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

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
        if (selectedSession && selectedSession.label) {
          const mappedPrefix = parseSessionToPrefix(selectedSession.label);
          if (mappedPrefix) query = query.ilike("reg", `${mappedPrefix}%`);
        }
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

  const handleExpandResult = async (reg: string, studentId: number) => {
    if (expandedReg === reg) {
      setExpandedReg(null);
      return;
    }
    setExpandedReg(reg);

    try {
      // Admin sees everything (Pro Mode hardcoded)
      const columns = "id, sessional_marks, mid_term_marks, end_term_marks, practical_sessional_marks, practical_final_marks, total_marks, subject_id (course_code, course_name, credit_hours), semester_num, semester";
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
        
        const totalMarks = roundMark(rec.total_marks);
        const gradeInfo = getGradeInfo(totalMarks);
        const credits = Number(rec.subject_id?.credit_hours) || 3;

        acc[sem].push({
          code: rec.subject_id?.course_code || "N/A",
          name: rec.subject_id?.course_name || "Unknown",
          credits: credits,
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

        courses.forEach((c: any) => {
           if (c.tot !== null) {
             totalQualityPoints += (c.gp * c.credits);
             totalCr += c.credits;
             semTotalMarks += c.tot;
             semMaxMarks += 100;
           } else {
             totalCr += c.credits;
           }
        });
        const sgpa = totalCr > 0 ? (totalQualityPoints / totalCr).toFixed(2) : "0.00";
        return { semNum: sem.replace("Semester ", ""), courses: courses, sgpa: sgpa, totalMarks: semTotalMarks, maxMarks: semMaxMarks };
      });

      setStudentDetails(sortedSemesters);
    } catch (err) {
      setStudentDetails([]);
    }
  };


  // === ADMIN DATA LOADING ===
  const loadRealAdminData = async (appPage = 0) => {
    // We fetch decoupled to avoid missing FK relation errors
    const { data: approvedAll } = await supabase.from('payments_record').select('amount, user_reg').eq('status', 'approved');
    const totalProfit = approvedAll?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    
    // Fetch Pending
    const { data: pending } = await supabase.from('payments_record').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    
    // Fetch user details manually to avoid FK crash
    let pendingWithUsers = pending || [];
    if (pending && pending.length > 0) {
        const regs = pending.map(p => p.user_reg);
        const { data: users } = await supabase.from('users').select('reg, phone, email').in('reg', regs);
        pendingWithUsers = pending.map(p => ({
            ...p,
            users: users?.find(u => u.reg === p.user_reg) || { phone: 'N/A', email: 'N/A' }
        }));
    }
    setPendingApprovals(pendingWithUsers);
    
    // Fetch Approved Paginated
    const { data: approvedPaginated } = await supabase.from('payments_record').select('*').eq('status', 'approved').order('created_at', { ascending: false }).range(appPage * 10, (appPage + 1) * 10 - 1);
    
    let appWithUsers = approvedPaginated || [];
    if (approvedPaginated && approvedPaginated.length > 0) {
        const regsApp = approvedPaginated.map(p => p.user_reg);
        const { data: appUsers } = await supabase.from('users').select('reg, phone').in('reg', regsApp);
        appWithUsers = approvedPaginated.map(p => ({
            ...p,
            users: appUsers?.find(u => u.reg === p.user_reg) || { phone: 'N/A' }
        }));
    }

    if (appPage === 0) setApprovedHistory(appWithUsers);
    else setApprovedHistory(prev => [...prev, ...appWithUsers]);
    setApprovedPage(appPage);

    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    setAdminStats({ sales: approvedAll?.length || 0, pending: pending?.length || 0, totalUsers: userCount || 0, premiumUsers: 0, profit: totalProfit });
  };

  const loadAllUsers = async () => {
    const { data } = await supabase.from('users').select('reg, email, phone').order('reg', { ascending: true }).limit(100);
    setAllUsersList(data || []);
  };

  const handleChatSearch = async (val: string) => {
      setChatSearchQuery(val);
      if (!val.trim()) {
          setChatSearchResults([]);
          return;
      }
      
      try {
        // 1. Fetch from registered users first
        const { data: registeredUsers, error } = await supabase
          .from('users')
          .select('reg, email')
          .or(`reg.ilike.%${val}%,email.ilike.%${val}%`)
          .limit(10);

        if (error) throw error;

        if (!registeredUsers || registeredUsers.length === 0) {
          // Fallback: Check name records in students, then verify if they have a user account
          const { data: studentMatch } = await supabase
            .from('students')
            .select('reg, name')
            .ilike('name', `%${val}%`)
            .limit(5);

          if (studentMatch && studentMatch.length > 0) {
            const matches = studentMatch.map(s => s.reg);
            const { data: userFallback } = await supabase.from('users').select('reg, email').in('reg', matches);
            
            if (userFallback && userFallback.length > 0) {
              const enrichedFallback = userFallback.map(u => ({
                reg: u.reg,
                name: studentMatch.find(s => s.reg === u.reg)?.name || u.email
              }));
              setChatSearchResults(enrichedFallback);
              return;
            }
          }
          setChatSearchResults([]);
          return;
        }

        // 2. Fetch profile structural names for the verified list
        const userRegs = registeredUsers.map(u => u.reg);
        const { data: profiles } = await supabase
          .from('students')
          .select('reg, name')
          .in('reg', userRegs);

        const enrichedResults = registeredUsers.map(u => ({
          reg: u.reg,
          name: profiles?.find(p => p.reg === u.reg)?.name || u.email
        }));

        setChatSearchResults(enrichedResults);
      } catch (err) {
        console.error("Chat search error: ", err);
        setChatSearchResults([]);
      }
  };

  const loadAdminChatList = async () => {
    const { data, error } = await supabase.rpc('get_admin_chat_list');
    if (!error && data && data.length > 0) {
      const regs = data.map((d: any) => d.reg);
      
      // Fetch latest messages for calculations
      const { data: latestMsgs } = await supabase.from('messages')
        .select('sender_reg, receiver_reg, content, is_read, is_delivered, created_at')
        .or(`receiver_reg.eq.${PRIMARY_ADMIN_REG},sender_reg.eq.${PRIMARY_ADMIN_REG}`)
        .order('created_at', { ascending: false });

      // Fetch names from students table so your sidebar displays beautiful names instead of blank emails
      const { data: studentNames } = await supabase
        .from('students')
        .select('reg, name')
        .in('reg', regs);

      const enrichedList = data.map((chat: any) => {
         const lastMsg = latestMsgs?.find(m => 
            (m.sender_reg === chat.reg && m.receiver_reg === PRIMARY_ADMIN_REG) || 
            (m.sender_reg === PRIMARY_ADMIN_REG && m.receiver_reg === chat.reg)
         );
         
         const studentProfile = studentNames?.find(s => s.reg.toUpperCase() === chat.reg.toUpperCase());

         return {
             ...chat,
             name: studentProfile ? studentProfile.name : (chat.name || "Registered User"),
             last_msg_content: lastMsg ? lastMsg.content : "No messages",
             last_msg_is_me: lastMsg?.sender_reg === PRIMARY_ADMIN_REG,
             last_msg_is_read: lastMsg?.is_read || false,
             last_msg_is_delivered: lastMsg?.is_delivered || false,
             last_msg_time: lastMsg ? lastMsg.created_at : chat.last_msg_time
         };
      });

      // Sort chats dynamically so the person who sent the freshest message jumps straight to the top
      enrichedList.sort((a, b) => new Date(b.last_msg_time).getTime() - new Date(a.last_msg_time).getTime());
      setAdminChatList(enrichedList);
    } else {
      if (error) console.error("Error executing admin chat list loading routing:", error);
      setAdminChatList([]);
    }
  };

  const loadAdminSingleChat = async (reg: string, name: string) => {
    setActiveAdminChatUser({ reg, name });
    setShowChatProfile(false);
    setChatSearchQuery("");
    setChatSearchResults([]);
    
    // Decoupled fetch to avoid FK crash
    const [msgsRes, payRes, credRes, userRes] = await Promise.all([
      supabase.from('messages').select('*').or(`and(sender_reg.eq.${reg},receiver_reg.eq.${PRIMARY_ADMIN_REG}),and(sender_reg.eq.${PRIMARY_ADMIN_REG},receiver_reg.eq.${reg})`),
      supabase.from('payments_record').select('*').eq('user_reg', reg),
      supabase.from('user_credits').select('credits').eq('user_reg', reg).maybeSingle(),
      supabase.from('users').select('phone, email').eq('reg', reg).maybeSingle()
    ]);

    const payments = payRes.data || [];
    const feed = [
        ...(msgsRes.data || []).map(m => ({ ...m, feedType: 'msg' })),
        ...payments.map(p => ({ ...p, feedType: 'payment' }))
    ].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    setChatFeed(feed);
    setUserChatStats({
        credits: credRes.data?.credits || 0,
        totalSpent: payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0),
        pendingCount: payments.filter(p => p.status === 'pending').length,
        phone: userRes.data?.phone || 'N/A',
        email: userRes.data?.email || 'N/A'
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

  // === PAYMENT ACTIONS ===
  const handleAdminApprove = async (paymentId: string, reg: string, amount: number) => {
    try {
      await supabase.rpc('approve_payment_and_credit', { p_payment_id: paymentId, p_user_reg: reg.toUpperCase(), p_amount: amount });
      showToast("Approved", `Approved Rs ${amount}`, "info");
      loadRealAdminData(0);
      if (activeAdminChatUser?.reg === reg) loadAdminSingleChat(reg, activeAdminChatUser.name);
    } catch (e: any) {
       // Fallback if RPC fails/disabled
       await supabase.from('payments_record').update({ status: 'approved' }).eq('id', paymentId);
       
       let calcCredits = 0;
       if (amount === 5000) calcCredits = 125000;
       else if (amount === 1000) calcCredits = 17000;
       else if (amount === 500) calcCredits = 7500;
       else calcCredits = amount * 15;

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

  const handleAdminReject = async (paymentId: string, reg: string) => {
    if (window.confirm("Reject this payment?")) {
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
        let calcCredits = 0;
        const numAmount = Number(manualPay.amount);
        if (numAmount === 5000) calcCredits = 125000;
        else if (numAmount === 1000) calcCredits = 17000;
        else if (numAmount === 500) calcCredits = 7500;
        else calcCredits = numAmount * 15;

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

  const showToast = (title: string, desc: string, type: 'error'|'info' = 'error') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const getWaLink = (phone: string) => `https://wa.me/${phone?.replace(/^0/, '92').replace(/\D/g, '') || ''}`;

  // UI Theme Vars
  const t = {
    bg: theme === "light" ? "bg-[#f4f7f6]" : "bg-[#00122a]",
    text: theme === "light" ? "text-slate-800" : "text-slate-100",
    textMuted: theme === "light" ? "text-slate-500" : "text-blue-300/70",
    cardBg: theme === "light" ? "bg-white border-slate-300/60 shadow-md" : "bg-[#001c4d]/80 border-[#00348c]/50",
    border: theme === "light" ? "border-slate-300/60" : "border-[#00348c]/50",
    primary: theme === "light" ? "text-[#0056b3]" : "text-amber-400",
    inputBg: theme === "light" ? "bg-slate-50 border-slate-300" : "bg-[#00122a]/50",
    inputFocus: theme === "light" ? "focus:border-[#0056b3] focus:ring-[#0056b3]/20" : "focus:border-amber-500 focus:ring-amber-500/30",
    btnPrimary: theme === "light" ? "bg-[#0056b3] text-white hover:bg-[#004494]" : "bg-amber-500 text-black hover:bg-amber-400",
  };

  const selectStyles = {
    control: (base: any) => ({ ...base, background: 'transparent', borderColor: 'transparent', boxShadow: 'none', cursor: 'pointer', paddingLeft: '1rem', minHeight: '2.5rem', fontSize: '0.8rem', color: theme === 'light' ? '#1e293b' : '#f1f5f9' }),
    singleValue: (base: any) => ({ ...base, color: theme === 'light' ? '#1e293b' : '#f1f5f9' }),
    input: (base: any) => ({ ...base, color: theme === 'light' ? '#1e293b' : '#f1f5f9' }),
    menu: (base: any) => ({ ...base, backgroundColor: theme === 'light' ? '#ffffff' : '#001c4d', border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#00348c'}`, zIndex: 999 }),
    option: (base: any, state: any) => ({ ...base, backgroundColor: state.isFocused ? (theme === 'light' ? '#f1f5f9' : '#00205b') : 'transparent', color: theme === 'light' ? '#1e293b' : '#f1f5f9', cursor: 'pointer', fontSize: '0.8rem' })
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
          
          {/* CHANGED: Now sets active tab to home instead of pushing route to '/' */}
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={t.primary}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-current opacity-20"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 14l3-3 2 2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-lg font-black tracking-tight leading-none whitespace-nowrap">
              IUB Result<span className={t.primary}>Admin</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black font-black text-xs shadow-md">
            <ShieldAlert size={14} /> ADMIN
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
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className={`fixed top-0 left-0 h-full w-64 ${theme==='light' ? 'bg-white' : 'bg-[#00173d]'} z-50 flex flex-col shadow-2xl border-r ${t.border}`}
            >
              <div className="p-5 border-b border-slate-500/10 flex justify-between items-center">
                <div className="font-bold text-lg text-amber-500 flex items-center gap-2"><Crown size={18}/> Controls</div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-black/5"><X size={20} /></button>
              </div>
              <div className="p-3 space-y-1 flex-1">
                {[
                  { id: 'home', icon: Activity, label: 'Search & Dashboard' },
                  { id: 'approvals', icon: CheckCircle2, label: 'Approvals', badge: pendingApprovals.length },
                  { id: 'admin_chats', icon: MessageSquare, label: 'User Chats', badge: adminChatList.reduce((sum, c) => sum + (c.unread || 0), 0) },
                  { id: 'users_management', icon: UserCog, label: 'Manage Users' },
                ].map(item => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${activeTab === item.id ? t.btnPrimary + ' shadow-md' : "hover:bg-slate-500/10"}`}>
                    <div className="flex items-center gap-3"><item.icon size={16}/> {item.label}</div>
                    {item.badge > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md">{item.badge}</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-5">
        
        {/* TAB: DASHBOARD & SEARCH */}
        {activeTab === "home" && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-3 mb-2">
                <h2 className="text-xl font-black">Admin Overview</h2>
                {pendingApprovals.length > 0 && (
                     <button onClick={() => setActiveTab('approvals')} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95">
                         <AlertCircle size={14}/> {pendingApprovals.length} Pending Requests <ArrowRight size={14}/>
                     </button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`p-4 rounded-2xl border ${t.border} ${t.cardBg}`}>
                <div className="text-[11px] font-bold opacity-70 mb-1 flex items-center gap-1.5"><DollarSign size={12}/> Profit</div>
                <div className="text-xl font-black text-emerald-500">Rs {adminStats.profit.toLocaleString()}</div>
              </div>
              <div onClick={() => setActiveTab('approvals')} className={`p-4 rounded-2xl border ${t.border} ${t.cardBg} cursor-pointer hover:border-amber-500 transition-colors`}>
                <div className="text-[11px] font-bold opacity-70 mb-1 flex items-center gap-1.5"><CheckCircle2 size={12}/> Pending Tasks</div>
                <div className="text-xl font-black text-amber-500 flex justify-between items-center">
                    {adminStats.pending} <ArrowUpRight size={14} className="opacity-50"/>
                </div>
              </div>
              <div className={`p-4 rounded-2xl border ${t.border} ${t.cardBg}`}>
                <div className="text-[11px] font-bold opacity-70 mb-1 flex items-center gap-1.5"><UsersRound size={12}/> Total Users</div>
                <div className="text-xl font-black">{adminStats.totalUsers}</div>
              </div>
              <div onClick={() => setActiveTab('admin_chats')} className={`p-4 rounded-2xl border ${t.border} ${t.cardBg} cursor-pointer hover:border-blue-500 transition-colors`}>
                <div className="text-[11px] font-bold opacity-70 mb-1 flex items-center gap-1.5"><MessageSquare size={12}/> Unread Chats</div>
                <div className="text-xl font-black text-blue-500 flex justify-between items-center">
                    {adminChatList.reduce((sum, c) => sum + c.unread, 0)} <ArrowUpRight size={14} className="opacity-50"/>
                </div>
              </div>
            </div>

            {/* SEARCH PORTAL CLONE */}
            <div className={`${t.cardBg} border ${t.border} p-4 sm:p-5 rounded-2xl transition-all mt-4`}>
              <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-emerald-500"><Search size={18}/> Search Results</h3>
              <form onSubmit={(e) => handleSearch(e, 0)} className="flex flex-col gap-3">
                
                <div className="flex flex-col items-center mb-1">
                  <div className={`flex p-1 rounded-xl w-full max-w-[280px] relative ${theme==='light'?'bg-slate-100 border border-slate-200':'bg-[#00122a] border border-[#00348c]/30'}`}>
                    <div 
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-out shadow-sm ${t.btnPrimary}`}
                      style={{ left: searchMode === 'Roll Number' ? '4px' : 'calc(50%)' }}
                    />
                    <button type="button" onClick={() => {setSearchMode('Roll Number'); setSearchQuery(""); setSearchResults(null);}} className={`flex-1 py-1.5 text-xs font-bold z-10 transition-colors ${searchMode === 'Roll Number' ? (theme==='light'?'text-white':'text-black') : 'opacity-60 hover:opacity-100'}`}>
                      Reg Number
                    </button>
                    <button type="button" onClick={() => {setSearchMode('Name'); setSearchQuery(""); setSearchResults(null);}} className={`flex-1 py-1.5 text-xs font-bold z-10 transition-colors ${searchMode === 'Name' ? (theme==='light'?'text-white':'text-black') : 'opacity-60 hover:opacity-100'}`}>
                      Name
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {searchMode === "Name" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-2 overflow-visible pt-1"
                    >
                      <div className="relative z-[60]">
                        <Calendar className={`absolute left-3 top-2.5 ${t.textMuted} z-10`} size={14} />
                        <Select options={filterOptions.sessions} value={selectedSession} onChange={(val) => { setSelectedSession(val); setSelectedSection(null); }} styles={selectStyles} placeholder="All Sessions" isClearable />
                      </div>
                      <div className="relative z-[50]">
                        <Building className={`absolute left-3 top-2.5 ${t.textMuted} z-10`} size={14} />
                        <Select options={filterOptions.departments} value={selectedDept} onChange={(val) => { setSelectedDept(val); setSelectedSection(null); }} styles={selectStyles} placeholder="All Departments" isClearable />
                      </div>
                      <div className="relative z-[40]">
                        <Users className={`absolute left-3 top-2.5 ${t.textMuted} z-10`} size={14} />
                        <Select options={filterOptions.sections.filter(s => (!selectedSession || s.session_id === parseInt(selectedSession.value)) && (!selectedDept || s.department_id === parseInt(selectedDept.value)))} value={selectedSection} onChange={(val) => setSelectedSection(val)} styles={selectStyles} placeholder="All Sections" isClearable />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Search className={`absolute left-3 top-2.5 ${t.textMuted}`} size={16} />
                    <input type="text" placeholder={searchMode === 'Roll Number' ? "e.g. F20BSCS1M010" : "e.g. Ali"} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none ${t.inputFocus}`}
                    />
                  </div>
                  <button type="submit" disabled={isSearching || !searchQuery.trim()} className={`${t.btnPrimary} font-bold text-xs rounded-xl px-6 py-2 flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm`}>
                    {isSearching ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Search"}
                  </button>
                </div>
              </form>
            </div>

            {searchResults && (
              <div className={`font-bold mb-2 px-1 text-xs ${t.textMuted}`}>
                Showing {searchResults.length} of {totalRecords} records
              </div>
            )}

            <div className="space-y-2">
              <AnimatePresence>
                {searchResults?.map((student, idx) => (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
                    <div className="p-3 flex justify-between items-center gap-2 cursor-pointer hover:bg-slate-500/5 transition-colors" onClick={() => handleExpandResult(student.reg, student.id)}>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold ${theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-[#00122a] border-[#00348c]'}`}>{student.reg}</span>
                          <h3 className="font-bold text-sm">{student.name}</h3>
                        </div>
                        <div className={`text-[11px] ${t.textMuted} font-medium`}>
                          {student.session} • {student.section?.replace(/[- ]?\d+(st|nd|rd|th)[- ]?/i, ' • ')}
                        </div>
                      </div>
                      <button className={`p-1.5 rounded-full ${t.textMuted} bg-slate-500/5 transition-colors`}>
                        <motion.div animate={{ rotate: expandedReg === student.reg ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown size={16} />
                        </motion.div>
                      </button>
                    </div>

                    <AnimatePresence>
                      {expandedReg === student.reg && studentDetails && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className={`border-t ${t.border} overflow-hidden ${theme === 'light' ? 'bg-slate-50/50' : 'bg-[#00122a]/30'}`}>
                          <div className="p-3 space-y-3">
                            {studentDetails.length === 0 ? (
                              <div className="text-center py-4 opacity-60 text-xs font-medium">No Records found.</div>
                            ) : (
                              studentDetails.map((sem: any, sIdx: number) => (
                                <div key={sIdx} className={`rounded-xl border ${t.border} ${t.cardBg} overflow-hidden shadow-sm`}>
                                  <div className={`px-2 py-1.5 text-[10px] font-black uppercase tracking-widest ${theme === 'light' ? 'bg-[#0056b3]/5 text-[#0056b3]' : 'bg-[#00122a] text-amber-400'}`}>
                                    Semester {sem.semNum}
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left whitespace-nowrap text-xs">
                                      <thead className={`border-b ${t.border} text-opacity-80 bg-black/5`}>
                                        <tr>
                                          <th className="px-2 py-1.5 font-bold">Subject</th>
                                          <th className="px-2 py-1.5 text-center font-bold">Mid</th>
                                          <th className="px-2 py-1.5 text-center font-bold">Sess</th>
                                          <th className="px-2 py-1.5 text-center font-bold">Fin</th>
                                          <th className="px-2 py-1.5 text-center font-bold">Tot</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-500/10">
                                        {sem.courses.map((course: any, cIdx: number) => (
                                          <tr key={cIdx} className="hover:bg-black/5">
                                            <td className="px-2 py-1.5 max-w-[150px] truncate" title={course.name}>
                                              <span className="font-semibold block">{course.name}</span>
                                              <span className="block text-[9px] opacity-70 font-mono mt-0.5">{course.code} • {course.credits}Cr</span>
                                            </td>
                                            <td className="px-2 py-1.5 text-center font-mono">{course.mid ?? "-"}</td>
                                            <td className="px-2 py-1.5 text-center font-mono">{course.sess ?? "-"}</td>
                                            <td className="px-2 py-1.5 text-center font-mono">{course.fin ?? "-"}</td>
                                            <td className={`px-2 py-1.5 text-center font-mono font-bold ${t.primary}`}>{course.tot ?? "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className={`px-2 py-2 flex justify-between items-center text-[11px] border-t ${t.border} bg-black/5`}>
                                    <div className="font-bold opacity-80">Cr: {sem.courses.reduce((acc: number, c: any) => acc + c.credits, 0)}</div>
                                    <div className="flex items-center gap-3">
                                      <div className="font-bold">Marks: <span className={t.primary}>{sem.totalMarks}</span> / {sem.maxMarks}</div>
                                      <div className="font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">SGPA: {sem.sgpa}</div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>

              {searchResults && searchResults.length > 0 && totalRecords > searchResults.length && (
                <button onClick={(e) => handleSearch(e, page + 1)} className={`w-full py-2.5 rounded-xl border ${t.border} ${t.cardBg} hover:bg-slate-500/5 text-xs font-bold transition-colors shadow-sm`}>
                  Load Next 10 Records
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB: APPROVALS & PAYMENTS */}
        {activeTab === "approvals" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <h2 className="text-xl font-black flex items-center gap-2 text-amber-500"><CheckCircle2 size={20}/> Manage Approvals</h2>
            
            <div className={`${t.cardBg} border ${t.border} p-4 rounded-2xl border-l-4 border-l-amber-500`}>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><CreditCard size={16}/> Manual Credit Award</h3>
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <input type="text" placeholder="Reg Number" value={manualPay.reg} onChange={e=>setManualPay({...manualPay, reg:e.target.value})} className={`w-full sm:flex-1 ${t.inputBg} border ${t.border} rounded-lg p-2 text-xs outline-none`} />
                <input type="number" placeholder="Amount (Rs)" value={manualPay.amount} onChange={e=>setManualPay({...manualPay, amount:e.target.value})} className={`w-full sm:w-28 ${t.inputBg} border ${t.border} rounded-lg p-2 text-xs outline-none`} />
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => handleManualAward(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-3 py-2 transition-colors">Award & Save</button>
                    <button onClick={() => handleManualAward(false)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg px-3 py-2 transition-colors">Silent</button>
                </div>
              </div>
            </div>

            <div className={`${t.cardBg} border ${t.border} p-4 rounded-2xl`}>
              <h3 className="font-bold text-sm mb-3">Pending Requests ({pendingApprovals.length})</h3>
              {pendingApprovals.length === 0 ? (
                  <div className={`p-6 text-center text-xs rounded-xl border ${t.border} border-dashed opacity-50 font-bold`}>No pending requests.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pendingApprovals.map(p => (
                    <div key={p.id} className={`p-3 border border-amber-500/30 bg-amber-500/5 rounded-xl relative transition-all hover:border-amber-500/60`}>
                        <div className="absolute top-3 right-3 flex gap-1">
                            <button onClick={() => setExpandedPending(expandedPending === p.id ? null : p.id)} className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors"><ChevronDown size={14} /></button>
                        </div>
                        <div className="mb-1">
                            <h4 className="font-black text-base text-amber-500">{p.user_reg}</h4>
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-sm uppercase">Rs {p.amount}</span>
                        </div>
                        <div className="text-[11px] space-y-0.5 opacity-80 mt-2">
                            <p><strong>Name:</strong> {p.account_name}</p>
                            <p><strong>TID:</strong> <span className="font-mono">{p.tid_number}</span></p>
                        </div>
                        
                        {expandedPending === p.id && (
                            <motion.div initial={{ height: 0, opacity: 0}} animate={{ height: 'auto', opacity: 1}} className="mt-2 flex gap-2 p-1.5 bg-black/5 rounded-lg overflow-hidden">
                                <a href={getWaLink(p?.users?.phone)} target="_blank" className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1.5 rounded text-[10px] font-bold text-center flex items-center justify-center gap-1 transition-colors"><Phone size={12}/> WhatsApp</a>
                                <button onClick={() => { setActiveAdminChatUser({reg: p.user_reg, name: p.account_name}); setActiveTab('admin_chats'); loadAdminSingleChat(p.user_reg, p.account_name); }} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"><MessageSquare size={12}/> Open Chat</button>
                            </motion.div>
                        )}

                        <div className="flex gap-2 mt-3">
                            <button onClick={() => handleAdminApprove(p.id, p.user_reg, p.amount)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-[11px] font-bold transition-colors">Approve</button>
                            <button onClick={() => handleAdminReject(p.id, p.user_reg)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-1.5 rounded-lg text-[11px] font-bold transition-colors">Reject</button>
                        </div>
                    </div>
                    ))}
                </div>
              )}
            </div>

            <div className={`${t.cardBg} border ${t.border} p-4 rounded-2xl`}>
              <h3 className="font-bold text-sm mb-3">Recently Approved (Last {approvedHistory.length})</h3>
              <div className="space-y-1.5">
                {approvedHistory.map(p => (
                  <div key={p.id} className={`flex justify-between items-center p-2.5 border ${t.border} rounded-lg bg-black/5`}>
                    <div>
                      <p className="font-bold text-xs text-emerald-500">{p.user_reg}</p>
                      <p className="text-[10px] opacity-70 font-mono">{new Date(p.created_at).toLocaleString()} | Rs {p.amount} | {p?.users?.phone || 'No Phone'}</p>
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-500/20">Approved</span>
                  </div>
                ))}
                <button onClick={() => loadRealAdminData(approvedPage + 1)} className={`w-full mt-2 py-2 text-[11px] font-bold border ${t.border} rounded-lg hover:bg-black/5 transition-colors`}>Load Next 10</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ADMIN CHATS */}
        {activeTab === "admin_chats" && (
          <div className={`flex flex-col h-[75vh] md:h-[80vh] ${t.cardBg} border ${t.border} rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300`}>
            {!activeAdminChatUser ? (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-slate-500/10 bg-black/5">
                  <h3 className="font-black text-base mb-2 flex items-center gap-2 text-blue-500"><MessageSquare size={16}/> Chat System</h3>
                  <div className="relative">
                    <input type="text" placeholder="Search by Reg or Name to start chat..." value={chatSearchQuery} onChange={e => handleChatSearch(e.target.value)} className={`w-full ${t.inputBg} border ${t.border} rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500 transition-colors`} />
                    {chatSearchResults.length > 0 && (
                        <div className={`absolute top-full left-0 right-0 mt-1 z-50 ${t.cardBg} border ${t.border} rounded-lg shadow-xl overflow-hidden`}>
                            {chatSearchResults.map(res => (
                                <div key={res.reg} onClick={() => loadAdminSingleChat(res.reg, res.name)} className="px-3 py-2 text-xs border-b border-slate-500/10 hover:bg-blue-500/10 cursor-pointer flex justify-between items-center">
                                    <span className="font-bold">{res.name}</span>
                                    <span className="font-mono text-[9px] text-blue-500 px-1.5 bg-blue-500/10 rounded">{res.reg}</span>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                </div>
                <div className="p-0 overflow-y-auto flex-1">
                  {adminChatList.length === 0 ? (
                      <div className="p-8 text-center text-xs opacity-50 font-bold">No active conversations found.</div>
                  ) : (
                      adminChatList.map((u) => (
                        <div key={u.reg} onClick={() => loadAdminSingleChat(u.reg, u.name)} className={`flex justify-between items-center px-3 py-2.5 border-b ${t.border} cursor-pointer hover:bg-black/5 transition-colors`}>
                          <div className="flex-1 pr-3 overflow-hidden">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${theme==='light'?'bg-slate-100 border border-slate-300':'bg-[#00122a] border border-[#00348c]'}`}>{u.reg}</span>
                                <p className="font-bold text-[13px] truncate">{u.name}</p>
                            </div>
                            <p className="text-[11px] opacity-60 truncate">{u.last_msg_is_me && "You: "}{u.last_msg_content}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] opacity-50 font-mono">{u.last_msg_time ? new Date(u.last_msg_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            <div className="flex items-center gap-1.5">
                                {u.last_msg_is_me && (
                                    u.last_msg_is_read ? <CheckCheck size={12} className="text-blue-400" /> : u.last_msg_is_delivered ? <CheckCheck size={12} className="text-gray-400" /> : <Check size={12} className="text-gray-400" />
                                )}
                                {u.unread > 0 && <span className="bg-emerald-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold shadow-sm">{u.unread}</span>}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ) : (
              <div className={`flex flex-col h-full ${theme === 'light' ? 'bg-slate-50' : 'bg-[#000a1a]'}`}>
                {/* Single Chat Header */}
                <div className={`p-2 border-b ${t.border} ${theme==='light' ? 'bg-white' : 'bg-[#001c4d]'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setActiveAdminChatUser(null); loadAdminChatList(); }} className="p-1.5 hover:bg-black/10 rounded-md transition-colors">
                          <ArrowLeft size={16} />
                      </button>
                      <div className="cursor-pointer" onClick={() => setShowChatProfile(!showChatProfile)}>
                        <div className="font-black text-sm flex items-center gap-2">
                            {activeAdminChatUser.name} 
                        </div>
                        <div className="text-[10px] font-mono text-blue-500 flex items-center gap-1">
                            {activeAdminChatUser.reg} <Info size={10} className="opacity-50"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 overflow-hidden relative">
                    {/* Chat Messages Area */}
                    <div className={`flex-1 flex flex-col ${showChatProfile ? 'hidden sm:flex' : 'flex'}`}>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={chatScrollRef}>
                          {chatFeed.map((item) => {
                            if (item.feedType === 'msg') {
                                const isMe = item.sender_reg === PRIMARY_ADMIN_REG;
                                return (
                                    <div key={item.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 text-xs shadow-sm ${isMe ? t.btnPrimary + ' rounded-2xl rounded-tr-sm' : `bg-white dark:bg-[#00205b] border ${t.border} rounded-2xl rounded-tl-sm`}`}>
                                            {item.content}
                                        </div>
                                        <div className="flex items-center mt-0.5 gap-1">
                                            <span className="text-[9px] opacity-50">{new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            {isMe && (
                                                <span className="ml-0.5">
                                                    {item.is_read ? <CheckCheck size={12} className="text-blue-400" /> : <Check size={12} className="text-gray-400" />}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            } else if (item.feedType === 'payment') {
                                return (
                                    <div key={item.id} className="my-2 mx-auto w-full max-w-[90%] sm:max-w-[75%] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#002a4d] dark:to-[#001a33] p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs"><CreditCard size={14}/> Deposit</div>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${item.status === 'approved' ? 'bg-emerald-500/20 text-emerald-600' : item.status==='rejected' ? 'bg-red-500/20 text-red-600' : 'bg-amber-500/20 text-amber-600'}`}>{item.status}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2">
                                            <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded border border-black/5">Amount: <b className="text-emerald-500">Rs {item.amount}</b></div>
                                            <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded border border-black/5">Name: <b className="truncate block">{item.account_name}</b></div>
                                            <div className="col-span-2 bg-white/50 dark:bg-black/20 p-1.5 rounded border border-black/5">TID: <b className="font-mono">{item.tid_number}</b></div>
                                        </div>
                                        {item.status === 'pending' && (
                                            <div className="flex gap-1.5">
                                                <button onClick={() => handleAdminApprove(item.id, item.user_reg, item.amount)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded text-[10px] font-bold transition-colors">Approve</button>
                                                <button onClick={() => handleAdminReject(item.id, item.user_reg)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1.5 rounded text-[10px] font-bold transition-colors">Reject</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                          })}
                        </div>
                        
                        <div className={`p-2 bg-white dark:bg-[#001c4d] border-t ${t.border} flex gap-1.5`}>
                          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendMessage()} placeholder="Type message..." className={`flex-1 ${t.inputBg} border ${t.border} rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-colors`} />
                          <button onClick={handleSendMessage} className={`${t.btnPrimary} px-3 rounded-lg transition-transform active:scale-95`}><Send size={14}/></button>
                        </div>
                    </div>

                    {/* Chat Profile Drawer (WhatsApp style) */}
                    <AnimatePresence>
                        {showChatProfile && (
                            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 250, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className={`border-l ${t.border} ${theme === 'light' ? 'bg-white' : 'bg-[#001c4d]'} flex flex-col w-full sm:w-[250px] absolute sm:relative h-full right-0 z-10`}>
                                <div className={`p-3 border-b ${t.border} flex justify-between items-center`}>
                                    <h4 className="font-bold text-xs">Profile Info</h4>
                                    <button onClick={() => setShowChatProfile(false)} className="p-1 hover:bg-black/5 rounded"><X size={14}/></button>
                                </div>
                                <div className="p-4 flex flex-col items-center border-b border-slate-500/10">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-lg mb-2 ${t.btnPrimary}`}>
                                        {activeAdminChatUser.name.charAt(0)}
                                    </div>
                                    <h3 className="font-bold text-sm text-center">{activeAdminChatUser.name}</h3>
                                    <p className="text-[10px] font-mono text-blue-500">{activeAdminChatUser.reg}</p>
                                </div>
                                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                                    <div>
                                        <p className="text-[9px] uppercase tracking-widest opacity-50 mb-1">Contact</p>
                                        <p className="text-xs font-medium flex items-center gap-1.5"><Phone size={12}/> {userChatStats.phone}</p>
                                        <p className="text-xs font-medium mt-1 truncate max-w-full">{userChatStats.email}</p>
                                    </div>
                                    <hr className={`border-${t.border}`} />
                                    <div>
                                        <p className="text-[9px] uppercase tracking-widest opacity-50 mb-1">Wallet Stats</p>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-1"><Wallet size={12} className="text-amber-500"/> Credits</span>
                                                <span className="font-bold">{userChatStats.credits}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-1"><DollarSign size={12} className="text-emerald-500"/> Total Spent</span>
                                                <span className="font-bold">Rs {userChatStats.totalSpent}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-1"><Activity size={12} className="text-red-400"/> Pending</span>
                                                <span className="font-bold">{userChatStats.pendingCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: USERS MANAGEMENT */}
        {activeTab === "users_management" && (
            <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black flex items-center gap-2 text-blue-500"><UserCog size={20}/> Manage Users</h2>
                    <button onClick={loadAllUsers} className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-2.5 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-colors">Refresh</button>
                </div>

                <div className={`${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className={`bg-black/5 border-b ${t.border} font-bold opacity-80`}>
                                <tr>
                                    <th className="p-3">Reg Number</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Phone</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allUsersList.map(u => (
                                    <tr key={u.reg} className={`border-b ${t.border} hover:bg-black/5 transition-colors`}>
                                        <td className="p-3 font-mono font-bold text-blue-500">{u.reg}</td>
                                        <td className="p-3 opacity-80">{u.email}</td>
                                        <td className="p-3 opacity-80">{u.phone || 'N/A'}</td>
                                        <td className="p-3 flex justify-center">
                                            <button onClick={() => { setActiveAdminChatUser({reg: u.reg, name: u.email}); setActiveTab('admin_chats'); loadAdminSingleChat(u.reg, u.email); }} className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors" title="Message User"><MessageSquare size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
