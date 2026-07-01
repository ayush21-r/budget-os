export function formatDisplayDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: '2-digit',
  }).format(new Date(`${value}T00:00:00`));
}

export function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function getNextMonth(profile) {
  const [year, month] = profile.monthId.split('-').map(Number);
  const nextDate = new Date(year, month, 1);

  return {
    monthId: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`,
    month: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(nextDate),
  };
}
