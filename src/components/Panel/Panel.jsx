import styles from './Panel.module.css';

function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`${styles.panel} ${className}`}>
      {(title || actions) && (
        <div className={styles.header}>
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export default Panel;
