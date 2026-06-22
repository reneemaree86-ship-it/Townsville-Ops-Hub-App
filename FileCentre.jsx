import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

const STATUS = ["All", "New", "Needs approval", "Responded", "Follow-up needed", "Won", "Lost", "Not suitable", "Ignored"];
const CATEGORIES = ["All", "Hot lead", "Warm lead", "Maybe", "Not suitable"];
const SERVICES = ["All", "Regular weekly cleaning", "Fortnightly cleaning", "One-off house clean", "Deep clean", "Spring clean", "Bathroom deep clean", "Kitchen deep clean", "Hoarder/heavy clean", "Office cleaning", "Commercial cleaning", "Move-in clean", "Pre-sale/property presentation clean", "Rental inspection rescue clean", "Airbnb/short-stay cleaning", "Pressure washing", "Window cleaning", "Decluttering/organisation clean", "Other", "Bond/end-of-lease review"];

const categoryColor = { "Hot lead": "#dc2626", "Warm lead": "#f97316", "Maybe": "#7c3aed", "Not suitable": "#64748b" };
const statusColor = { "New": "#2563eb", "Needs approval": "#e11d48", "Responded": "#16a34a", "Follow-up needed": "#f59e0b", "Won": "#059669", "Lost": "#64748b", "Not suitable": "#475569", "Ignored": "#94a3b8" };

const defaultUrgentReply = `Hi, I saw you're needing a cleaner and I may be able to help. I run Renee's Cleaning Services in Townsville and handle one-off cleans, deep cleans, inspection rescue cleans and regular cleaning.\n\nIf you'd like, send through the suburb, what needs doing, and a couple of photos if possible, and I can give you a clear estimate.\n\nThanks kindly,\nRenee`;
const defaultReply = `Hi, I saw your post looking for a cleaner and thought I'd reach out. I run Renee's Cleaning Services here in Townsville and offer regular, one-off, deep, inspection and office cleaning depending on what you need.\n\nI'm reliable, detail-focused and happy to have a look at what you're needing done. Feel free to send through a few details or photos and I can give you a clear estimate.\n\nThanks kindly,\nRenee\nRenee's Cleaning Services\nhttps://www.reneescleaningservicestsv.com`;

function Stat({ label, value, tone }) {
  const bg = tone === "hot" ? "#fee2e2" : tone === "warn" ? "#fff7ed" : tone === "good" ? "#dcfce7" : "#eef2ff";
  const color = tone === "hot" ? "#991b1b" : tone === "warn" ? "#9a3412" : tone === "good" ? "#166534" : "#3730a3";
  return (
    <div style={{ background: bg, color, borderRadius: 18, padding: 16, border: "1px solid rgba(0,0,0,.04)" }}>
      <div style={{ fontSize: 28, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 800 }}>{label}</div>
    </div>
  );
}

export default function FileCentre() {
  const [leads, setLeads] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveMsg, setApproveMsg] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [service, setService] = useState("All");
  const [platform, setPlatform] = useState("All");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const leadRows = await base44.entities.Lead.list("-created_date", 100);
      setLeads(leadRows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const platforms = useMemo(() => ["All", ...Array.from(new Set(leads.map(l => l.source).filter(Boolean))).sort()], [leads]);

  const filtered = leads.filter(l => {
    const blob = `${l.source || ""} ${l.name || ""} ${l.suburb || ""} ${l.service_needed || ""} ${l.original_post_text || ""}`.toLowerCase();
    return (!search || blob.includes(search.toLowerCase()))
      && (status === "All" || l.status === status)
      && (category === "All" || l.urgency === category)
      && (service === "All" || l.service_needed === service)
      && (platform === "All" || l.source === platform);
  });

  const counts = {
    new: leads.filter(l => l.status === "New").length,
    hot: leads.filter(l => l.urgency === "urgent").length,
    approval: leads.filter(l => l.status === "needs_approval").length,
    followups: leads.filter(l => l.status === "follow_up_due").length,
    won: leads.filter(l => l.status === "won").length,
    ignored: leads.filter(l => ["archived", "not_suitable"].includes(l.status)).length,
  };

  const requestManualScan = async () => {
    setScanLoading(true); setScanMessage("");
    try {
      await base44.entities.LeadScan.create({
        scan_type: "manual",
        status: "running",
        sources_scanned: [],
        leads_found: 0,
        hot_leads_found: 0,
      });
      setScanMessage("✅ Scan requested. Leads will appear here shortly.");
    } catch (e) {
      setScanMessage("❌ Couldn't request scan. Try messaging me directly.");
    } finally { setScanLoading(false); }
  };

  const updateLead = async (lead, patch) => {
    await base44.entities.Lead.update(lead.id, patch);
    if (selected?.id === lead.id) setSelected({ ...lead, ...patch });
    load();
  };

  const approveLead = async (lead) => {
    setApproveLoading(true); setApproveMsg("");
    try {
      const reply = lead.response_draft || (lead.urgency === "urgent" ? defaultUrgentReply : defaultReply);
      const res = await fetch("https://the-smart-cleaning-business-agent-d8cfd18c.base44.app/functions/approveLead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          leadName: lead.name || "Lead",
          suburb: lead.suburb || "Townsville",
          service: lead.service_needed || "",
          estimatedValue: lead.estimated_value || "?",
          reply: reply,
          sourceUrl: lead.source_url || "https://facebook.com",
        })
      });
      const data = await res.json();
      if (data.ok) {
        await updateLead(lead, { status: "applied_responded", response_sent: true, response_approved: true });
        setApproveMsg("✅ Sent to your Telegram! Open it, copy the reply and paste on Facebook.");
        setTimeout(() => { setSelected(null); setApproveMsg(""); }, 3000);
      } else {
        setApproveMsg("⚠️ Telegram not configured yet. Reply copied — paste it manually.");
        await updateLead(lead, { status: "applied_responded" });
      }
    } catch (e) {
      setApproveMsg("⚠️ Could not reach Telegram. Lead marked responded anyway.");
      await updateLead(lead, { status: "applied_responded" });
    } finally { setApproveLoading(false); }
  };

  const denyLead = async (lead) => {
    await updateLead(lead, { status: "archived" });
    setSelected(null);
  };

  const input = { width: "100%", padding: "11px 12px", border: "1px solid #e2e8f0", borderRadius: 12, background: "white", fontSize: 14, boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#fff7fb,#f4f0ff)", padding: "24px 14px", fontFamily: "Inter, Arial, sans-serif", color: "#0f172a" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#e85ca8,#7c3aed)", color: "white", borderRadius: 28, padding: 24, boxShadow: "0 18px 45px rgba(124,58,237,.22)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: "0 0 6px", fontSize: 30 }}>🎯 AI Lead Finder</h1>
              <div style={{ opacity: .94 }}>Renee's Cleaning Services • Townsville lead hunting, scoring & reply drafting</div>
              <div style={{ marginTop: 10, fontSize: 13, background: "rgba(255,255,255,.16)", display: "inline-block", padding: "7px 12px", borderRadius: 999 }}>
                Daily scan: {settings?.daily_scan_time || "06:00"} AEST • Approval required before replies
              </div>
            </div>
            <button onClick={requestManualScan} disabled={scanLoading} style={{ border: 0, borderRadius: 16, padding: "13px 20px", background: "white", color: "#7c3aed", fontWeight: 900, fontSize: 15, cursor: scanLoading ? "wait" : "pointer", boxShadow: "0 8px 20px rgba(0,0,0,.12)" }}>
              {scanLoading ? "Requesting…" : "🔍 Find leads now"}
            </button>
          </div>
          {scanMessage && <div style={{ marginTop: 12, background: "rgba(255,255,255,.18)", padding: "10px 14px", borderRadius: 12 }}>{scanMessage}</div>}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginTop: 16 }}>
          <Stat label="New leads" value={counts.new} />
          <Stat label="Hot leads" value={counts.hot} tone="hot" />
          <Stat label="Need approval" value={counts.approval} tone="warn" />
          <Stat label="Follow-ups due" value={counts.followups} tone="warn" />
          <Stat label="Won jobs" value={counts.won} tone="good" />
          <Stat label="Ignored" value={counts.ignored} />
        </div>

        {/* Filters */}
        <div style={{ background: "white", borderRadius: 22, padding: 16, marginTop: 16, boxShadow: "0 8px 24px rgba(15,23,42,.07)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10 }}>
            <input style={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suburb, service, post text…" />
            <select style={input} value={platform} onChange={e => setPlatform(e.target.value)}>{platforms.map(x => <option key={x}>{x}</option>)}</select>
            <select style={input} value={service} onChange={e => setService(e.target.value)}>{SERVICES.map(x => <option key={x}>{x}</option>)}</select>
            <select style={input} value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(x => <option key={x}>{x}</option>)}</select>
            <select style={input} value={status} onChange={e => setStatus(e.target.value)}>{STATUS.map(x => <option key={x}>{x}</option>)}</select>
          </div>
        </div>

        {/* Lead list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 50, color: "#64748b", fontSize: 18 }}>Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: 22, padding: 40, marginTop: 16, textAlign: "center", color: "#64748b", boxShadow: "0 8px 24px rgba(15,23,42,.07)" }}>
            No leads yet. Hit <strong>Find leads now</strong> or wait for the 6:00am scan.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {filtered.map(l => (
              <div key={l.id} onClick={() => { setSelected(l); setApproveMsg(""); }} style={{ background: "white", borderRadius: 20, padding: 16, cursor: "pointer", borderLeft: `6px solid ${categoryColor[l.urgency] || "#94a3b8"}`, boxShadow: "0 4px 16px rgba(15,23,42,.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 17, fontWeight: 900 }}>{l.name || "Public lead"}{l.suburb ? ` — ${l.suburb}` : ""}</div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{l.source || "Unknown"} • {l.service_needed || "Service TBC"} • {l.created_date?.slice(0,10) || "today"}</div>
                    <div style={{ marginTop: 8, color: "#334155", lineHeight: 1.5 }}>{(l.original_post_text || "").slice(0, 200)}{(l.original_post_text || "").length > 200 ? "…" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 130 }}>
                    <div style={{ fontSize: 26, fontWeight: 950, color: categoryColor[l.urgency] || "#334155" }}>{l.score || 0}/100</div>
                    <span style={{ display: "inline-block", background: categoryColor[l.urgency] || "#64748b", color: "white", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800 }}>{l.urgency || "Unscored"}</span><br />
                    <span style={{ display: "inline-block", marginTop: 5, background: statusColor[l.status] || "#64748b", color: "white", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800 }}>{l.status || "New"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lead detail modal */}
        {selected && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, padding: 16 }} onClick={() => setSelected(null)}>
            <div style={{ background: "white", width: "min(780px,100%)", maxHeight: "92vh", overflow: "auto", borderRadius: 26, padding: 24 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <h2 style={{ margin: 0 }}>{selected.name || "Lead"}</h2>
                <button onClick={() => setSelected(null)} style={{ border: 0, background: "#f1f5f9", borderRadius: 999, width: 36, height: 36, cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
              <p style={{ color: "#64748b", marginTop: 6 }}>{selected.source} • {selected.suburb} • {selected.service_needed}</p>

              <div style={{ background: "#f8fafc", borderRadius: 16, padding: 14, whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 8 }}>{selected.original_post_text || "No post text."}</div>

              <h3 style={{ marginTop: 20 }}>Your reply</h3>
              <textarea
                defaultValue={selected.response_draft || (selected.urgency === "urgent" ? defaultUrgentReply : defaultReply)}
                style={{ ...input, minHeight: 180, whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                id="reply-textarea"
              />

              {/* APPROVE / DENY */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 20 }}>
                <button
                  onClick={() => approveLead(selected)}
                  disabled={approveLoading}
                  style={{ border: 0, borderRadius: 18, padding: "20px 10px", background: approveLoading ? "#86efac" : "linear-gradient(135deg,#16a34a,#15803d)", color: "white", fontSize: 20, fontWeight: 900, cursor: approveLoading ? "wait" : "pointer", boxShadow: "0 6px 20px rgba(22,163,74,.35)" }}
                >
                  {approveLoading ? "Sending…" : "✅ APPROVE"}
                  <div style={{ fontSize: 12, marginTop: 5, opacity: .85, fontWeight: 600 }}>Sends reply to Telegram</div>
                </button>
                <button
                  onClick={() => denyLead(selected)}
                  style={{ border: 0, borderRadius: 18, padding: "20px 10px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "white", fontSize: 20, fontWeight: 900, cursor: "pointer", boxShadow: "0 6px 20px rgba(220,38,38,.3)" }}
                >
                  ❌ DENY
                  <div style={{ fontSize: 12, marginTop: 5, opacity: .85, fontWeight: 600 }}>Dismiss this lead</div>
                </button>
              </div>

              {approveMsg && (
                <div style={{ marginTop: 14, background: approveMsg.startsWith("✅") ? "#dcfce7" : "#fff7ed", border: `1px solid ${approveMsg.startsWith("✅") ? "#86efac" : "#fed7aa"}`, color: approveMsg.startsWith("✅") ? "#166534" : "#9a3412", borderRadius: 14, padding: 14, fontWeight: 700, fontSize: 15 }}>
                  {approveMsg}
                </div>
              )}

              {selected.source_url && (
                <a href={selected.source_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 16, color: "#7c3aed", fontWeight: 800, fontSize: 15 }}>
                  👉 Open original Facebook post
                </a>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}