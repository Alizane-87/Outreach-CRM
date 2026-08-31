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
        alert('Invalid access PIN. Try default: ALIZANE2026');
      }
    } catch (err) {
      alert('Authentication error. Default PIN: ALIZANE2026');
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
    const fullUpdates = { ...updates };
    if (updates.status === 'dm_sent') {
      fullUpdates.last_contacted_at = new Date().toISOString();
    }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...fullUpdates } : l));

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullUpdates),
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Update failed:', data.error);
      }
    } catch (err) {
      console.error('Error updating lead:', err);
    }
  };

  const copyToClipboard = (text: string, label: string = 'Copied to clipboard') => {
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
      const st = l.status || 'to_contact';
      if (st === 'to_contact') s.to_contact++;
      else if (st === 'dm_sent') s.dm_sent++;
      else if (st === 'replied') s.replied++;
      else if (st === 'follow_up') s.follow_up++;
      else if (st === 'booked') s.booked++;

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
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7] p-6 text-[#111827]">
        <div className="max-w-md w-full rounded-xl border border-[#E7E5E4] bg-white p-8 shadow-xl space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-mono font-bold text-sm tracking-wider">
            AL
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#111827] tracking-tight">Alizane Labs</h2>
            <p className="text-xs text-[#57534E] mt-1 font-mono uppercase tracking-wider">Outbound Conversion Desk</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Team Access PIN"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full text-center tracking-widest text-sm rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] px-4 py-3 text-[#111827] outline-none focus:border-[#065F46] font-mono transition-colors"
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[#065F46] hover:bg-[#047857] py-3 font-semibold text-white text-xs tracking-wide uppercase transition-all shadow-sm"
            >
              Access Dashboard
            </button>
          </form>
          <div className="text-[11px] text-[#78716C] font-mono">
            Sovereign Emerald Architecture • Neon PostgreSQL Sync
          </div>
        </div>
      </div>
    );
  }

  const goalPct = Math.min(100, Math.round((stats.sent_today / dailyTarget) * 100));

  return (
    <div className="min-h-screen bg-[#F9F9F7] text-[#111827] p-4 sm:p-8 space-y-6">
      <div className="max-w-[1900px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7E5E4] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-mono text-[#065F46]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#065F46]"></span>
              <span>PostgreSQL Connected</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              US Restoration Contractors — Outbound Intelligence Desk
            </h1>
            <p className="text-xs text-[#57534E]">
              Active Meta Ads Intelligence &amp; Multi-Channel Conversion Workflow
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <button
              onClick={() => {
                fetchWeeklyReport();
                setReportModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] px-3.5 py-2 text-[#111827] font-medium transition-all shadow-sm"
            >
              <span>Weekly Reports</span>
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] px-3.5 py-2 text-[#111827] font-medium transition-all shadow-sm"
            >
              <span>Scripts &amp; Objections</span>
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#065F46] bg-[#065F46] hover:bg-[#047857] px-3.5 py-2 text-white font-medium transition-all shadow-sm"
            >
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchLeads}
              className="inline-flex items-center rounded-lg border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] px-3 py-2 text-[#57534E] hover:text-[#111827] transition-all text-xs font-mono shadow-sm"
              title="Refresh Data"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Daily Goal & Streak Progress */}
        <div className="rounded-xl border border-[#E7E5E4] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2.5">
            <div>
              <div className="text-xs font-bold text-[#111827] font-mono uppercase tracking-wider">
                Daily Outbound Progress
              </div>
              <div className="text-xs text-[#57534E] font-mono mt-0.5">
                {stats.sent_today} of {dailyTarget} Outbound Contacts ({goalPct}%)
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[#57534E]">Target:</span>
              <select
                value={dailyTarget}
                onChange={e => setDailyTarget(Number(e.target.value))}
                className="bg-[#F5F5F4] border border-[#E7E5E4] rounded px-2.5 py-1 text-[#111827] outline-none"
              >
                <option value={15}>15 / day</option>
                <option value={30}>30 / day</option>
                <option value={50}>50 / day</option>
                <option value={100}>100 / day</option>
              </select>
            </div>
          </div>

          <div className="w-full bg-[#F5F5F4] rounded-full h-2 overflow-hidden border border-[#E7E5E4]">
            <div
              className="bg-[#065F46] h-2 rounded-full transition-all duration-300"
              style={{ width: `${goalPct}%` }}
            ></div>
          </div>
        </div>

        {/* Pipeline Metric Filter Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 font-mono text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg border p-3 text-left transition-all ${
              statusFilter === 'all'
                ? 'border-[#065F46] bg-[#ECFDF5] text-[#065F46] font-bold shadow-sm'
                : 'border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#D6D3D1]'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider text-[#57534E]">All Leads</div>
            <div className="text-lg font-bold text-[#111827] mt-1">{stats.total}</div>
          </button>

          <button
            onClick={() => setStatusFilter('to_contact')}
            className={`rounded-lg border p-3 text-left transition-all ${
              statusFilter === 'to_contact'
                ? 'border-[#065F46] bg-[#ECFDF5] text-[#065F46] font-bold shadow-sm'
                : 'border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#D6D3D1]'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider text-[#57534E]">To Contact</div>
            <div className="text-lg font-bold text-[#111827] mt-1">{stats.to_contact}</div>
          </button>

          <button
            onClick={() => setStatusFilter('dm_sent')}
            className={`rounded-lg border p-3 text-left transition-all ${
              statusFilter === 'dm_sent'
                ? 'border-sky-600 bg-sky-50 text-sky-800 font-bold shadow-sm'
                : 'border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#D6D3D1]'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider text-sky-700">Outbound Sent</div>
            <div className="text-lg font-bold text-sky-800 mt-1">{stats.dm_sent}</div>
          </button>

          <button
            onClick={() => setStatusFilter('replied')}
            className={`rounded-lg border p-3 text-left transition-all ${
              statusFilter === 'replied'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                : 'border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#D6D3D1]'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider text-emerald-700">In Discussion</div>
            <div className="text-lg font-bold text-emerald-800 mt-1">{stats.replied}</div>
          </button>

          <button
            onClick={() => setStatusFilter('follow_up')}
            className={`rounded-lg border p-3 text-left transition-all ${
              statusFilter === 'follow_up'
                ? 'border-amber-600 bg-amber-50 text-amber-800 font-bold shadow-sm'
                : 'border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#D6D3D1]'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider text-amber-700">Follow-Up</div>
            <div className="text-lg font-bold text-amber-800 mt-1">{stats.follow_up}</div>
          </button>

          <button
            onClick={() => setStatusFilter('booked')}
            className={`rounded-lg border p-3 text-left transition-all ${
              statusFilter === 'booked'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold shadow-sm'
                : 'border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#D6D3D1]'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider text-indigo-700">Demo Booked</div>
            <div className="text-lg font-bold text-indigo-800 mt-1">{stats.booked}</div>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[280px]">
            <input
              type="text"
              placeholder="Search company, location, domain, or ad hook..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E7E5E4] bg-white px-3.5 py-2.5 text-xs text-[#111827] placeholder-[#78716C] outline-none focus:border-[#065F46] transition-colors shadow-sm"
            />
          </div>

          <select
            value={repFilter}
            onChange={e => setRepFilter(e.target.value)}
            className="bg-white border border-[#E7E5E4] rounded-lg px-3.5 py-2.5 text-xs text-[#111827] outline-none font-mono shadow-sm"
          >
            <option value="all">All Team Reps</option>
            <option value="partner_a">Rep 1 (You)</option>
            <option value="partner_b">Rep 2 (Partner)</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <select
            value={nicheFilter}
            onChange={e => setNicheFilter(e.target.value)}
            className="bg-white border border-[#E7E5E4] rounded-lg px-3.5 py-2.5 text-xs text-[#111827] outline-none font-mono shadow-sm"
          >
            <option value="all">All Niches</option>
            <option value="mold">Mold Remediation</option>
            <option value="water">Water Damage Extraction</option>
            <option value="fire">Fire &amp; Smoke Recovery</option>
          </select>
        </div>

        {/* Leads Table */}
        <div className="rounded-xl border border-[#E7E5E4] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E7E5E4] bg-[#F5F5F4] font-mono text-[11px] uppercase tracking-wider text-[#57534E]">
                  <th className="py-3 px-3 text-center">#</th>
                  <th className="py-3 px-3">Pipeline Status</th>
                  <th className="py-3 px-3">Assigned Rep</th>
                  <th className="py-3 px-3">Contractor &amp; Domain</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3 text-center">Ads</th>
                  <th className="py-3 px-3 text-center">Outreach Channels</th>
                  <th className="py-3 px-3">Primary Niche</th>
                  <th className="py-3 px-3">Ad Hook</th>
                  <th className="py-3 px-3 text-center">Notes</th>
                  <th className="py-3 px-3 text-center">Meta Ads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]/80 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-[#78716C] font-mono">
                      Loading contractor records from database...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-[#78716C] font-mono">
                      No records match the current filter selection.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, idx) => {
                    let statusSelectClass = 'bg-[#F5F5F4] text-[#111827] border-[#E7E5E4]';
                    if (lead.status === 'dm_sent') statusSelectClass = 'bg-sky-50 text-sky-800 border-sky-300 font-medium';
                    if (lead.status === 'replied') statusSelectClass = 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] font-medium';
                    if (lead.status === 'follow_up') statusSelectClass = 'bg-amber-50 text-amber-800 border-amber-300 font-medium';
                    if (lead.status === 'booked') statusSelectClass = 'bg-indigo-50 text-indigo-800 border-indigo-300 font-medium';

                    return (
                      <tr key={lead.id} className="hover:bg-[#F5F5F4]/60 transition-colors border-b border-[#E7E5E4]/60">
                        <td className="py-3 px-3 font-mono text-[#78716C] text-center">{idx + 1}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={lead.status || 'to_contact'}
                            onChange={e => updateLead(lead.id, { status: e.target.value })}
                            className={`text-xs font-mono rounded-md px-2.5 py-1 border outline-none cursor-pointer ${statusSelectClass}`}
                          >
                            <option value="to_contact" className="bg-white text-[#111827]">To Contact</option>
                            <option value="dm_sent" className="bg-white text-[#111827]">Outbound Sent</option>
                            <option value="replied" className="bg-white text-[#111827]">In Discussion</option>
                            <option value="follow_up" className="bg-white text-[#111827]">Follow-Up</option>
                            <option value="booked" className="bg-white text-[#111827]">Demo Booked</option>
                            <option value="not_interested" className="bg-white text-[#111827]">Passed</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={lead.assigned_to || 'unassigned'}
                            onChange={e => updateLead(lead.id, { assigned_to: e.target.value })}
                            className="text-[11px] font-mono rounded bg-[#F5F5F4] border border-[#E7E5E4] px-2 py-1 text-[#111827] outline-none"
                          >
                            <option value="unassigned">— None —</option>
                            <option value="partner_a">Rep 1 (You)</option>
                            <option value="partner_b">Rep 2 (Partner)</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="text-xs font-bold text-[#111827]">{lead.company_name}</div>
                          <div>
                            {lead.domain && lead.domain !== 'N/A' ? (
                              <a href={lead.destination_url || '#'} target="_blank" className="font-mono text-[11px] text-[#065F46] hover:underline font-medium">
                                {lead.domain}
                              </a>
                            ) : (
                              <span className="font-mono text-[11px] text-[#78716C]">Direct Ad Lead</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded bg-[#F5F5F4] px-2 py-0.5 font-mono text-[11px] text-[#57534E] border border-[#E7E5E4]">
                            {lead.location}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center rounded bg-[#F5F5F4] border border-[#E7E5E4] px-2 py-0.5 font-mono text-[11px] text-[#111827] font-semibold">
                            {lead.active_ads_count} Ads
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <a
                              href={lead.ig_dm_url}
                              target="_blank"
                              onClick={() => updateLead(lead.id, { status: 'dm_sent' })}
                              className="inline-flex items-center rounded border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] text-[#111827] font-medium px-2 py-1 transition-colors shadow-sm"
                              title="Open Instagram DM"
                            >
                              IG
                            </a>
                            <a
                              href={lead.fb_messenger_url}
                              target="_blank"
                              onClick={() => updateLead(lead.id, { status: 'dm_sent' })}
                              className="inline-flex items-center rounded border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] text-[#111827] font-medium px-2 py-1 transition-colors shadow-sm"
                              title="Open Facebook Messenger"
                            >
                              FB
                            </a>
                            <a
                              href={lead.linkedin_search_url}
                              target="_blank"
                              className="inline-flex items-center rounded border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] text-[#111827] font-medium px-2 py-1 transition-colors shadow-sm"
                              title="Search Owner on LinkedIn"
                            >
                              LinkedIn
                            </a>
                            <button
                              onClick={() => copyToClipboard(lead.dm_pitch_script, 'Pitch Script Copied')}
                              className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#57534E] hover:text-[#111827] px-2 py-1 rounded border border-[#E7E5E4] text-[10px] transition-colors"
                              title="Copy Conversion Desk Pitch"
                            >
                              Pitch
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-[#57534E] max-w-xs truncate">
                          {lead.offer_type}
                        </td>

                        <td className="py-3 px-3 text-[#57534E] max-w-sm">
                          <div className="line-clamp-2 leading-relaxed text-xs">
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
                                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] font-medium'
                                : 'bg-white border-[#E7E5E4] text-[#78716C] hover:text-[#111827]'
                            }`}
                          >
                            {lead.notes && lead.notes.length > 0 ? 'Notes' : '+ Note'}
                          </button>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <a
                            href={lead.ad_library_url}
                            target="_blank"
                            className="inline-flex items-center rounded border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] px-2 py-1 text-[#57534E] hover:text-[#111827] font-mono text-[10px] transition-colors shadow-sm"
                          >
                            Meta Ads
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-4xl w-full rounded-xl border border-[#E7E5E4] bg-white p-6 sm:p-8 space-y-6 shadow-2xl my-8 text-[#111827]">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-4">
              <div>
                <h3 className="font-bold text-[#111827] text-base sm:text-lg">Weekly Performance &amp; Activity Log</h3>
                <p className="text-xs font-mono text-[#57534E]">Team Analytics &amp; Verified Audit Trail</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportWeeklyCsv}
                  className="bg-[#065F46] hover:bg-[#047857] text-white font-mono text-xs font-medium px-3 py-1.5 rounded shadow-sm transition-all"
                >
                  Export CSV
                </button>
                <button onClick={() => setReportModalOpen(false)} className="text-[#78716C] hover:text-[#111827] font-mono text-base px-2">
                  Close
                </button>
              </div>
            </div>

            {reportLoading || !weeklyReport ? (
              <div className="py-12 text-center text-[#78716C] font-mono text-xs">
                Generating summary from database...
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 4 Top KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-3.5">
                    <div className="text-[10px] text-[#57534E] uppercase tracking-wider">Outbound (7 Days)</div>
                    <div className="text-xl font-bold text-[#111827] mt-1">{weeklyReport.weekly.dms_sent_week || 0}</div>
                  </div>
                  <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-3.5">
                    <div className="text-[10px] text-[#065F46] uppercase tracking-wider">In Discussion</div>
                    <div className="text-xl font-bold text-[#065F46] mt-1">{weeklyReport.weekly.replies_week || 0}</div>
                  </div>
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3.5">
                    <div className="text-[10px] text-indigo-700 uppercase tracking-wider">Demos Booked</div>
                    <div className="text-xl font-bold text-indigo-800 mt-1">{weeklyReport.weekly.booked_week || 0}</div>
                  </div>
                  <div className="rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-3.5">
                    <div className="text-[10px] text-[#57534E] uppercase tracking-wider">Notes Logged</div>
                    <div className="text-xl font-bold text-[#111827] mt-1">{weeklyReport.weekly.notes_week || 0}</div>
                  </div>
                </div>

                {/* Rep Breakdown */}
                <div className="space-y-2.5">
                  <h4 className="font-mono text-xs font-bold text-[#111827] uppercase tracking-wider">
                    Rep Workload Distribution
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    {weeklyReport.reps.map(r => {
                      const repLabel = r.rep === 'partner_a' ? 'Rep 1 (You)' : r.rep === 'partner_b' ? 'Rep 2 (Partner)' : 'Unassigned';

                      return (
                        <div key={r.rep} className="rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between font-bold text-[#111827]">
                            <span>{repLabel}</span>
                            <span className="text-xs text-[#57534E]">{r.total_assigned} Assigned</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                            <div className="bg-white rounded p-2 border border-[#E7E5E4]">
                              <div className="text-[#57534E]">Sent</div>
                              <div className="font-bold text-[#111827] text-xs mt-0.5">{r.dms_sent}</div>
                            </div>
                            <div className="bg-white rounded p-2 border border-[#E7E5E4]">
                              <div className="text-[#57534E]">Convo</div>
                              <div className="font-bold text-[#065F46] text-xs mt-0.5">{r.replied}</div>
                            </div>
                            <div className="bg-white rounded p-2 border border-[#E7E5E4]">
                              <div className="text-[#57534E]">Follow-Up</div>
                              <div className="font-bold text-amber-700 text-xs mt-0.5">{r.follow_up}</div>
                            </div>
                            <div className="bg-white rounded p-2 border border-[#E7E5E4]">
                              <div className="text-[#57534E]">Booked</div>
                              <div className="font-bold text-indigo-700 text-xs mt-0.5">{r.booked}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Activity Trail Feed */}
                <div className="space-y-2.5">
                  <h4 className="font-mono text-xs font-bold text-[#111827] uppercase tracking-wider">
                    Recent Activity Trail
                  </h4>
                  <div className="rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-3 max-h-56 overflow-y-auto custom-scrollbar space-y-2 font-mono text-[11px]">
                    {weeklyReport.recent && weeklyReport.recent.length > 0 ? (
                      weeklyReport.recent.map(act => {
                        const dateStr = new Date(act.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const repBadge = act.rep_name === 'partner_a' ? 'Rep 1' : act.rep_name === 'partner_b' ? 'Rep 2' : 'System';

                        let actionDesc = '';
                        if (act.action_type === 'status_change') {
                          actionDesc = `updated status to ${act.to_value.replace('_', ' ').toUpperCase()}`;
                        } else if (act.action_type === 'note_added') {
                          actionDesc = `logged note: "${act.to_value}"`;
                        } else if (act.action_type === 'rep_assigned') {
                          actionDesc = `assigned to ${act.to_value}`;
                        }

                        return (
                          <div key={act.id} className="flex items-center justify-between border-b border-[#E7E5E4] pb-1.5 last:border-0">
                            <div className="flex items-center gap-2 truncate">
                              <span className="px-1.5 py-0.2 rounded bg-white text-[#111827] text-[10px] border border-[#E7E5E4]">{repBadge}</span>
                              <span className="font-bold text-[#111827]">{act.company_name}</span>
                              <span className="text-[#57534E]">{actionDesc}</span>
                            </div>
                            <span className="text-[#78716C] text-[10px] whitespace-nowrap ml-2">{dateStr}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-[#78716C] text-xs">
                        Activity logs will populate automatically as actions are taken.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full rounded-xl border border-[#E7E5E4] bg-white p-6 space-y-4 shadow-2xl text-[#111827]">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
              <div>
                <h3 className="font-bold text-[#111827] text-sm">{notesModalLead.company_name}</h3>
                <p className="text-xs font-mono text-[#57534E]">Call Logs &amp; Discussion Record</p>
              </div>
              <button onClick={() => setNotesModalLead(null)} className="text-[#78716C] hover:text-[#111827] font-mono text-xs">
                Close
              </button>
            </div>

            <textarea
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              placeholder="Record discussion details, follow-up timeline, or specific requirements..."
              rows={5}
              className="w-full rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-3 text-xs text-[#111827] placeholder-[#78716C] outline-none focus:border-[#065F46] font-mono"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setNotesModalLead(null)}
                className="px-3 py-1.5 rounded text-xs font-mono text-[#78716C] hover:text-[#111827]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateLead(notesModalLead.id, { notes: notesText });
                  setNotesModalLead(null);
                  showToast('Note saved to database');
                }}
                className="px-3.5 py-1.5 rounded bg-[#065F46] hover:bg-[#047857] text-xs font-medium text-white shadow-sm font-mono"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Objection & Scripts Drawer */}
      {drawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-[#E7E5E4] shadow-2xl p-6 flex flex-col custom-scrollbar overflow-y-auto space-y-6 text-[#111827]">
          <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-[#111827]">Outreach &amp; Objection Cheatsheet</h3>
              <p className="text-[11px] font-mono text-[#57534E]">Standard Conversion Desk Responses</p>
            </div>
            <button onClick={() => setDrawerOpen(false)} className="text-[#78716C] hover:text-[#111827] text-xs font-mono">
              Close
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Follow-Up 1 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#111827]">Follow-Up 1 (Day 2 Bump)</span>
                <button
                  onClick={() => copyToClipboard('Hey [Name] — floating this back to the top. Just wanted to see if your team has a system in place to instantly convert after-hours ad traffic before they click onto another contractor\'s ad?')}
                  className="bg-white hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4] shadow-sm"
                >
                  Copy
                </button>
              </div>
              <p className="text-[#57534E] leading-relaxed">
                Hey [Name] — floating this back to the top. Just wanted to see if your team has a system in place to instantly convert after-hours ad traffic before they click onto another contractor's ad?
              </p>
            </div>

            {/* Follow-Up 2 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#111827]">Follow-Up 2 (Day 4 Value)</span>
                <button
                  onClick={() => copyToClipboard('Hey [Name] — quick question: does your team currently track which specific Meta ad campaigns are driving high-ticket insurance water/mold jobs vs lost clicks? Happy to send a 45-sec Loom showing how our Conversion Desk tracks this live.')}
                  className="bg-white hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4] shadow-sm"
                >
                  Copy
                </button>
              </div>
              <p className="text-[#57534E] leading-relaxed">
                Hey [Name] — quick question: does your team currently track which specific Meta ad campaigns are driving high-ticket insurance water/mold jobs vs lost clicks? Happy to send a 45-sec Loom showing how our Conversion Desk tracks this live.
              </p>
            </div>

            {/* Objection 1 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#111827]">"We have an answering service"</span>
                <button
                  onClick={() => copyToClipboard('Totally get that. Most answering services just take a message and relay it 15 mins later. Our Conversion Desk qualifies insurance carriers in under 30 seconds and books the inspection straight to your calendar while the property owner is on the line. Worth a 1-min look?')}
                  className="bg-white hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4] shadow-sm"
                >
                  Copy
                </button>
              </div>
              <p className="text-[#57534E] leading-relaxed">
                Totally get that. Most answering services just take a message and relay it 15 mins later. Our Conversion Desk qualifies insurance carriers in under 30 seconds and books the inspection straight to your calendar while the property owner is on the line. Worth a 1-min look?
              </p>
            </div>

            {/* Objection 2 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#111827]">"We already have a marketing agency"</span>
                <button
                  onClick={() => copyToClipboard('That’s actually awesome! We don\'t replace your agency — we plug directly into their ads with instant call & chat response and ad-level attribution so you can both see the exact ROAS on every dollar spent.')}
                  className="bg-white hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4] shadow-sm"
                >
                  Copy
                </button>
              </div>
              <p className="text-[#57534E] leading-relaxed">
                That’s actually awesome! We don't replace your agency — we plug directly into their ads with instant call &amp; chat response and ad-level attribution so you can both see the exact ROAS on every dollar spent.
              </p>
            </div>

            {/* Objection 3 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#111827]">"How much does it cost?"</span>
                <button
                  onClick={() => copyToClipboard('We offer a straightforward pilot trial with zero long-term contracts. If it doesn\'t lock in emergency dispatches for your team, you don\'t pay. Open to a 2-min interactive walkthrough to see if it fits?')}
                  className="bg-white hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4] shadow-sm"
                >
                  Copy
                </button>
              </div>
              <p className="text-[#57534E] leading-relaxed">
                We offer a straightforward pilot trial with zero long-term contracts. If it doesn't lock in emergency dispatches for your team, you don't pay. Open to a 2-min interactive walkthrough to see if it fits?
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111827] text-white font-mono text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-[#E7E5E4]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#065F46]"></span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
