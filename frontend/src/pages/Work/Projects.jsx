import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { FiCalendar, FiDownload, FiFilter, FiGrid, FiSearch, FiStar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { projectService } from '../../api/projectService';
import { departmentService } from '../../api/departmentService';
import { employeeService } from '../../api/employeeService';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import Modal from '../../components/UI/Modal';
import Avatar from '../../components/UI/Avatar';
import SearchableEmployeeSelect from '../../components/UI/SearchableEmployeeSelect';
import CategoryManagerModal from './components/CategoryManagerModal';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = [
  { label: 'All status', value: 'ALL' },
  { label: 'Not started', value: 'PLANNING' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'On hold', value: 'ON_HOLD' },
  { label: 'Finished', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const VIEW_TABS = [
  { label: 'Projects', key: 'projects', icon: <FiGrid className="h-4 w-4" /> },
  { label: 'Calendar', key: 'calendar', icon: <FiCalendar className="h-4 w-4" /> },
  { label: 'Pinned', key: 'pinned', icon: <FiStar className="h-4 w-4" /> },
];

const Projects = () => {
  const { isAdmin, user, getModulePermission } = useAuth();
  const canManageProject = (project) => {
    const hasAllUpdatePermission = getModulePermission('Projects', 'update') === 'All';
    return isAdmin() || hasAllUpdatePermission || project.projectAdminId === user?.userId;
  };
  const navigate = useNavigate();

  // Get permissions for Projects module
  const canAdd = isAdmin() || getModulePermission('Projects', 'add') !== 'None';
  const canUpdate = isAdmin() || getModulePermission('Projects', 'update') !== 'None';
  const canDelete = isAdmin() || getModulePermission('Projects', 'delete') !== 'None';

  const [projects, setProjects] = useState([]);
  const [pinnedProjects, setPinnedProjects] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeView, setActiveView] = useState('projects');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'ALL',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState({ projectId: null, top: 0, left: 0 });
  const actionMenuRef = useRef(null);

  useEffect(() => {
    fetchBootstrapData();
  }, []);

  const fetchBootstrapData = async () => {
    try {
      setLoading(true);
      // Check if user has "All" view permission for Projects
      const hasAllViewPermission = isAdmin() || getModulePermission('Projects', 'view') === 'All';

      const basePromises = [
        hasAllViewPermission ? projectService.getAll() : projectService.getMyProjects(),
        projectService.getCategories(),
        departmentService.getAll(),
      ];

      // Only load full employee directory when needed for member selection
      // to keep initial Projects load fast.
      const [projectResponse, categoryResponse, deptResponse] = await Promise.all(basePromises);

      const projectList = projectResponse.data;
      setProjects(projectList);

      if (hasAllViewPermission) {
        const pinnedResponse = await projectService.getPinned();
        setPinnedProjects(pinnedResponse.data);
      } else {
        setPinnedProjects(projectList.filter((project) => project.pinned));
      }

      setProjectCategories(categoryResponse.data);
      setDepartments(deptResponse.data);

      // Defer employee loading slightly so it does not block first paint.
      setTimeout(async () => {
        try {
          const employeeResponse = await employeeService.getAll();
          setEmployees(employeeResponse.data);
        } catch (error) {
        }
      }, 0);
    } catch (error) {
      alert('Unable to load project details. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const list = activeView === 'pinned' ? pinnedProjects : projects;
    return list.filter((project) => {
      const matchesStatus = filters.status === 'ALL' || project.status === filters.status;
      const matchesSearch =
        !filters.search ||
        project.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (project.code || '').toLowerCase().includes(filters.search.toLowerCase());

      let matchesRange = true;
      if (filters.startDate && filters.endDate && project.startDate) {
        const start = parseISO(filters.startDate);
        const end = parseISO(filters.endDate);
        matchesRange = isWithinInterval(parseISO(project.startDate), { start, end });
      }

      return matchesStatus && matchesSearch && matchesRange;
    });
  }, [projects, pinnedProjects, activeView, filters]);

  const handleExport = () => {
    if (!filteredProjects.length) {
      alert('Nothing to export. Adjust filters first.');
      return;
    }

    // Helper function to escape CSV fields
    const escapeCsvField = (field) => {
      if (field == null) return '';
      const str = String(field);
      // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = [
      'Code',
      'Project Name',
      'Members',
      'Start Date',
      'Deadline',
      'Status',
      'Progress',
      'Department',
    ];
    const rows = filteredProjects.map((project) => [
      project.code || '',
      project.name || '',
      project.memberNames?.join(', ') || '—',
      formatDate(project.startDate) || '—',
      formatDate(project.deadline) || '—',
      project.status || '',
      `${project.progressPercentage || 0}%`,
      project.departmentName || '—',
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map(escapeCsvField).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'projects.csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleActionMenu = (projectId, triggerEl) => {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const viewportPadding = 12;
    const menuWidth = 220;
    const menuItemHeight = 44; // Approximate height per menu item (py-2 + text)
    const menuSpacing = 8; // Space between button and menu
    const maxMenuItems = 4; // Maximum possible menu items (View, Edit, Pin, Delete)
    const estimatedMenuHeight = menuItemHeight * maxMenuItems;
    
    // Calculate available space below and above
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    
    // Determine if menu should open upward or downward
    const shouldOpenUpward = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
    
    // Calculate top position
    let topPosition;
    if (shouldOpenUpward) {
      // Open upward: position menu above the button
      topPosition = rect.top - estimatedMenuHeight - menuSpacing + window.scrollY;
      // Ensure menu doesn't go above viewport
      topPosition = Math.max(viewportPadding + window.scrollY, topPosition);
    } else {
      // Open downward: position menu below the button
      topPosition = rect.bottom + menuSpacing + window.scrollY;
      // Ensure menu doesn't go below viewport (will be adjusted by actual menu height if needed)
      const maxTop = window.innerHeight - estimatedMenuHeight - viewportPadding + window.scrollY;
      topPosition = Math.min(maxTop, topPosition);
    }
    
    // Calculate left position (centered on button, but constrained to viewport)
    const calculatedLeft = Math.min(
      rect.right - menuWidth / 2,
      window.innerWidth - menuWidth - viewportPadding,
    );
    
    setActionMenu((current) =>
      current.projectId === projectId
        ? { projectId: null, top: 0, left: 0 }
        : {
            projectId,
            top: topPosition,
            left: Math.max(viewportPadding, calculatedLeft),
          },
    );
  };

  const closeMenus = () => setActionMenu({ projectId: null, top: 0, left: 0 });

  const handleDelete = async (project) => {
    const confirmed = window.confirm(`Delete ${project.name}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await projectService.delete(project.id);
      await fetchBootstrapData();
    } catch (error) {
      alert('Unable to delete project.');
    }
  };

  const mapProjectToPayload = (project, overrides = {}) => ({
    name: project.name,
    summary: project.summary,
    description: project.summary,
    startDate: project.startDate,
    deadline: project.deadline,
    categoryId: project.categoryId,
    departmentId: project.departmentId,
    projectAdminId: project.projectAdminId,
    memberIds: project.memberIds || [],
    status: project.status,
    progressPercentage: project.progressPercentage,
    autoProgress: project.autoProgress,
    budget: project.budget,
    pinned: project.pinned,
    ...overrides,
  });

  const handlePinToggle = async (project) => {
    try {
      await projectService.update(project.id, mapProjectToPayload(project, { pinned: !project.pinned }));
      await fetchBootstrapData();
    } catch (error) {
      alert('Pin action failed.');
    }
  };

  const handleStatusChange = async (project, status) => {
    if (!canManageProject(project)) {
      return;
    }
    try {
      await projectService.update(project.id, mapProjectToPayload(project, { status }));
      setProjects((prev) =>
        prev.map((item) => (item.id === project.id ? { ...item, status } : item)),
      );
    } catch (error) {
      alert('Status update failed.');
    }
  };

  const handleSaveProject = async (formData) => {
    const normalize = (value) => {
      if (!value || value === '') return null;
      const num = Number(value);
      return isNaN(num) ? null : num;
    };
    const payload = {
      name: formData.name,
      summary: formData.summary,
      description: formData.summary,
      startDate: formData.startDate || null,
      deadline: formData.deadline || null,
      categoryId: normalize(formData.categoryId),
      departmentId: normalize(formData.departmentId),
      projectAdminId: normalize(formData.projectAdminId),
      memberIds: (formData.memberIds || [])
        .map((id) => Number(id))
        .filter((id) => !isNaN(id) && id > 0),
      status: formData.status || 'PLANNING',
      autoProgress: formData.autoProgress || false,
      progressPercentage: formData.autoProgress ? null : formData.progressPercentage,
      budget: formData.budget ? Number(formData.budget) : null,
      pinned: formData.pinned || false,
    };

    try {
      if (editingProject) {
        await projectService.update(editingProject.id, payload);
      } else {
        await projectService.create(payload);
      }
      setShowProjectForm(false);
      setEditingProject(null);
      await fetchBootstrapData();
    } catch (error) {
      alert('Unable to save project. Please check the details.');
    }
  };

  const handleCategorySave = async (name) => {
    try {
      await projectService.createCategory({ name });
      const updated = await projectService.getCategories();
      setProjectCategories(updated.data);
    } catch (error) {
      alert('Unable to create category');
    }
  };

  const handleCategoryDelete = async (category) => {
    const confirmed = window.confirm(`Remove ${category.name}?`);
    if (!confirmed) return;
    try {
      await projectService.deleteCategory(category.id);
      const updated = await projectService.getCategories();
      setProjectCategories(updated.data);
    } catch (error) {
      alert('Unable to delete category.');
    }
  };

  useEffect(() => {
    document.addEventListener('click', closeMenus);
    return () => document.removeEventListener('click', closeMenus);
  }, []);

  useEffect(() => {
    const handleViewportChange = () => closeMenus();
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  // Adjust menu position after render to ensure it's fully visible
  useEffect(() => {
    if (actionMenu.projectId && actionMenuRef.current) {
      const menuEl = actionMenuRef.current;
      const rect = menuEl.getBoundingClientRect();
      const viewportPadding = 12;
      let adjustedTop = actionMenu.top;
      let needsAdjustment = false;

      // Check if menu overflows below viewport
      if (rect.bottom > window.innerHeight - viewportPadding) {
        const overflow = rect.bottom - (window.innerHeight - viewportPadding);
        // actionMenu.top is in document coordinates, so we subtract overflow directly
        adjustedTop = actionMenu.top - overflow;
        needsAdjustment = true;
      }

      // Check if menu overflows above viewport
      if (rect.top < viewportPadding) {
        // Convert viewport position to document coordinates
        adjustedTop = viewportPadding + window.scrollY;
        needsAdjustment = true;
      }

      // Only update if adjustment is needed to avoid unnecessary re-renders
      if (needsAdjustment) {
        setActionMenu((current) => ({
          ...current,
          top: adjustedTop,
        }));
      }
    }
  }, [actionMenu.projectId, actionMenu.top]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-sm font-medium text-gray-600">
        Loading projects…
      </div>
    );
  }

  const activeMenuProject = filteredProjects.find((item) => item.id === actionMenu.projectId);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
            <section className="flex flex-col gap-3 sm:gap-4 rounded-xl bg-white p-3 sm:p-4 shadow">
              <div className="w-full">
                <FilterBar filters={filters} onChange={setFilters} />
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-auto">
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 sm:px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
                >
                  <FiDownload className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => setShowProjectForm(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
                  >
                    <span className="sm:hidden">+</span>
                    <span className="hidden sm:inline">+ Add Project</span>
                  </button>
                )}
              </div>
            </section>

            <div className="flex flex-wrap justify-between gap-2 sm:gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                <span>Total: {filteredProjects.length}</span>
                <span className="hidden sm:inline">
                  In Progress:{' '}
                  {filteredProjects.filter((project) => project.status === 'IN_PROGRESS').length}
                </span>
                <span className="hidden sm:inline">
                  Completed: {filteredProjects.filter((project) => project.status === 'COMPLETED').length}
                </span>
              </div>
            </div>

            <div className="flex justify-end -mt-2">
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1 shadow-sm">
                {VIEW_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveView(tab.key)}
                    aria-label={tab.label}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition ${activeView === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                      }`}
                  >
                    {tab.icon}
                  </button>
                ))}
              </div>
            </div>

            {activeView === 'calendar' ? (
              <CalendarView projects={filteredProjects} />
            ) : (
              <section className="rounded-xl bg-white shadow overflow-hidden">
                <div className="relative overflow-hidden rounded-b-xl">
                  <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                        <thead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wider text-gray-500 shadow-sm">
                        <tr>
                          <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left">Project</th>
                          <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left hidden sm:table-cell">Members</th>
                          <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left hidden md:table-cell">Start</th>
                          <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left hidden md:table-cell">Deadline</th>
                          <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left hidden lg:table-cell">Progress</th>
                          <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left">State</th>
                          <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredProjects.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-2 sm:px-3 md:px-6 py-8 sm:py-10 text-center text-xs sm:text-sm text-gray-500">
                              No projects found. Adjust filters or add a new project.
                            </td>
                          </tr>
                        )}
                        {filteredProjects.map((project) => (
                          <tr key={project.id} className="hover:bg-gray-50 active:bg-gray-100">
                            <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4">
                            <div className="flex flex-col min-w-[120px]">
                              <span
                                onClick={() => navigate(`/work/projects/${project.id}`)}
                                className="cursor-pointer text-xs sm:text-sm font-semibold text-gray-800 hover:text-blue-600 break-words"
                              >
                                {project.name}
                              </span>
                              <span className="text-[10px] sm:text-xs text-gray-500">{project.code}</span>
                            </div>
                          </td>
                            <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 hidden sm:table-cell">
                              <AvatarStack project={project} employees={employees} />
                            </td>
                            <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-600 hidden md:table-cell whitespace-nowrap">{formatDate(project.startDate) || '—'}</td>
                            <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 text-[10px] sm:text-xs md:text-sm text-gray-600 hidden md:table-cell whitespace-nowrap">{formatDate(project.deadline) || '—'}</td>
                            <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 hidden lg:table-cell">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div className="h-1.5 sm:h-2 w-16 sm:w-24 md:w-32 rounded-full bg-gray-100">
                                  <div
                                    className="h-1.5 sm:h-2 rounded-full bg-green-500 transition-all"
                                    style={{ width: `${project.progressPercentage || 0}%` }}
                                  />
                                </div>
                                <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                                  {project.progressPercentage || 0}%
                                </span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4">
                            <select
                              value={project.status}
                              onChange={(event) => handleStatusChange(project, event.target.value)}
                              disabled={!canManageProject(project)}
                              className={`rounded border border-gray-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none w-full max-w-[120px] sm:max-w-none ${!canManageProject(project) ? 'cursor-not-allowed opacity-60' : ''
                                }`}
                            >
                              {STATUS_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 text-right">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleActionMenu(project.id, event.currentTarget);
                              }}
                              className="rounded px-1.5 sm:px-2 py-1 text-gray-500 transition hover:bg-gray-100 text-base sm:text-lg"
                              aria-label="Actions"
                            >
                              &#8942;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              </section>
            )}
            {actionMenu.projectId && activeMenuProject && (
              <div
                ref={actionMenuRef}
                className="fixed z-[60] w-56 rounded-lg border border-gray-200 bg-white text-sm shadow-2xl"
                style={{ top: actionMenu.top, left: actionMenu.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <ActionButton
                  label="View"
                  onClick={() => {
                    closeMenus();
                    navigate(`/work/projects/${activeMenuProject.id}`);
                  }}
                />
                {canManageProject(activeMenuProject) && canUpdate && (
                  <Fragment>
                    <ActionButton
                      label="Edit"
                      onClick={() => {
                        closeMenus();
                        setEditingProject(activeMenuProject);
                        setShowProjectForm(true);
                      }}
                    />
                    <ActionButton
                      label={activeMenuProject.pinned ? 'Unpin project' : 'Pin project'}
                      onClick={() => {
                        closeMenus();
                        handlePinToggle(activeMenuProject);
                      }}
                    />
                  </Fragment>
                )}
                {canDelete && (
                  <Fragment>
                    <ActionButton
                      label="Delete"
                      destructive
                      onClick={() => {
                        closeMenus();
                        handleDelete(activeMenuProject);
                      }}
                    />
                  </Fragment>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <ProjectFormModal
        isOpen={showProjectForm}
        onClose={() => {
          setShowProjectForm(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        employees={employees}
        departments={departments}
        categories={projectCategories}
        project={editingProject}
        onManageCategories={() => setCategoryModalOpen(true)}
      />

      <CategoryManagerModal
        title="Project Categories"
        isOpen={categoryModalOpen}
        categories={projectCategories}
        onClose={() => setCategoryModalOpen(false)}
        onAdd={handleCategorySave}
        onDelete={handleCategoryDelete}
      />
    </div>
  );
};

const FilterBar = ({ filters, onChange }) => {
  const update = (patch) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="flex flex-col sm:flex-row flex-1 flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 p-2 sm:px-3 sm:py-2">
        <span className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-gray-600 whitespace-nowrap">
          <FiFilter className="h-3 w-3 sm:h-4 sm:w-4" />
          Duration
        </span>
        <div className="flex items-center gap-1 sm:gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => update({ startDate: event.target.value })}
            className="h-8 sm:h-9 flex-1 rounded-md border border-gray-200 bg-white px-1.5 sm:px-2 text-[10px] sm:text-xs md:text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
          />
          <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => update({ endDate: event.target.value })}
            className="h-8 sm:h-9 flex-1 rounded-md border border-gray-200 bg-white px-1.5 sm:px-2 text-[10px] sm:text-xs md:text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2 sm:px-3 py-2">
        <span className="text-[10px] sm:text-xs font-semibold text-gray-600 whitespace-nowrap">Status</span>
        <select
          value={filters.status}
          onChange={(event) => update({ status: event.target.value })}
          className="h-8 sm:h-9 flex-1 rounded-md border border-gray-200 bg-white px-2 sm:px-3 text-[10px] sm:text-xs md:text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 min-w-[200px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2 sm:px-3 py-2">
        <span className="text-[10px] sm:text-xs font-semibold text-gray-600 whitespace-nowrap">Search</span>
        <div className="relative flex-1 min-w-0">
          <FiSearch className="pointer-events-none absolute left-2 sm:left-3 top-1/2 h-3 w-3 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder="Project name or code"
            className="h-8 sm:h-9 w-full rounded-md border border-gray-200 bg-white pl-7 sm:pl-9 pr-2 sm:pr-3 text-[10px] sm:text-xs md:text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </label>
    </div>
  );
};

const AvatarStack = ({ project, employees }) => {
  if (!project) {
    return <span className="text-xs text-gray-400">No members</span>;
  }

  let members = project.members || [];

  // Some project APIs only send memberIds / memberNames in list view.
  // In that case, derive lightweight member objects from the employee directory.
  if (!members.length && (project.memberIds?.length || project.memberNames?.length)) {
    const directoryMap = (employees || []).reduce((acc, employee) => {
      if (employee?.id != null) {
        acc[employee.id] = employee;
      }
      return acc;
    }, {});

    members = (project.memberIds || []).map((memberId, index) => {
      const fallbackName = project.memberNames?.[index] || `Member ${index + 1}`;
      const directoryEntry = directoryMap[memberId];
      const name = directoryEntry?.fullName || directoryEntry?.name || fallbackName;
      return {
        id: memberId ?? `${project.id}-member-${index}`,
        name,
        profilePictureUrl: directoryEntry?.profilePictureUrl || null,
      };
    });
  }

  if (!members.length) {
    return <span className="text-xs text-gray-400">No members</span>;
  }

  const visible = members.slice(0, 5);
  const hiddenCount = members.length - visible.length;

  return (
    <div className="flex -space-x-2">
      {visible.map((member) => (
        <Avatar
          key={member.id}
          profilePictureUrl={member.profilePictureUrl}
          name={member.name}
          fullName={member.name}
          size="w-8 h-8"
          className="border-2 border-white"
        />
      ))}
      {hiddenCount > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-semibold text-gray-600">
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

const ActionButton = ({ label, onClick, destructive }) => (
  <button
    type="button"
    onClick={onClick}
    className={`block w-full px-4 py-2 text-left text-sm ${destructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
  >
    {label}
  </button>
);

const ProjectFormModal = ({
  isOpen,
  onClose,
  onSave,
  employees,
  departments,
  categories,
  project,
  onManageCategories,
}) => {
  const defaultState = {
    name: '',
    startDate: '',
    deadline: '',
    categoryId: '',
    departmentId: '',
    summary: '',
    memberIds: [],
    status: 'PLANNING',
    progressPercentage: 0,
    autoProgress: false,
    projectAdminId: '',
    budget: '',
    pinned: false,
  };
  const [formState, setFormState] = useState(defaultState);
  // Project admin dropdown is now handled by SearchableEmployeeSelect

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Project admin dropdown is now handled by SearchableEmployeeSelect component
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (project) {
      setFormState({
        ...defaultState,
        ...project,
        deadline: project.deadline || '',
        categoryId: project.categoryId || '',
        departmentId: project.departmentId || '',
        status: project.status || 'PLANNING',
        progressPercentage: project.progressPercentage || 0,
        autoProgress: project.autoProgress || false,
        memberIds: project.memberIds || [],
        projectAdminId: project.projectAdminId || '',
        budget: project.budget || '',
        pinned: project.pinned || false,
      });
    } else {
      setFormState(defaultState);
    }
  }, [project]);

  const updateState = (patch) => setFormState((prev) => ({ ...prev, ...patch }));

  // Member selection is now handled by SearchableEmployeeSelect component

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      alert('Project name is required.');
      return;
    }
    if (!formState.startDate) {
      alert('Please provide a start date.');
      return;
    }
    onSave(formState);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={project ? 'Edit Project' : 'Add Project'} size="xl" variant="panel">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Project Name *
            <input
              type="text"
              value={formState.name}
              onChange={(event) => updateState({ name: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Project Category
            <div className="mt-1 flex gap-2">
              <select
                value={formState.categoryId}
                onChange={(event) => updateState({ categoryId: event.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
                className="rounded border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Manage
              </button>
            </div>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Start Date *
            <input
              type="date"
              value={formState.startDate}
              onChange={(event) => updateState({ startDate: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Deadline
            <input
              type="date"
              value={formState.deadline || ''}
              onChange={(event) => updateState({ deadline: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Department
            <select
              value={formState.departmentId}
              onChange={(event) => updateState({ departmentId: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Status
            <select
              value={formState.status}
              onChange={(event) => updateState({ status: event.target.value })}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {STATUS_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Project Admin
            <div className="mt-1">
              <SearchableEmployeeSelect
                selectedIds={formState.projectAdminId ? [formState.projectAdminId] : []}
                onSelectionChange={(selectedIds) => {
                  updateState({ projectAdminId: selectedIds[0] || '' });
                }}
                multiple={false}
                placeholder="Select Admin"
                className="w-full"
              />
            </div>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Project Budget (₹)
            <div className="mt-1 flex items-center rounded border border-gray-300">
              <span className="px-3 text-gray-500">₹</span>
              <input
                type="number"
                value={formState.budget}
                onChange={(event) => updateState({ budget: event.target.value })}
                className="w-full border-0 px-2 py-2 text-sm focus:outline-none"
                placeholder="0.00"
                min="0"
              />
            </div>
          </label>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          Project Summary
          <textarea
            rows={3}
            value={formState.summary}
            onChange={(event) => updateState({ summary: event.target.value })}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Key highlights, goals, or context"
          />
        </label>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Project progress</p>
              <p className="text-xs text-gray-500">Track manually or let tasks drive completion</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={formState.autoProgress}
                onChange={(event) => updateState({ autoProgress: event.target.checked })}
              />
              Calculate progress through tasks
            </label>
          </div>
          {!formState.autoProgress && (
            <div className="mt-4 flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={formState.progressPercentage}
                onChange={(event) => updateState({ progressPercentage: Number(event.target.value) })}
                className="w-full"
              />
              <span className="w-20 text-right text-sm font-semibold text-gray-800">
                {formState.progressPercentage}%
              </span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Project Members</p>
              <p className="text-xs text-gray-500">Choose multiple team members. Search by name.</p>
            </div>
          </div>
          <div className="mt-4">
            <SearchableEmployeeSelect
              selectedIds={formState.memberIds.map(id => String(id))}
              onSelectionChange={(selectedIds) => {
                updateState({ memberIds: selectedIds.map(id => Number(id)) });
              }}
              multiple={true}
              placeholder="Select members..."
              className="w-full"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={formState.pinned}
            onChange={(event) => updateState({ pinned: event.target.checked })}
          />
          Pin project to "Pinned Projects" tab
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

const CalendarView = ({ projects }) => {
  const today = new Date();
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const start = monthDate;
  const daysInMonth = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(1 - start.getDay() + i);
    return date;
  });

  const changeMonth = (delta) => {
    const newDate = new Date(monthDate);
    newDate.setMonth(monthDate.getMonth() + delta);
    setMonthDate(newDate);
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{format(monthDate, 'MMMM yyyy')}</h2>
          <p className="text-sm text-gray-500">Project start dates highlighted</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded border border-gray-200 px-3 py-1 text-gray-600 hover:bg-gray-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="rounded border border-gray-200 px-3 py-1 text-gray-600 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 text-sm">
        {daysInMonth.map((date, index) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const hasProjects = projects.filter((project) => project.startDate === dateStr);
          const isCurrentMonth = date.getMonth() === monthDate.getMonth();

          return (
            <div
              key={`${dateStr}-${index}`}
              className={`min-h-[90px] rounded border border-gray-100 p-2 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                }`}
            >
              <div className="text-xs font-semibold text-gray-600">{format(date, 'd')}</div>
              <div className="mt-1 space-y-1">
                {hasProjects.map((project) => (
                  <div
                    key={project.id}
                    className="truncate rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700"
                  >
                    {project.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Projects;

