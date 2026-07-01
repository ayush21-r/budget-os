import { X } from 'lucide-react';
import Button from '../Button/Button.jsx';
import styles from './Modal.module.css';

function Modal({ title, children, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <Button variant="secondary" icon={X} onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default Modal;
