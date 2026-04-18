const Table = ({ columns, data, onRowClick }) => {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 bg-white">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-3 md:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 md:px-4 lg:px-6 py-4 text-center text-xs sm:text-sm text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr
                    key={index}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={onRowClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-3 md:px-4 lg:px-6 py-3 md:py-4 text-xs sm:text-sm text-gray-900">
                        <div className="max-w-[200px] md:max-w-none truncate md:whitespace-normal">
                          {column.render ? column.render(row[column.key], row) : row[column.key] || '—'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Table;

