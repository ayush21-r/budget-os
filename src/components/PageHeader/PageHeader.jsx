import styles from './PageHeader.module.css';

function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

export default PageHeader;
