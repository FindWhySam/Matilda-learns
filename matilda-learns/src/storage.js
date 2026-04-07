const USER_ID = "matilda-primary";
const KEY     = "matilda-v5"; // localStorage fallback key

const url = () => "https://oektwjbobociaaxpmnez.supabase.co";
const key = () => "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la3R3amJvYm9jaWFheHBtbmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTc4MzAsImV4cCI6MjA5MTA3MzgzMH0.b3npMWIv_-2I2ognDbLxCZ-YEcc7qusnG28nYibiqxs";
const headers = () => ({
  "Content-Type": "application/json",
  "apikey": key(),
  "Authorization": `Bearer ${key()}`,
  "Prefer": "return=minimal",
});

// ── Progress ───────────────────────────────────────────

export const persist = async (data) => {
  try {
    await fetch(`${url()}/rest/v1/matilda_progress`, {
      method: "POST",
      headers: { ...headers(), "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: USER_ID,
        term_levels: data.termLevels,
        path: data.path,
        diag_results: data.diagResults || null,
        last_mix_date: data.lastMixDate || null,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    // Fallback to localStorage
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }
};

export const hydrate = async () => {
  try {
    const res = await fetch(
      `${url()}/rest/v1/matilda_progress?user_id=eq.${USER_ID}&select=*`,
      { headers: headers() }
    );
    const rows = await res.json();
    if (!rows?.length) return null;
    const r = rows[0];
    return {
      termLevels:  r.term_levels,
      path:        r.path,
      diagResults: r.diag_results,
      lastMixDate: r.last_mix_date,
    };
  } catch {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
};

export const clearAll = async () => {
  try {
    await fetch(`${url()}/rest/v1/matilda_progress?user_id=eq.${USER_ID}`, {
      method: "DELETE",
      headers: headers(),
    });
    await fetch(`${url()}/rest/v1/matilda_questions?user_id=eq.${USER_ID}`, {
      method: "DELETE",
      headers: headers(),
    });
  } catch {}
  try { localStorage.removeItem(KEY); } catch {}
};

// ── Question history ───────────────────────────────────

export const getQuestionHistory = async (subject) => {
  try {
    const res = await fetch(
      `${url()}/rest/v1/matilda_questions?user_id=eq.${USER_ID}&subject=eq.${subject}&select=questions`,
      { headers: headers() }
    );
    const rows = await res.json();
    return rows?.[0]?.questions || [];
  } catch { return []; }
};

export const saveQuestions = async (subject, questions) => {
  try {
    const existing = await getQuestionHistory(subject);
    const newQs    = questions.map(q => q.question);
    const merged   = [...existing, ...newQs].slice(-60);
    await fetch(`${url()}/rest/v1/matilda_questions`, {
      method: "POST",
      headers: { ...headers(), "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: USER_ID, subject, questions: merged }),
    });
  } catch {}
};

