import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const SearchableMultiSelect = ({
  label,
  placeholder = 'Select...',
  options = [],
  selected = [],
  onChange,
  getOptionLabel = (opt) => opt.name || opt.fullName || String(opt),
  getOptionValue = (opt) => opt.id || opt.value || opt,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(event.target))
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const updateMenuPosition = () => {
    if (!containerRef.current) return;
    const trigger = containerRef.current.getBoundingClientRect();
    setMenuPosition({
      top: trigger.bottom + 4,
      left: trigger.left,
      width: trigger.width,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const handleResize = () => updateMenuPosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((option) => {
    const label = getOptionLabel(option).toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

  const toggleValue = (value) => {
    if (!onChange) return;
    const valueStr = String(value);
    if (selected.some((s) => String(s) === valueStr)) {
      onChange(selected.filter((s) => String(s) !== valueStr));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    if (!onChange) return;
    const allValues = filteredOptions.map((opt) => getOptionValue(opt));
    const newSelected = [...new Set([...selected, ...allValues])];
    onChange(newSelected);
  };

  const handleDeselectAll = () => {
    if (!onChange) return;
    const filteredValues = filteredOptions.map((opt) => String(getOptionValue(opt)));
    onChange(selected.filter((s) => !filteredValues.includes(String(s))));
  };

  const removeSelected = (value, e) => {
    e.stopPropagation();
    if (!onChange) return;
    onChange(selected.filter((s) => String(s) !== String(value)));
  };

  const selectedOptions = options.filter((opt) =>
    selected.some((s) => String(getOptionValue(opt)) === String(s))
  );

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? getOptionLabel(selectedOptions[0])
        : `${selected.length} selected`;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mt-1 relative block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 pr-8 text-left text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
      >
        <div className="flex flex-wrap gap-1 items-center">
          {selectedOptions.length > 0 && selectedOptions.length <= 2 ? (
            selectedOptions.map((opt) => {
              const value = getOptionValue(opt);
              return (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs"
                >
                  {getOptionLabel(opt)}
                  <button
                    type="button"
                    onClick={(e) => removeSelected(value, e)}
                    className="hover:text-blue-900 focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              );
            })
          ) : selectedOptions.length > 2 ? (
            <span className="text-gray-900">{displayText}</span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={dropdownRef}
            className="bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-hidden z-[9999]"
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search members..."
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sticky top-0 bg-white border-b border-gray-200 flex gap-2 p-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Deselect All
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
              ) : (
                filteredOptions.map((option) => {
                  const optionValue = getOptionValue(option);
                  const isSelected = selected.some((s) => String(s) === String(optionValue));
                  return (
                    <button
                      key={optionValue}
                      type="button"
                      onClick={() => toggleValue(optionValue)}
                      className={`block w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 active:bg-gray-200 min-h-[44px] ${
                        isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="text-blue-600 rounded focus:ring-blue-500"
                          readOnly
                        />
                        <span>{getOptionLabel(option)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SearchableMultiSelect;

