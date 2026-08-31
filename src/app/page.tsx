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
    } else if (updates.status === 'to_contact') {
      fullUpdates.last_contacted_at = null;
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

      if (st !== 'to_contact' && l.last_contacted_at && l.last_contacted_at.startsWith(todayStr)) {
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
        r.rep === 'mahadi' || r.rep === 'partner_a' ? 'Mahadi' : r.rep === 'shivangi' || r.rep === 'partner_b' ? 'Shivangi' : 'Unassigned',
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
            <option value="mahadi">Mahadi</option>
            <option value="shivangi">Shivangi</option>
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
                            <option value="mahadi">Mahadi</option>
                            <option value="shivangi">Shivangi</option>
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
                      const repLabel = r.rep === 'mahadi' || r.rep === 'partner_a' ? 'Mahadi' : r.rep === 'shivangi' || r.rep === 'partner_b' ? 'Shivangi' : 'Unassigned';

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
                        const repBadge = act.rep_name === 'mahadi' || act.rep_name === 'partner_a' ? 'Mahadi' : act.rep_name === 'shivangi' || act.rep_name === 'partner_b' ? 'Shivangi' : 'System';

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

      {/* Comprehensive Conversion Desk Q&A & Playbook Drawer */}
      {drawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[680px] bg-[#F9F9F7] border-l border-[#E7E5E4] shadow-2xl p-6 flex flex-col custom-scrollbar overflow-y-auto space-y-6 text-[#111827]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-4 sticky top-0 bg-[#F9F9F7] z-10">
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 font-mono text-[10px] text-[#065F46] font-bold">
                LIVE PLAYBOOK
              </div>
              <h3 className="text-base font-bold text-[#111827]">Conversion Desk — Q&amp;A Sheet</h3>
              <p className="text-[11px] font-mono text-[#57534E]">For live use in DMs and calls with restoration prospects</p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-[#78716C] hover:text-[#111827] text-xs font-mono px-2.5 py-1.5 rounded border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] shadow-sm transition-all"
            >
              Close
            </button>
          </div>

          {/* Core Rules Warning Card */}
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 space-y-2.5 text-xs">
            <div className="font-mono font-bold text-red-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>Read This First — 3 Rules That Don't Bend</span>
            </div>
            <ul className="space-y-2 text-red-950/90 leading-relaxed font-sans text-xs">
              <li><strong>1. Never invent proof.</strong> We have no case studies, testimonials, or published results. Do not say "we've helped X companies," quote unmeasured results, or name a client. If asked for proof we don't have, answer honestly with the script below.</li>
              <li><strong>2. Never promise outbound calling.</strong> We do not call people back. Answering inbound calls is legally straightforward; placing automated AI calls to consumers carries massive penalties. If asked: <em>"A person on your team does that — we hand you the lead within seconds so they can."</em></li>
              <li><strong>3. Only sell to businesses already running ads.</strong> If they aren't spending on paid traffic, the entire pitch is void — there are no clicks to convert, they'll see nothing in month one, and they'll cancel. Politely disqualify.</li>
            </ul>
          </div>

          {/* Confirm Before Using Notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 text-xs">
            <div className="font-mono font-bold text-amber-800 uppercase tracking-wider text-[11px]">
              Confirm Before Using — Not Yet Locked
            </div>
            <p className="text-amber-950/90 leading-relaxed text-xs">
              Check before quoting: $250 paid pilot credit against build fee, founding-client offer (waived build, $149/mo locked 12 mo, first 5 clients), 30-day money-back guarantee, live phone number availability, and <strong>whether page captures GCLID & fires conversion events yet</strong>. If unconfirmed, don't mention it. Silence is recoverable; a walked-back promise isn't.
            </p>
          </div>

          {/* Section: The Product */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-[#065F46] uppercase tracking-wider border-b border-[#E7E5E4] pb-1">
              The Product
            </h4>

            {/* Q1 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"What is this exactly?"</span>
                <button
                  onClick={() => copyToClipboard("One page, built for a phone, that your ads point to instead of your homepage. Right at the top, a button to call. Underneath it, a conversation that's already open — answering questions about your business and getting the caller's name and number before they wander off. There's also a backstop on your phone line: if a call comes in and nobody gets to it, we pick it up instead of voicemail and send you the details. And every lead that comes through, chat or call, comes back tagged with the exact ad and keyword that produced it.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                One page, built for a phone, that your ads point to instead of your homepage. Right at the top, a button to call. Underneath it, a conversation that's already open — answering questions about your business and getting the caller's name and number before they wander off. There's also a backstop on your phone line: if a call comes in and nobody gets to it, we pick it up instead of voicemail and send you the details. And every lead that comes through, chat or call, comes back tagged with the exact ad and keyword that produced it.
              </p>
            </div>

            {/* Q2 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Is this a website? Do I have to replace mine?"</span>
                <button
                  onClick={() => copyToClipboard("No — your website stays exactly as it is. This is a separate page that only your paid traffic ever sees. Nothing about what you've already got gets touched.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                No — your website stays exactly as it is. This is a separate page that only your paid traffic ever sees. Nothing about what you've already got gets touched.
              </p>
            </div>

            {/* Q3 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"So it's a chatbot."</span>
                <button
                  onClick={() => copyToClipboard("Three things, and the conversation's only one of them. Second: the calls your crew misses stop going to voicemail. It still rings your line first, same as today, and only if nobody gets to it do we pick it up, get the address and what happened, and send it straight to you. Third — and this is the one people miss — every lead comes back with the exact ad that produced it attached, and that feeds into your Google Ads account so your campaigns keep learning. A chatbot's a box on a website. It has no idea what you paid for that visitor, and no way to tell Google any of it worked.\n\nIf a box on a website is genuinely all you want, go get one for $19 — really, do that. This is for someone spending real money on clicks.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Three things, and the conversation's only one of them. Second: the calls your crew misses stop going to voicemail. It still rings your line first, same as today, and only if nobody gets to it do we pick it up, get the address and what happened, and send it straight to you. Third — and this is the one people miss — every lead comes back with the exact ad that produced it attached, and that feeds into your Google Ads account so your campaigns keep learning. A chatbot's a box on a website. It has no idea what you paid for that visitor, and no way to tell Google any of it worked.
              </p>
              <p className="text-[11px] text-[#78716C] italic">
                If a box on a website is genuinely all you want, go get one for $19 — really, do that. This is for someone spending real money on clicks.
              </p>
            </div>

            {/* Q4 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Who's answering the phone?"</span>
                <button
                  onClick={() => copyToClipboard("Your people are, same as today. The call rings your line first, exactly like it does now — nothing changes for the ones you catch. It's only when nobody picks up, after hours, mid-job, two calls at once during a storm, that it rolls to us instead of voicemail. We find out what happened and where, and get it to you.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Your people are, same as today. The call rings your line first, exactly like it does now — nothing changes for the ones you catch. It's only when nobody picks up, after hours, mid-job, two calls at once during a storm, that it rolls to us instead of voicemail. We find out what happened and where, and get it to you.
              </p>
              <p className="text-[11px] text-[#065F46] font-mono">
                *Say it in that order.* "We answer your phone" sounds like a threat to an owner. "We catch the ones you'd have lost" doesn't.
              </p>
            </div>

            {/* Q5 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"I don't want a machine talking to my customers."</span>
                <button
                  onClick={() => copyToClipboard("Fair, and that's not really what's happening here. Every call you'd normally pick up, you still pick up. The only ones that ever reach us are the ones that were headed to voicemail anyway — so the honest comparison isn't us against your guy. It's us against nothing.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Fair, and that's not really what's happening here. Every call you'd normally pick up, you still pick up. The only ones that ever reach us are the ones that were headed to voicemail anyway — so the honest comparison isn't us against your guy. It's us against nothing.
              </p>
            </div>

            {/* Q6 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Will my customers know?"</span>
                <button
                  onClick={() => copyToClipboard("If they ask, yes — it'll tell them. Most people mid-emergency aren't asking, though; they just want someone to take it down and get a truck moving. It's not pretending to be human, and it doesn't need to.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                If they ask, yes — it'll tell them. Most people mid-emergency aren't asking, though; they just want someone to take it down and get a truck moving. It's not pretending to be human, and it doesn't need to.
              </p>
            </div>

            {/* Q7 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"What if it can't answer something?"</span>
                <button
                  onClick={() => copyToClipboard("It takes the name, the number, and the situation, and hands the whole thing to you instead of guessing. It's built to capture, not to quote — it will never throw out a price or commit you to anything.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                It takes the name, the number, and the situation, and hands the whole thing to you instead of guessing. It's built to capture, not to quote — it will never throw out a price or commit you to anything.
              </p>
            </div>

            {/* Q8 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"How do I get the lead?"</span>
                <button
                  onClick={() => copyToClipboard("A message with their name, number, and what they said — usually within seconds of them sending it. Email and push, at launch.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                A message with their name, number, and what they said — usually within seconds of them sending it. Email and push, at launch.
              </p>
              <p className="text-[11px] text-[#78716C] italic">
                If asked about SMS specifically: not in the first version — business texting has a registration requirement we'd set up separately.
              </p>
            </div>

            {/* Q9 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Can it book the job on my calendar?"</span>
                <button
                  onClick={() => copyToClipboard("Not in this version. It captures and hands off; your person makes the call from there.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Not in this version. It captures and hands off; your person makes the call from there. <em>Say this plainly — do not imply booking.</em>
              </p>
            </div>

            {/* Q10 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Does it work with my existing phone number?"</span>
                <button
                  onClick={() => copyToClipboard("Yes — your number stays exactly what it is. Calls only forward to us when nobody picks up, or after hours, or whatever rule actually makes sense for you.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Yes — your number stays exactly what it is. Calls only forward to us when nobody picks up, or after hours, or whatever rule actually makes sense for you.
              </p>
            </div>

            {/* Q11 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Does it integrate with [Encircle / DASH / Xactimate / CRM]?"</span>
                <button
                  onClick={() => copyToClipboard("Let me check what that one actually supports instead of guessing — I'll get back to you today.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                <strong>Don't answer this from memory.</strong> Say: <em>"Let me check what that one actually supports instead of guessing — I'll get back to you today."</em> Then actually check.
              </p>
            </div>

            {/* Q12 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Spanish?"</span>
                <button
                  onClick={() => copyToClipboard("Let me check our active Spanish model routing for your market and get right back to you today.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Check before answering. Don't assume.
              </p>
            </div>

            {/* Q13 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"I already have a landing page."</span>
                <button
                  onClick={() => copyToClipboard("Good — then you already believe in the idea, which saves us a step. Real question is whether anything's actually answering on it at 11pm on a Sunday, and whether you ever find out about the visitor who looked and didn't call. If your page already does that, you don't need us.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Good — then you already believe in the idea, which saves us a step. Real question is whether anything's actually answering on it at 11pm on a Sunday, and whether you ever find out about the visitor who looked and didn't call. If your page already does that, you don't need us.
              </p>
            </div>
          </div>

          {/* Section: Conversion Tracking */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-[#065F46] uppercase tracking-wider border-b border-[#E7E5E4] pb-1">
              Conversion Tracking
            </h4>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-900 leading-relaxed">
              <strong>Crucial Rule:</strong> If tracking isn't live & tested on an account, say <em>"Let me confirm exactly how that's wired for your account and come back to you."</em> Overclaiming here costs the client three weeks in when their agency asks why conversions dropped.
            </div>

            {/* T1 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Will this break my conversion tracking?"</span>
                <button
                  onClick={() => copyToClipboard("The most important question on this page — and the one your agency's going to ask on your behalf, whether you ask it yourself or not. Moving your traffic to a new page means the tracking has to move with it. That's a real step, not a footnote — but it's ours to handle, not yours to think about. Pretending otherwise is exactly how this goes sideways, so we don't.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                The most important question on this page — and the one their agency's going to ask on their behalf, whether they ask it themselves or not. Moving your traffic to a new page means the tracking has to move with it. That's a real step, not a footnote — but it's ours to handle, not yours to think about. Pretending otherwise is exactly how this goes sideways, so we don't.
              </p>
            </div>

            {/* T2 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"How will I know if it's working?"</span>
                <button
                  onClick={() => copyToClipboard("Every lead comes back attached to the click that produced it. The moment someone taps your ad, Google stamps that click with an ID — we hold onto it and store it right alongside the lead. So what lands in your inbox isn't just a name and a number. It's a name, a number, and the exact ad and keyword that brought them to you.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Every lead comes back attached to the click that produced it. The moment someone taps your ad, Google stamps that click with an ID — we hold onto it and store it right alongside the lead. So what lands in your inbox isn't just a name and a number. It's a name, a number, and the exact ad and keyword that brought them to you.
              </p>
            </div>

            {/* T3 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Will my conversions still show up in Google Ads?"</span>
                <button
                  onClick={() => copyToClipboard("Yes — that's the whole point of holding onto the click ID. Every captured lead gets sent back into your Google Ads account as a conversion, so your bidding keeps learning from real results. Skip that step and your campaigns don't just stall. They get worse over time.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Yes — that's the whole point of holding onto the click ID. Every captured lead gets sent back into your Google Ads account as a conversion, so your bidding keeps learning from real results. Skip that step and your campaigns don't just stall. They get worse over time.
              </p>
              <p className="text-[11px] text-[#78716C]">
                <em>Technical reference (if agency asks):</em> GCLID captured on landing & stored with lead, conversion events on page for chat/call taps, Google call reporting, returned via Google Data Manager.
              </p>
            </div>

            {/* T4 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Can you tell me which leads actually became jobs?"</span>
                <button
                  onClick={() => copyToClipboard("Only if you tell us. We capture the lead and the click that brought it in — whether it turned into a signed job lives on your end. But if you're willing to mark off which ones closed, that flows back to Google as a stronger signal, and your ad spend gets sharper because of it.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Only if you tell us. We capture the lead and the click that brought it in — whether it turned into a signed job lives on your end. But if you're willing to mark off which ones closed, that flows back to Google as a stronger signal, and your ad spend gets sharper because of it.
              </p>
            </div>

            {/* T5 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"My agency runs my ads. Will they have a problem?"</span>
                <button
                  onClick={() => copyToClipboard("Best move is to get ahead of it rather than dodge it — happy to jump on a call with them directly and walk through exactly how the tracking's set up before anything goes live. Most agencies come around fast once they see it reports conversions properly, because it's really their numbers looking better too.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Best move is to get ahead of it rather than dodge it — happy to jump on a call with them directly and walk through exactly how the tracking's set up before anything goes live. Most agencies come around fast once they see it reports conversions properly, because it's really their numbers looking better too.
              </p>
            </div>

            {/* T6 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Will a different number mess up my Google listing?"</span>
                <button
                  onClick={() => copyToClipboard("Fair question, and usually one that comes from getting burned before. Here's exactly how ours works: your real number is what's actually on the page. If we turn on Google's own call reporting, Google swaps in a forwarding number just for visitors who arrived through your ad — everyone else, every search engine, still sees your real number. Your Google Business Profile, your directory listings — none of that changes. It's Google's own free feature, not some third-party tracking number.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Fair question, and usually one that comes from getting burned before. Here's exactly how ours works: your real number is what's actually on the page. If we turn on Google's own call reporting, Google swaps in a forwarding number just for visitors who arrived through your ad — everyone else, every search engine, still sees your real number. Your Google Business Profile, your directory listings — none of that changes. It's Google's own free feature, not some third-party tracking number.
              </p>
            </div>
          </div>

          {/* Section: Pricing */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-[#065F46] uppercase tracking-wider border-b border-[#E7E5E4] pb-1">
              Pricing &amp; Plans
            </h4>

            {/* Table */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white overflow-hidden text-xs shadow-sm font-mono">
              <table className="w-full text-left">
                <thead className="bg-[#F5F5F4] border-b border-[#E7E5E4] text-[#57534E]">
                  <tr>
                    <th className="p-2.5">Plan</th>
                    <th className="p-2.5">Build Fee</th>
                    <th className="p-2.5">Monthly</th>
                    <th className="p-2.5">Minutes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4]">
                  <tr>
                    <td className="p-2.5 font-bold text-[#111827]">Desk (page + chat, no phone)</td>
                    <td className="p-2.5">$997</td>
                    <td className="p-2.5">$199</td>
                    <td className="p-2.5 text-[#78716C]">—</td>
                  </tr>
                  <tr className="bg-[#ECFDF5]/40 font-semibold">
                    <td className="p-2.5 text-[#065F46]">Desk + Answer (Full System)</td>
                    <td className="p-2.5">$1,497</td>
                    <td className="p-2.5">$399</td>
                    <td className="p-2.5">300 mins</td>
                  </tr>
                </tbody>
              </table>
              <div className="p-2.5 bg-[#F5F5F4] text-[11px] text-[#57534E] border-t border-[#E7E5E4]">
                Overage: $0.55/min on Desk + Answer. Capped at 2x monthly fee (bill can't run away in storm month).
              </div>
            </div>

            {/* P1 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Why is there a setup fee?"</span>
                <button
                  onClick={() => copyToClipboard("Because there's real work that happens before any of this goes live — the page itself, copy written for your specific services and area, the call flow, testing it against scenarios that actually come up. A landing page alone from an agency runs $1,500 to $5,000, and that one doesn't even answer the phone.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Because there's real work that happens before any of this goes live — the page itself, copy written for your specific services and area, the call flow, testing it against scenarios that actually come up. A landing page alone from an agency runs $1,500 to $5,000, and that one doesn't even answer the phone.
              </p>
            </div>

            {/* P2 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Why is this more than [Rosie / Chatbase / $49 tool]?"</span>
                <button
                  onClick={() => copyToClipboard("Different category, not a markup. Those are tools you configure yourself, and each one does a single piece — chat, or phone, never both. None of them is the actual page your ad lands on, and none of them can tie a lead back to the click that paid for it, because they don't own the page and never see the ad data in the first place.\n\nThe comparison that actually matters isn't against a $49 widget anyway. It's against what you're already paying per click.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Different category, not a markup. Those are tools you configure yourself, and each one does a single piece — chat, or phone, never both. None of them is the actual page your ad lands on, and none of them can tie a lead back to the click that paid for it, because they don't own the page and never see the ad data in the first place. The comparison that actually matters isn't against a $49 widget anyway. It's against what you're already paying per click.
              </p>
            </div>

            {/* P3 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Do I still need my answering service?"</span>
                <button
                  onClick={() => copyToClipboard("We're a backstop on the calls that get missed, not a front desk. If your service is dispatching crews and dealing with adjusters, keep it — that's not what we do. If it's mostly taking messages on calls your own people never got to, that's the same job we're doing. Worth figuring out which one's true before deciding anything.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                We're a backstop on the calls that get missed, not a front desk. If your service is dispatching crews and dealing with adjusters, keep it — that's not what we do. If it's mostly taking messages on calls your own people never got to, that's the same job we're doing. Worth figuring out which one's true before deciding anything.
              </p>
            </div>

            {/* P4 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Is there a contract?"</span>
                <button
                  onClick={() => copyToClipboard("Month to month — cancel whenever you want.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Month to month — cancel whenever you want. (The bigger platforms in this space run annual auto-renew contracts — worth mentioning if they've been burned before).
              </p>
            </div>
          </div>

          {/* Section: Trust — The Hard Ones */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-[#065F46] uppercase tracking-wider border-b border-[#E7E5E4] pb-1">
              Trust — The Hard Ones
            </h4>

            {/* TR1 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"How long have you been doing this?"</span>
                <button
                  onClick={() => copyToClipboard("We're new — you'd be one of the first, and that's exactly why the offer looks the way it does.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Straight answer, no hedging: <em>"We're new — you'd be one of the first, and that's exactly why the offer looks the way it does."</em> Then move to the demo. <strong>Do not perform confidence you don't have; contractors detect it instantly.</strong>
              </p>
            </div>

            {/* TR2 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Who else have you done this for?"</span>
                <button
                  onClick={() => copyToClipboard("Nobody in your market yet — and I'm not going to invent a list to make you feel better about that. What I can do instead is show you the thing working right now, and build a version with your name on it before you pay a cent, so you're deciding on something real instead of a promise.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                <em>"Nobody in your market yet — and I'm not going to invent a list to make you feel better about that. What I can do instead is show you the thing working right now, and build a version with your name on it before you pay a cent, so you're deciding on something real instead of a promise."</em>
              </p>
              <p className="text-[11px] text-[#065F46] font-mono">
                That answer converts better than a vague dodge. The offer to build first is the whole play.
              </p>
            </div>

            {/* TR3 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"What if it says something wrong to a customer?"</span>
                <button
                  onClick={() => copyToClipboard("It's built to take details, not to hand out quotes, commitments, or advice. Worst realistic failure is it captures a lead a little awkwardly, and you call them back to smooth it over. It can't price a job. It can't promise a crew.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                It's built to take details, not to hand out quotes, commitments, or advice. Worst realistic failure is it captures a lead a little awkwardly, and you call them back to smooth it over. It can't price a job. It can't promise a crew.
              </p>
            </div>
          </div>

          {/* Section: Legal */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-[#065F46] uppercase tracking-wider border-b border-[#E7E5E4] pb-1">
              Legal &amp; Compliance
            </h4>

            {/* L1 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Is this even legal?"</span>
                <button
                  onClick={() => copyToClipboard("Yes — for answering your own phone, this is squarely legal. The rules people are actually worried about, robocall law, govern calls a business places, not calls it answers. We only ever answer.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Yes — for answering your own phone, this is squarely legal. The rules people are actually worried about, robocall law, govern calls a business <em>places</em>, not calls it answers. We only ever answer.
              </p>
            </div>

            {/* L2 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Can it call people back for me?"</span>
                <button
                  onClick={() => copyToClipboard("No, and we won't build it. Calling consumers with an automated voice carries penalties that stack up per call — not a risk worth either of us taking. Your person makes that call. We just make sure they've got the lead in hand within seconds of it coming in.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                No, and we won't build it. Calling consumers with an automated voice carries penalties that stack up per call — not a risk worth either of us taking. Your person makes that call. We just make sure they've got the lead in hand within seconds of it coming in.
              </p>
            </div>
          </div>

          {/* Section: Operations */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-[#065F46] uppercase tracking-wider border-b border-[#E7E5E4] pb-1">
              Operations &amp; Setup
            </h4>

            {/* O1 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"What do you need from me?"</span>
                <button
                  onClick={() => copyToClipboard("Your services, your service area, your hours, how you want emergency versus non-emergency calls handled, and the number to forward from. That's the whole intake conversation — and it's short.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Your services, your service area, your hours, how you want emergency versus non-emergency calls handled, and the number to forward from. That's the whole intake conversation — and it's short.
              </p>
            </div>

            {/* O2 */}
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">"Do I have to change my ads?"</span>
                <button
                  onClick={() => copyToClipboard("One change, and it's small: point the ad at the new page instead of your homepage. That's the whole thing. Nothing about your campaigns or your budget changes.")}
                  className="bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#111827] px-2 py-1 rounded text-[10px] font-mono border border-[#E7E5E4]"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                One change, and it's small: point the ad at the new page instead of your homepage. That's the whole thing. Nothing about your campaigns or your budget changes.
              </p>
            </div>
          </div>

          {/* Section: 7 Qualifying Questions */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-[#065F46] uppercase tracking-wider border-b border-[#E7E5E4] pb-1">
              Qualify Them — Ask These Early
            </h4>
            <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 space-y-3 text-xs shadow-sm">
              <div className="space-y-1 border-b border-[#E7E5E4] pb-2">
                <div className="font-bold text-[#111827]">1. Are you running paid ads right now?</div>
                <div className="text-[#57534E]">If no → disqualify politely. No traffic, no product.</div>
              </div>
              <div className="space-y-1 border-b border-[#E7E5E4] pb-2">
                <div className="font-bold text-[#111827]">2. Where do those ads point?</div>
                <div className="text-[#57534E]">Homepage = perfect fit. Existing dedicated page = harder sell, dig into whether anything answers on it.</div>
              </div>
              <div className="space-y-1 border-b border-[#E7E5E4] pb-2">
                <div className="font-bold text-[#111827]">3. What happens to a call at 11pm?</div>
                <div className="text-[#57534E]">Voicemail = the whole pitch. Existing answering service = ask what it costs and what they actually do.</div>
              </div>
              <div className="space-y-1 border-b border-[#E7E5E4] pb-2">
                <div className="font-bold text-[#111827]">4. Who picks up the phone during the day?</div>
                <div className="text-[#57534E]">Owner-operator answering from a job site is the strongest buyer in this segment.</div>
              </div>
              <div className="space-y-1 border-b border-[#E7E5E4] pb-2">
                <div className="font-bold text-[#111827]">5. Roughly what's the average job worth?</div>
                <div className="text-[#57534E]">Not to price them — to let them do the math themselves out loud. That math is the close.</div>
              </div>
              <div className="space-y-1 border-b border-[#E7E5E4] pb-2">
                <div className="font-bold text-[#111827]">6. Who manages your ads — you or an agency?</div>
                <div className="text-[#57534E]">Determines whether there's a second stakeholder to bring in, and who you'll be coordinating tracking setup with.</div>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-[#111827]">7. Do you currently know which ads produce your jobs?</div>
                <div className="text-[#57534E]">If no or "not really," that's a second thing you're fixing and worth naming.</div>
              </div>
            </div>
          </div>

          {/* Section: What NOT to Say */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-2 text-xs">
            <div className="font-mono font-bold text-red-800 uppercase tracking-wider text-[11px]">
              What NOT to Say (Hard Guardrails)
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-red-950/90 leading-relaxed text-xs">
              <li>Any number about results, conversion lift, or leads recovered. We haven't measured any.</li>
              <li>Any client name or "a company like yours."</li>
              <li>"It books appointments." It doesn't.</li>
              <li>"It calls them back." It doesn't and won't.</li>
              <li>"Guaranteed" anything, unless approved and you can state exact terms.</li>
              <li>Any tracking claim that hasn't been built &amp; tested in a real ad account.</li>
              <li>Anything about our own scale, team size, or how many clients we run.</li>
            </ul>
            <p className="text-[11px] text-red-900 italic pt-1 border-t border-red-200">
              When you don't know: <strong>"I don't want to guess on that — let me check and come back to you today."</strong> Then do it.
            </p>
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
