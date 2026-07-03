import BudgetPieChart from '../../charts/BudgetPieChart/BudgetPieChart.jsx';
import MonthlySpendingChart from '../../charts/MonthlySpendingChart/MonthlySpendingChart.jsx';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import Panel from '../../components/Panel/Panel.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { getMonthlySpendingData } from '../../utils/budgetUtils.js';
import { formatCurrency } from '../../utils/formatters.js';
import styles from './Analytics.module.css';

function Analytics({ budgetState, appState, overview, isArchivedView, activeMonthId, setActiveMonthId, monthOptions }) {
  usePageTitle('Analytics');

  const sortedCategories = [...overview.categoryTotals].sort((first, second) => second.spent - first.spent);
  const monthlyData = getMonthlySpendingData(budgetState, appState?.history || []);

  return (
    <div className="pageFade">
      <PageHeader
        eyebrow="Analytics"
        title="Spending patterns, minus the noise."
        description={isArchivedView ? 'Viewing analytics for a locked archived month.' : 'A focused view of spending mix, month-by-month behavior, and the categories carrying the most weight.'}
      />

      <section className={styles.chartGrid}>
        <Panel title="Category Spend" subtitle="Share of current recorded expenses.">
          <BudgetPieChart data={overview.categoryTotals.filter((category) => category.spent > 0)} />
        </Panel>
        <Panel title="Monthly Spending" subtitle={`${budgetState.profile.month} spending and savings.`}>
          <MonthlySpendingChart data={monthlyData} />
        </Panel>
      </section>

      <section className={styles.bottomGrid}>
        <Panel
          title="Category Summary"
          subtitle={`${formatCurrency(overview.spent)} total expenses, ${formatCurrency(overview.remaining_budget)} remaining budget.`}
          actions={
            <select className={styles.monthSelect} value={activeMonthId} onChange={(event) => setActiveMonthId(event.target.value)}>
              {monthOptions.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.label}
                </option>
              ))}
            </select>
          }
        >
          <div className={styles.summaryList}>
            {overview.categoryTotals.map((category) => (
              <article key={category.id} className={styles.summaryRow}>
                <div className={styles.summaryHeader}>
                  <span style={{ backgroundColor: category.color }} />
                  <strong>{category.name}</strong>
                </div>
                <p className={styles.summaryValue}>
                  <span>Budget</span>
                  <strong>{formatCurrency(category.budget)}</strong>
                </p>
                <p className={styles.summaryValue}>
                  <span>Spent</span>
                  <strong>{formatCurrency(category.spent)}</strong>
                </p>
                <p className={styles.summaryValue}>
                  <span>Remaining</span>
                  <strong>{formatCurrency(category.remaining)}</strong>
                </p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Top Spending Categories" subtitle={`Highest: ${overview.highestSpendingCategory?.name || 'None'}. Savings progress: ${Math.round(overview.savingsProgress)}%.`}>
          <div className={styles.rankList}>
            {sortedCategories.slice(0, 5).map((category, index) => (
              <article key={category.id} className={styles.rankRow}>
                <span>{index + 1}</span>
                <div>
                  <strong>{category.name}</strong>
                  <p>{Math.round(category.percentage)}% of category budget used</p>
                </div>
                <strong>{formatCurrency(category.spent)}</strong>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

export default Analytics;
