import { WalletCards, CalendarDays, TrendingUp, AlertCircle, CheckCircle2, Award } from 'lucide-react';
import { Cell, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { formatCurrency } from '../../utils/formatters.js';
import { formatDisplayDate } from '../../utils/dateUtils.js';
import { getMonthlySpendingData } from '../../utils/budgetUtils.js';
import styles from './BudgetReport.module.css';

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#64748b', '#3b82f6'];

function BudgetReport({ budgetState, appState, overview, reportRef }) {
  const profile = budgetState.profile;
  const categories = budgetState.categories;
  const expenses = budgetState.expenses;
  const recurringExpenses = appState.recurringExpenses || [];

  const allowance = Number(profile.allowance || 0);
  const spent = Number(overview.spent || 0);
  const savings_goal = Number(profile.savings_goal || 0);
  const remaining_budget = Number(overview.remaining_budget || 0);
  const current_balance = Number(overview.current_balance || 0);

  const budgetUtilization = allowance > 0 ? Math.min((spent / allowance) * 100, 100) : 0;
  const savingsProgress = savings_goal > 0 ? Math.min((remaining_budget / savings_goal) * 100, 100) : 0;

  // Sorted categories
  const sortedCategoryTotals = [...overview.categoryTotals].sort((a, b) => b.spent - a.spent);

  // Performance calculations
  const totalSavings = allowance - spent;
  const utilization = allowance > 0 ? (spent / allowance) * 100 : 0;
  const averageExpense = expenses.length > 0 ? spent / expenses.length : 0;
  const highestExpense = expenses.length > 0 ? Math.max(...expenses.map(e => Number(e.amount))) : 0;
  const lowestExpense = expenses.length > 0 ? Math.min(...expenses.map(e => Number(e.amount))) : 0;
  const largestCategory = overview.highestSpendingCategory?.name || 'None';

  // Dynamic Insights
  const generateInsights = () => {
    const list = [];

    // 1. Savings Goal achievement
    if (savings_goal > 0) {
      if (remaining_budget >= savings_goal) {
        list.push({
          text: `Savings Goal achieved: Saved ${formatCurrency(remaining_budget)}, exceeding target of ${formatCurrency(savings_goal)}.`,
          tone: 'success'
        });
      } else {
        list.push({
          text: `Savings Goal of ${formatCurrency(savings_goal)} was not fully met. Remaining balance: ${formatCurrency(remaining_budget)}.`,
          tone: 'warning'
        });
      }
    }

    // 2. Budget utilization insight
    if (utilization > 90) {
      list.push({
        text: `Critical: Monthly budget utilization is at ${Math.round(utilization)}%. High risk of deficit.`,
        tone: 'danger'
      });
    } else if (utilization > 75) {
      list.push({
        text: `Warning: Budget utilization reached ${Math.round(utilization)}%. Moderate discretionary spending warning.`,
        tone: 'warning'
      });
    } else {
      list.push({
        text: `Excellent: Budget utilization is healthy at ${Math.round(utilization)}%, leaving a surplus.`,
        tone: 'success'
      });
    }

    // 3. Food spending check
    const foodCat = overview.categoryTotals.find(c => c.name.toLowerCase() === 'food');
    if (foodCat && spent > 0) {
      const foodPct = Math.round((foodCat.spent / spent) * 100);
      if (foodPct > 30) {
        list.push({
          text: `Food spending is high, accounting for ${foodPct}% of your total monthly expenditures.`,
          tone: 'warning'
        });
      }
    }

    // 4. Over-budget category check
    const overBudgetCats = overview.categoryTotals.filter(c => c.spent > c.budget);
    overBudgetCats.forEach(c => {
      const overPct = Math.round(((c.spent - c.budget) / c.budget) * 100);
      list.push({
        text: `Category warning: Exceeded ${c.name} allocation by ${overPct}% (+${formatCurrency(c.spent - c.budget)}).`,
        tone: 'danger'
      });
    });

    // 5. Under-budget category check
    const underBudgetCats = overview.categoryTotals.filter(c => c.spent <= c.budget && c.spent > 0);
    if (underBudgetCats.length > 0) {
      const bestCat = underBudgetCats.sort((a, b) => (a.spent / a.budget) - (b.spent / b.budget))[0];
      list.push({
        text: `${bestCat.name} spending stayed well under budget, using only ${Math.round((bestCat.spent / bestCat.budget) * 100)}% of allocation.`,
        tone: 'success'
      });
    }

    return list.slice(0, 5);
  };

  // Dynamic Recommendations
  const generateRecommendations = () => {
    const list = [];

    const foodCat = overview.categoryTotals.find(c => c.name.toLowerCase() === 'food');
    if (foodCat && foodCat.spent > foodCat.budget) {
      list.push({
        text: `Reduce food spending by ${formatCurrency(foodCat.spent - foodCat.budget)} next cycle to align with allocation.`,
        primary: true
      });
    }

    const overBudgetCats = overview.categoryTotals.filter(c => c.spent > c.budget);
    if (overBudgetCats.length > 0) {
      list.push({
        text: `Reallocate budget next month to increase limits for over-budget categories: ${overBudgetCats.map(c => c.name).join(', ')}.`,
        primary: true
      });
    }

    if (totalSavings > savings_goal * 1.5) {
      list.push({
        text: `You have an extra surplus of ${formatCurrency(totalSavings - savings_goal)}. Consider increasing your savings goal next month.`,
        primary: false
      });
    }

    const entCat = overview.categoryTotals.find(c => c.name.toLowerCase() === 'entertainment');
    if (entCat && entCat.spent < 0.15 * entCat.budget) {
      list.push({
        text: `Discretionary entertainment spending is very low. Standard life balance can be safely accommodated.`,
        primary: false
      });
    }

    const lowUsageCats = overview.categoryTotals.filter(c => c.spent < 0.25 * c.budget && c.budget > 200);
    lowUsageCats.forEach(c => {
      list.push({
        text: `Underutilized allocation in ${c.name}. Reduce category budget next month to free up allowance.`,
        primary: false
      });
    });

    return list.slice(0, 4);
  };

  const insights = generateInsights();
  const recommendations = generateRecommendations();

  // Chunker for Expense History pages
  const expenseChunks = [];
  const chunkSize = 20;
  const sortedExpenses = [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  for (let i = 0; i < sortedExpenses.length; i += chunkSize) {
    expenseChunks.push(sortedExpenses.slice(i, i + chunkSize));
  }

  // Monthly Spending Trend Data
  const monthlySpendingData = getMonthlySpendingData(budgetState, appState.history || []);

  // Category Distribution Data (Pie Chart)
  const pieData = overview.categoryTotals
    .filter(c => c.spent > 0)
    .map(c => ({ name: c.name, value: c.spent }));

  // Budget vs Spent Bar Chart Data
  const barData = overview.categoryTotals
    .filter(c => c.budget > 0 || c.spent > 0)
    .map(c => ({ name: c.name, budget: c.budget, spent: c.spent }));

  const totalPages = 3 + Math.max(1, expenseChunks.length) + 1; // Cover/Exec + Breakdown/Perf + Charts + ExpenseHistory pages + Insights page
  let pageCounter = 1;

  const renderHeader = (subtitle) => (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <WalletCards size={16} />
        </div>
        <span className={styles.brandText}>BudgetOS</span>
      </div>
      <div className={styles.reportTitleBlock}>
        <h1>Monthly Budget Report</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );

  const renderFooter = (pageNumber) => (
    <footer className={styles.footer}>
      <div className={styles.footerLeft}>
        <span>BudgetOS Automatic Report</span>
        <span>•</span>
        <span>{profile.month}</span>
      </div>
      <div>
        Page {pageNumber} of {totalPages}
      </div>
    </footer>
  );

  return (
    <div className={styles.reportContainer} ref={reportRef}>
      {/* PAGE 1: COVER & EXECUTIVE SUMMARY */}
      <div className={styles.pdfPage}>
        {renderHeader("Executive Summary")}
        <div>
          <div className={styles.metaGrid}>
            <div className={styles.metaCol}>
              <h3>Prepared For</h3>
              <p>{appState.profile?.fullName || 'Valued Client'}</p>
              <h3>Email</h3>
              <p>{appState.profile?.email || 'user@budgetos.com'}</p>
            </div>
            <div className={styles.metaCol}>
              <h3>Reporting Cycle</h3>
              <p>{profile.month}</p>
              <h3>Generated On</h3>
              <p>{new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          </div>

          <h2 className={styles.sectionTitle}>Executive Summary</h2>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span>Allowance</span>
              <strong>{formatCurrency(allowance)}</strong>
              <small>Monthly income</small>
            </div>
            <div className={styles.summaryCard}>
              <span>Total Spent</span>
              <strong>{formatCurrency(spent)}</strong>
              <small>{expenses.length} recorded payments</small>
            </div>
            <div className={styles.summaryCard}>
              <span>Remaining</span>
              <strong>{formatCurrency(remaining_budget)}</strong>
              <small>Discretionary balance</small>
            </div>
            <div className={styles.summaryCard}>
              <span>Savings Goal</span>
              <strong>{formatCurrency(savings_goal)}</strong>
              <small>{Math.round(savingsProgress)}% achieved</small>
            </div>
          </div>

          <h2 className={styles.sectionTitle}>Month Overview</h2>
          <div className={styles.progressSection}>
            <div className={styles.progressItem}>
              <div className={styles.progressHeader}>
                <span>Budget Utilization (Spent vs Allowance)</span>
                <span>{Math.round(budgetUtilization)}%</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${budgetUtilization > 90 ? styles.progressFillDanger : budgetUtilization > 75 ? styles.progressFillWarning : ''}`} 
                  style={{ width: `${budgetUtilization}%` }} 
                />
              </div>
            </div>
            <div className={styles.progressItem}>
              <div className={styles.progressHeader}>
                <span>Savings Progress (Remaining vs Goal)</span>
                <span>{Math.round(savingsProgress)}%</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${savingsProgress >= 100 ? styles.progressFillSuccess : styles.progressFillWarning}`} 
                  style={{ width: `${Math.min(savingsProgress, 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
        {renderFooter(pageCounter++)}
      </div>

      {/* PAGE 2: CATEGORY BREAKDOWN & TOP SPEND */}
      <div className={styles.pdfPage}>
        {renderHeader("Category Breakdown")}
        <div>
          <h2 className={styles.sectionTitle}>Category Breakdown</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Budget</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Usage %</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategoryTotals.map(cat => {
                  const usage = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
                  return (
                    <tr key={cat.id}>
                      <td className={styles.categoryCell}>
                        <span className={styles.categoryColor} style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </td>
                      <td>{formatCurrency(cat.budget)}</td>
                      <td>{formatCurrency(cat.spent)}</td>
                      <td>{formatCurrency(cat.budget - cat.spent)}</td>
                      <td>{Math.round(usage)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 className={styles.sectionTitle}>Top Spending Categories</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ranking</th>
                  <th>Category</th>
                  <th>Spent</th>
                  <th>Percentage of Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategoryTotals.slice(0, 5).map((cat, index) => {
                  const totalPct = spent > 0 ? (cat.spent / spent) * 100 : 0;
                  return (
                    <tr key={cat.id}>
                      <td><strong>#{index + 1}</strong></td>
                      <td className={styles.categoryCell}>
                        <span className={styles.categoryColor} style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </td>
                      <td><strong>{formatCurrency(cat.spent)}</strong></td>
                      <td>{Math.round(totalPct)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 className={styles.sectionTitle}>Monthly Performance Indicators</h2>
          <div className={styles.perfGrid}>
            <div className={styles.perfItem}>
              <span>Net Surplus / Savings</span>
              <strong>{formatCurrency(totalSavings)}</strong>
            </div>
            <div className={styles.perfItem}>
              <span>Average Expense</span>
              <strong>{formatCurrency(averageExpense)}</strong>
            </div>
            <div className={styles.perfItem}>
              <span>Highest Single Bill</span>
              <strong>{formatCurrency(highestExpense)}</strong>
            </div>
          </div>
        </div>
        {renderFooter(pageCounter++)}
      </div>

      {/* PAGE 3: ANALYTICS CHARTS */}
      <div className={styles.pdfPage}>
        {renderHeader("Analytics & Trends")}
        <div>
          <h2 className={styles.sectionTitle}>Visual Analytics</h2>
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <h3>Category Spend Distribution</h3>
              {pieData.length > 0 ? (
                <PieChart width={320} height={180}>
                  <Pie
                    data={pieData}
                    cx={160}
                    cy={90}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                </PieChart>
              ) : (
                <div style={{ height: 180, display: 'grid', placeItems: 'center', fontSize: '0.8rem', color: '#9ca3af' }}>No spending data recorded.</div>
              )}
            </div>

            <div className={styles.chartCard}>
              <h3>Budget vs. Actual</h3>
              {barData.length > 0 ? (
                <BarChart width={320} height={180} data={barData.slice(0, 6)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                  <Bar dataKey="budget" fill="#cbd5e1" isAnimationActive={false} />
                  <Bar dataKey="spent" fill="#4f46e5" isAnimationActive={false} />
                </BarChart>
              ) : (
                <div style={{ height: 180, display: 'grid', placeItems: 'center', fontSize: '0.8rem', color: '#9ca3af' }}>No category limits mapped.</div>
              )}
            </div>

            <div className={`${styles.chartCard} ${styles.chartFullWidth}`}>
              <h3>Monthly Spending Trend (Last 6 Months)</h3>
              <LineChart width={660} height={180} data={monthlySpendingData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="spent" stroke="#4f46e5" strokeWidth={2} name="Spent" isAnimationActive={false} />
                <Line type="monotone" dataKey="saved" stroke="#10b981" strokeWidth={2} name="Saved Goal" isAnimationActive={false} />
              </LineChart>
            </div>
          </div>
        </div>
        {renderFooter(pageCounter++)}
      </div>

      {/* PAGE 4+: EXPENSE HISTORY PAGES */}
      {expenseChunks.length === 0 ? (
        <div className={styles.pdfPage}>
          {renderHeader("Expense History")}
          <div>
            <h2 className={styles.sectionTitle}>Expense History</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No expenses recorded this cycle.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {renderFooter(pageCounter++)}
        </div>
      ) : (
        expenseChunks.map((chunk, chunkIdx) => (
          <div className={styles.pdfPage} key={`exp-page-${chunkIdx}`}>
            {renderHeader(`Expense Ledger (Page ${chunkIdx + 1})`)}
            <div>
              <h2 className={styles.sectionTitle}>Expense History</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Method</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map(exp => {
                      const cat = categoryMap.get(exp.category_id);
                      return (
                        <tr key={exp.id}>
                          <td>{formatDisplayDate(exp.expense_date)}</td>
                          <td className={styles.categoryCell}>
                            <span className={styles.categoryColor} style={{ backgroundColor: cat?.color }} />
                            {cat?.name || 'Other'}
                          </td>
                          <td>{exp.description}</td>
                          <td>{exp.payment_method || 'UPI'}</td>
                          <td><strong>{formatCurrency(exp.amount)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {renderFooter(pageCounter++)}
          </div>
        ))
      )}

      {/* RECURRING EXPENSES PAGE (IF PRESENT) */}
      <div className={styles.pdfPage}>
        {renderHeader("Commitments & Bills")}
        <div>
          <h2 className={styles.sectionTitle}>Recurring Expenses</h2>
          <div className={styles.tableWrap}>
            {recurringExpenses.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
                No active recurring templates/commitments scheduled.
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                    <th>Next Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recurringExpenses.map(recur => {
                    const cat = categoryMap.get(recur.category_id);
                    return (
                      <tr key={recur.id}>
                        <td><strong>{recur.description}</strong></td>
                        <td className={styles.categoryCell}>
                          <span className={styles.categoryColor} style={{ backgroundColor: cat?.color }} />
                          {cat?.name || 'Other'}
                        </td>
                        <td><strong>{formatCurrency(recur.amount)}</strong></td>
                        <td>{recur.frequency}</td>
                        <td>{formatDisplayDate(recur.next_due_date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {renderFooter(pageCounter++)}
      </div>

      {/* LAST PAGE: INSIGHTS & RECOMMENDATIONS */}
      <div className={styles.pdfPage}>
        {renderHeader("Advisory & Insights")}
        <div>
          <h2 className={styles.sectionTitle}>Smart Insights</h2>
          <div className={styles.insightsList}>
            {insights.map((insight, idx) => {
              const isWarning = insight.tone === 'warning' || insight.tone === 'danger';
              const isSuccess = insight.tone === 'success';
              return (
                <div 
                  key={`insight-${idx}`} 
                  className={`${styles.insightCard} ${isWarning ? styles.insightCardWarning : isSuccess ? styles.insightCardSuccess : ''}`}
                >
                  {isWarning ? <AlertCircle size={16} /> : isSuccess ? <CheckCircle2 size={16} /> : <TrendingUp size={16} />}
                  <span>{insight.text}</span>
                </div>
              );
            })}
          </div>

          <h2 className={styles.sectionTitle}>Financial Recommendations</h2>
          <div className={styles.recsList}>
            {recommendations.map((rec, idx) => (
              <div 
                key={`rec-${idx}`} 
                className={`${styles.recCard} ${rec.primary ? styles.recCardPrimary : ''}`}
              >
                <Award size={16} />
                <span>{rec.text}</span>
              </div>
            ))}
          </div>
        </div>
        {renderFooter(pageCounter++)}
      </div>
    </div>
  );
}

export default BudgetReport;
