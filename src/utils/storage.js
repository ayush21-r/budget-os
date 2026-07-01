const STORAGE_KEY = 'budgetos.phase2';

export function loadBudgetState(fallback) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveBudgetState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearBudgetState() {
  localStorage.removeItem(STORAGE_KEY);
}
