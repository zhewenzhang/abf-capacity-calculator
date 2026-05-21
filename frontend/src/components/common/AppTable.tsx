import { Table } from 'antd';
import type { TableProps } from 'antd';

export interface AppTableProps<RecordType extends object = any> extends TableProps<RecordType> {
  /** Use compact row density (default: true) */
  compact?: boolean;
  /** Additional CSS class (app-table is always applied) */
  className?: string;
}

/**
 * Wrapper around Ant Design Table with standardized defaults:
 * - Compact row density
 * - Horizontal scroll for wide tables
 * - Consistent size="small"
 * - Always applies .app-table CSS class
 */
export const AppTable = <RecordType extends object = any>({
  compact = true,
  className = '',
  size = 'small',
  scroll = { x: 'max-content' as const },
  pagination = false,
  ...rest
}: AppTableProps<RecordType>) => (
  <Table<RecordType>
    size={size}
    scroll={scroll}
    pagination={pagination}
    className={`app-table ${className}`.trim()}
    {...rest}
  />
);

export default AppTable;
