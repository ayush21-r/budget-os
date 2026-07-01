export function createExpense({ amount, categoryId, categories }) {
  const category = categories.find((item) => item.id === categoryId);
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: Date.now(),
    title: category ? `${category.name} Expense` : 'New Expense',
    categoryId,
    amount: Number(amount),
    date: today,
    createdAt: Date.now(),
  };
}

export function createCategory({ name, budget, icon = 'wallet' }) {
  const colorOptions = ['#D46A4C', '#4E7D96', '#C9A227', '#6A7D5A', '#8C6F5D', '#111111'];

  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'category'}-${Date.now()}`,
    name,
    budget: Number(budget),
    icon,
    color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
  };
}
