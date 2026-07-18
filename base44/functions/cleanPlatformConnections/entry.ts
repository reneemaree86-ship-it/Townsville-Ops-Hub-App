import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403, headers: cors });
    }

    const all = await base44.asServiceRole.entities.PlatformConnection.list();

    const deleted = [];
    const updated = [];

    const byPlatform = {};
    for (const rec of all) {
      const key = rec.platform_name;
      if (!byPlatform[key]) byPlatform[key] = [];
      byPlatform[key].push(rec);
    }

    for (const [platform, records] of Object.entries(byPlatform)) {
      if (records.length <= 1) continue;
      records.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      for (const dupe of records.slice(1)) {
        try {
          await base44.asServiceRole.entities.PlatformConnection.delete(dupe.id);
          deleted.push(`${platform} (${dupe.id})`);
        } catch (e) {
          console.error(`Failed to delete ${dupe.id}:`, e.message);
        }
      }
    }

    const remaining = await base44.asServiceRole.entities.PlatformConnection.list();

    for (const rec of remaining) {
      let newStatus = rec.connection_status;
      let newNotes = rec.notes;

      if (OPTIONAL_PLATFORMS.includes(rec.platform_name) && rec.connection_status === 'requires_authorised_connection') {
        newStatus = 'not_configured';
        newNotes = `Optional — not yet set up. ${rec.notes || ''}`.trim();
      }
      if (rec.platform_name === 'Google Search Console') {
        newStatus = 'connected'; newNotes = 'Connected via Google OAuth.';
      }
      if (rec.platform_name === 'Gmail') {
        newStatus = 'connected'; newNotes = 'Connected via Gmail OAuth. Sends quotes, invoices, lead replies.';
      }
      if (rec.platform_name === 'Gumtree') {
        newStatus = 'manual_monitoring_only'; newNotes = 'No public API. Scanned via HTTP — active.';
      }
      if (rec.platform_name === 'Airtasker') {
        newStatus = 'manual_monitoring_only'; newNotes = 'Platform terms restrict automation. Monitored via HTTP scan.';
      }

      if (newStatus !== rec.connection_status || newNotes !== rec.notes) {
        try {
          await base44.asServiceRole.entities.PlatformConnection.update(rec.id, {
            connection_status: newStatus, notes: newNotes, last_checked: new Date().toISOString(),
          });
          updated.push(`${rec.platform_name}: ${rec.connection_status} → ${newStatus}`);
        } catch (e) {
          console.error(`Failed to update ${rec.id}:`, e.message);
        }
      }
    }

    return Response.json({ success: true, deleted_count: deleted.length, deleted, updated_count: updated.length, updated }, { headers: cors });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: cors });
  }
});