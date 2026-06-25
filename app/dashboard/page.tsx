"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Building, Calendar, Users, 
  Sun, Moon, ChevronDown, Lock,
  Menu, CreditCard, History, Share2, Wallet,
  CheckCircle2, X, GraduationCap, Activity, TrendingUp, AlertCircle,
  ShieldAlert, DollarSign, UsersRound, Crown, ArrowRight, MessageSquare, Check, CheckCheck, Edit2, Trash2, Send, Download, Unlock, BookOpen, UserCog, MoreVertical, Phone, Ban
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';
import Select from 'react-select'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// SINGLE ADMIN IDENTITY (Can be expanded if needed)
const PRIMARY_ADMIN_REG = "S20BSCS1M01001"; 

type Theme = "light" | "dark";
type TabState = "home" | "search" | "approvals" | "leaderboard" | "admin_chats" | "users_management";

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
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any[] | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  
  const [filterOptions, setFilterOptions] = useState({ departments: [] as any[], sessions: [] as any[], sections: [] as any[] });
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

  // Users Management Data
  const [manageUsers, setManageUsers] = useState<any[]>([]);
  const [manageUsersPage, setManageUsersPage] = useState(0);
  const [manageUsersSearch, setManageUsersSearch] = useState("");

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
      
      // Auto-logout if not fetched properly or not admin
      if (!userRecord || userRecord.reg.toUpperCase() === "UNKNOWN" || userRecord.reg.toUpperCase() !== PRIMARY_ADMIN_REG) {
        forceLogout(); 
        return;
      }

      const { data: studentRecord } = await supabase.from("students").select("name").ilike("reg", userRecord.reg.trim()).maybeSingle();
      const actualName = studentRecord?.name || "System Admin";

      if (actualName === "Student" || actualName === "UNKNOWN") {
        forceLogout();
        return;
      }
      
      setCurrentUser({ reg: userRecord.reg.toUpperCase(), name: actualName, phone: userRecord.phone, email: userRecord.email });
      loadRealAdminData(0);
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
        const m = s.section_name.match(/\b(\d+[A-Z])\b/i);
        return { id: s.id, value: s.id.toString(), label: m ? m[1].toUpperCase() : s.section_name, session_id: s.session_id, department_id: s.department_id, original: s.section_name };
      })
      .filter(s => /^\d+[A-Z]$/.test(s.label));

    // Format Sessions to easily match logic
    const formattedSessions = (sessionsRes.data || []).map(s => {
       return { id: s.id, value: s.id.toString(), label: s.session_code, original: s.session_code }
    });

    setFilterOptions({
      departments: (deptsRes.data || []).map(d => ({ id: d.id, value: d.id.toString(), label: `${d.depart_name} (${d.depart_code})` })),
      sessions: formattedSessions,
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

    // Leaderboard
    const { data: topUsers } = await supabase.from('user_credits').select('user_reg, credits').order('credits', { ascending: false }).limit(10);
    setLeaderboard(topUsers || []);
  };

  const loadManageUsers = async (pageIndex = 0, query = manageUsersSearch) => {
      try {
          let req = supabase.from('users').select('*').range(pageIndex * 15, (pageIndex + 1) * 15 - 1);
          if (query) {
              req = req.or(`reg.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
          }
          const { data } = await req;
          if (pageIndex === 0) setManageUsers(data || []);
          else setManageUsers(prev => [...prev, ...(data || [])]);
          setManageUsersPage(pageIndex);
      } catch(e) { }
  };

  const handleUpdateManageUser = async (userReg: string, field: string, currentValue: string) => {
      const newValue = window.prompt(`Update ${field} for ${userReg}:`, currentValue);
      if (newValue !== null && newValue.trim() !== "") {
          try {
              await supabase.from('users').update({ [field]: newValue.trim() }).eq('reg', userReg);
              showToast('Success', `Updated ${field} successfully.`, 'info');
              loadManageUsers(0);
          } catch(e) { showToast('Error', 'Update failed.', 'error'); }
      }
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

    const { data: users } = await supabase.from('users').select('reg, email, phone');
    const { data: students } = await supabase.from('students').select('reg, name').in('reg', Array.from(chatMap.keys()));
    
    const formattedList = Array.from(chatMap.values()).map(c => {
        const uMatch = users?.find(u => u.reg === c.reg);
        const sMatch = students?.find(s => s.reg === c.reg);
        return { ...c, name: sMatch?.name || uMatch?.email || "Unknown User", phone: uMatch?.phone };
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
    // Search strictly in users table
    const { data } = await supabase.from('users').select('reg, email, phone').or(`reg.ilike.%${chatSearchQuery}%,email.ilike.%${chatSearchQuery}%,phone.ilike.%${chatSearchQuery}%`).limit(1);
    
    if (data && data.length > 0) {
        const u = data[0];
        const { data: studentMatch } = await supabase.from('students').select('name').eq('reg', u.reg).maybeSingle();
        setChatSearchQuery(""); // Clear search bar automatically
        loadAdminSingleChat(u.reg, studentMatch?.name || u.email);
    } else {
        showToast("Not Found", "No registered user found with this query.", "error");
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
    if (window.confirm("Reject this and wipe user credits equivalent to amount?")) {
        await supabase.from('payments_record').update({ status: 'rejected' }).eq('id', paymentId);
        
        // Wipe Credits Logic (equivalent calculation based on amount)
        const calcCreditsToWipe = amount >= 500 ? (amount === 500 ? 10000 : amount * 20) : amount * 20; 
        
        const { data: creds } = await supabase.from('user_credits').select('credits').eq('user_reg', reg).maybeSingle();
        if (creds) {
            const newBalance = Math.max(0, creds.credits - calcCreditsToWipe);
            await supabase.from('user_credits').update({ credits: newBalance }).eq('user_reg', reg);
        }

        showToast("Rejected", "Payment rejected and credits adjusted.", "info");
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
    const days = window.prompt(`Enter number of days to ban user ${reg}:`, "7");
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

  // -------------------------------------------------------------
  // SEARCH PORTAL LOGIC (Admin is free)
  // -------------------------------------------------------------
  const handleSearch = async (e?: React.FormEvent, newPage = 0, overrideQuery?: string, overrideMode?: "Roll Number" | "Name") => {
    if (e) e.preventDefault();
    const activeQuery = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const activeMode = overrideMode !== undefined ? overrideMode : searchMode;

    if (!activeQuery.trim()) return;

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
        
        if (selectedSession) {
          // Find matching sessions logic (S25 -> Spring 2025)
          query = query.eq("session_id", selectedSession.id);
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
    if (expandedReg === reg) { setExpandedReg(null); return; }
    setExpandedReg(reg);

    try {
      const columns = "id, sessional_marks, mid_term_marks, end_term_marks, practical_sessional_marks, practical_final_marks, total_marks, subject_id (course_code, course_name, credit_hours), semester_num, semester";
      const { data: records, error } = await supabase.from("results").select(columns).eq("student_id", studentId); 
      if (error) throw error;
      if (!records || records.length === 0) { setStudentDetails([]); return; }

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
        return { semNum: sem.replace("Semester ", ""), courses, sgpa, totalMarks: semTotalMarks, maxMarks: semMaxMarks };
      });
      setStudentDetails(sortedSemesters);
    } catch (err) { setStudentDetails([]); }
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
    inputFocus: theme === "light" ? "focus:border-[#0056b3] focus:ring-[#0056b3]/20" : "focus:border-amber-500 focus:ring-amber-500/30",
    btnPrimary: theme === "light" ? "bg-[#0056b3] text-white" : "bg-amber-500 text-black",
    rowHover: theme === "light" ? "hover:bg-slate-100" : "hover:bg-[#00205b]/40"
  };

  const selectStyles = {
    control: (base: any) => ({
      ...base, background: 'transparent', borderColor: 'transparent', boxShadow: 'none', cursor: 'pointer', paddingLeft: '1rem', minHeight: '2.5rem', fontSize: '0.8rem', color: theme === 'light' ? '#1e293b' : '#f1f5f9',
    }),
    singleValue: (base: any) => ({ ...base, color: theme === 'light' ? '#1e293b' : '#f1f5f9' }),
    input: (base: any) => ({ ...base, color: theme === 'light' ? '#1e293b' : '#f1f5f9' }),
    menu: (base: any) => ({ ...base, backgroundColor: theme === 'light' ? '#ffffff' : '#001c4d', border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#00348c'}`, zIndex: 50 }),
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

      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${t.border} ${theme === 'light' ? 'bg-white/90' : 'bg-[#00122a]/90'} px-5 py-3.5 flex justify-between items-center`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className={`relative p-1.5 rounded-lg border ${t.border} hover:bg-slate-500/10 transition-colors`}>
            <Menu size={20} className={t.primary} />
            {adminChatList.some(c => c.unread > 0) && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-[#00122a]"></span>}
          </button>
          <div className="flex items-center gap-1.5 font-black text-lg">
            IUB Result<span className={t.primary}>Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 border border-amber-500">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className={`fixed top-0 left-0 h-full w-64 ${theme==='light' ? 'bg-white' : 'bg-[#00173d]'} z-50 flex flex-col shadow-2xl border-r ${t.border}`}>
              <div className="p-5 border-b border-slate-500/10 flex justify-between items-center">
                <div className="font-bold text-lg text-amber-500">Admin Controls</div>
                <button onClick={() => setSidebarOpen(false)}><X size={20} className={t.textMuted} /></button>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { id: 'home', icon: Activity, label: 'Dashboard Stats' },
                  { id: 'search', icon: Search, label: 'Search Portal' },
                  { id: 'approvals', icon: CheckCircle2, label: 'Payment Approvals' },
                  { id: 'admin_chats', icon: MessageSquare, label: 'User Chats', badge: adminChatList.reduce((sum, c) => sum + c.unread, 0) },
                  { id: 'users_management', icon: UserCog, label: 'Manage Users' },
                  { id: 'leaderboard', icon: Crown, label: 'Leaderboards' }
                ].map(item => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium ${activeTab === item.id ? t.btnPrimary : "hover:bg-slate-500/10 transition-colors"}`}>
                    <div className="flex items-center gap-3"><item.icon size={18}/> {item.label}</div>
                    {item.badge > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md">{item.badge}</span>}
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
              <div onClick={() => setActiveTab('approvals')} className={`p-5 rounded-2xl border ${t.border} ${t.cardBg} cursor-pointer hover:border-amber-500 transition-all relative`}>
                {pendingApprovals.length > 0 && <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>}
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><CheckCircle2 size={14}/> Pending Tasks</div>
                <div className="text-2xl font-black text-amber-500">{adminStats.pending}</div>
              </div>
              <div onClick={() => setActiveTab('users_management')} className={`p-5 rounded-2xl border ${t.border} ${t.cardBg} cursor-pointer hover:border-amber-500 transition-all`}>
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><UsersRound size={14}/> Total Users</div>
                <div className="text-2xl font-black">{adminStats.totalUsers}</div>
              </div>
              <div onClick={() => setActiveTab('admin_chats')} className={`p-5 rounded-2xl border ${t.border} ${t.cardBg} cursor-pointer hover:border-blue-500 transition-all relative`}>
                {adminChatList.some(c => c.unread > 0) && <div className="absolute top-[-5px] right-[-5px] bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">{adminChatList.filter(c => c.unread > 0).length} Distinct</div>}
                <div className="text-xs font-bold opacity-70 mb-2 flex items-center gap-2"><MessageSquare size={14}/> Unread Msgs</div>
                <div className="text-2xl font-black text-blue-500">{adminChatList.reduce((sum, c) => sum + c.unread, 0)}</div>
              </div>
            </div>

            {pendingApprovals.length > 0 && (
               <div className={`mb-6 ${t.cardBg} border ${t.border} p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md`}>
                 <div>
                   <h3 className="font-bold text-lg text-amber-500">Pending Approvals</h3>
                   <p className="opacity-70 text-sm">You have {pendingApprovals.length} requests waiting to be reviewed.</p>
                 </div>
                 <button onClick={() => setActiveTab('approvals')} className="bg-amber-500 text-[#00122a] px-6 py-3 rounded-xl font-black shadow-lg hover:bg-amber-400 active:scale-95 transition-all whitespace-nowrap">
                   Approve Pending Requests
                 </button>
               </div>
            )}
          </div>
        )}

        {/* TAB: SEARCH PORTAL */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black mb-4 flex items-center gap-2 text-amber-500"><Search/> Free Admin Search</h2>
            <div className={`${t.cardBg} border ${t.border} p-4 sm:p-6 rounded-2xl transition-all`}>
              <form onSubmit={(e) => handleSearch(e, 0)} className="flex flex-col gap-4">
                <div className="flex flex-col items-center mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest opacity-50 mb-2">Search By</span>
                  <div className={`flex p-1 rounded-xl w-full max-w-[300px] relative ${theme==='light'?'bg-slate-100 border border-slate-200 shadow-inner':'bg-[#00122a] border border-[#00348c]/30'}`}>
                    <div 
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-out shadow-sm ${t.btnPrimary}`}
                      style={{ left: searchMode === 'Roll Number' ? '4px' : 'calc(50%)' }}
                    />
                    <button type="button" onClick={() => {setSearchMode('Roll Number'); setSearchQuery(""); setSearchResults(null);}} className={`flex-1 py-2 font-bold z-10 transition-colors ${searchMode === 'Roll Number' ? (theme==='light'?'text-white':'text-black') : 'opacity-60 hover:opacity-100'}`}>Reg Number</button>
                    <button type="button" onClick={() => {setSearchMode('Name'); setSearchQuery(""); setSearchResults(null);}} className={`flex-1 py-2 font-bold z-10 transition-colors ${searchMode === 'Name' ? (theme==='light'?'text-white':'text-black') : 'opacity-60 hover:opacity-100'}`}>Name</button>
                  </div>
                </div>

                <AnimatePresence>
                  {searchMode === "Name" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 overflow-hidden pt-1">
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
              <div className={`font-bold mb-3 px-1.5 ${t.textMuted}`}>Showing {searchResults.length} of {totalRecords} records found</div>
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
                        <div className={`text-[12px] ${t.textMuted} font-medium`}>Session: {parseSessionFromReg(student.reg)} • {student.section?.replace(/[- ]?\d+(st|nd|rd|th)[- ]?/i, ' • ')}</div>
                      </div>
                      <button className={`p-1.5 rounded-full ${t.textMuted} hover:${t.primary} bg-slate-500/5 transition-colors`}>
                        <motion.div animate={{ rotate: expandedReg === student.reg ? 180 : 0 }} transition={{ duration: 0.3 }}><ChevronDown size={20} /></motion.div>
                      </button>
                    </div>

                    <AnimatePresence>
                      {expandedReg === student.reg && studentDetails && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className={`border-t ${t.border} overflow-hidden ${theme === 'light' ? 'bg-slate-50/50' : 'bg-[#00122a]/30'}`}>
                          <div className="p-3 sm:p-5 space-y-4">
                            {studentDetails.length === 0 ? (
                              <div className="text-center py-6 opacity-60 font-medium">No Records found.</div>
                            ) : (
                              studentDetails.map((sem: any, sIdx: number) => (
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
                                              <span className="block text-[10px] opacity-70 font-mono mt-0.5">{course.code} • {course.credits}</span>
                                            </td>
                                            <td className="px-2 py-2 text-center font-mono">{course.mid ?? "-"}</td>
                                            <td className="px-2 py-2 text-center font-mono">{course.sess ?? "-"}</td>
                                            <td className="px-2 py-2 text-center font-mono">{course.fin ?? "-"}</td>
                                            <td className="px-2 py-2 text-center font-mono">{course.prSess ?? "-"}</td>
                                            <td className="px-2 py-2 text-center font-mono">{course.prFin ?? "-"}</td>
                                            <td className={`px-2 py-2 text-center font-mono font-bold ${t.primary}`}>{course.tot ?? "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className={`px-3 py-3 sm:px-4 flex justify-between items-center text-xs border-t ${t.border} ${theme === 'light' ? 'bg-slate-100/50' : 'bg-[#00205b]/30'}`}>
                                    <div className="font-bold opacity-80">Total Credits: {sem.courses.reduce((acc: number, c: any) => acc + c.credits, 0)}</div>
                                    <div className="flex items-center gap-4 sm:gap-6">
                                      <div className="font-bold">Marks: <span className={t.primary}>{sem.totalMarks}</span> {sem.maxMarks !== "🔒" && <span className="opacity-70">/ {sem.maxMarks}</span>}</div>
                                      <div className="font-black text-[13px] sm:text-sm bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-lg border border-emerald-500/20">SGPA: {sem.sgpa}</div>
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
                <button onClick={(e) => handleSearch(e, page + 1)} className={`w-full py-3 rounded-xl border ${t.border} ${t.cardBg} hover:bg-slate-500/5 font-bold transition-colors shadow-sm`}>
                  Load Next 10 Records
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB: APPROVALS & PAYMENTS */}
        {activeTab === "approvals" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black flex items-center gap-2 text-amber-500"><CheckCircle2 /> Manage Approvals</h2>
            
            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl border-l-4 border-l-amber-500`}>
              <h3 className="font-bold mb-3 flex items-center gap-2"><CreditCard size={18}/> Manual Credit Award</h3>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <input type="text" placeholder="User Registration" value={manualPay.reg} onChange={e=>setManualPay({...manualPay, reg:e.target.value})} className={`flex-1 w-full ${t.inputBg} border ${t.border} rounded-xl p-3 outline-none ${t.inputFocus}`} />
                <input type="number" placeholder="Equivalent Rs" value={manualPay.amount} onChange={e=>setManualPay({...manualPay, amount:e.target.value})} className={`w-full sm:w-32 ${t.inputBg} border ${t.border} rounded-xl p-3 outline-none ${t.inputFocus}`} />
                <div className="flex gap-2 w-full sm:w-auto">
                   <button onClick={() => handleManualAward(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-5 py-3 shadow-md whitespace-nowrap">Award & Save</button>
                   <button onClick={() => handleManualAward(false)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-5 py-3 shadow-md whitespace-nowrap">Award Only</button>
                </div>
              </div>
            </div>

            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
              <h3 className="font-bold mb-4">Pending Requests ({pendingApprovals.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.map(p => (
                  <div key={p.id} className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-2xl shadow-sm relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => setExpandedPending(expandedPending === p.id ? null : p.id)} className="p-1 rounded-full bg-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors"><ChevronDown size={16} className={expandedPending === p.id ? "rotate-180" : ""} /></button>
                        <button onClick={() => handleBanUser(p.user_reg)} className="p-1 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Ban User"><MoreVertical size={16}/></button>
                    </div>
                    <div className="mb-2">
                      <h4 className="font-black text-lg text-amber-500">{p.user_reg}</h4>
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Rs {p.amount}</span>
                    </div>
                    <div className="text-sm space-y-1 opacity-80 mt-3">
                      <p><strong>Name:</strong> {p.account_name}</p>
                      <p><strong>Phone:</strong> {p?.users?.phone || 'N/A'}</p>
                      <p><strong>Email:</strong> {p?.users?.email || 'N/A'}</p>
                      <p><strong>TID:</strong> <span className="font-mono text-xs">{p.tid_number}</span></p>
                    </div>
                    
                    <AnimatePresence>
                      {expandedPending === p.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 flex gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                              <a href={getWaLink(p?.users?.phone)} target="_blank" className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1.5 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 shadow-md"><Phone size={14}/> WhatsApp</a>
                              <button onClick={() => { setActiveAdminChatUser({reg: p.user_reg, name: p.account_name}); setActiveTab('admin_chats'); loadAdminSingleChat(p.user_reg, p.account_name); }} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-md"><MessageSquare size={14}/> Open Chat</button>
                          </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-amber-500/20">
                      <button onClick={() => handleAdminApprove(p.id, p.user_reg, p.amount)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md"><Check size={14}/> Approve</button>
                      <button onClick={() => handleAdminModify(p.id, p.amount)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md"><Edit2 size={14}/> Modify</button>
                      <button onClick={() => handleAdminReject(p.id, p.user_reg, p.amount)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md" title="Reject and Wipe Credits"><X size={14}/> Reject (Wipe)</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
              <h3 className="font-bold mb-3">Recently Approved History</h3>
              <div className="space-y-2">
                {approvedHistory.length === 0 && <p className="opacity-50">No approved history.</p>}
                {approvedHistory.map(p => (
                  <div key={p.id} className={`flex justify-between items-center p-3 border ${t.border} rounded-xl bg-slate-500/5 hover:bg-slate-500/10 transition-colors`}>
                    <div>
                      <p className="font-bold text-emerald-500">{p.user_reg} <span className="text-[11px] text-slate-500 ml-2 font-semibold">({p?.users?.students?.[0]?.name || p.account_name})</span></p>
                      <p className="text-[11px] opacity-70 font-mono mt-0.5">{new Date(p.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} | Rs {p.amount} | {p?.users?.phone || 'No Phone'} | {p?.users?.email || 'No Email'}</p>
                    </div>
                  </div>
                ))}
                {approvedHistory.length >= 10 && (
                   <button onClick={() => loadRealAdminData(approvedPage + 1)} className="w-full mt-3 py-2 text-xs font-bold bg-slate-500/10 hover:bg-slate-500/20 rounded-xl transition-colors">Load Next 10</button>
                )}
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
                    <input type="text" placeholder="Search registered users (Reg, Name, Email, Phone)..." value={chatSearchQuery} onChange={e => setChatSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUserInChat()} className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl px-4 py-2 text-sm outline-none ${t.inputFocus}`} />
                    <button onClick={handleSearchUserInChat} className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl text-xs font-bold shadow-md transition-colors">Search DB</button>
                  </div>
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                  {adminChatList.length === 0 && <p className="opacity-50 text-center p-5">No chats found.</p>}
                  {adminChatList.map((u) => (
                    <div key={u.reg} onClick={() => loadAdminSingleChat(u.reg, u.name)} className={`flex justify-between items-center p-4 border-b border-slate-500/10 cursor-pointer transition-colors ${t.rowHover}`}>
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded text-[10px] font-black font-mono shadow-sm">{u.reg}</span>
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
                      <button onClick={() => { setActiveAdminChatUser(null); loadAdminChatList(); }} className="mr-2 p-1.5 bg-slate-500/10 hover:bg-slate-500/20 rounded-lg transition-colors"><X size={16}/></button>
                      <div>
                        <div className="font-black flex items-center gap-2 text-base">{activeAdminChatUser.name} <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px] font-mono shadow-sm border border-blue-500/20">{activeAdminChatUser.reg}</span></div>
                      </div>
                    </div>
                  </div>
                  {/* Chat Sub-Bar */}
                  <div className={`flex justify-between items-center p-2.5 rounded-xl text-xs border ${t.border} ${theme === 'light' ? 'bg-slate-100 shadow-inner' : 'bg-[#00122a]'}`}>
                    <div className="flex items-center gap-1.5 font-bold"><Wallet size={14} className="text-amber-500"/> {userChatStats.credits.toLocaleString()} Cr</div>
                    <div className="flex items-center gap-1.5 font-bold"><DollarSign size={14} className="text-emerald-500"/> Rs {userChatStats.totalSpent.toLocaleString()}</div>
                    <div className="flex items-center gap-1.5 font-bold text-red-400"><Activity size={14}/> {userChatStats.pendingCount} Pending</div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatScrollRef}>
                  {chatFeed.map((item) => {
                    if (item.feedType === 'msg') {
                        const isMe = item.sender_reg === PRIMARY_ADMIN_REG;
                        return (
                            <div key={item.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[75%] p-3 rounded-2xl text-sm break-words whitespace-pre-wrap shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-[#00205b] border border-slate-200 dark:border-blue-900 rounded-bl-sm'}`}>
                                    {item.content}
                                </div>
                                <span className="text-[10px] opacity-50 mt-1 px-1">{new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                        );
                    } else if (item.feedType === 'payment') {
                        return (
                            <div key={item.id} className="my-4 mx-auto max-w-[85%] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#002a4d] dark:to-[#001a33] p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black"><CreditCard size={16}/> Deposit Request</div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${item.status === 'approved' ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' : item.status==='rejected' ? 'bg-red-500/20 text-red-600 border border-red-500/30' : 'bg-amber-500/20 text-amber-600 border border-amber-500/30'}`}>{item.status}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                    <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5 dark:border-white/5">Amount: <b className="text-emerald-500">Rs {item.amount}</b></div>
                                    <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5 dark:border-white/5 truncate" title={item.account_name}>Name: <b>{item.account_name}</b></div>
                                    <div className="col-span-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-black/5 dark:border-white/5">TID: <b className="font-mono">{item.tid_number}</b></div>
                                </div>
                                {item.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAdminApprove(item.id, item.user_reg, item.amount)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1"><Check size={14}/> Approve</button>
                                        <button onClick={() => handleAdminModify(item.id, item.amount)} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1"><Edit2 size={14}/> Modify</button>
                                        <button onClick={() => handleAdminReject(item.id, item.user_reg, item.amount)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1" title="Reject and Wipe Credits"><X size={14}/> Reject</button>
                                    </div>
                                )}
                            </div>
                        );
                    }
                  })}
                </div>
                
                <div className={`p-3 bg-white dark:bg-[#001c4d] border-t border-slate-200 dark:border-slate-800 flex gap-2 items-end`}>
                  <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="Type a message..." className={`flex-1 ${t.inputBg} border ${t.border} rounded-xl px-4 py-2.5 outline-none resize-none min-h-[44px] max-h-32 ${t.inputFocus}`} rows={1} />
                  <button onClick={handleSendMessage} disabled={!chatInput.trim()} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl disabled:opacity-50 transition-colors shadow-md"><Send size={18}/></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: USERS MANAGEMENT */}
        {activeTab === "users_management" && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-2xl font-black mb-2 flex items-center gap-2 text-amber-500"><UserCog /> Manage Users Database</h2>
              <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
                 <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="flex-1 relative">
                       <Search className={`absolute left-3.5 top-3 ${t.textMuted}`} size={18} />
                       <input 
                         type="text" 
                         placeholder="Search Reg, Email, or Phone..." 
                         value={manageUsersSearch} 
                         onChange={(e) => setManageUsersSearch(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && loadManageUsers(0)}
                         className={`w-full ${t.inputBg} border ${t.border} rounded-xl py-2.5 pl-10 pr-3 focus:outline-none ${t.inputFocus}`}
                       />
                    </div>
                    <button onClick={() => loadManageUsers(0)} className={`${t.btnPrimary} font-bold rounded-xl px-6 py-2.5 shadow-md`}>Search</button>
                 </div>
                 
                 <div className="overflow-x-auto">
                   <table className="w-full text-left whitespace-nowrap">
                      <thead className={`bg-slate-500/5 text-opacity-80 border-b ${t.border}`}>
                         <tr>
                           <th className="px-4 py-3 font-bold">Reg Number</th>
                           <th className="px-4 py-3 font-bold">Email</th>
                           <th className="px-4 py-3 font-bold">Phone</th>
                           <th className="px-4 py-3 font-bold text-center">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/10">
                         {manageUsers.length === 0 && <tr><td colSpan={4} className="p-5 text-center opacity-50">No users found</td></tr>}
                         {manageUsers.map(u => (
                            <tr key={u.reg} className={t.rowHover}>
                               <td className="px-4 py-3 font-bold text-[12px] font-mono">{u.reg}</td>
                               <td className="px-4 py-3 cursor-pointer hover:underline" onClick={() => handleUpdateManageUser(u.reg, 'email', u.email)}>{u.email || "N/A"}</td>
                               <td className="px-4 py-3 cursor-pointer hover:underline" onClick={() => handleUpdateManageUser(u.reg, 'phone', u.phone)}>{u.phone || "N/A"}</td>
                               <td className="px-4 py-3 text-center flex justify-center gap-2">
                                  <button onClick={() => handleUpdateManageUser(u.reg, 'email', u.email)} className="bg-slate-500/10 p-1.5 rounded-md hover:bg-slate-500/20 text-blue-400" title="Edit Email"><Edit2 size={14}/></button>
                                  <button onClick={() => handleBanUser(u.reg)} className="bg-red-500/10 p-1.5 rounded-md hover:bg-red-500/20 text-red-500" title="Ban User"><Ban size={14}/></button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                 </div>
                 <div className="mt-4 flex justify-center">
                   <button onClick={() => loadManageUsers(manageUsersPage + 1)} className={`text-xs font-bold px-6 py-2 rounded-xl border ${t.border} bg-transparent hover:bg-slate-500/10 transition-colors`}>Load Next 15</button>
                 </div>
              </div>
           </motion.div>
        )}

        {/* TAB: LEADERBOARDS */}
        {activeTab === "leaderboard" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-2xl font-black mb-2 flex items-center gap-2 text-amber-500"><Crown /> Top Users Leaderboard</h2>
            <div className={`${t.cardBg} border ${t.border} p-5 rounded-2xl`}>
              <h3 className="font-bold text-base mb-3">Top Credit Holders</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className={`bg-slate-500/5 text-opacity-80`}>
                    <tr>
                      <th className="px-4 py-3 font-bold rounded-tl-lg">Rank</th>
                      <th className="px-4 py-3 font-bold">Registration</th>
                      <th className="px-4 py-3 font-bold text-right rounded-tr-lg">Credits Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-500/10">
                    {leaderboard.length === 0 && <tr><td colSpan={3} className="text-center py-5 opacity-50">No records found.</td></tr>}
                    {leaderboard.map((user, i) => (
                      <tr key={user.user_reg} className={t.rowHover}>
                        <td className={`px-4 py-3 font-black ${i===0 ? 'text-amber-500 text-base' : 'opacity-70'}`}>#{i+1}</td>
                        <td className="px-4 py-3 font-semibold font-mono">{user.user_reg}</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-500">{user.credits?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
