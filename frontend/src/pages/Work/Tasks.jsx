import { Fragment, useEffect, useMemo, useState } from 'react';
import { FiEye, FiEdit2, FiBookmark, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { taskService } from '../../api/taskService';
import { projectService } from '../../api/projectService';
import { employeeService } from '../../api/employeeService';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import Modal from '../../components/UI/Modal';
import CategoryManagerModal from './components/CategoryManagerModal';
import TaskDetailModal from '../../components/Tasks/TaskDetailModal';
import SearchableMultiSelect from '../../components/UI/SearchableMultiSelect';
import { formatDate } from '../../utils/formatters';

const BOARD_COLUMNS = [
  { title: 'Incomplete', status: 'INCOMPLETE', accent: 'text-red-500' },
  { title: 'To Do', status: 'PENDING', accent: 'text-yellow-500' },
  { title: 'Doing', status: 'IN_PROGRESS', accent: 'text-blue-600' },
  { title: 'Completed', status: 'COMPLETED', accent: 'text-green-600' },
];

const Tasks = () => {
  const { isAdmin, getModulePermission } = useAuth();

  // Get permissions for Tasks module
  const canAdd = isAdmin() || getModulePermission('Tasks', 'add') !== 'None';
  const canUpdate = isAdmin() || getModulePermission('Tasks', 'update') !== 'None';
  const canDelete = isAdmin() || getModulePermission('Tasks', 'delete') !== 'None';
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'ALL', assignedTo: 'ALL', search: '' });
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskCategories, setTaskCategories] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [taskDetailModalOpen, setTaskDetailModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const hasAllViewPermission = getModulePermission('Tasks', 'view') === 'All';
      const [tasksResponse, projectsResponse, employeesResponse, categoryResponse] = await Promise.all([
        (isAdmin() || hasAllViewPermission) ? taskService.getAll() : taskService.getMyTasks(),
        projectService.getAll(),
        employeeService.getAll(),
        taskService.getCategories(),
      ]);
      setTasks(tasksResponse.data);
      setProjects(projectsResponse.data);
      setEmployees(employeesResponse.data);
      setTaskCategories(categoryResponse.data);
    } catch (error) {
      alert('Unable to load tasks right now.');
    } finally {
      setLoading(false);
    }
  };

  const refreshCategories = async () => {
    const response = await taskService.getCategories();
    setTaskCategories(response.data);
  };

  const handleCategoryAdd = async (name) => {
    try {
      await taskService.createCategory({ name });
      await refreshCategories();
    } catch (error) {
      alert('Unable to add category.');
    }
  };

  const handleCategoryDelete = async (category) => {
    if (!window.confirm(`Delete category ${category.name}?`)) return;
    try {
      await taskService.deleteCategory(category.id);
      await refreshCategories();
    } catch (error) {
      alert('Unable to delete category.');
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = filters.status === 'ALL' || task.status === filters.status;
      const matchesAssigned =
        filters.assignedTo === 'ALL' || task.assignedToId === Number(filters.assignedTo);
      const matchesSearch =
        !filters.search ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        (task.projectName || '').toLowerCase().includes(filters.search.toLowerCase());
      return matchesStatus && matchesAssigned && matchesSearch;
    });
  }, [tasks, filters]);

  const handleTaskSave = async (formState, attachmentFile) => {
    const payload = {
      title: formState.title,
      description: formState.description,
      startDate: formState.startDate,
      dueDate: formState.dueDate,
      status: formState.status,
      priority: formState.priority,
      assignedToIds: formState.assignedToIds || [],
      projectId: formState.projectId,
      categoryId: formState.categoryId || null,
      pinned: formState.pinned,
    };

    try {
      let response;
      if (editingTask) {
        response = await taskService.update(editingTask.id, payload);
      } else {
        response = await taskService.create(payload);
      }
      if (attachmentFile) {
        const data = new FormData();
        data.append('file', attachmentFile);
        await taskService.uploadAttachment(response.data.id, data);
      }
      setTaskModalOpen(false);
      setEditingTask(null);
      await loadData();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unable to save task.';
      alert(errorMessage);
    }
  };

  const handleTaskDelete = async (task) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await taskService.delete(task.id);
      await loadData();
    } catch (error) {
      alert('Unable to delete task.');
    }
  };

  const handleTaskPin = async (task) => {
    try {
      await taskService.update(task.id, {
        title: task.title,
        description: task.description,
        startDate: task.startDate,
        dueDate: task.dueDate,
        status: task.status,
        priority: task.priority,
        assignedToId: task.assignedToId,
        projectId: task.projectId,
        categoryId: task.categoryId,
        pinned: !task.pinned,
      });
      await loadData();
    } catch (error) {
      alert('Unable to update pin state.');
    }
  };

  const handleTaskStatusChange = async (task, status) => {
    try {
      await taskService.update(task.id, {
        title: task.title,
        description: task.description,
        startDate: task.startDate,
        dueDate: task.dueDate,
        status,
        priority: task.priority,
        assignedToId: task.assignedToId,
        projectId: task.projectId,
        categoryId: task.categoryId,
        pinned: task.pinned,
      });
      await loadData();
    } catch (error) {
      alert('Unable to update task status.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-600">
        Loading tasks…
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow md:flex-row md:items-center md:justify-between">
              <div className="hidden">
                {/* Page title removed - shown in topbar */}
              </div>
              {canAdd && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setTaskModalOpen(true);
                  }}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  + Add Task
                </button>
              )}
            </div>

            <section className="grid gap-3 rounded-xl bg-white p-4 shadow md:grid-cols-4">
              <select
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                className="rounded border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All status</option>
                {BOARD_COLUMNS.map((column) => (
                  <option key={column.status} value={column.status}>
                    {column.title}
                  </option>
                ))}
              </select>
              <select
                value={filters.assignedTo}
                onChange={(event) => setFilters({ ...filters, assignedTo: event.target.value })}
                className="rounded border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All assignees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Search tasks or project"
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                className="md:col-span-2 rounded border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-4">
              {BOARD_COLUMNS.map((column) => (
                <div key={column.status} className="flex flex-col rounded-xl bg-white p-4 shadow">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-semibold ${column.accent}`}>{column.title}</h3>
                    <span className="text-xs text-gray-400">
                      {filteredTasks.filter((task) => task.status === column.status).length}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] flex-1">
                    {filteredTasks
                      .filter((task) => task.status === column.status)
                      .map((task) => (
                        <article key={task.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 shadow-sm">
                          <header className="flex items-start justify-between gap-2">
                            <div className="flex-1 cursor-pointer" onClick={() => {
                              setViewingTask(task);
                              setTaskDetailModalOpen(true);
                            }}>
                              <p className="text-sm font-semibold text-gray-800 hover:text-blue-600">{task.title}</p>
                              <p className="text-xs text-gray-500">{task.projectName || 'General task'}</p>
                            </div>
                            {task.pinned && <span className="text-xs text-yellow-500">Pinned</span>}
                          </header>
                          <div className="mt-2 text-xs text-gray-500">
                            <p>Assigned: {task.assignedToName}</p>
                            <p>Due: {formatDate(task.dueDate) || '—'}</p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800"
                              onClick={() => {
                                setViewingTask(task);
                                setTaskDetailModalOpen(true);
                              }}
                              title="View task details"
                            >
                              <FiEye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </button>
                            {canUpdate && (
                              <Fragment>
                                <button
                                  type="button"
                                  className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setTaskModalOpen(true);
                                  }}
                                  title="Edit task"
                                >
                                  <FiEdit2 className="h-3.5 w-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                                    task.pinned
                                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 hover:text-yellow-800'
                                      : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-700'
                                  }`}
                                  onClick={() => handleTaskPin(task)}
                                  title={task.pinned ? 'Unpin task' : 'Pin task'}
                                >
                                  <FiBookmark className="h-3.5 w-3.5" />
                                  <span>{task.pinned ? 'Unpin' : 'Pin'}</span>
                                </button>
                              </Fragment>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 hover:text-red-800"
                                onClick={() => handleTaskDelete(task)}
                                title="Delete task"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                          {isAdmin() && (
                            <div className="mt-3">
                              <select
                                value={task.status}
                                onChange={(event) => handleTaskStatusChange(task, event.target.value)}
                                className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                              >
                                <option value="INCOMPLETE">Incomplete</option>
                                <option value="PENDING">To Do</option>
                                <option value="IN_PROGRESS">Doing</option>
                                <option value="COMPLETED">Completed</option>
                              </select>
                            </div>
                          )}
                        </article>
                      ))}
                    {filteredTasks.filter((task) => task.status === column.status).length === 0 && (
                      <p className="text-xs text-gray-400">No tasks here yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </div>
        </main>
      </div>

      <GlobalTaskFormModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        projects={projects}
        employees={employees}
        categories={taskCategories}
        onSave={handleTaskSave}
        onManageCategories={() => setCategoryModalOpen(true)}
      />

      <CategoryManagerModal
        title="Task Categories"
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={taskCategories}
        onAdd={handleCategoryAdd}
        onDelete={handleCategoryDelete}
      />

      <TaskDetailModal
        isOpen={taskDetailModalOpen}
        onClose={() => {
          setTaskDetailModalOpen(false);
          setViewingTask(null);
        }}
        task={viewingTask}
        projectName={viewingTask?.projectName}
        onStatusChange={handleTaskStatusChange}
      />
    </div>
  );
};

const GlobalTaskFormModal = ({
  isOpen,
  onClose,
  task,
  projects,
  employees,
  categories,
  onSave,
  onManageCategories,
}) => {
  const defaultState = {
    title: '',
    description: '',
    projectId: projects[0]?.id || '',
    assignedToIds: [],
    startDate: '',
    dueDate: '',
    status: 'PENDING',
    priority: 'MEDIUM',
    categoryId: '',
    pinned: false,
  };
  const [formState, setFormState] = useState(defaultState);
  const [attachmentFile, setAttachmentFile] = useState(null);

  useEffect(() => {
    if (task) {
      setFormState({
        title: task.title,
        description: task.description || '',
        projectId: task.projectId,
        assignedToIds: task.assignedToIds && task.assignedToIds.length > 0 
          ? task.assignedToIds 
          : (task.assignedToId ? [task.assignedToId] : []),
        startDate: task.startDate || '',
        dueDate: task.dueDate || '',
        status: task.status || 'PENDING',
        priority: task.priority || 'MEDIUM',
        categoryId: task.categoryId || '',
        pinned: task.pinned || false,
      });
    } else {
      setFormState(defaultState);
    }
    setAttachmentFile(null);
  }, [task, isOpen]);

  const updateState = (patch) => setFormState((prev) => ({ ...prev, ...patch }));

  const currentProjectMembers = useMemo(() => {
    const project = projects.find((item) => item.id === Number(formState.projectId));
    return project?.members || [];
  }, [projects, formState.projectId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      alert('Task title is required.');
      return;
    }
    if (!formState.projectId) {
      alert('Select a project.');
      return;
    }
    if (!formState.assignedToIds || formState.assignedToIds.length === 0) {
      alert('Assign this task to at least one member.');
      return;
    }
    if (!formState.startDate) {
      alert('Start date is required.');
      return;
    }
    onSave(formState, attachmentFile);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'Add Task'} size="lg" variant="panel">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Project *
            <select
              value={formState.projectId}
              onChange={(event) => updateState({ projectId: Number(event.target.value), assignedToIds: [] })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <SearchableMultiSelect
              label="Assigned To"
              placeholder="Select members"
              options={currentProjectMembers}
              selected={formState.assignedToIds}
              onChange={(selectedIds) => updateState({ assignedToIds: selectedIds })}
              required
            />
          </div>
          <label className="text-sm font-medium text-gray-700">
            Task Title *
            <input
              type="text"
              value={formState.title}
              onChange={(event) => updateState({ title: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Category
            <div className="mt-1 flex gap-2">
              <select
                value={formState.categoryId}
                onChange={(event) => updateState({ categoryId: event.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onManageCategories}
                className="rounded border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Manage
              </button>
            </div>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Status
            <select
              value={formState.status}
              onChange={(event) => updateState({ status: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="PENDING">To Do</option>
              <option value="INCOMPLETE">Incomplete</option>
              <option value="IN_PROGRESS">Doing</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Start Date *
            <input
              type="date"
              value={formState.startDate}
              onChange={(event) => updateState({ startDate: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Due Date
            <input
              type="date"
              value={formState.dueDate}
              onChange={(event) => updateState({ dueDate: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Priority
            <select
              value={formState.priority}
              onChange={(event) => updateState({ priority: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>
        </div>
        <label className="text-sm font-medium text-gray-700">
          Description
          <textarea
            rows={4}
            value={formState.description}
            onChange={(event) => updateState({ description: event.target.value })}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={formState.pinned}
            onChange={(event) => updateState({ pinned: event.target.checked })}
          />
          Pin task
        </label>
        <div className="rounded border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
          <p>Attachment (optional)</p>
          <input type="file" className="mt-2 text-sm" onChange={(event) => setAttachmentFile(event.target.files?.[0])} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-200 px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Save Task
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Tasks;

