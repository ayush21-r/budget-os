const budgetData = {
  profile: {
    name: 'Aarav Sharma',
    month: 'July 2026',
    monthId: '2026-07',
    allowance: 2606,
    savingsGoal: 500,
  },
  categories: [
    { id: 'food', name: 'Food', budget: 1600, color: '#D46A4C', icon: 'utensils' },
    { id: 'college', name: 'College', budget: 200, color: '#111111', icon: 'graduation' },
    { id: 'subscriptions', name: 'Subscriptions', budget: 288, color: '#4E7D96', icon: 'repeat' },
    { id: 'misc', name: 'Misc', budget: 18, color: '#C9A227', icon: 'wallet' },
  ],
  expenses: [
    { id: 1, title: 'Canteen Lunch', categoryId: 'food', amount: 120, date: '2026-07-01', createdAt: 1782844200000 },
    { id: 2, title: 'Notes Photocopy', categoryId: 'college', amount: 35, date: '2026-06-30', createdAt: 1782757800000 },
    { id: 3, title: 'Music Subscription', categoryId: 'subscriptions', amount: 99, date: '2026-06-29', createdAt: 1782671400000 },
    { id: 4, title: 'Snacks', categoryId: 'food', amount: 80, date: '2026-06-28', createdAt: 1782585000000 },
  ],
  monthlySpending: [
    { month: 'Jul', spent: 334, saved: 500 },
  ],
  history: [],
};

export default budgetData;
