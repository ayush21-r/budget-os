import styles from './LoadingScreen.module.css';

function LoadingScreen() {
  return (
    <div className={styles.screen} aria-live="polite" aria-busy="true">
      <div className={styles.spinner} />
    </div>
  );
}

export default LoadingScreen;
