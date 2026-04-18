import { Fragment, useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiEye, FiEdit2, FiBookmark, FiTrash2 } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { taskService } from '../../api/taskService';
import { projectService } from '../../api/projectService';
import { employeeService } from '../../api/employeeService';
import { departmentService } from '../../api/departmentService';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import Modal from '../../components/UI/Modal';
import Avatar from '../../components/UI/Avatar';
import CategoryManagerModal from './components/CategoryManagerModal';
import TaskDetailModal from '../../components/Tasks/TaskDetailModal';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import { getFullImageUrl } from '../../utils/imageUrl';

const PROJECT_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'members', label: 'Members' },
  { key: 'files', label: 'Files' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'taskboard', label: 'Task Board' },
];

const TASK_STATUS_OPTIONS = [
  { label: 'To Do', value: 'PENDING' },
  { label: 'Incomplete', value: 'INCOMPLETE' },
  { label: 'Doing', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
];

const TASK_PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Ensure we always have member objects for UI, even if backend only sends IDs/names
const hydrateProjectMembers = (project, employeeDirectory = []) => {
  if (!project) {
    return project;
  }

  // If backend already sends full members array, just use it
  if (project.members && project.members.length) {
    return project;
  }

  if (!project.memberIds || !project.memberIds.length) {
    return { ...project, members: [] };
  }

  const directoryMap = (employeeDirectory || []).reduce((acc, employee) => {
    if (employee?.id != null) {
      acc[employee.id] = employee;
    }
    return acc;
  }, {});

  const resolvedMembers = project.memberIds.map((memberId, index) => {
    const fallbackName = project.memberNames?.[index] || `Member ${index + 1}`;
    const entry = directoryMap[memberId];

    return {
      id: memberId,
      name: entry?.fullName || fallbackName,
      email: entry?.email || '',
      profilePictureUrl: entry?.profilePictureUrl || null,
      designation:
        entry?.designationName ||
        entry?.designation ||
        entry?.roleName ||
        '',
    };
  });

  return { ...project, members: resolvedMembers };
};

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user, getModulePermission } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [taskCategories, setTaskCategories] = useState([]);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [taskFilters, setTaskFilters] = useState({ status: 'ALL', assignedTo: 'ALL', search: '' });
  const [taskCategoryModalOpen, setTaskCategoryModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [taskDetailModalOpen, setTaskDetailModalOpen] = useState(false);

  // Check if user has "All" update permission for Projects module
  const hasAllUpdatePermission = isAdmin() || getModulePermission('Projects', 'update') === 'All';
  const canEdit = hasAllUpdatePermission || project?.projectAdminId === user?.userId;

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const [projectResponse, tasksResponse, employeesResponse, departmentsResponse, taskCategoryResponse, fileResponse] =
        await Promise.all([
          projectService.getById(id),
          taskService.getByProject(id),
          employeeService.getAll(),
          departmentService.getAll(),
          taskService.getCategories(),
          projectService.getFiles(id),
        ]);
      const employeeList = employeesResponse.data || [];
      const hydratedProject = hydrateProjectMembers(projectResponse.data, employeeList);

      setProject(hydratedProject);
      setTasks(tasksResponse.data);
      setEmployees(employeeList);
      setDepartments(departmentsResponse.data);
      setTaskCategories(taskCategoryResponse.data);
      setFiles(fileResponse.data);
    } catch (error) {
      alert('Unable to load project. Please go back.');
      navigate('/work/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminChange = async (memberId) => {
    if (!project) return;
    try {
      await projectService.update(project.id, {
        name: project.name,
        summary: project.summary,
        description: project.summary,
        startDate: project.startDate,
        deadline: project.deadline,
        status: project.status,
        progressPercentage: project.progressPercentage,
        autoProgress: project.autoProgress,
        departmentId: project.departmentId,
        categoryId: project.categoryId,
        memberIds: project.memberIds,
        projectAdminId: memberId,
        budget: project.budget,
        pinned: project.pinned,
      });
      await loadProject();
    } catch (error) {
      alert('Unable to update project admin.');
    }
  };

  const handleMemberDeletion = async (memberId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      const updatedMembers = project.memberIds.filter((idValue) => idValue !== memberId);
      await projectService.update(project.id, {
        name: project.name,
        summary: project.summary,
        description: project.summary,
        startDate: project.startDate,
        deadline: project.deadline,
        status: project.status,
        progressPercentage: project.progressPercentage,
        autoProgress: project.autoProgress,
        departmentId: project.departmentId,
        categoryId: project.categoryId,
        memberIds: updatedMembers,
        projectAdminId: project.projectAdminId,
        budget: project.budget,
        pinned: project.pinned,
      });
      await loadProject();
    } catch (error) {
      alert('Unable to remove project member.');
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = taskFilters.status === 'ALL' || task.status === taskFilters.status;
      const matchesAssignee = taskFilters.assignedTo === 'ALL' || task.assignedToId === Number(taskFilters.assignedTo);
      const matchesSearch =
        !taskFilters.search ||
        task.title.toLowerCase().includes(taskFilters.search.toLowerCase()) ||
        (task.code || '').toLowerCase().includes(taskFilters.search.toLowerCase());
      return matchesStatus && matchesAssignee && matchesSearch;
    });
  }, [tasks, taskFilters]);

  const handleTaskSave = async (payload, attachmentFile) => {
    const preparedPayload = {
      title: payload.title,
      description: payload.description,
      startDate: payload.startDate,
      dueDate: payload.dueDate,
      status: payload.status,
      priority: payload.priority,
      assignedToId: payload.assignedToId,
      projectId: id,
      categoryId: payload.categoryId || null,
      pinned: payload.pinned,
    };
    try {
      let response;
      if (editingTask) {
        response = await taskService.update(editingTask.id, preparedPayload);
      } else {
        response = await taskService.create(preparedPayload);
      }
      const savedTask = response.data;
      if (attachmentFile) {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        await taskService.uploadAttachment(savedTask.id, formData);
      }
      setTaskModalOpen(false);
      setEditingTask(null);
      await loadProject();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unable to save task. Check required fields.';
      alert(errorMessage);
    }
  };

  const refreshTaskCategories = async () => {
    const response = await taskService.getCategories();
    setTaskCategories(response.data);
  };

  const handleTaskCategoryAdd = async (name) => {
    try {
      await taskService.createCategory({ name });
      await refreshTaskCategories();
    } catch (error) {
      alert('Unable to create task category.');
    }
  };

  const handleTaskCategoryDelete = async (category) => {
    if (!window.confirm(`Delete category ${category.name}?`)) return;
    try {
      await taskService.deleteCategory(category.id);
      await refreshTaskCategories();
    } catch (error) {
      alert('Unable to delete task category.');
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
        projectId: id,
        categoryId: task.categoryId,
        pinned: task.pinned,
      });
      await loadProject();
    } catch (error) {
      alert('Unable to update task status.');
    }
  };

  const handleTaskDelete = async (task) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await taskService.delete(task.id);
      await loadProject();
    } catch (error) {
      alert('Unable to delete task');
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
        projectId: id,
        categoryId: task.categoryId,
        pinned: !task.pinned,
      });
      await loadProject();
    } catch (error) {
      alert('Failed to update task pin status.');
    }
  };

  const handleFileUpload = async (event) => {
    if (!project) return;
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10 MB max for project files)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10 MB');
      event.target.value = '';
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png', 'image/jpeg', 'application/zip'];
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'zip'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      alert('File type not allowed. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, ZIP');
      event.target.value = '';
      return;
    }

    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await projectService.uploadFile(project.id, formData);
      await loadProject();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to upload file.');
    } finally {
      setFileUploading(false);
      event.target.value = '';
    }
  };

  const handleFileDelete = async (file) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await projectService.deleteFile(file.id);
      await loadProject();
    } catch (error) {
      alert('File delete failed');
    }
  };

  const handleMemberModalSave = async ({ mode, selectedMemberIds, selectedDepartmentId }) => {
    if (!project) return;

    // Start from existing member IDs, normalised to numbers
    const existingMemberIds = (project.memberIds || []).map((id) => Number(id));
    let newMembers = [...existingMemberIds];

    if (mode === 'member') {
      selectedMemberIds.forEach((memberId) => {
        const numericId = Number(memberId);
        if (!Number.isNaN(numericId) && !newMembers.includes(numericId)) {
          newMembers.push(numericId);
        }
      });
    } else if (mode === 'department') {
      const departmentEmployees = employees.filter(
        (employee) => employee.departmentId === Number(selectedDepartmentId),
      );
      departmentEmployees.forEach((employee) => {
        const numericId = Number(employee.id);
        if (!Number.isNaN(numericId) && !newMembers.includes(numericId)) {
          newMembers.push(numericId);
        }
      });
    }

    // Ensure there are no duplicates and all IDs are numeric
    newMembers = Array.from(new Set(newMembers.filter((id) => !Number.isNaN(id))));

    try {
      await projectService.update(project.id, {
        // Send only the minimal, safe fields required to update members
        name: project.name,
        memberIds: newMembers,
        projectAdminId: project.projectAdminId,
      });
      setMemberModalOpen(false);
      await loadProject();
    } catch (error) {
      alert('Unable to add members to project.');
    }
  };

  if (loading || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-600">
        Loading project…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
            <div className="flex flex-col gap-3 sm:gap-4 rounded-xl bg-white p-3 sm:p-4 md:p-5 shadow">
              <div className="flex flex-1 flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 flex-shrink-0"
                  aria-label="Go back"
                >
                  <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 break-words">{project.name}</h1>
                    {project.categoryName && (
                      <span className="rounded-full bg-gray-100 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {project.categoryName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                    <span className="break-words">{project.departmentName || 'No department'}</span>
                    {project.deadline && (
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        <span className="hidden sm:inline">Deadline: </span>
                        <span>{formatDate(project.deadline)}</span>
                      </span>
                    )}
                    {project.startDate && (
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        <span className="hidden sm:inline">Start: </span>
                        <span>{formatDate(project.startDate)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="rounded-full bg-blue-50 px-2 sm:px-3 py-1 font-medium text-blue-700 whitespace-nowrap">{project.status}</span>
                <span className="rounded-full bg-green-50 px-2 sm:px-3 py-1 font-medium text-green-700 whitespace-nowrap">
                  {project.progressPercentage || 0}% complete
                </span>
                <span className="rounded-full bg-gray-100 px-2 sm:px-3 py-1 font-medium text-gray-700 whitespace-nowrap">
                  Budget: ₹{project.budget || 0}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2 rounded-xl bg-white p-1.5 sm:p-2 shadow overflow-x-auto">
              {PROJECT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold whitespace-nowrap ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && <OverviewTab project={project} tasks={tasks} />}

            {activeTab === 'members' && (
              <MembersTab
                project={project}
                employees={employees}
                canEdit={canEdit}
                onAdminChange={handleAdminChange}
                onRemove={handleMemberDeletion}
                onAddMembers={() => setMemberModalOpen(true)}
              />
            )}

            {activeTab === 'files' && (
              <FilesTab
                files={files}
                canEdit={canEdit}
                uploading={fileUploading}
                onUpload={handleFileUpload}
                onDelete={handleFileDelete}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksTab
                tasks={filteredTasks}
                members={project.members}
                canEdit={canEdit}
                filters={taskFilters}
                onFiltersChange={setTaskFilters}
                onAddTask={() => {
                  setEditingTask(null);
                  setTaskModalOpen(true);
                }}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setTaskModalOpen(true);
                }}
                onDeleteTask={handleTaskDelete}
                onPinTask={handleTaskPin}
                onStatusChange={handleTaskStatusChange}
                onViewTask={(task) => {
                  setViewingTask(task);
                  setTaskDetailModalOpen(true);
                }}
                onExport={() => exportTasks(filteredTasks)}
              />
            )}

            {activeTab === 'taskboard' && (
              <TaskBoard
                tasks={tasks}
                onPinTask={handleTaskPin}
                canEdit={canEdit}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setTaskModalOpen(true);
                }}
                onViewTask={(task) => {
                  setViewingTask(task);
                  setTaskDetailModalOpen(true);
                }}
                onStatusChange={handleTaskStatusChange}
              />
            )}
          </div>
        </main>
      </div>

      <AddMembersModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        employees={employees}
        departments={departments}
        onSave={handleMemberModalSave}
      />

      <TaskFormModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        members={project.members}
        categories={taskCategories}
        onSave={handleTaskSave}
        onManageCategories={() => setTaskCategoryModalOpen(true)}
      />

      <CategoryManagerModal
        title="Task Categories"
        isOpen={taskCategoryModalOpen}
        onClose={() => setTaskCategoryModalOpen(false)}
        categories={taskCategories}
        onAdd={handleTaskCategoryAdd}
        onDelete={handleTaskCategoryDelete}
      />

      <TaskDetailModal
        isOpen={taskDetailModalOpen}
        onClose={() => {
          setTaskDetailModalOpen(false);
          setViewingTask(null);
        }}
        task={viewingTask}
        projectName={project?.name}
        onStatusChange={(task, newStatus) => {
          handleTaskStatusChange(task, newStatus);
          loadProject();
        }}
      />
    </div>
  );
};

const OverviewTab = ({ project, tasks }) => {
  const completed = project.completedTasks || 0;
  const total = project.totalTasks || 0;
  const incomplete = total - completed;
  const progress = project.progressPercentage || 0;
  return (
    <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <div className="rounded-xl bg-white p-4 sm:p-6 shadow">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-800">Project Progress</h2>
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="flex-shrink-0">
            <AnimatedProgressRing value={progress} />
          </div>
          <div className="flex-1 space-y-3 w-full sm:w-auto">
            <div>
              <p className="text-[10px] sm:text-xs uppercase text-gray-500">Start Date</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-800">{formatDate(project.startDate) || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase text-gray-500">Deadline</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-800">{formatDate(project.deadline) || '—'}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="rounded-full bg-green-50 px-2 sm:px-3 py-1 text-green-700 whitespace-nowrap">Completed: {completed}</span>
              <span className="rounded-full bg-red-50 px-2 sm:px-3 py-1 text-red-600 whitespace-nowrap">Incomplete: {Math.max(0, incomplete)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-white p-4 sm:p-6 shadow">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-800">Project Summary</h2>
        <p className="mt-3 sm:mt-4 text-xs text-gray-600 break-words">{project.summary || 'Summary not added yet.'}</p>
        <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4 text-xs">
          <div>
            <p className="text-[10px] sm:text-xs uppercase text-gray-500">Project Admin</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 break-words">{project.projectAdminName || 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs uppercase text-gray-500">Members</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800">{project.members?.length || 0}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs uppercase text-gray-500">Category</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 break-words">{project.categoryName || 'Not Assigned'}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs uppercase text-gray-500">Budget</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800">₹{project.budget || 0}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const MembersTab = ({ project, employees, canEdit, onAdminChange, onRemove, onAddMembers }) => {
  // Extra safety: hydrate again using latest employee directory
  const hydrated = hydrateProjectMembers(project, employees);
  const allMembers = hydrated.members || [];
  const [searchQuery, setSearchQuery] = useState('');

  const members = useMemo(() => {
    if (!searchQuery) return allMembers;
    return allMembers.filter((member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allMembers, searchQuery]);

  return (
    <section className="rounded-xl bg-white p-3 sm:p-4 md:p-6 shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-800">Members</h2>
          <p className="text-[10px] sm:text-xs text-gray-500">Assign a single project admin and manage member access.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 sm:flex-initial rounded border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
          />
          {canEdit && (
            <button
              type="button"
              onClick={onAddMembers}
              className="rounded bg-blue-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
            >
              Add Members
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 sm:mt-6 overflow-hidden rounded-xl border border-gray-100">
        <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-xs sm:text-sm">
            <thead className="sticky top-0 bg-white text-[10px] sm:text-xs font-semibold uppercase text-gray-500 shadow-sm">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Name</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left hidden sm:table-cell">User Role</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Admin</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Avatar
                        profilePictureUrl={member.profilePictureUrl}
                        name={member.name}
                        fullName={member.name}
                        size="w-8 h-8 sm:w-10 sm:h-10"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{member.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell text-xs sm:text-sm">{member.designation || '—'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                    <input
                      type="radio"
                      name="projectAdmin"
                      disabled={!canEdit}
                      checked={project.projectAdminId === member.id}
                      onChange={() => onAdminChange(member.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(member.id)}
                      disabled={!canEdit}
                      className={`text-xs sm:text-sm font-semibold ${canEdit ? 'text-red-600 hover:text-red-700' : 'cursor-not-allowed text-gray-300'
                        }`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 sm:px-4 py-4 sm:py-6 text-center text-xs sm:text-sm text-gray-500">
                    {searchQuery ? 'No members match your search.' : 'No members assigned yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

const FilesTab = ({ files, canEdit, uploading, onUpload, onDelete }) => {
  const handleDownloadFile = async (file) => {
    try {
      const response = await projectService.downloadFile(file.id);
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.originalFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  return (
    <section className="rounded-xl bg-white p-3 sm:p-4 md:p-6 shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-800">Files</h2>
          <p className="text-[10px] sm:text-xs text-gray-500">Upload key documents and share with the team.</p>
        </div>
        {canEdit && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-gray-200 px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap">
            <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
            {uploading ? 'Uploading…' : '+ Upload File'}
          </label>
        )}
      </div>
      <div className="mt-4 sm:mt-6">
        {files.length === 0 && <p className="text-xs sm:text-sm text-gray-500">No files uploaded yet.</p>}
        <ul className="divide-y divide-gray-100">
          {files.map((file) => (
            <li key={file.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 py-3 text-xs sm:text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{file.originalFileName}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  Uploaded by {file.uploadedByName || 'unknown'} • {Math.round((file.sizeInBytes / 1024) * 100) / 100} KB
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(file)}
                  className="text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  Download
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDelete(file)}
                    className="text-red-600 hover:text-red-700 whitespace-nowrap"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const TasksTab = ({
  tasks,
  members,
  canEdit,
  filters,
  onFiltersChange,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onPinTask,
  onStatusChange,
  onViewTask,
  onExport,
}) => (
  <section className="rounded-xl bg-white p-3 sm:p-4 md:p-6 shadow">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-800">Tasks</h2>
        <p className="text-[10px] sm:text-xs text-gray-500">Track every deliverable with filters and exports.</p>
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={onAddTask}
          className="rounded bg-blue-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
        >
          + Add Task
        </button>
      )}
    </div>

    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
      <select
        value={filters.status}
        onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}
        className="rounded border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
      >
        <option value="ALL">All Status</option>
        {TASK_STATUS_OPTIONS.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <select
        value={filters.assignedTo}
        onChange={(event) => onFiltersChange({ ...filters, assignedTo: event.target.value })}
        className="rounded border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
      >
        <option value="ALL">All Members</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Search tasks"
        value={filters.search}
        onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
        className="md:col-span-2 rounded border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
      />
    </div>

    <div className="mt-3 sm:mt-4 text-right">
      <button
        type="button"
        onClick={onExport}
        className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        Export to Excel
      </button>
    </div>

    <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
      <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-xs sm:text-sm">
          <thead className="sticky top-0 bg-white text-[10px] sm:text-xs font-semibold uppercase text-gray-500 shadow-sm">
            <tr>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Task</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left hidden sm:table-cell">Start</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left hidden sm:table-cell">Due</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left hidden md:table-cell">Assigned</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Status</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-2 sm:px-4 py-2 sm:py-3 min-w-[150px]">
                  <p
                    className="cursor-pointer text-xs sm:text-sm font-semibold text-gray-800 hover:text-blue-600 break-words"
                    onClick={() => onViewTask(task)}
                  >
                    {task.title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500">{task.code}</p>
                  <div className="sm:hidden mt-1 text-[10px] text-gray-600">
                    <span>Start: {formatDate(task.startDate) || '—'}</span>
                    <span className="mx-2">•</span>
                    <span>Due: {formatDate(task.dueDate) || '—'}</span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs hidden sm:table-cell whitespace-nowrap">{formatDate(task.startDate) || '—'}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs hidden sm:table-cell whitespace-nowrap">{formatDate(task.dueDate) || '—'}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <Avatar
                      profilePictureUrl={task.assignedToAvatar}
                      fullName={task.assignedToName}
                      size="w-6 h-6 sm:w-8 sm:h-8"
                    />
                    <span className="text-xs sm:text-sm truncate">{task.assignedToName}</span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3">
                  <select
                    value={task.status}
                    disabled={!canEdit}
                    onChange={(event) => onStatusChange(task, event.target.value)}
                    className="rounded border border-gray-200 px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs md:text-sm w-full max-w-[120px] sm:max-w-none"
                  >
                    {TASK_STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3">
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    <button 
                      onClick={() => onViewTask(task)} 
                      className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] sm:text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800 whitespace-nowrap"
                      title="View task details"
                    >
                      <FiEye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>View</span>
                    </button>
                    {canEdit && (
                      <Fragment>
                        <button 
                          onClick={() => onEditTask(task)} 
                          className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-[10px] sm:text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 whitespace-nowrap"
                          title="Edit task"
                        >
                          <FiEdit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button 
                          onClick={() => onPinTask(task)} 
                          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                            task.pinned
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 hover:text-yellow-800'
                              : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-700'
                          }`}
                          title={task.pinned ? 'Unpin task' : 'Pin task'}
                        >
                          <FiBookmark className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span>{task.pinned ? 'Unpin' : 'Pin'}</span>
                        </button>
                        <button 
                          onClick={() => onDeleteTask(task)} 
                          className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] sm:text-xs font-medium text-red-700 transition-colors hover:bg-red-100 hover:text-red-800 whitespace-nowrap"
                          title="Delete task"
                        >
                          <FiTrash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span>Delete</span>
                        </button>
                      </Fragment>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 sm:px-4 py-4 sm:py-6 text-center text-xs sm:text-sm text-gray-500">
                  No tasks match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

const TaskBoard = ({ tasks, onPinTask, canEdit, onEditTask, onViewTask }) => {
  const columns = [
    { title: 'Incomplete', status: 'INCOMPLETE', color: 'text-red-600' },
    { title: 'To Do', status: 'PENDING', color: 'text-yellow-500' },
    { title: 'Doing', status: 'IN_PROGRESS', color: 'text-blue-600' },
    { title: 'Completed', status: 'COMPLETED', color: 'text-green-600' },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {columns.map((column) => (
        <div key={column.status} className="rounded-xl bg-white p-3 sm:p-4 shadow">
          <div className="flex items-center justify-between">
            <h3 className={`text-xs sm:text-sm font-semibold ${column.color}`}>{column.title}</h3>
            <span className="text-[10px] sm:text-xs text-gray-400">
              {tasks.filter((task) => task.status === column.status).length}
            </span>
          </div>
          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 max-h-[520px] overflow-y-auto pr-1 scroll-smooth">
            {tasks
              .filter((task) => task.status === column.status)
              .map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-2 sm:p-3 shadow-sm cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => onViewTask && onViewTask(task)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-gray-800 break-words">{task.title}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400">{task.code}</p>
                    </div>
                    {task.pinned && <span className="text-[10px] sm:text-xs text-yellow-500 flex-shrink-0">Pinned</span>}
                  </div>
                  <div className="mt-2 text-[10px] sm:text-xs text-gray-500">
                    <p className="truncate">Assigned: {task.assignedToName}</p>
                    <p>Due: {formatDate(task.dueDate) || '—'}</p>
                  </div>
                  {canEdit && (
                    <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] sm:text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800" 
                        onClick={() => onViewTask && onViewTask(task)}
                        title="View task details"
                      >
                        <FiEye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>View</span>
                      </button>
                      <button 
                        className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-[10px] sm:text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900" 
                        onClick={() => onEditTask(task)}
                        title="Edit task"
                      >
                        <FiEdit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button 
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] sm:text-xs font-medium transition-colors ${
                          task.pinned
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 hover:text-yellow-800'
                            : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-700'
                        }`}
                        onClick={() => onPinTask(task)}
                        title={task.pinned ? 'Unpin task' : 'Pin task'}
                      >
                        <FiPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>{task.pinned ? 'Unpin' : 'Pin'}</span>
                      </button>
                    </div>
                  )}
                  {!canEdit && (
                    <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] sm:text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800" 
                        onClick={() => onViewTask && onViewTask(task)}
                        title="View task details"
                      >
                        <FiEye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>View</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            {tasks.filter((task) => task.status === column.status).length === 0 && (
              <p className="text-[10px] sm:text-xs text-gray-400">No tasks in this column.</p>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};

const AddMembersModal = ({ isOpen, onClose, employees, departments, onSave }) => {
  const [mode, setMode] = useState('member');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setMode('member');
      setSelectedMemberIds([]);
      setSelectedDepartmentId('');
      setDepartmentSearch('');
      setMemberSearch('');
    }
  }, [isOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === 'member' && selectedMemberIds.length === 0) {
      alert('Select at least one member.');
      return;
    }
    if (mode === 'department' && !selectedDepartmentId) {
      alert('Choose a department.');
      return;
    }
    onSave({ mode, selectedMemberIds, selectedDepartmentId });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Members" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded border border-gray-200 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={mode === 'member'} onChange={() => setMode('member')} />
            Choose members
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="radio" checked={mode === 'department'} onChange={() => setMode('department')} />
            Choose department
          </label>
        </div>

        {mode === 'member' ? (
          <div>
            <input
              type="text"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Search employees"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const visibleEmployeeIds = employees
                    .filter((employee) =>
                      employee.fullName.toLowerCase().includes(memberSearch.toLowerCase())
                    )
                    .map((e) => e.id);
                  setSelectedMemberIds((prev) => {
                    const newIds = new Set([...prev, ...visibleEmployeeIds]);
                    return Array.from(newIds);
                  });
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                SELECT ALL
              </button>
              <button
                type="button"
                onClick={() => setSelectedMemberIds([])}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                DESELECT ALL
              </button>
            </div>
            <div className="mt-3 max-h-48 overflow-y-auto rounded border border-gray-100">
              {employees
                .filter((employee) =>
                  employee.fullName.toLowerCase().includes(memberSearch.toLowerCase()),
                )
                .map((employee) => (
                  <label
                    key={employee.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-gray-50 px-4 py-2 text-sm last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(employee.id)}
                      onChange={() =>
                        setSelectedMemberIds((prev) =>
                          prev.includes(employee.id)
                            ? prev.filter((idValue) => idValue !== employee.id)
                            : [...prev, employee.id],
                        )
                      }
                    />
                    <span>{employee.fullName}</span>
                    <span className="text-xs text-gray-400">{employee.departmentName || employee.roleName}</span>
                  </label>
                ))}
            </div>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={departmentSearch}
              onChange={(event) => setDepartmentSearch(event.target.value)}
              placeholder="Search departments"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={selectedDepartmentId}
              onChange={(event) => setSelectedDepartmentId(event.target.value)}
              className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select department</option>
              {departments
                .filter((department) =>
                  department.name.toLowerCase().includes(departmentSearch.toLowerCase()),
                )
                .map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-200 px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

const TaskFormModal = ({ isOpen, onClose, task, members = [], categories, onSave, onManageCategories }) => {
  const defaultState = {
    title: '',
    categoryId: '',
    startDate: '',
    dueDate: '',
    status: 'PENDING',
    assignedToId: members[0]?.id || '',
    description: '',
    priority: 'MEDIUM',
    pinned: false,
  };

  const [formState, setFormState] = useState(defaultState);
  const [attachmentFile, setAttachmentFile] = useState(null);

  useEffect(() => {
    if (task) {
      setFormState({
        title: task.title,
        categoryId: task.categoryId || '',
        startDate: task.startDate || '',
        dueDate: task.dueDate || '',
        status: task.status || 'PENDING',
        assignedToId: task.assignedToId,
        description: task.description || '',
        priority: task.priority || 'MEDIUM',
        pinned: task.pinned || false,
      });
    } else {
      setFormState(defaultState);
    }
    setAttachmentFile(null);
  }, [task, isOpen]);

  const updateState = (patch) => setFormState((prev) => ({ ...prev, ...patch }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      alert('Task title is required.');
      return;
    }
    if (!formState.startDate) {
      alert('Task start date is required.');
      return;
    }
    if (!formState.assignedToId) {
      alert('Please assign the task to a member.');
      return;
    }
    onSave(formState, attachmentFile);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'Add Task'} size="lg" variant="panel">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formState.title}
            onChange={(event) => updateState({ title: event.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Category</label>
            <div className="flex gap-2">
              <select
                value={formState.categoryId}
                onChange={(event) => updateState({ categoryId: event.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onManageCategories}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
              >
                Manage
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <select
              value={formState.assignedToId}
              onChange={(event) =>
                updateState({ assignedToId: event.target.value ? Number(event.target.value) : '' })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select assignee</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formState.startDate}
              onChange={(event) => updateState({ startDate: event.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={formState.dueDate}
              onChange={(event) => updateState({ dueDate: event.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formState.status}
              onChange={(event) => updateState({ status: event.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {TASK_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={formState.priority}
              onChange={(event) => updateState({ priority: event.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={4}
            value={formState.description}
            onChange={(event) => updateState({ description: event.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formState.pinned}
              onChange={(event) => updateState({ pinned: event.target.checked })}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Pin task (shows at top of list and board)</span>
          </label>
        </div>

        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
          <p>Attach supporting file (optional)</p>
          <input
            type="file"
            className="mt-2 text-sm"
            onChange={(event) => setAttachmentFile(event.target.files?.[0])}
          />
          {task?.attachmentName && !attachmentFile && (
            <p className="mt-2 text-xs text-gray-500">Current attachment: {task.attachmentName}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
          >
            Save Task
          </button>
        </div>
      </form>
    </Modal>
  );
};

const exportTasks = (tasks) => {
  if (!tasks.length) {
    alert('Nothing to export');
    return;
  }
  const header = ['Code', 'Title', 'Start', 'Due', 'Assigned', 'Status', 'Priority'];
  const rows = tasks.map((task) => [
    task.code,
    task.title,
    formatDate(task.startDate) || '—',
    formatDate(task.dueDate) || '—',
    task.assignedToName,
    task.status,
    task.priority,
  ]);
  const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'project-tasks.csv');
  link.click();
  URL.revokeObjectURL(url);
};

const AnimatedProgressRing = ({ value = 0 }) => {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDisplayValue(Math.min(100, Math.max(0, value))), 50);
    return () => clearTimeout(timeout);
  }, [value]);

  const offset = circumference * (1 - displayValue / 100);

  return (
    <div className="relative h-24 w-24 sm:h-32 sm:w-32 md:h-36 md:w-36">
      <svg className="h-24 w-24 sm:h-32 sm:w-32 md:h-36 md:w-36 -rotate-90" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="12"
          fill="transparent"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#22c55e"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-4 sm:inset-5 md:inset-6 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
        <span className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">{displayValue}%</span>
        <span className="text-[8px] sm:text-[10px] md:text-xs uppercase text-gray-400 tracking-wide">Complete</span>
      </div>
    </div>
  );
};

export default ProjectDetails;


