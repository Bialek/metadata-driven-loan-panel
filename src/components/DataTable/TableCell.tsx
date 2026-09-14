import React from 'react';
import type { NormalizedColumn, TableRow } from '../../types/table';
import {
  formatText,
  formatNumber,
  formatCurrency,
  formatDate,
} from '../../logic/formatters';
import { StatusBadge } from './StatusBadge';
import { ActionButton } from './ActionButton';
import styles from './DataTable.module.css';

interface TableCellProps {
  column: NormalizedColumn;
  row: TableRow;
  onAction?: (actionId: string, row: TableRow) => void;
}

export const TableCell: React.FC<TableCellProps> = ({
  column,
  row,
  onAction,
}) => {
  const value = row.values[column.key];

  switch (column.type) {
    case 'action': {
      const isEnabled = Boolean(value);
      const actionName = column.action || 'edit';

      return (
        <td className={`${styles.td} ${styles.tdAction}`}>
          <ActionButton
            action={actionName}
            enabled={isEnabled}
            onClick={() => onAction?.(actionName, row)}
          />
        </td>
      );
    }

    case 'badge': {
      return (
        <td className={`${styles.td} ${styles.tdBadge}`}>
          <StatusBadge status={value} />
        </td>
      );
    }

    case 'currency': {
      return (
        <td className={`${styles.td} ${styles.tdCurrency}`}>
          {formatCurrency(value, column.currency)}
        </td>
      );
    }

    case 'date': {
      return (
        <td className={`${styles.td} ${styles.tdDate}`}>
          {formatDate(value)}
        </td>
      );
    }

    case 'number': {
      return (
        <td className={`${styles.td} ${styles.tdNumber}`}>
          {formatNumber(value)}
        </td>
      );
    }

    case 'text':
    default: {
      return (
        <td className={`${styles.td} ${styles.tdText}`}>
          {formatText(value)}
        </td>
      );
    }
  }
};
