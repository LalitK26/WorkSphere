import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MultiSelectDropdown = ({ label, placeholder, options = [], selected = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(event.target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    if (!open) return;
    updateMenuPosition();
    const handleResize = () => updateMenuPosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [open]);

  const toggleValue = (value) => {
    if (!onChange) return;
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    if (!onChange) return;
    onChange(options.map((opt) => opt.value));
  };

  const handleDeselectAll = () => {
    if (!onChange) return;
    onChange([]);
  };

  const summaryText =
    selected.length === 0
      ? placeholder || 'Select'
      : selected.length === options.length
        ? 'All selected'
        : `${selected.length} selected`;

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-left text-gray-900 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={selected.length === 0 ? 'text-gray-500' : ''}>{summaryText}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transform transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={dropdownRef}
            className="bg-white border border-gray-200 rounded shadow-lg max-h-64 overflow-auto z-[9999]"
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
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
            <div className="p-2 space-y-1 max-h-56 overflow-y-auto">
              {options.length === 0 ? (
                <p className="text-sm text-gray-500">No options available</p>
              ) : (
                options.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="text-blue-600 rounded"
                      checked={selected.includes(option.value)}
                      onChange={() => toggleValue(option.value)}
                    />
                    <span className="text-sm text-gray-900">{option.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default MultiSelectDropdown;


