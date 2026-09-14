import React from 'react';
import styles from './Feedback.module.css';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Wczytywanie wniosków…',
}) => {
  return (
    <div className={styles.feedbackContainer} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.feedbackText}>{message}</p>
    </div>
  );
};
