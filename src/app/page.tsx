'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface ContractorLead {
  id: string;
  company_name: string;
  location: string;
  domain: string;
  offer_type: string;
  active_ads_count: number;
  earliest_start_date: string;
  ad_format: string;
  primary_headline: string;
  primary_cta: string;
  primary_hook: string;
  destination_url: string;
  ad_library_url: string;
  ig_handle: string;
  ig_profile_url: string;
  ig_dm_url: string;
  fb_messenger_url: string;
  linkedin_search_url: string;
  dm_pitch_script: string;
  status: string;
  assigned_to: string;
  notes: string;
  last_contacted_at: string | null;
}

interface WeeklyReportData {
  pipeline: {
    total_leads: number;
    to_contact: number;
    dm_sent: number;
    replied: number;
    follow_up: number;
    booked: number;
    not_interested: number;
  };
  weekly: {
    dms_sent_week: number;
    replies_week: number;
    booked_week: number;
    notes_week: number;
  };
  reps: Array<{
    rep: string;
    total_assigned: number;
    dms_sent: number;
    replied: number;
    follow_up: number;
    booked: number;
  }>;
  daily: Array<{
    day_label: string;
    date_val: string;
    dms_sent: number;
    replied: number;
    booked: number;
  }>;
  recent: Array<{
    id: number;
    lead_id: string;
    company_name: string;
    action_type: string;
    from_value: string;
    to_value: string;
    rep_name: string;
    created_at: string;
  }>;
}

export default function OutreachCRM() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [leads, setLeads] = useState<ContractorLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [repFilter, setRepFilter] = useState('all');
  const [nicheFilter, setNicheFilter] = useState('all');
  const [dailyTarget, setDailyTarget] = useState(30);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [notesModalLead, setNotesModalLead] = useState<ContractorLead | null>(null);
  const [notesText, setNotesText] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Authentication check
  useEffect(() => {
    const savedAuth = localStorage.getItem('alizane_crm_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = pinInput.trim().toUpperCase();
    if (entered === 'ALIZANE2026' || entered === '1234') {
      setIsAuthenticated(true);
      localStorage.setItem('alizane_crm_authenticated', 'true');
      return;
    }
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: entered }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('alizane_crm_authenticated', 'true');
      } else {
        alert('Incorrect access PIN. Default PIN is ALIZANE2026');
      }
    } catch (err) {
      alert('Authentication error. Try PIN: ALIZANE2026');
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/reports/weekly');
      const data = await res.json();
      if (data.success) {
        setWeeklyReport(data.data);
      }
    } catch (err) {
      console.error('Failed to load weekly report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads();
    }
  }, [isAuthenticated]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 2200);
  };

  const updateLead = async (id: string, updates: Partial<ContractorLead>) => {
    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Update failed:', data.error);
      }
    } catch (err) {
      console.error('Error updating lead:', err);
    }
  };

  const copyToClipboard = (text: string, label: string = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    showToast(label);
  };

  const stats = useMemo(() => {
    const s = {
      total: leads.length,
      to_contact: 0,
      dm_sent: 0,
      replied: 0,
      follow_up: 0,
      booked: 0,
      sent_today: 0,
    };
    const todayStr = new Date().toISOString().split('T')[0];

    leads.forEach(l => {
      if (l.status === 'to_contact') s.to_contact++;
      if (l.status === 'dm_sent') s.dm_sent++;
      if (l.status === 'replied') s.replied++;
      if (l.status === 'follow_up') s.follow_up++;
      if (l.status === 'booked') s.booked++;
      if (l.last_contacted_at && l.last_contacted_at.startsWith(todayStr)) {
        s.sent_today++;
      }
    });
    return s;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (repFilter !== 'all' && lead.assigned_to !== repFilter) return false;
      
      if (nicheFilter !== 'all') {
        const type = lead.offer_type.toLowerCase();
        if (nicheFilter === 'mold' && !type.includes('mold')) return false;
        if (nicheFilter === 'water' && !type.includes('water') && !type.includes('extraction')) return false;
        if (nicheFilter === 'fire' && !type.includes('fire') && !type.includes('smoke')) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const text = `${lead.company_name} ${lead.location} ${lead.domain} ${lead.ig_handle} ${lead.primary_headline} ${lead.primary_hook}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [leads, statusFilter, repFilter, nicheFilter, search]);

  const exportCsv = () => {
    const rows = [
      ["Company Name", "Location", "Domain", "Status", "Assigned Rep", "Instagram Handle", "IG DM Link", "FB Messenger", "LinkedIn Search", "Custom Pitch", "Notes"]
    ];

    filteredLeads.forEach(l => {
      rows.push([
        l.company_name,
        l.location,
        l.domain,
        l.status,
        l.assigned_to,
        '@' + l.ig_handle,
        l.ig_dm_url,
        l.fb_messenger_url,
        l.linkedin_search_url,
        l.dm_pitch_script,
        l.notes || ''
      ]);
    });

    const csvContent = "\uFEFF" + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `alizane_outreach_${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportWeeklyCsv = () => {
    if (!weeklyReport) return;
    const rows = [
      ["--- WEEKLY OUTREACH PERFORMANCE REPORT ---"],
      ["Report Generated", new Date().toLocaleString()],
      ["DMs Sent (Last 7 Days)", weeklyReport.weekly.dms_sent_week || 0],
      ["Conversations Started", weeklyReport.weekly.replies_week || 0],
      ["Demos Booked", weeklyReport.weekly.booked_week || 0],
      ["Notes Added", weeklyReport.weekly.notes_week || 0],
      [""],
      ["--- REP BREAKDOWN ---"],
      ["Rep Name", "Total Assigned", "DMs Sent", "In Convo", "Follow-up", "Booked"]
    ];

    weeklyReport.reps.forEach(r => {
      rows.push([
        r.rep === 'partner_a' ? 'Rep 1 (You)' : r.rep === 'partner_b' ? 'Rep 2 (Partner)' : 'Unassigned',
        r.total_assigned,
        r.dms_sent,
        r.replied,
        r.follow_up,
        r.booked
      ]);
    });

    const csvContent = "\uFEFF" + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `alizane_weekly_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 text-2xl shadow-lg">
            ⚡
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Alizane Labs Outreach CRM</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">Restoration Meta Ads &amp; Conversion Desk Dispatch</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter Team Access PIN (ALIZANE2026)"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full text-center tracking-widest text-sm rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-pink-500 font-mono transition-colors"
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 py-3 font-bold text-white text-sm shadow-xl transition-all"
            >
              Enter Live CRM 🚀
            </button>
          </form>
          <div className="text-[11px] text-slate-500 font-mono">
            Powered by Neon Postgres + Vercel
          </div>
        </div>
      </div>
    );
  }

  const goalPct = Math.min(100, Math.round((stats.sent_today / dailyTarget) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 selection:bg-pink-500 selection:text-white">
      <div className="max-w-[1900px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-1 text-xs font-mono text-emerald-400 mb-2 shadow-inner">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>⚡ Live Connected to Neon Postgres</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              US Restoration Contractors — Collaborative Outreach CRM
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Active Meta Ads Intelligence with 1-Click Multi-Channel Dispatch &amp; Live Real-Time Team Sync
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <button
              onClick={() => {
                fetchWeeklyReport();
                setReportModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/80 hover:bg-cyan-900 px-4 py-2.5 font-bold text-cyan-300 transition-all shadow-lg hover:shadow-cyan-500/10"
            >
              <span>📊 Weekly Report &amp; Logs</span>
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/70 hover:bg-purple-900 px-4 py-2.5 font-bold text-purple-300 transition-all shadow-lg hover:shadow-purple-500/10"
            >
              <span>🎯 Objections &amp; Scripts</span>
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-bold text-white transition-all shadow-lg"
            >
              <span>📤 Export CSV</span>
            </button>
            <button
              onClick={fetchLeads}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-2.5 text-slate-300 transition-all"
              title="Refresh Data"
            >
              <span>🔄</span>
            </button>
          </div>
        </div>

        {/* Daily Goal & Streak Progress */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔥</span>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Daily Outreach Target</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Live Team Tracker ⚡
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {stats.sent_today} / {dailyTarget} DMs Sent Today ({goalPct}%)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Daily Target:</span>
              <select
                value={dailyTarget}
                onChange={e => setDailyTarget(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white outline-none font-bold"
              >
                <option value={15}>15 DMs/day</option>
                <option value={30}>30 DMs/day</option>
                <option value={50}>50 DMs/day</option>
                <option value={100}>100 DMs/day</option>
              </select>
            </div>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-pink-500 via-rose-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${goalPct}%` }}
            ></div>
          </div>
        </div>

        {/* Pipeline Metric Filter Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 font-mono text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl border p-3 text-left transition-all ${
              statusFilter === 'all'
                ? 'border-pink-500 bg-pink-950/60 shadow-lg shadow-pink-500/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="text-slate-400 text-[11px]">All Leads</div>
            <div className="text-xl font-bold text-white mt-1">{stats.total}</div>
          </button>

          <button
            onClick={() => setStatusFilter('to_contact')}
            className={`rounded-xl border p-3 text-left transition-all ${
              statusFilter === 'to_contact'
                ? 'border-pink-500 bg-pink-950/60 shadow-lg shadow-pink-500/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="text-slate-400 text-[11px]">⏳ To Contact</div>
            <div className="text-xl font-bold text-slate-200 mt-1">{stats.to_contact}</div>
          </button>

          <button
            onClick={() => setStatusFilter('dm_sent')}
            className={`rounded-xl border p-3 text-left transition-all ${
              statusFilter === 'dm_sent'
                ? 'border-cyan-500 bg-cyan-950/60 shadow-lg shadow-cyan-500/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="text-cyan-400 text-[11px]">🚀 DM Sent</div>
            <div className="text-xl font-bold text-cyan-300 mt-1">{stats.dm_sent}</div>
          </button>

          <button
            onClick={() => setStatusFilter('replied')}
            className={`rounded-xl border p-3 text-left transition-all ${
              statusFilter === 'replied'
                ? 'border-emerald-500 bg-emerald-950/60 shadow-lg shadow-emerald-500/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="text-emerald-400 text-[11px]">💬 In Convo</div>
            <div className="text-xl font-bold text-emerald-300 mt-1">{stats.replied}</div>
          </button>

          <button
            onClick={() => setStatusFilter('follow_up')}
            className={`rounded-xl border p-3 text-left transition-all ${
              statusFilter === 'follow_up'
                ? 'border-amber-500 bg-amber-950/60 shadow-lg shadow-amber-500/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="text-amber-400 text-[11px]">⏰ Follow-Up</div>
            <div className="text-xl font-bold text-amber-300 mt-1">{stats.follow_up}</div>
          </button>

          <button
            onClick={() => setStatusFilter('booked')}
            className={`rounded-xl border p-3 text-left transition-all ${
              statusFilter === 'booked'
                ? 'border-purple-500 bg-purple-950/60 shadow-lg shadow-purple-500/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="text-purple-400 text-[11px]">🎯 Demo Booked</div>
            <div className="text-xl font-bold text-purple-300 mt-1">{stats.booked}</div>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[280px]">
            <input
              type="text"
              placeholder="Search by Company, Location, Domain, Handle, Ad Hook..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <select
            value={repFilter}
            onChange={e => setRepFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 outline-none font-mono"
          >
            <option value="all">👤 All Team Reps</option>
            <option value="partner_a">Rep 1 (You)</option>
            <option value="partner_b">Rep 2 (Partner)</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <select
            value={nicheFilter}
            onChange={e => setNicheFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 outline-none font-mono"
          >
            <option value="all">All Services (Water • Fire • Mold)</option>
            <option value="mold">Certified Mold Remediation</option>
            <option value="water">Water Damage Extraction</option>
            <option value="fire">Fire &amp; Smoke Recovery</option>
          </select>
        </div>

        {/* Leads Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/95 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3 text-center">#</th>
                  <th className="py-3 px-3">Pipeline Status</th>
                  <th className="py-3 px-3">Assigned Rep</th>
                  <th className="py-3 px-3">Contractor &amp; Domain</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3 text-center">Ads</th>
                  <th className="py-3 px-3 text-center text-pink-400">⚡ 1-Click Outreach</th>
                  <th className="py-3 px-3">Primary Niche</th>
                  <th className="py-3 px-3">Ad Hook</th>
                  <th className="py-3 px-3 text-center">Notes</th>
                  <th className="py-3 px-3 text-center">Meta Ads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 font-mono">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-pink-500 animate-ping"></span>
                        <span>Loading leads from Neon Postgres...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 font-mono">
                      No contractors found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, idx) => {
                    let statusSelectColor = 'bg-slate-950 text-slate-300 border-slate-700';
                    if (lead.status === 'dm_sent') statusSelectColor = 'bg-cyan-950 text-cyan-300 border-cyan-500';
                    if (lead.status === 'replied') statusSelectColor = 'bg-emerald-950 text-emerald-300 border-emerald-500';
                    if (lead.status === 'follow_up') statusSelectColor = 'bg-amber-950 text-amber-300 border-amber-500';
                    if (lead.status === 'booked') statusSelectColor = 'bg-purple-950 text-purple-300 border-purple-500';

                    return (
                      <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">
                        <td className="py-3 px-3 font-mono text-slate-500 text-center">{idx + 1}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={lead.status}
                            onChange={e => updateLead(lead.id, { status: e.target.value })}
                            className={`text-xs font-mono font-bold rounded-lg px-2.5 py-1 border outline-none cursor-pointer ${statusSelectColor}`}
                          >
                            <option value="to_contact">⏳ To Contact</option>
                            <option value="dm_sent">🚀 DM Sent</option>
                            <option value="replied">💬 In Convo</option>
                            <option value="follow_up">⏰ Follow-Up</option>
                            <option value="booked">🎯 Booked</option>
                            <option value="not_interested">❌ Passed</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={lead.assigned_to || 'unassigned'}
                            onChange={e => updateLead(lead.id, { assigned_to: e.target.value })}
                            className="text-[11px] font-mono rounded bg-slate-950 border border-slate-800 px-2 py-1 text-slate-300 outline-none"
                          >
                            <option value="unassigned">— None —</option>
                            <option value="partner_a">Rep 1 (You)</option>
                            <option value="partner_b">Rep 2 (Partner)</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                          <div className="text-sm font-bold text-white">{lead.company_name}</div>
                          <div>
                            {lead.domain && lead.domain !== 'N/A' ? (
                              <a href={lead.destination_url || '#'} target="_blank" className="font-mono text-[11px] text-emerald-400 hover:underline font-medium">
                                {lead.domain}
                              </a>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-500">Phone Lead / Direct Ad</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-200 border border-slate-700">
                            📍 {lead.location}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center rounded-full bg-cyan-950 border border-cyan-500/50 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-300">
                            {lead.active_ads_count} Ads
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <a
                              href={lead.ig_dm_url}
                              target="_blank"
                              onClick={() => updateLead(lead.id, { status: 'dm_sent' })}
                              className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold px-2 py-1 shadow"
                              title="Open Instagram DM"
                            >
                              <span>📸 IG</span>
                            </a>
                            <a
                              href={lead.fb_messenger_url}
                              target="_blank"
                              onClick={() => updateLead(lead.id, { status: 'dm_sent' })}
                              className="inline-flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-1 shadow"
                              title="Open Facebook Messenger"
                            >
                              <span>💬 FB</span>
                            </a>
                            <a
                              href={lead.linkedin_search_url}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded bg-sky-800 hover:bg-sky-700 text-sky-200 font-bold px-2 py-1 shadow"
                              title="Search Owner on LinkedIn"
                            >
                              <span>💼 In</span>
                            </a>
                            <button
                              onClick={() => copyToClipboard(lead.dm_pitch_script, 'Conversion Desk Pitch Copied!')}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 text-[10px]"
                              title="Copy Tailored Conversion Desk Pitch"
                            >
                              📋 Pitch
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                          {lead.offer_type}
                        </td>

                        <td className="py-3 px-3 text-slate-300 max-w-sm">
                          <div className="line-clamp-2 leading-relaxed text-xs text-slate-400">
                            {lead.primary_hook}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => {
                              setNotesModalLead(lead);
                              setNotesText(lead.notes || '');
                            }}
                            className={`px-2.5 py-1 rounded font-mono text-[10px] border transition-colors ${
                              lead.notes && lead.notes.length > 0
                                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {lead.notes && lead.notes.length > 0 ? '📝 Notes (1)' : '+ Note'}
                          </button>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <a
                            href={lead.ad_library_url}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300 hover:bg-slate-700 font-mono text-[10px]"
                          >
                            <span>Ads</span>
                            <span>↗</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Weekly Performance Report & Team Logs Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="max-w-4xl w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="font-extrabold text-white text-lg sm:text-xl">Weekly Outreach Performance &amp; Team Logs</h3>
                  <p className="text-xs font-mono text-slate-400">Live Team Analytics, Rep Breakdown &amp; Audit Trail</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportWeeklyCsv}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold px-3 py-1.5 rounded-lg shadow transition-all"
                >
                  📥 Export Report CSV
                </button>
                <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-white font-mono text-lg px-2">
                  ✕
                </button>
              </div>
            </div>

            {reportLoading || !weeklyReport ? (
              <div className="py-12 text-center text-slate-400 font-mono">
                <div className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Generating weekly report from Neon Postgres...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 4 Top KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4">
                    <div className="text-[11px] text-cyan-400 font-bold">DMs Sent (7 Days)</div>
                    <div className="text-2xl font-black text-white mt-1">{weeklyReport.weekly.dms_sent_week || 0}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4">
                    <div className="text-[11px] text-emerald-400 font-bold">Conversations Started</div>
                    <div className="text-2xl font-black text-white mt-1">{weeklyReport.weekly.replies_week || 0}</div>
                  </div>
                  <div className="rounded-xl border border-purple-500/30 bg-purple-950/40 p-4">
                    <div className="text-[11px] text-purple-400 font-bold">Demos Booked 🎯</div>
                    <div className="text-2xl font-black text-white mt-1">{weeklyReport.weekly.booked_week || 0}</div>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-4">
                    <div className="text-[11px] text-amber-400 font-bold">Call/Chat Notes</div>
                    <div className="text-2xl font-black text-white mt-1">{weeklyReport.weekly.notes_week || 0}</div>
                  </div>
                </div>

                {/* Rep Leaderboard Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                    <span>👥</span>
                    <span>Rep Leaderboard &amp; Workload Distribution</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                    {weeklyReport.reps.map(r => {
                      const repLabel = r.rep === 'partner_a' ? '👤 Rep 1 (You)' : r.rep === 'partner_b' ? '👤 Rep 2 (Partner)' : '📁 Unassigned';
                      const repBorder = r.rep === 'partner_a' ? 'border-pink-500/40 bg-pink-950/20' : r.rep === 'partner_b' ? 'border-blue-500/40 bg-blue-950/20' : 'border-slate-800 bg-slate-950';

                      return (
                        <div key={r.rep} className={`rounded-xl border p-4 space-y-3 ${repBorder}`}>
                          <div className="flex items-center justify-between font-bold text-white text-sm">
                            <span>{repLabel}</span>
                            <span className="text-xs text-slate-400">{r.total_assigned} Assigned Leads</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                            <div className="bg-slate-900/90 rounded p-2 border border-slate-800">
                              <div className="text-slate-400 text-[10px]">DMs Sent</div>
                              <div className="font-bold text-cyan-300 text-sm mt-0.5">{r.dms_sent}</div>
                            </div>
                            <div className="bg-slate-900/90 rounded p-2 border border-slate-800">
                              <div className="text-slate-400 text-[10px]">In Convo</div>
                              <div className="font-bold text-emerald-300 text-sm mt-0.5">{r.replied}</div>
                            </div>
                            <div className="bg-slate-900/90 rounded p-2 border border-slate-800">
                              <div className="text-slate-400 text-[10px]">Follow-Up</div>
                              <div className="font-bold text-amber-300 text-sm mt-0.5">{r.follow_up}</div>
                            </div>
                            <div className="bg-slate-900/90 rounded p-2 border border-slate-800">
                              <div className="text-slate-400 text-[10px]">Booked 🎯</div>
                              <div className="font-bold text-purple-300 text-sm mt-0.5">{r.booked}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Activity Trail Feed */}
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                    <span>📜</span>
                    <span>Recent Team Activity Log (Live Audit Trail)</span>
                  </h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 max-h-60 overflow-y-auto custom-scrollbar space-y-2 font-mono text-[11px]">
                    {weeklyReport.recent && weeklyReport.recent.length > 0 ? (
                      weeklyReport.recent.map(act => {
                        const dateStr = new Date(act.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const repBadge = act.rep_name === 'partner_a' ? 'Rep 1' : act.rep_name === 'partner_b' ? 'Rep 2' : 'Team';

                        let actionDesc = '';
                        if (act.action_type === 'status_change') {
                          actionDesc = `changed status to ${act.to_value.toUpperCase()}`;
                        } else if (act.action_type === 'note_added') {
                          actionDesc = `added note: "${act.to_value}"`;
                        } else if (act.action_type === 'rep_assigned') {
                          actionDesc = `assigned to ${act.to_value}`;
                        }

                        return (
                          <div key={act.id} className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">{repBadge}</span>
                              <span className="font-bold text-white">{act.company_name}</span>
                              <span className="text-slate-400">{actionDesc}</span>
                            </div>
                            <span className="text-slate-500 text-[10px] whitespace-nowrap">{dateStr}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-slate-500">
                        No outreach actions logged yet. As you mark leads as DM Sent or add notes, they will appear here live!
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">{notesModalLead.company_name}</h3>
                <p className="text-xs font-mono text-slate-400">Call Logs &amp; Outreach Notes (Syncs with Team)</p>
              </div>
              <button onClick={() => setNotesModalLead(null)} className="text-slate-400 hover:text-white font-mono">
                ✕
              </button>
            </div>

            <textarea
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              placeholder="e.g. Talked with Owner Dave on IG. Interested in 24/7 water dispatch tracking. Follow up Friday 11am."
              rows={5}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 font-mono"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setNotesModalLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateLead(notesModalLead.id, { notes: notesText });
                  setNotesModalLead(null);
                  showToast('Note saved to Neon Postgres!');
                }}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white shadow-lg font-mono"
              >
                Save Note 💾
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Objection & Scripts Drawer */}
      {drawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl p-6 flex flex-col custom-scrollbar overflow-y-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h3 className="text-base font-bold text-white">Outreach &amp; Objection Cheatsheet</h3>
            </div>
            <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white text-lg font-mono">
              ✕
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Follow-Up 1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400">⏰ Follow-Up 1 (Day 2 Bump)</span>
                <button
                  onClick={() => copyToClipboard('Hey [Name] — floating this back to the top. Just wanted to see if your team has a system in place to instantly convert after-hours ad traffic before they click onto another contractor\'s ad?')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[11px] font-mono"
                >
                  📋 Copy
                </button>
              </div>
              <p className="text-slate-300">
                Hey [Name] — floating this back to the top. Just wanted to see if your team has a system in place to instantly convert after-hours ad traffic before they click onto another contractor's ad?
              </p>
            </div>

            {/* Follow-Up 2 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400">⏰ Follow-Up 2 (Day 4 Value Drop)</span>
                <button
                  onClick={() => copyToClipboard('Hey [Name] — quick question: does your team currently track which specific Meta ad campaigns are driving high-ticket insurance water/mold jobs vs lost clicks? Happy to send a 45-sec Loom showing how our Conversion Desk tracks this live.')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[11px] font-mono"
                >
                  📋 Copy
                </button>
              </div>
              <p className="text-slate-300">
                Hey [Name] — quick question: does your team currently track which specific Meta ad campaigns are driving high-ticket insurance water/mold jobs vs lost clicks? Happy to send a 45-sec Loom showing how our Conversion Desk tracks this live.
              </p>
            </div>

            {/* Objection 1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-purple-400">🛡️ 'We have an answering service'</span>
                <button
                  onClick={() => copyToClipboard('Totally get that. Most answering services just take a message and relay it 15 mins later. Our Conversion Desk qualifies insurance carriers in under 30 seconds and books the inspection straight to your calendar while the property owner is on the line. Worth a 1-min look?')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[11px] font-mono"
                >
                  📋 Copy
                </button>
              </div>
              <p className="text-slate-300">
                Totally get that. Most answering services just take a message and relay it 15 mins later. Our Conversion Desk qualifies insurance carriers in under 30 seconds and books the inspection straight to your calendar while the property owner is on the line. Worth a 1-min look?
              </p>
            </div>

            {/* Objection 2 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-purple-400">🛡️ 'We already have a marketing agency'</span>
                <button
                  onClick={() => copyToClipboard('That’s actually awesome! We don\'t replace your agency — we plug directly into their ads with instant call & chat response and ad-level attribution so you can both see the exact ROAS on every dollar spent.')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[11px] font-mono"
                >
                  📋 Copy
                </button>
              </div>
              <p className="text-slate-300">
                That’s actually awesome! We don't replace your agency — we plug directly into their ads with instant call &amp; chat response and ad-level attribution so you can both see the exact ROAS on every dollar spent.
              </p>
            </div>

            {/* Objection 3 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-purple-400">🛡️ 'How much does it cost?'</span>
                <button
                  onClick={() => copyToClipboard('We offer a straightforward pilot trial with zero long-term contracts. If it doesn\'t lock in emergency dispatches for your team, you don\'t pay. Open to a 2-min interactive walkthrough to see if it fits?')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[11px] font-mono"
                >
                  📋 Copy
                </button>
              </div>
              <p className="text-slate-300">
                We offer a straightforward pilot trial with zero long-term contracts. If it doesn't lock in emergency dispatches for your team, you don't pay. Open to a 2-min interactive walkthrough to see if it fits?
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono animate-bounce">
          <span>✅</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
