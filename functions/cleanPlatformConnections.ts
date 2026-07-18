import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// One-time cleanup function:
// 1. Deletes duplicate PlatformConnection records (keep newest per platform)
// 2. Corrects statuses so only real errors count as "needs connection"
// 3. Updates Google Search Console to 'connected' (OAuth is authorised)

const OPTIONAL_PLATFORMS = [
  'Google Ads', 'Facebook Ads', 'Instagram',
  'Google Business Profile', 'Semrush', 'Townsville Noticeboard'
];

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const all = await base44.asServiceRole.entities.PlatformConnection.list();

    const deleted: string[] = [];
    const updated: string[] = [];

    // --- Step 1: Deduplicate — keep newest per platform_name ---
    const byPlatform: Record<string, any[]> = {};
    for (const rec of all) {
      const key = rec.platform_name;
      if (!byPlatform[key]) byPlatform[key] = [];
      byPlatform[key].push(rec);
    }

    for (const [platform, records] of Object.entries(byPlatform)) {
      if (records.length <= 1) continue;
      // Sort newest first by created_date
      records.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      // Delete all but the first (newest)
      for (const dupe of records.slice(1)) {
        try {
          await base44.asServiceRole.entities.PlatformConnection.delete(dupe.id);
          deleted.push(`${platform} (${dupe.id})`);
        } catch (e: any) {
          console.error(`[cleanup] Failed to delete ${dupe.id}:`, e.message);
        }
      }
    }

    // --- Step 2: Fix statuses on surviving records ---
    const remaining = await base44.asServiceRole.entities.PlatformConnection.list();

    for (const rec of remaining) {
      let newStatus = rec.connection_status;
      let newNotes = rec.notes;

      // Mark optional/not-yet-purchased platforms clearly
      if (OPTIONAL_PLATFORMS.includes(rec.platform_name) && rec.connection_status === 'requires_authorised_connection') {
        newStatus = 'not_configured';
        newNotes = `Optional platform — not yet connected. ${rec.notes || ''}`.trim();
      }

      // Google Search Console — OAuth is authorised via Base44 connector
      if (rec.platform_name === 'Google Search Console') {
        newStatus = 'connected';
        newNotes = 'Connected via Google OAuth. Reads organic search performance data.';
      }

      // Gmail — connected
      if (rec.platform_name === 'Gmail') {
        newStatus = 'connected';
        newNotes = 'Connected via Gmail OAuth. Sends quotes, invoices, and lead replies.';
      }

      // Gumtree / Airtasker — working via direct HTTP scan
      if (rec.platform_name === 'Gumtree') {
        newStatus = 'manual_monitoring_only';
        newNotes = 'No public API. Scanned directly via HTTP — active and working.';
      }
      if (rec.platform_name === 'Airtasker') {
        newStatus = 'manual_monitoring_only';
        newNotes = 'Platform terms prevent automation. Monitored via direct HTTP scan where possible.';
      }

      // Facebook — keep connected if already connected
      if (rec.platform_name === 'Facebook' && rec.connection_status === 'connected') {
        newStatus = 'connected';
      }

      if (newStatus !== rec.connection_status || newNotes !== rec.notes) {
        try {
          await base44.asServiceRole.entities.PlatformConnection.update(rec.id, {
            connection_status: newStatus,
            notes: newNotes,
            last_checked: new Date().toISOString(),
          });
          updated.push(`${rec.platform_name}: ${rec.connection_status} → ${newStatus}`);
        } catch (e: any) {
          console.error(`[cleanup] Failed to update ${rec.id}:`, e.message);
        }
      }
    }

    return Response.json({
      success: true,
      deleted_count: deleted.length,
      deleted,
      updated_count: updated.length,
      updated,
    }, { headers: cors });

  } catch (e: any) {
    return Response.json({ error: String(e) }, { status: 500, headers: cors });
  }
});
