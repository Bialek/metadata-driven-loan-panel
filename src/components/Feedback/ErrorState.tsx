import React from 'react';
import styles from './Feedback.module.css';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className={`${styles.feedbackContainer} ${styles.errorBox}`} role="alert">
      <div className={styles.errorIconWrapper} aria-hidden="true">
        <svg className={styles.errorIcon} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 className={styles.errorTitle}>Wystąpił błąd podczas ładowania danych</h2>
      <p className={styles.errorMessage}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={styles.retryButton}
        >
          Spróbuj ponownie
        </button>
      )}
    </div>
  );
};
