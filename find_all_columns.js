import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqqqwrdhvkiaslrexuhe.supabase.co';
const supabaseAnonKey = 'sb_publishable_v8Pf6Vh02oc1AlzuFuvHtQ_3UVE9Zny';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidates = {
  profiles: [
    'id', 'email', 'full_name', 'avatar_url', 'created_at', 'updated_at'
  ],
  monthly_budgets: [
    'id', 'user_id', 'month', 'year', 'allowance', 'savings_goal', 'current_balance', 'remaining_budget', 'total_spent', 'archived', 'created_at', 'updated_at'
  ],
  monthly_budget_categories: [
    'id', 'user_id', 'monthly_budget_id', 'name', 'icon', 'color', 'budget', 'spent', 'remaining', 'created_at'
  ],
  expenses: [
    'id', 'user_id', 'category_id', 'monthly_budget_id', 'amount', 'description', 'expense_date', 'payment_method', 'notes', 'created_at'
  ],
  recurring_expenses: [
    'id', 'user_id', 'category_id', 'amount', 'description', 'payment_method', 'notes', 'frequency', 'start_date', 'next_due_date', 'end_date', 'active', 'created_at', 'updated_at'
  ],
  settings: [
    'id', 'user_id', 'currency', 'theme', 'notifications', 'first_day_of_month', 'default_allowance', 'default_savings_goal', 'created_at', 'updated_at'
  ]
};

async function testColumn(table, col) {
  const { error } = await supabase.from(table).select(col).limit(0);
  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      return false;
    }
    if (error.message.includes('schema cache')) {
      return false;
    }
  }
  return true;
}

async function run() {
  for (const [table, cols] of Object.entries(candidates)) {
    console.log(`\nTable: ${table}`);
    const validCols = [];
    for (const col of cols) {
      const ok = await testColumn(table, col);
      if (ok) {
        validCols.push(col);
      }
    }
    console.log(`  Valid columns: ${validCols.join(', ')}`);
  }
}

run();
