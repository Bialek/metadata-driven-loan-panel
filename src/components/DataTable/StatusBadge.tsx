import React from 'react';
import { formatStatus, MISSING_VALUE_PLACEHOLDER } from '../../logic/formatters';
import styles from './DataTable.module.css';

interface StatusBadgeProps {
  status: unknown;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const meta = formatStatus(status);

  if (!meta) {
    return <span>{MISSING_VALUE_PLACEHOLDER}</span>;
  }

  return (
    <span
      className={`${styles.badge} ${styles[`badge_${meta.variant}`] || styles.badge_default}`}
      data-status={String(status)}
    >
      <span className={styles.badgeDot} aria-hidden="true" />
      {meta.label}
    </span>
  );
};
