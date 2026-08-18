import { WalletCards, CalendarDays, TrendingUp, AlertCircle, CheckCircle2, Award, ShieldCheck, FileCheck, Layers } from 'lucide-react';
import { Cell, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { formatCurrency } from '../../utils/formatters.js';
import { formatDisplayDate } from '../../utils/dateUtils.js';
import { getMonthlySpendingData } from '../../utils/budgetUtils.js';
import styles from './BudgetReport.module.css';

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#64748b', '#3b82f6'];

function BudgetReport({ budgetState, appState, user, overview, reportRef }) {
  const profile = budgetState.profile;
  const categories = budgetState.categories || [];
  const expenses = budgetState.expenses || [];
  const recurringExpenses = (appState.recurringExpenses || []).filter(r => r.active !== false);

  // Authenticated User Identity
  const accountHolderName = user?.user_metadata?.full_name || user?.user_metadata?.name || appState.profile?.fullName || 'Account Holder';
  const accountHolderEmail = user?.email || appState.profile?.email || 'N/A';

  const allowance = Number(profile.allowance || 0);
  const spent = Number(overview.spent || 0);
  const savings_goal = Number(profile.savings_goal || 0);
  const remaining_budget = Number(overview.remaining_budget || 0);
  const netSurplus = Math.max(0, allowance - spent);

  const budgetUtilization = allowance > 0 ? Math.min((spent / allowance) * 100, 100) : 0;
  const savingsRate = allowance > 0 ? Math.round((netSurplus / allowance) * 100) : 0;
  const savingsProgress = savings_goal > 0 ? Math.min((netSurplus / savings_goal) * 100, 500) : 0;

  // Category mapping
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Sorted categories: categories with spending first, then by budget
  const sortedCategoryTotals = [...overview.categoryTotals].sort((a, b) => {
    if (b.spent !== a.spent) return b.spent - a.spent;
    return b.budget - a.budget;
  });

  const categoriesWithSpend = sortedCategoryTotals.filter(c => c.spent > 0);
  const overBudgetCategories = sortedCategoryTotals.filter(c => c.spent > c.budget && c.budget > 0);

  // Performance calculations
  const averageExpense = expenses.length > 0 ? spent / expenses.length : 0;
  const highestExpense = expenses.length > 0 ? Math.max(...expenses.map(e => Number(e.amount))) : 0;

  // Dynamic Insights
  const generateInsights = () => {
    const list = [];

    if (spent === 0) {
      list.push({
        text: `Optimal Capital Retention: 100% of the ${formatCurrency(allowance)} monthly allowance was preserved with zero expenditures.`,
        tone: 'success'
      });
      list.push({
        text: `Savings Target Fulfillment: Full monthly surplus of ${formatCurrency(netSurplus)} completely covers the ${formatCurrency(savings_goal)} goal.`,
        tone: 'success'
      });
      list.push({
        text: `Zero Category Breaches: All ${categories.length} configured spending categories remained entirely within planned allocations.`,
        tone: 'neutral'
      });
    } else {
      // 1. Savings Goal achievement
      if (savings_goal > 0) {
        if (netSurplus >= savings_goal) {
          list.push({
            text: `Savings Goal Met: Retained ${formatCurrency(netSurplus)} in net surplus, exceeding the ${formatCurrency(savings_goal)} target.`,
            tone: 'success'
          });
        } else {
          list.push({
            text: `Savings Goal Variance: Retained ${formatCurrency(netSurplus)} toward the ${formatCurrency(savings_goal)} target (${formatCurrency(savings_goal - netSurplus)} short).`,
            tone: 'warning'
          });
        }
      }

      // 2. Budget utilization insight
      if (budgetUtilization > 90) {
        list.push({
          text: `Critical Budget Burn: Monthly utilization reached ${Math.round(budgetUtilization)}% (${formatCurrency(spent)} of ${formatCurrency(allowance)}).`,
          tone: 'danger'
        });
      } else if (budgetUtilization > 75) {
        list.push({
          text: `Moderate Utilization: Used ${Math.round(budgetUtilization)}% of allowance. Discretionary cushion is ${formatCurrency(remaining_budget)}.`,
          tone: 'warning'
        });
      } else {
        list.push({
          text: `Healthy Budget Control: Utilization maintained at ${Math.round(budgetUtilization)}%, leaving a comfortable ${formatCurrency(remaining_budget)} surplus.`,
          tone: 'success'
        });
      }

      // 3. Over-budget category check
      if (overBudgetCategories.length > 0) {
        const topOver = overBudgetCategories[0];
        const overAmt = topOver.spent - topOver.budget;
        list.push({
          text: `Category Alert: ${topOver.name} exceeded its limit by ${formatCurrency(overAmt)} (${Math.round((topOver.spent / topOver.budget) * 100)}% utilized).`,
          tone: 'danger'
        });
      }

      // 4. Concentration check
      if (categoriesWithSpend.length > 0) {
        const topCat = categoriesWithSpend[0];
        const topPct = Math.round((topCat.spent / spent) * 100);
        if (topPct >= 35) {
          list.push({
            text: `High Concentration: ${topCat.name} represents ${topPct}% of your total recorded spending (${formatCurrency(topCat.spent)}).`,
            tone: 'warning'
          });
        }
      }
    }

    return list.slice(0, 3);
  };

  // Dynamic Recommendations
  const generateRecommendations = () => {
    const list = [];

    if (spent === 0) {
      list.push({
        text: `Carry forward unspent surplus (${formatCurrency(netSurplus)}) into the next month's savings fund or investment allocation.`,
        primary: true
      });
      list.push({
        text: `Consider adjusting your base monthly savings target higher if this spending velocity continues regularly.`,
        primary: false
      });
    } else {
      if (overBudgetCategories.length > 0) {
        list.push({
          text: `Reallocate category ceilings for ${overBudgetCategories.map(c => c.name).join(', ')} next cycle to reflect actual spending reality.`,
          primary: true
        });
      }

      if (netSurplus > savings_goal * 1.3) {
        list.push({
          text: `Surplus of ${formatCurrency(netSurplus - savings_goal)} above goal detected. Great opportunity to boost emergency or investment funds.`,
          primary: false
        });
      } else if (netSurplus < savings_goal) {
        list.push({
          text: `Trim discretionary expenses by ${formatCurrency(savings_goal - netSurplus)} in future weeks to hit full savings targets consistently.`,
          primary: true
        });
      }

      const lowUsageCats = sortedCategoryTotals.filter(c => c.spent === 0 && c.budget > 300);
      if (lowUsageCats.length > 0) {
        list.push({
          text: `Review inactive category allowances in ${lowUsageCats.slice(0, 2).map(c => c.name).join(', ')} to free up flexible monthly cashflow.`,
          primary: false
        });
      }
    }

    return list.slice(0, 2);
  };

  const insights = generateInsights();
  const recommendations = generateRecommendations();

  // Monthly Spending Trend Data
  const monthlySpendingData = getMonthlySpendingData(budgetState, appState.history || []);

  // Category Distribution Data (Pie Chart)
  const pieData = overview.categoryTotals
    .filter(c => c.spent > 0)
    .map(c => ({ name: c.name, value: c.spent, color: c.color }));

  // Budget vs Spent Bar Chart Data
  const barData = overview.categoryTotals
    .filter(c => c.budget > 0 || c.spent > 0)
    .map(c => ({ name: c.name, budget: c.budget, spent: c.spent }));

  // Sorted Expenses
  const sortedExpenses = [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date));

  // Determine dynamic pages required
  // If expenses <= 10: everything fits on 3 pages!
  // If expenses > 10: expenses chunk into pages of 14 rows each.
  const expenseChunks = [];
  if (sortedExpenses.length > 10) {
    const chunkSize = 14;
    for (let i = 0; i < sortedExpenses.length; i += chunkSize) {
      expenseChunks.push(sortedExpenses.slice(i, i + chunkSize));
    }
  }

  // Calculate total pages accurately
  const totalPages = sortedExpenses.length > 10 ? 2 + expenseChunks.length + 1 : 3;

  const renderHeader = (subtitle) => (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <WalletCards size={18} />
        </div>
        <div className={styles.brandDetails}>
          <span className={styles.brandText}>BudgetOS</span>
          <span className={styles.brandSubtext}>Financial Management Engine</span>
        </div>
      </div>
      <div className={styles.reportTitleBlock}>
        <h1>Monthly Financial Statement</h1>
        <p>{subtitle} • {profile.month}</p>
      </div>
    </header>
  );

  const renderFooter = (pageNumber) => (
    <footer className={styles.footer}>
      <div className={styles.footerLeft}>
        <span>BudgetOS Verified Record</span>
        <span>•</span>
        <span>{profile.month}</span>
        <span>•</span>
        <span>Ref: {profile.id?.slice(0, 8).toUpperCase() || 'FIN-REC'}</span>
      </div>
      <div>
        Page {pageNumber} of {totalPages}
      </div>
    </footer>
  );

  return (
    <div className={styles.reportContainer} ref={reportRef}>
      {/* ========================================================================= */}
      {/* PAGE 1: EXECUTIVE OVERVIEW & KEY FINANCIAL INDICATORS */}
      {/* ========================================================================= */}
      <div className={styles.pdfPage}>
        <div>
          {renderHeader("Executive Summary")}

          {/* Metadata Block */}
          <div className={styles.metaGrid}>
            <div className={styles.metaCol}>
              <h3>Account Holder</h3>
              <p>{accountHolderName}</p>
              <h3>Account Email</h3>
              <p>{accountHolderEmail}</p>
            </div>
            <div className={styles.metaCol}>
              <h3>Reporting Cycle</h3>
              <p>{profile.month}</p>
              <h3>Statement Date</h3>
              <p>{new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          </div>

          {/* Executive Summary 4-KPI Grid */}
          <h2 className={styles.sectionTitle}>Executive KPI Summary</h2>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span>Monthly Allowance</span>
              <strong>{formatCurrency(allowance)}</strong>
              <small>Total budget allocation</small>
            </div>
            <div className={styles.summaryCard}>
              <span>Total Spent</span>
              <strong>{formatCurrency(spent)}</strong>
              <small>{expenses.length} payments recorded</small>
            </div>
            <div className={styles.summaryCard}>
              <span>Net Surplus / Remaining</span>
              <strong>{formatCurrency(netSurplus)}</strong>
              <small>Unspent disposable capital</small>
            </div>
            <div className={styles.summaryCard}>
              <span>Savings</span>
              <strong>{formatCurrency(netSurplus)}</strong>
              <small>Goal: {formatCurrency(savings_goal)} ({Math.round(savingsProgress)}%)</small>
            </div>
          </div>

          {/* Financial Health & Utilization Progress */}
          <h2 className={styles.sectionTitle}>Financial Health & Plan Utilization</h2>
          <div className={styles.progressSection}>
            <div className={styles.progressItem}>
              <div className={styles.progressHeader}>
                <span>Budget Utilization (Spent vs Allowance)</span>
                <span>{Math.round(budgetUtilization)}% ({formatCurrency(spent)} / {formatCurrency(allowance)})</span>
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
                <span>Savings Target Fulfillment</span>
                <span>{Math.round(savingsProgress)}% ({formatCurrency(netSurplus)} / {formatCurrency(savings_goal)})</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${savingsProgress >= 100 ? styles.progressFillSuccess : styles.progressFillWarning}`} 
                  style={{ width: `${Math.min(savingsProgress, 100)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <h2 className={styles.sectionTitle}>Key Performance Indicators</h2>
          <div className={styles.perfGrid}>
            <div className={styles.perfItem}>
              <span>Overall Savings Rate</span>
              <strong>{savingsRate}%</strong>
            </div>
            <div className={styles.perfItem}>
              <span>Transaction Volume</span>
              <strong>{expenses.length} payments</strong>
            </div>
            <div className={styles.perfItem}>
              <span>Average Transaction</span>
              <strong>{formatCurrency(averageExpense)}</strong>
            </div>
          </div>

          {/* Executive Statement Narrative */}
          <div className={styles.narrativeCard}>
            <h3>Executive Statement</h3>
            <p>
              {spent === 0 ? (
                `During the ${profile.month} financial cycle, zero expenditures were recorded against the ${formatCurrency(allowance)} monthly allowance. The full allowance of ${formatCurrency(allowance)} is preserved as liquid net surplus, completely fulfilling the baseline savings target of ${formatCurrency(savings_goal)} and maintaining a 100% savings rate.`
              ) : (
                `During the ${profile.month} financial cycle, total recorded expenditures amounted to ${formatCurrency(spent)} across ${expenses.length} transaction(s) against the ${formatCurrency(allowance)} monthly allowance. The workspace closed the cycle with ${formatCurrency(netSurplus)} in net surplus (${savingsRate}% savings rate), with ${categoriesWithSpend.length} active spending categor${categoriesWithSpend.length === 1 ? 'y' : 'ies'}.`
              )}
            </p>
          </div>
        </div>

        {renderFooter(1)}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: CATEGORY ALLOCATIONS & VISUAL ANALYTICS */}
      {/* ========================================================================= */}
      <div className={styles.pdfPage}>
        <div>
          {renderHeader("Category Allocations & Analytics")}

          {/* Category Breakdown Table */}
          <h2 className={styles.sectionTitle}>
            <span>Category Budget Allocations</span>
            <span style={{ fontSize: '0.72rem', color: '#6c6258' }}>{categories.length} Configured Categories</span>
          </h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className={styles.textRight}>Budget Limit</th>
                  <th className={styles.textRight}>Actual Spent</th>
                  <th className={styles.textRight}>Variance / Remaining</th>
                  <th className={styles.textRight}>Utilization</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategoryTotals.map(cat => {
                  const usage = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
                  const isOver = cat.spent > cat.budget && cat.budget > 0;
                  const isHealthy = cat.spent <= cat.budget;
                  const variance = cat.budget - cat.spent;

                  return (
                    <tr key={cat.id}>
                      <td className={styles.categoryCell}>
                        <span className={styles.categoryColor} style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </td>
                      <td className={styles.textRight}>{formatCurrency(cat.budget)}</td>
                      <td className={styles.textRight}><strong>{formatCurrency(cat.spent)}</strong></td>
                      <td className={styles.textRight} style={{ color: variance < 0 ? '#ef4444' : '#111111' }}>
                        {formatCurrency(variance)}
                      </td>
                      <td className={styles.textRight}>{Math.round(usage)}%</td>
                      <td style={{ textAlign: 'center' }}>
                        {cat.spent === 0 ? (
                          <span className={`${styles.badge} ${styles.badgeNeutral}`}>Unused</span>
                        ) : isOver ? (
                          <span className={`${styles.badge} ${styles.badgeDanger}`}>Over Budget</span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeSuccess}`}>Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visual Analytics */}
          <h2 className={styles.sectionTitle}>Visual Analytics</h2>

          {spent > 0 ? (
            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <h3>Category Spend Distribution</h3>
                {pieData.length > 0 ? (
                  <PieChart width={320} height={170}>
                    <Pie
                      data={pieData}
                      cx={160}
                      cy={85}
                      innerRadius={40}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="#111111"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                  </PieChart>
                ) : null}
              </div>

              <div className={styles.chartCard}>
                <h3>Budget vs. Actual Spend</h3>
                {barData.length > 0 ? (
                  <BarChart width={320} height={170} data={barData.slice(0, 6)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid vertical={false} stroke="#d8d0c3" />
                    <XAxis dataKey="name" tick={{ fontSize: 8.5 }} />
                    <YAxis tick={{ fontSize: 8.5 }} />
                    <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                    <Bar dataKey="budget" fill="#d46a4c" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="spent" fill="#111111" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={styles.capitalPreservationCard}>
              <div className={styles.capitalPreservationIcon}>
                <ShieldCheck size={22} />
              </div>
              <div className={styles.capitalPreservationContent}>
                <h4>100% Capital Preservation Recorded</h4>
                <p>
                  No category limits were breached during this cycle. All {categories.length} budget lines retained full capacity, preserving the entire monthly allowance of {formatCurrency(allowance)} as surplus.
                </p>
              </div>
            </div>
          )}

          {/* Historical Trend Chart */}
          <div className={styles.chartCard} style={{ marginTop: '0.6rem' }}>
            <h3>Monthly Multi-Cycle Trend (Last 6 Months)</h3>
            <LineChart width={670} height={165} data={monthlySpendingData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid vertical={false} stroke="#d8d0c3" />
              <XAxis dataKey="month" tick={{ fontSize: 9.5 }} />
              <YAxis tick={{ fontSize: 9.5 }} />
              <Tooltip formatter={(val) => formatCurrency(Number(val))} />
              <Legend wrapperStyle={{ fontSize: 9.5 }} />
              <Line type="monotone" dataKey="spent" stroke="#111111" strokeWidth={2.5} name="Total Spent" isAnimationActive={false} />
              <Line type="monotone" dataKey="saved" stroke="#d46a4c" strokeWidth={2.5} name="Savings Target" isAnimationActive={false} />
            </LineChart>
          </div>
        </div>

        {renderFooter(2)}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3+ : TRANSACTIONS, RECURRING COMMITMENTS & ADVISORY INSIGHTS */}
      {/* ========================================================================= */}
      {sortedExpenses.length <= 10 ? (
        /* Standard 3-Page Flow: Transactions + Recurring + Insights on Page 3 */
        <div className={styles.pdfPage}>
          <div>
            {renderHeader("Ledger, Commitments & Advisory")}

            {/* Expense History Section */}
            <h2 className={styles.sectionTitle}>
              <span>Expense Transaction Ledger</span>
              <span style={{ fontSize: '0.72rem', color: '#6c6258' }}>{expenses.length} Records</span>
            </h2>
            {expenses.length === 0 ? (
              <div className={styles.emptyCallout}>
                <CheckCircle2 size={16} color="#22c55e" />
                <span>Zero transaction entries recorded during this billing cycle.</span>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Method</th>
                      <th className={styles.textRight}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedExpenses.map(exp => {
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
                          <td className={styles.textRight}><strong>{formatCurrency(exp.amount)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Recurring Commitments Section */}
            <h2 className={styles.sectionTitle}>
              <span>Recurring Commitments & Subscriptions</span>
              <span style={{ fontSize: '0.72rem', color: '#6c6258' }}>{recurringExpenses.length} Active</span>
            </h2>
            {recurringExpenses.length === 0 ? (
              <div className={styles.emptyCallout}>
                <Layers size={16} color="#6c6258" />
                <span>No active scheduled recurring commitments or recurring bills registered.</span>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Frequency</th>
                      <th>Next Due Date</th>
                      <th className={styles.textRight}>Amount</th>
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
                          <td>{recur.frequency}</td>
                          <td>{formatDisplayDate(recur.next_due_date)}</td>
                          <td className={styles.textRight}><strong>{formatCurrency(recur.amount)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Smart Insights */}
            <h2 className={styles.sectionTitle}>Strategic Financial Insights</h2>
            <div className={styles.insightsList}>
              {insights.map((insight, idx) => {
                const isWarning = insight.tone === 'warning';
                const isDanger = insight.tone === 'danger';
                const isSuccess = insight.tone === 'success';
                return (
                  <div 
                    key={`insight-${idx}`} 
                    className={`${styles.insightCard} ${isDanger ? styles.insightCardDanger : isWarning ? styles.insightCardWarning : isSuccess ? styles.insightCardSuccess : ''}`}
                  >
                    {isDanger || isWarning ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                    <span>{insight.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Financial Recommendations */}
            <h2 className={styles.sectionTitle}>Actionable Advisory Recommendations</h2>
            <div className={styles.recsList}>
              {recommendations.map((rec, idx) => (
                <div 
                  key={`rec-${idx}`} 
                  className={`${styles.recCard} ${rec.primary ? styles.recCardPrimary : ''}`}
                >
                  <Award size={15} />
                  <span>{rec.text}</span>
                </div>
              ))}
            </div>

            {/* Compliance / Statement Stamp */}
            <div className={styles.complianceStamp}>
              <span>Certified BudgetOS Financial Engine Record</span>
              <span>Generated for {accountHolderEmail}</span>
            </div>
          </div>

          {renderFooter(3)}
        </div>
      ) : (
        /* Multi-Page Flow when large transaction ledger exists */
        <>
          {expenseChunks.map((chunk, chunkIdx) => (
            <div className={styles.pdfPage} key={`exp-chunk-${chunkIdx}`}>
              <div>
                {renderHeader(`Expense Ledger (Part ${chunkIdx + 1})`)}
                <h2 className={styles.sectionTitle}>
                  <span>Expense Transaction Ledger (Page {chunkIdx + 1} of {expenseChunks.length})</span>
                  <span style={{ fontSize: '0.72rem', color: '#6c6258' }}>Showing {chunk.length} items</span>
                </h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Method</th>
                        <th className={styles.textRight}>Amount</th>
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
                            <td className={styles.textRight}><strong>{formatCurrency(exp.amount)}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {renderFooter(3 + chunkIdx)}
            </div>
          ))}

          {/* Final Summary & Advisory Page */}
          <div className={styles.pdfPage}>
            <div>
              {renderHeader("Commitments & Strategic Advisory")}

              {/* Recurring Commitments Section */}
              <h2 className={styles.sectionTitle}>
                <span>Recurring Commitments & Subscriptions</span>
                <span style={{ fontSize: '0.72rem', color: '#6c6258' }}>{recurringExpenses.length} Active</span>
              </h2>
              {recurringExpenses.length === 0 ? (
                <div className={styles.emptyCallout}>
                  <Layers size={16} color="#6c6258" />
                  <span>No active scheduled recurring commitments or recurring bills registered.</span>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Frequency</th>
                        <th>Next Due Date</th>
                        <th className={styles.textRight}>Amount</th>
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
                            <td>{recur.frequency}</td>
                            <td>{formatDisplayDate(recur.next_due_date)}</td>
                            <td className={styles.textRight}><strong>{formatCurrency(recur.amount)}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Strategic Insights */}
              <h2 className={styles.sectionTitle}>Strategic Financial Insights</h2>
              <div className={styles.insightsList}>
                {insights.map((insight, idx) => {
                  const isWarning = insight.tone === 'warning';
                  const isDanger = insight.tone === 'danger';
                  const isSuccess = insight.tone === 'success';
                  return (
                    <div 
                      key={`insight-${idx}`} 
                      className={`${styles.insightCard} ${isDanger ? styles.insightCardDanger : isWarning ? styles.insightCardWarning : isSuccess ? styles.insightCardSuccess : ''}`}
                    >
                      {isDanger || isWarning ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                      <span>{insight.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Recommendations */}
              <h2 className={styles.sectionTitle}>Actionable Advisory Recommendations</h2>
              <div className={styles.recsList}>
                {recommendations.map((rec, idx) => (
                  <div 
                    key={`rec-${idx}`} 
                    className={`${styles.recCard} ${rec.primary ? styles.recCardPrimary : ''}`}
                  >
                    <Award size={15} />
                    <span>{rec.text}</span>
                  </div>
                ))}
              </div>

              {/* Compliance Stamp */}
              <div className={styles.complianceStamp}>
                <span>Certified BudgetOS Financial Engine Record</span>
                <span>Generated for {accountHolderEmail}</span>
              </div>
            </div>
            {renderFooter(totalPages)}
          </div>
        </>
      )}
    </div>
  );
}

export default BudgetReport;
