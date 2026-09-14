import React from 'react';
import styles from './Feedback.module.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className={styles.feedbackContainer} role="region" aria-label="Brak danych">
      <div className={styles.emptyIconWrapper} aria-hidden="true">
        <svg className={styles.emptyIcon} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v1H4zm7 0h5v-1h-5v1zm-7-3V9h12v1H4zm0-3V7a1 1 0 011-1h10a1 1 0 011 1v1H4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 className={styles.emptyTitle}>{title}</h2>
      {description && <p className={styles.emptyDescription}>{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={styles.emptyActionButton}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
