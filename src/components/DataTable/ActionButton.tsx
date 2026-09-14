import React from 'react';
import styles from './DataTable.module.css';

interface ActionButtonProps {
  action: string;
  enabled: boolean;
  onClick: () => void;
  label?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  enabled,
  onClick,
  label,
}) => {
  const displayLabel = label || (action === 'edit' ? 'Edytuj' : action);

  return (
    <button
      type="button"
      className={`${styles.actionButton} ${!enabled ? styles.actionButtonDisabled : ''}`}
      disabled={!enabled}
      onClick={enabled ? onClick : undefined}
      title={enabled ? `${displayLabel} wniosek` : 'Brak uprawnień do edycji'}
    >
      <svg
        className={styles.actionIcon}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
      <span>{displayLabel}</span>
    </button>
  );
};
