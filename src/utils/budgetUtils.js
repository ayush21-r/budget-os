export function getCategoryTotals(categories, expenses) {
  return categories.map((category) => {
    const spent = expenses
      .filter((expense) => expense.category_id === category.id)
      .reduce((total, expense) => total + Number(expense.amount), 0);

    return {
      ...category,
      spent,
      remaining: category.budget - spent,
      percentage: category.budget > 0 ? Math.min((spent / category.budget) * 100, 100) : 0,
      isOverBudget: spent > category.budget,
    };
  });
}

export function calculateBudgetOverview(state) {
  const allowance = Number(state.profile.allowance || 0);
  const savings_goal = Number(state.profile.savings_goal || 0);
  const allocated = state.categories.reduce((total, category) => total + Number(category.budget), 0);
  const spent = state.expenses.reduce((total, expense) => total + Number(expense.amount), 0);

  // Savings Goal is ONLY a target and is NOT subtracted from available money
  // Remaining Budget = Monthly Allowance - Actual Spending
  const remaining_budget = allowance - spent;
  const current_balance = allowance - spent;
  const actualSavings = Math.max(0, allowance - spent);

  const categoryTotals = getCategoryTotals(state.categories, state.expenses);
  const highestSpendingCategory = [...categoryTotals].sort((first, second) => second.spent - first.spent)[0];

  // Savings progress compares Actual Savings vs Savings Goal target
  const savingsProgress = savings_goal > 0 ? Math.min((actualSavings / savings_goal) * 100, 100) : 0;

  return {
    allocated,
    availableSpending: allowance,
    unallocated: allowance - allocated,
    spent,
    current_balance,
    remaining_budget,
    actualSavings,
    categoryTotals,
    highestSpendingCategory,
    savingsProgress,
  };
}

export function getMonthlySpendingData(currentState, history = []) {
  const archived = history.map((month) => {
    const monthAllowance = Number(month.profile.allowance || 0);
    const monthSpent = Number(month.profile.total_spent || 0);
    const actualSaved = Math.max(0, monthAllowance - monthSpent);
    return {
      month: month.profile.month.split(' ')[0],
      spent: monthSpent,
      saved: actualSaved,
      goal: Number(month.profile.savings_goal || 0),
    };
  });

  const currentAllowance = Number(currentState.profile.allowance || 0);
  const currentSpent = currentState.expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  const currentSaved = Math.max(0, currentAllowance - currentSpent);

  return [
    ...archived,
    {
      month: currentState.profile.month.split(' ')[0],
      spent: currentSpent,
      saved: currentSaved,
      goal: Number(currentState.profile.savings_goal || 0),
    },
  ].slice(-6);
}
