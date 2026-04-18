import { useEffect, useState } from 'react';
import Modal from '../../../components/UI/Modal';

const CategoryManagerModal = ({
  title,
  isOpen,
  onClose,
  categories = [],
  onAdd,
  onDelete,
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
    }
  }, [isOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      alert('Please enter a category name.');
      return;
    }
    onAdd(name);
    setName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="text-sm font-medium text-gray-700">
          Category Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          + Add Category
        </button>
      </form>
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-800">Existing categories</h4>
        <ul className="mt-2 divide-y divide-gray-200 text-sm">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between py-2">
              <span>{category.name}</span>
              <button
                type="button"
                onClick={() => onDelete(category)}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </li>
          ))}
          {categories.length === 0 && (
            <p className="py-3 text-xs text-gray-400">No categories yet.</p>
          )}
        </ul>
      </div>
    </Modal>
  );
};

export default CategoryManagerModal;


