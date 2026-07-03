import { supabase } from '../lib/supabase.js';

function formatMonthName(monthNum, yearNum) {
  const date = new Date(yearNum, monthNum - 1, 1);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
}

function addInterval(dateStr, frequency) {
  const date = new Date(dateStr + 'T00:00:00');
  if (frequency === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'biweekly') {
    date.setDate(date.getDate() + 14);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (frequency === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString().slice(0, 10);
}

export async function loadBudgetWorkspace(userId, user, preferredMonthId) {
  let { data: budgets, error: budgetsError } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (budgetsError) throw budgetsError;

  if (!budgets || budgets.length === 0) {
    const { data: newMonthId, error: rpcError } = await supabase
      .rpc('create_new_month', { p_user_id: userId });

    if (rpcError) throw rpcError;

    const { data: refetched, error: refetchError } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (refetchError) throw refetchError;
    budgets = refetched;
  }

  let activeMonth = budgets[0];
  if (preferredMonthId) {
    const found = budgets.find(b => b.id === preferredMonthId);
    if (found) {
      activeMonth = found;
    }
  }

  // 1. Fetch recurring expenses
  let { data: recurringList, error: recurListError } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', userId);

  if (recurListError) throw recurListError;

  // 2. Process overdue recurring expenses
  const todayStr = new Date().toISOString().slice(0, 10);
  let processedAny = false;

  for (const recur of (recurringList || [])) {
    let nextDue = recur.next_due_date;
    let isActive = recur.active;

    // Loop in case next_due_date is multiple periods in the past
    while (isActive && nextDue && nextDue <= todayStr) {
      const dueDate = new Date(nextDue + 'T00:00:00');
      const dueMonthNum = dueDate.getMonth() + 1;
      const dueYearNum = dueDate.getFullYear();

      // Find the budget month matching this due date, or fallback to activeMonth
      let targetBudget = budgets.find(b => b.month === dueMonthNum && b.year === dueYearNum);
      if (!targetBudget) {
        targetBudget = activeMonth;
      }

      // Insert expense
      const { error: insExpError } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          category_id: recur.category_id,
          monthly_budget_id: targetBudget.id,
          amount: recur.amount,
          description: recur.description ? `${recur.description} (Recurring)` : 'Recurring Expense',
          expense_date: nextDue,
          payment_method: recur.payment_method || 'Card',
          notes: recur.notes || 'Automatically processed from template.',
        });

      if (insExpError) throw insExpError;

      // Update next due date
      nextDue = addInterval(nextDue, recur.frequency);

      // Check end date
      if (recur.end_date && nextDue > recur.end_date) {
        isActive = false;
      }

      processedAny = true;
    }

    if (processedAny) {
      // Save changes back to the database
      const { error: updateRecurError } = await supabase
        .from('recurring_expenses')
        .update({
          next_due_date: nextDue,
          active: isActive,
        })
        .eq('id', recur.id);

      if (updateRecurError) throw updateRecurError;
    }
  }

  // If recurring expenses were processed, re-fetch recurring list
  if (processedAny) {
    const { data: refetchedRecur, error: refetchRecurError } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', userId);

    if (refetchRecurError) throw refetchRecurError;
    recurringList = refetchedRecur;
  }

  const { data: allCategories, error: catsError } = await supabase
    .from('monthly_budget_categories')
    .select('*')
    .eq('user_id', userId);

  if (catsError) throw catsError;

  const { data: allExpenses, error: expError } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId);

  if (expError) throw expError;

  let { data: settingsList, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId);

  if (settingsError) throw settingsError;

  let settings = settingsList?.[0] || null;
  if (!settings) {
    const { data: newSettings, error: insertSettingsError } = await supabase
      .from('settings')
      .insert({
        user_id: userId,
        currency: 'INR',
        theme: 'light',
        notifications: true,
        first_day_of_month: 1,
        default_allowance: 2500,
        default_savings_goal: 500,
      })
      .select()
      .single();
    if (insertSettingsError) throw insertSettingsError;
    settings = newSettings;
  }

  const mapProfile = (row) => ({
    id: row.id,
    userId: row.user_id,
    month: formatMonthName(row.month, row.year),
    monthId: `${row.year}-${String(row.month).padStart(2, '0')}`,
    year: row.year,
    monthNum: row.month,
    allowance: Number(row.allowance),
    savings_goal: Number(row.savings_goal),
    current_balance: Number(row.current_balance),
    remaining_budget: Number(row.remaining_budget),
    total_spent: Number(row.total_spent),
    archived: row.archived,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  const activeCategories = allCategories.filter(c => c.monthly_budget_id === activeMonth.id);
  const activeExpenses = allExpenses.filter(e => e.monthly_budget_id === activeMonth.id);

  const history = budgets
    .filter(b => b.id !== activeMonth.id)
    .map(b => ({
      profile: mapProfile(b),
      categories: allCategories.filter(c => c.monthly_budget_id === b.id),
      expenses: allExpenses.filter(e => e.monthly_budget_id === b.id),
    }));

  return {
    profile: mapProfile(activeMonth),
    categories: activeCategories,
    expenses: activeExpenses,
    history,
    recurringExpenses: (recurringList || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      category_id: r.category_id,
      categoryId: r.category_id,
      amount: Number(r.amount),
      description: r.description,
      payment_method: r.payment_method,
      paymentMethod: r.payment_method,
      notes: r.notes,
      frequency: r.frequency,
      start_date: r.start_date,
      startDate: r.start_date,
      next_due_date: r.next_due_date,
      nextDueDate: r.next_due_date,
      end_date: r.end_date,
      endDate: r.end_date,
      active: r.active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
    settings: {
      id: settings.id,
      userId: settings.user_id,
      currency: settings.currency,
      theme: settings.theme,
      notifications: settings.notifications,
      firstDayOfMonth: settings.first_day_of_month,
      defaultAllowance: Number(settings.default_allowance),
      defaultSavingsGoal: Number(settings.default_savings_goal),
      created_at: settings.created_at,
      updated_at: settings.updated_at,
    },
  };
}

export async function updateMonth(monthId, updates) {
  const mapped = {};
  if (updates.allowance !== undefined) mapped.allowance = updates.allowance;
  if (updates.savings_goal !== undefined) mapped.savings_goal = updates.savings_goal;
  if (updates.savingsGoal !== undefined) mapped.savings_goal = updates.savingsGoal;

  const { error } = await supabase
    .from('monthly_budgets')
    .update(mapped)
    .eq('id', monthId);

  if (error) throw error;
}

export async function createCategory({ monthId, monthly_budget_id, name, budget, icon, color, userId, user_id }) {
  const actualMonthId = monthly_budget_id || monthId;
  const actualUserId = user_id || userId;
  const { error } = await supabase
    .from('monthly_budget_categories')
    .insert({
      user_id: actualUserId,
      monthly_budget_id: actualMonthId,
      name,
      budget: Number(budget),
      icon,
      color,
      spent: 0,
      remaining: Number(budget),
    });

  if (error) throw error;
}

export async function updateCategory(categoryId, updates) {
  const mapped = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.budget !== undefined) mapped.budget = Number(updates.budget);
  if (updates.icon !== undefined) mapped.icon = updates.icon;
  if (updates.color !== undefined) mapped.color = updates.color;

  const { error } = await supabase
    .from('monthly_budget_categories')
    .update(mapped)
    .eq('id', categoryId);

  if (error) throw error;
}

export async function deleteCategory(categoryId) {
  const { error } = await supabase
    .from('monthly_budget_categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw error;
}

export async function createExpense({ monthId, monthly_budget_id, categoryId, category_id, amount, description, title, expense_date, date, userId, user_id }) {
  const actualMonthId = monthly_budget_id || monthId;
  const actualCategoryId = category_id || categoryId;
  const actualUserId = user_id || userId;
  const actualDescription = description || title;
  const actualDate = expense_date || date;

  const { error } = await supabase
    .from('expenses')
    .insert({
      user_id: actualUserId,
      category_id: actualCategoryId,
      monthly_budget_id: actualMonthId,
      amount: Number(amount),
      description: actualDescription,
      expense_date: actualDate,
    });

  if (error) throw error;
}

export async function updateExpense(expenseId, updates) {
  const mapped = {};
  if (updates.amount !== undefined) mapped.amount = Number(updates.amount);
  if (updates.category_id !== undefined) mapped.category_id = updates.category_id;
  if (updates.categoryId !== undefined) mapped.category_id = updates.categoryId;
  if (updates.description !== undefined) mapped.description = updates.description;
  if (updates.title !== undefined) mapped.description = updates.title;
  if (updates.expense_date !== undefined) mapped.expense_date = updates.expense_date;
  if (updates.date !== undefined) mapped.expense_date = updates.date;

  const { error } = await supabase
    .from('expenses')
    .update(mapped)
    .eq('id', expenseId);

  if (error) throw error;
}

export async function deleteExpense(expenseId) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;
}

export async function createNewMonth(userId) {
  const { data, error } = await supabase
    .rpc('create_new_month', { p_user_id: userId });

  if (error) throw error;
  return { id: data };
}

export async function deleteMonth(monthId) {
  const { error } = await supabase
    .from('monthly_budgets')
    .delete()
    .eq('id', monthId);

  if (error) throw error;
}

export async function updateSettings(userId, payload) {
  const mapped = {};
  if (payload.currency !== undefined) mapped.currency = payload.currency;
  if (payload.theme !== undefined) mapped.theme = payload.theme;
  if (payload.notifications !== undefined) mapped.notifications = payload.notifications;
  if (payload.firstDayOfMonth !== undefined) mapped.first_day_of_month = payload.firstDayOfMonth;
  if (payload.defaultAllowance !== undefined) mapped.default_allowance = payload.defaultAllowance;
  if (payload.defaultSavingsGoal !== undefined) mapped.default_savings_goal = payload.defaultSavingsGoal;

  const { error } = await supabase
    .from('settings')
    .update(mapped)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function resetAllUserData(userId) {
  const { error: budgetsDeleteError } = await supabase
    .from('monthly_budgets')
    .delete()
    .eq('user_id', userId);

  if (budgetsDeleteError) throw budgetsDeleteError;

  const { error: recurError } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('user_id', userId);

  if (recurError) throw recurError;

  const { error: settingsError } = await supabase
    .from('settings')
    .update({
      currency: 'INR',
      theme: 'light',
      notifications: true,
      first_day_of_month: 1,
      default_allowance: 2500,
      default_savings_goal: 500,
    })
    .eq('user_id', userId);

  if (settingsError) throw settingsError;

  const { error: createError } = await supabase
    .rpc('create_new_month', { p_user_id: userId });

  if (createError) throw createError;
}

export async function importWorkspace(userId, exportedData) {
  const { error: clearBudgetsError } = await supabase
    .from('monthly_budgets')
    .delete()
    .eq('user_id', userId);
  if (clearBudgetsError) throw clearBudgetsError;

  const { error: clearRecurError } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('user_id', userId);
  if (clearRecurError) throw clearRecurError;

  if (exportedData.settings) {
    const s = exportedData.settings;
    const { error: settingsError } = await supabase
      .from('settings')
      .update({
        currency: s.currency || 'INR',
        theme: s.theme || 'light',
        notifications: s.notifications !== undefined ? s.notifications : true,
        first_day_of_month: s.firstDayOfMonth || 1,
        default_allowance: s.defaultAllowance || 2500,
        default_savings_goal: s.defaultSavingsGoal || 500,
      })
      .eq('user_id', userId);
    if (settingsError) throw settingsError;
  }

  const insertMonthData = async (monthItem) => {
    const p = monthItem.profile;
    const monthly_budget = {
      id: p.id,
      user_id: userId,
      month: p.monthNum || (p.monthId ? Number(p.monthId.split('-')[1]) : 1),
      year: p.year || (p.monthId ? Number(p.monthId.split('-')[0]) : 2026),
      allowance: Number(p.allowance),
      savings_goal: Number(p.savings_goal || p.savingsGoal),
      current_balance: Number(p.current_balance || p.currentBalance || 0),
      remaining_budget: Number(p.remaining_budget || p.remainingBudget || 0),
      total_spent: Number(p.total_spent || p.totalSpent || 0),
      archived: Boolean(p.archived || p.isArchived),
    };

    const { error: budgetError } = await supabase
      .from('monthly_budgets')
      .insert(monthly_budget);
    if (budgetError) throw budgetError;

    if (monthItem.categories && monthItem.categories.length > 0) {
      const categoriesToInsert = monthItem.categories.map(c => ({
        id: c.id,
        user_id: userId,
        monthly_budget_id: monthly_budget.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        budget: Number(c.budget),
        spent: Number(c.spent || 0),
        remaining: Number(c.remaining || 0),
      }));

      const { error: catsError } = await supabase
        .from('monthly_budget_categories')
        .insert(categoriesToInsert);
      if (catsError) throw catsError;
    }

    if (monthItem.expenses && monthItem.expenses.length > 0) {
      const expensesToInsert = monthItem.expenses.map(e => ({
        id: e.id,
        user_id: userId,
        category_id: e.category_id || e.categoryId,
        monthly_budget_id: monthly_budget.id,
        amount: Number(e.amount),
        description: e.description || e.title,
        expense_date: e.expense_date || e.date,
        payment_method: e.payment_method || null,
        notes: e.notes || null,
      }));

      const { error: expError } = await supabase
        .from('expenses')
        .insert(expensesToInsert);
      if (expError) throw expError;
    }
  };

  await insertMonthData(exportedData);

  if (exportedData.history && exportedData.history.length > 0) {
    for (const histMonth of exportedData.history) {
      await insertMonthData(histMonth);
    }
  }

  // Import recurring expenses if they exist in the export
  if (exportedData.recurringExpenses && exportedData.recurringExpenses.length > 0) {
    const recurringToInsert = exportedData.recurringExpenses.map(r => ({
      id: r.id,
      user_id: userId,
      category_id: r.category_id || r.categoryId,
      amount: Number(r.amount),
      description: r.description,
      payment_method: r.payment_method || r.paymentMethod || null,
      notes: r.notes || null,
      frequency: r.frequency || 'monthly',
      start_date: r.start_date || r.startDate,
      next_due_date: r.next_due_date || r.nextDueDate,
      end_date: r.end_date || r.endDate || null,
      active: r.active !== undefined ? r.active : true,
    }));

    const { error: importRecurError } = await supabase
      .from('recurring_expenses')
      .insert(recurringToInsert);
    if (importRecurError) throw importRecurError;
  }
}

// Recurring Expenses CRUD
export async function createRecurringExpense({ userId, user_id, categoryId, category_id, amount, description, paymentMethod, payment_method, notes, frequency, startDate, start_date, nextDueDate, next_due_date, endDate, end_date }) {
  const actualUserId = user_id || userId;
  const actualCategoryId = category_id || categoryId;
  const actualPaymentMethod = payment_method || paymentMethod;
  const actualStartDate = start_date || startDate || new Date().toISOString().slice(0, 10);
  const actualNextDueDate = next_due_date || nextDueDate || actualStartDate;
  const actualEndDate = end_date || endDate || null;

  const { error } = await supabase
    .from('recurring_expenses')
    .insert({
      user_id: actualUserId,
      category_id: actualCategoryId,
      amount: Number(amount),
      description,
      payment_method: actualPaymentMethod,
      notes,
      frequency,
      start_date: actualStartDate,
      next_due_date: actualNextDueDate,
      end_date: actualEndDate,
      active: true,
    });

  if (error) throw error;
}

export async function updateRecurringExpense(id, updates) {
  const mapped = {};
  if (updates.amount !== undefined) mapped.amount = Number(updates.amount);
  if (updates.category_id !== undefined) mapped.category_id = updates.category_id;
  if (updates.categoryId !== undefined) mapped.category_id = updates.categoryId;
  if (updates.description !== undefined) mapped.description = updates.description;
  if (updates.payment_method !== undefined) mapped.payment_method = updates.payment_method;
  if (updates.paymentMethod !== undefined) mapped.payment_method = updates.paymentMethod;
  if (updates.notes !== undefined) mapped.notes = updates.notes;
  if (updates.frequency !== undefined) mapped.frequency = updates.frequency;
  if (updates.start_date !== undefined) mapped.start_date = updates.start_date;
  if (updates.startDate !== undefined) mapped.start_date = updates.startDate;
  if (updates.next_due_date !== undefined) mapped.next_due_date = updates.next_due_date;
  if (updates.nextDueDate !== undefined) mapped.next_due_date = updates.nextDueDate;
  if (updates.end_date !== undefined) mapped.end_date = updates.end_date;
  if (updates.endDate !== undefined) mapped.end_date = updates.endDate;
  if (updates.active !== undefined) mapped.active = updates.active;

  const { error } = await supabase
    .from('recurring_expenses')
    .update(mapped)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteRecurringExpense(id) {
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
