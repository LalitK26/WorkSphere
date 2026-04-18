import { useState, useEffect, useRef, useCallback } from 'react';
import { employeeService } from '../../api/employeeService';
import { useDebounce } from '../../hooks/useDebounce';

/**
 * Optimized searchable employee select component with server-side search
 * Loads employees on-demand with pagination and debounced search
 */
const SearchableEmployeeSelect = ({
  selectedIds = [],
  onSelectionChange,
  multiple = true,
  placeholder = 'Select employees...',
  disabled = false,
  className = '',
  maxHeight = 'max-h-60'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedEmployeesMap, setSelectedEmployeesMap] = useState({});
  const dropdownRef = useRef(null);
  const scrollRef = useRef(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const pageSize = 50;

  // Load employees with server-side search
  const loadEmployees = useCallback(async (pageNum = 0, search = '') => {
    try {
      setLoading(true);
      // Trim search term to avoid issues with leading/trailing spaces
      const trimmedSearch = search ? search.trim() : '';
      const response = await employeeService.getAllPaginated(pageNum, pageSize, trimmedSearch);
      const newEmployees = response.data.content || [];
      
      if (pageNum === 0) {
        setEmployees(newEmployees);
      } else {
        setEmployees(prev => [...prev, ...newEmployees]);
      }
      
      setTotalElements(response.data.totalElements || 0);
      setHasMore(response.data.totalPages > pageNum + 1);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading employees:', error);
      // On error, show empty state
      if (pageNum === 0) {
        setEmployees([]);
        setTotalElements(0);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // Load employees when dropdown opens
  useEffect(() => {
    if (isOpen && employees.length === 0) {
      loadEmployees(0, '');
    }
  }, [isOpen, employees.length, loadEmployees]);

  // Reload when search changes
  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setEmployees([]);
      setHasMore(true); // Reset hasMore when search changes
      loadEmployees(0, debouncedSearch);
    }
  }, [debouncedSearch, isOpen, loadEmployees]);

  // Load more on scroll (infinite scroll)
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loading || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      loadEmployees(page + 1, debouncedSearch);
    }
  }, [page, debouncedSearch, loading, hasMore, loadEmployees]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selectedEmployeesMap when employees are loaded
  useEffect(() => {
    setSelectedEmployeesMap(prevMap => {
      const newMap = { ...prevMap };
      let hasChanges = false;
      employees.forEach(emp => {
        const idStr = String(emp.id);
        if (selectedIds.includes(idStr)) {
          newMap[idStr] = emp;
          hasChanges = true;
        }
      });
      return hasChanges ? newMap : prevMap;
    });
  }, [employees, selectedIds]);

  // Clean up selectedEmployeesMap when IDs are removed and load missing employees
  useEffect(() => {
    setSelectedEmployeesMap(prevMap => {
      // Clean up removed IDs
      const currentIdsSet = new Set(selectedIds);
      const cleanedMap = {};
      Object.keys(prevMap).forEach(id => {
        if (currentIdsSet.has(id)) {
          cleanedMap[id] = prevMap[id];
        }
      });

      // Find and load missing employees
      const missingIds = selectedIds.filter(id => !cleanedMap[id]);
      if (missingIds.length > 0) {
        Promise.all(
          missingIds.map(id => employeeService.getById(id).catch(() => null))
        ).then(responses => {
          setSelectedEmployeesMap(currentMap => {
            const updatedMap = { ...currentMap };
            responses.forEach((response, index) => {
              if (response?.data) {
                updatedMap[missingIds[index]] = response.data;
              }
            });
            return updatedMap;
          });
        }).catch(error => {
          console.error('Error loading selected employees:', error);
        });
      }

      return cleanedMap;
    });
  }, [selectedIds]);

  const selectedEmployees = selectedIds
    .map(id => selectedEmployeesMap[id])
    .filter(Boolean);

  const toggleEmployee = (employeeId) => {
    const idStr = String(employeeId);
    if (multiple) {
      const newSelection = selectedIds.includes(idStr)
        ? selectedIds.filter(id => id !== idStr)
        : [...selectedIds, idStr];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([idStr]);
      setIsOpen(false);
    }
  };

  const removeEmployee = (employeeId, e) => {
    e.stopPropagation();
    const idStr = String(employeeId);
    const newSelection = selectedIds.filter(id => id !== idStr);
    onSelectionChange(newSelection);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left bg-white flex items-start justify-between min-h-[42px] focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <div className="flex-1 flex flex-wrap gap-1 items-center min-w-0 py-0.5">
          {selectedEmployees.length === 0 ? (
            <span className="text-gray-500">{placeholder}</span>
          ) : multiple ? (
            selectedEmployees.map((emp) => (
              <span
                key={emp.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium flex-shrink-0"
              >
                <span className="truncate max-w-[150px]">{emp.fullName}</span>
                <button
                  type="button"
                  onClick={(e) => removeEmployee(emp.id, e)}
                  className="hover:bg-blue-200 rounded-full p-0.5 flex-shrink-0"
                  tabIndex={-1}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-900 truncate">
              {selectedEmployees[0]?.fullName || placeholder}
            </span>
          )}
        </div>
        <svg className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg ${maxHeight} overflow-hidden`}>
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employees..."
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {totalElements > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {employees.length} of {totalElements} employees
              </div>
            )}
          </div>
          
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-auto max-h-48"
          >
            {loading && employees.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">Loading employees...</div>
            ) : employees.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No employees found' : 'No employees available'}
              </div>
            ) : (
              <>
                {employees.map((emp) => {
                  const isSelected = selectedIds.includes(String(emp.id));
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleEmployee(emp.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center ${
                        isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      {multiple && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      )}
                      <span className="truncate">{emp.fullName}</span>
                      {emp.designationName && (
                        <span className="ml-2 text-xs text-gray-500 truncate">
                          ({emp.designationName})
                        </span>
                      )}
                    </button>
                  );
                })}
                {loading && employees.length > 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">Loading more...</div>
                )}
                {!hasMore && employees.length > 0 && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center border-t">
                    All employees loaded
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableEmployeeSelect;
