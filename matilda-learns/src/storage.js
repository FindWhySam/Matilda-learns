const KEY = "matilda-v5";

export const persist = (data) => {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
};

export const hydrate = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const clearAll = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
