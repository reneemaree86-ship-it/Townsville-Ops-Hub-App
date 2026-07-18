import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    const repo = 'reneemaree86-ship-it/Townsville-Ops-Hub-App';
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=100`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Townsville-Ops-Hub-App',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `GitHub API error: ${res.status} ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    // Filter out pull requests (GitHub issues API includes PRs)
    const issues = data
      .filter((item) => !item.pull_request)
      .map((item) => ({
        id: item.id,
        number: item.number,
        title: item.title,
        state: item.state,
        url: item.html_url,
        labels: (item.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
        assignee: item.assignee ? item.assignee.login : null,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

    return Response.json({ issues });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});