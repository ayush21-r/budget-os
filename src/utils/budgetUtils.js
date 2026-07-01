export function getCategoryTotals(categories, expenses) {
  return categories.map((category) => {
    const spent = expenses
      .filter((expense) => expense.categoryId === category.id)
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
  const allocated = state.categories.reduce((total, category) => total + Number(category.budget), 0);
  const spent = state.expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  const availableSpending = Number(state.profile.allowance) - Number(state.profile.savingsGoal);
  const currentBalance = availableSpending - spent;
  const categoryTotals = getCategoryTotals(state.categories, state.expenses);
  const highestSpendingCategory = [...categoryTotals].sort((first, second) => second.spent - first.spent)[0];

  return {
    allocated,
    availableSpending,
    unallocated: availableSpending - allocated,
    spent,
    currentBalance,
    remainingBudget: availableSpending - spent,
    categoryTotals,
    highestSpendingCategory,
    savingsProgress: state.profile.allowance > 0 ? Math.min((state.profile.savingsGoal / state.profile.allowance) * 100, 100) : 0,
  };
}

export function getMonthlySpendingData(currentState, history = []) {
  const archived = history.map((month) => ({
    month: month.profile.month.split(' ')[0],
    spent: month.expenses.reduce((total, expense) => total + Number(expense.amount), 0),
    saved: Number(month.profile.savingsGoal),
  }));

  return [
    ...archived,
    {
      month: currentState.profile.month.split(' ')[0],
      spent: currentState.expenses.reduce((total, expense) => total + Number(expense.amount), 0),
      saved: Number(currentState.profile.savingsGoal),
    },
  ].slice(-6);
}
