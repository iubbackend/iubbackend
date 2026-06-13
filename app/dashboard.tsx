"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, LogOut, Award, Lock, Unlock, CreditCard, CheckCircle2, 
  X, ChevronDown, Sparkles, GraduationCap, Building, Calendar, Users
} from "lucide-react";
import { useRouter } from "next/navigation";

type SearchMode = "Roll Number" | "Name" | "Semester" | "Section";

export default function DashboardPage() {
  const router = useRouter();
  
  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("Roll Number");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  
  // Name Filter States
  const [department, setDepartment] = useState("All");
  const [session, setSession] = useState("All");
  const [section, setSection] = useState("All");
  
  // Filter Options from DB
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    sessions: [],
    sections: []
  });
  
  // Premium / Paywall States
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch filter options when "Name" mode is selected
  useEffect(() => {
    if (searchMode === "Name" && filterOptions.departments.length === 0) {
      fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GET_FILTERS" }),
      })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setFilterOptions(data);
        }
      })
      .catch(err => console.error("Failed to load filters", err));
    }
  }, [searchMode]);

  // Execute Search against TiDB
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setResults(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEARCH",
          searchQuery,
          searchMode,
          department,
          session,
          section
        }),
      });

      const data = await response.json();
      
      if (data.results) {
        setResults(data.results);
      } else {
        setResults([]); // No results found
      }
    } catch (error) {
      console.error("Search failed", error);
      alert("Failed to connect to the database.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    // Base wrapper with IUB Deep Blue Theme (#00173D to #00205B)
    <div className="flex-1 w-full min-h-screen bg-[#00122a] text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 relative z-10">
        
        {/* GLOBAL HEADER */}
        <header className="flex justify-between items-center mb-12 border-b border-[#002a70] pb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#00173D] font-black text-xl shadow-lg shadow-amber-500/20">
              IUB
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Result Portal
                {isPremium && <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] uppercase tracking-wider font-bold">PRO</span>}
              </h1>
              <p className="text-xs text-blue-300">The Islamia University of Bahawalpur</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isPremium && (
              <button onClick={() => setShowUpgradeModal(true)} className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-medium text-sm transition-all duration-200">
                <Unlock size={16} /> Unlock Full Access
              </button>
            )}
            <button onClick={() => router.push("/login")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00205b] border border-[#00348c] hover:border-red-500/50 hover:bg-red-500/10 text-blue-200 hover:text-red-400 font-medium text-sm transition-all duration-200 shadow-sm">
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* HERO SECTION */}
        <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Database Query Interface
            </h2>
            <p className="text-blue-300 text-sm md:text-base mt-2 max-w-xl">
              Search the IUB academic registry. Verify grading profiles, mid-term standings, and final transcript records instantly.
            </p>
          </div>
        </div>

        {/* SEARCH CONTROLLER - IUB Blue Theme */}
        <div className="bg-[#001c4d]/80 backdrop-blur-md border border-[#00348c] p-6 rounded-2xl shadow-2xl mb-10 transition-all">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            
            {/* DYNAMIC FILTERS (SHOWN ABOVE SEARCH BAR ONLY IF MODE IS "NAME") */}
            <AnimatePresence>
              {searchMode === "Name" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="flex flex-col sm:flex-row gap-4 overflow-hidden"
                >
                  {/* Department Dropdown */}
                  <div className="flex-1 relative">
                    <Building className="absolute left-3.5 top-3 text-blue-400" size={16} />
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full appearance-none bg-[#00122a] border border-[#00348c] text-blue-100 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-sm transition-colors">
                      <option value="All">All Departments</option>
                      {filterOptions.departments.map((dep, idx) => (
                        <option key={idx} value={dep}>{dep}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3 text-blue-400 pointer-events-none" size={16} />
                  </div>
                  
                  {/* Session Dropdown */}
                  <div className="flex-1 relative">
                    <Calendar className="absolute left-3.5 top-3 text-blue-400" size={16} />
                    <select value={session} onChange={(e) => setSession(e.target.value)} className="w-full appearance-none bg-[#00122a] border border-[#00348c] text-blue-100 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-sm transition-colors">
                      <option value="All">All Sessions</option>
                      {filterOptions.sessions.map((sess, idx) => (
                        <option key={idx} value={sess}>{sess}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3 text-blue-400 pointer-events-none" size={16} />
                  </div>

                  {/* Section Dropdown */}
                  <div className="flex-1 relative">
                    <Users className="absolute left-3.5 top-3 text-blue-400" size={16} />
                    <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full appearance-none bg-[#00122a] border border-[#00348c] text-blue-100 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-sm transition-colors">
                      <option value="All">All Sections</option>
                      {filterOptions.sections.map((sec, idx) => (
                        <option key={idx} value={sec}>{sec}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3 text-blue-400 pointer-events-none" size={16} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MAIN SEARCH ROW */}
            <div className="flex flex-col md:flex-row gap-4">
              
              {/* Left Dropdown for Search Mode */}
              <div className="relative md:w-48">
                <select 
                  value={searchMode}
                  onChange={(e) => {
                    setSearchMode(e.target.value as SearchMode);
                    setSearchQuery(""); // Reset query when mode changes
                  }}
                  className="w-full appearance-none bg-[#00122a] border border-[#00348c] text-amber-400 rounded-xl px-4 py-3.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-sm font-semibold transition-all shadow-inner cursor-pointer"
                >
                  <option value="Roll Number">Roll Number</option>
                  <option value="Name">Student Name</option>
                  <option value="Semester">Semester</option>
                  <option value="Section">Section</option>
                </select>
                <ChevronDown className="absolute right-4 top-4 text-amber-500 pointer-events-none" size={16} />
              </div>

              {/* Input Field */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-3.5 text-blue-400" size={20} />
                <input 
                  type="text" 
                  placeholder={`Enter ${searchMode} (e.g. ${searchMode === 'Roll Number' ? 'SP21-BCS-089' : searchMode === 'Semester' ? '8' : 'John Doe'})...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#00122a] border border-[#00348c] text-white placeholder-blue-400/50 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all text-sm font-medium shadow-inner"
                />
              </div>

              {/* Submit Button (IUB Amber) */}
              <button 
                type="submit" 
                disabled={isSearching || !searchQuery.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-[#00173d] font-bold rounded-xl px-8 py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <div className="h-5 w-5 border-2 border-[#00173d]/30 border-t-[#00173d] rounded-full animate-spin" />
                ) : (
                  <>Search <Sparkles size={16} /></>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RESULTS RENDER ENGINE */}
        <AnimatePresence mode="wait">
          {results && results.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Table Container */}
              <div className="bg-[#001c4d]/50 border border-[#00348c] rounded-2xl overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#00122a] border-b border-[#00348c] text-blue-200 font-semibold">
                        <th className="px-6 py-4 flex items-center gap-2"><GraduationCap size={16}/> Course Details</th>
                        <th className="px-6 py-4 text-center text-amber-400">Mid Marks</th>
                        <th className="px-6 py-4 text-center">Sessional</th>
                        <th className="px-6 py-4 text-center">Final Exam</th>
                        <th className="px-6 py-4 text-center">Total Marks</th>
                        <th className="px-6 py-4 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#00348c]/50 text-blue-100 relative">
                      {results.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#00205b]/60 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-white">{item.course_name || "Course Name"}</p>
                            <p className="text-xs text-blue-300 font-mono mt-0.5">{item.course_code || "Code"}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-amber-400 font-bold text-lg">{item.mid_marks || 0}</td>
                          
                          {/* Masked/Premium Columns */}
                          <td className={`px-6 py-4 text-center font-mono ${!isPremium && "blur-[6px] select-none opacity-50"}`}>{item.sessional_marks || 0}</td>
                          <td className={`px-6 py-4 text-center font-mono ${!isPremium && "blur-[6px] select-none opacity-50"}`}>{item.final_marks || 0}</td>
                          <td className={`px-6 py-4 text-center font-mono font-bold ${!isPremium && "blur-[6px] select-none opacity-50 text-white"}`}>{item.total_marks || 0}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00122a] border border-[#00348c] ${!isPremium ? "blur-[6px] select-none opacity-50" : "text-amber-400"}`}>
                              {item.grade || "N/A"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paywall Overlay */}
                {!isPremium && (
                  <div className="absolute top-[60px] bottom-0 right-0 left-[30%] sm:left-[40%] bg-gradient-to-l from-[#00122a] via-[#00122a]/95 to-transparent flex flex-col justify-center items-end pr-8 sm:pr-16 backdrop-blur-[1px]">
                    <div className="bg-[#001c4d] border border-[#00348c] p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-xs animate-pulse hover:animate-none transition-all">
                      <div className="bg-amber-500/10 p-3 rounded-full mb-3">
                        <Lock className="text-amber-400" size={24} />
                      </div>
                      <h3 className="text-white font-bold text-lg">Results Locked</h3>
                      <p className="text-blue-200 text-xs mt-1 mb-5 leading-relaxed">Upgrade to view final marks, sessionals, and exact grading parameters.</p>
                      <button 
                        onClick={() => setShowUpgradeModal(true)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-[#00173d] text-sm font-bold py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                      >
                        Upgrade to PRO
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* No Results Fallback */}
          {results && results.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 border border-[#00348c] rounded-2xl bg-[#001c4d]/30">
              <div className="bg-[#00205b] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#00348c]">
                <Search className="text-blue-400" size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No Records Found</h3>
              <p className="text-blue-300 text-sm">Please verify your search parameters and try again.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* UPGRADE MODAL POPUP - IUB Themed */}
        <AnimatePresence>
          {showUpgradeModal && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowUpgradeModal(false)}
                className="fixed inset-0 bg-[#000a18]/80 backdrop-blur-sm z-50"
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#001c4d] border border-[#00348c] p-6 sm:p-8 rounded-2xl shadow-2xl z-50"
              >
                <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-blue-400 hover:text-white transition-colors bg-[#00122a] p-1.5 rounded-full border border-[#00348c]">
                  <X size={18} />
                </button>

                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 text-[#00173d] shadow-lg shadow-amber-500/20">
                    <Award size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">IUB Premium</h2>
                  <p className="text-blue-300 text-sm">Unlock your full academic transcript instantly.</p>
                </div>

                <div className="bg-[#00122a] border border-[#00348c] rounded-xl p-4 mb-6">
                  <ul className="space-y-3">
                    {['View Sessional Marks', 'View Final Exam Marks', 'Check Grades & Exact GPAs', 'Download Official PDF Transcript'].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-blue-100 font-medium">
                        <CheckCircle2 className="text-amber-400" size={18} /> {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-amber-400 font-bold uppercase tracking-wide mb-1">Subscription Fee</p>
                    <p className="text-3xl font-black text-white">Rs. 500<span className="text-sm font-normal text-blue-300"> / semester</span></p>
                  </div>

                  <div className="text-center text-sm text-blue-200 px-4">
                    Pay via EasyPaisa or JazzCash to the verified admin account below, then upload a screenshot.
                  </div>

                  <div className="bg-[#00122a] rounded-xl p-4 flex items-center justify-between border border-[#00348c]">
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-blue-400" size={20} />
                      <div className="text-left">
                        <p className="text-xs text-blue-400 font-medium">EasyPaisa Account</p>
                        <p className="text-sm font-mono text-white font-bold">03XX-XXXXXXX</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setIsPremium(true);
                      setShowUpgradeModal(false);
                      alert("Mock: Payment uploaded and approved! You are now Premium.");
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-[#00173d] font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
                  >
                    <Unlock size={18} /> Verify Payment
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
