const url = 'https://uqqqwrdhvkiaslrexuhe.supabase.co/rest/v1/';
const apiKey = 'sb_publishable_v8Pf6Vh02oc1AlzuFuvHtQ_3UVE9Zny';

const tables = [
  'profiles',
  'monthly_budgets',
  'monthly_budget_categories',
  'expenses',
  'recurring_expenses',
  'settings'
];

async function run() {
  for (const table of tables) {
    console.log(`\n========================================`);
    console.log(`CSV Header for table: ${table}`);
    console.log(`========================================`);
    try {
      const res = await fetch(`${url}${table}?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/csv'
        }
      });
      console.log('Status:', res.status);
      const text = await res.text();
      const firstLine = text.split('\n')[0];
      console.log('Columns:', firstLine);
    } catch (err) {
      console.error(`Error for ${table}:`, err);
    }
  }
}

run();
