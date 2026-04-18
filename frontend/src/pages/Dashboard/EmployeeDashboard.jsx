import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../api/dashboardService';
import { taskService } from '../../api/taskService';
import { projectService } from '../../api/projectService';
import { attendanceService } from '../../api/attendanceService';
import { employeeService } from '../../api/employeeService';
import { ticketService } from '../../api/ticketService';
import { leaveService } from '../../api/leaveService';
import { shiftRosterService } from '../../api/shiftRosterService';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import Avatar from '../../components/UI/Avatar';
import { formatDate } from '../../utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ComposedChart } from 'recharts';
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, Clock,
  AlertCircle, FileText, Activity, Calendar, Award,
  Briefcase, UserPlus, Gift, LogOut, Search, Bell,
  HelpCircle, ChevronRight, TrendingUp, UserCheck, Ticket
} from 'lucide-react';

const EmployeeDashboard = ({ variant = 'private' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const resolvedVariant = variant || (location.pathname.includes('/dashboard/advanced') ? 'advanced' : 'private');
  const isAdvancedView = resolvedVariant === 'advanced';
  const isPrivateView = !isAdvancedView;
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [clockLoading, setClockLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [leavesToday, setLeavesToday] = useState([]);
  const [clockedInEmployees, setClockedInEmployees] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [shiftEntries, setShiftEntries] = useState([]);
  const [joiningToday, setJoiningToday] = useState([]);
  const [anniversaryToday, setAnniversaryToday] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [allProjects, setAllProjects] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [employeesMap, setEmployeesMap] = useState(new Map());
  const [allLeaves, setAllLeaves] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [ticketSummary, setTicketSummary] = useState(null);
  const [todayAttendanceData, setTodayAttendanceData] = useState([]);

  const updatePeopleInsights = (people) => {
    if (!Array.isArray(people)) {
      setBirthdays([]);
      setJoiningToday([]);
      setAnniversaryToday([]);
      return;
    }

    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();
    const referenceToday = new Date(currentYear, today.getMonth(), today.getDate());

    const upcomingBirthdays = people
      .filter((person) => person.dateOfBirth)
      .map((person) => {
        const dob = new Date(person.dateOfBirth);
        const candidate = new Date(currentYear, dob.getMonth(), dob.getDate());
        if (candidate < referenceToday) {
          candidate.setFullYear(candidate.getFullYear() + 1);
        }
        const diffTime = candidate.getTime() - referenceToday.getTime();
        const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return {
          id: person.id,
          name: person.fullName || `${person.firstName} ${person.lastName}`.trim(),
          designation: person.designationName || person.roleName || 'Team member',
          date: person.dateOfBirth,
          upcomingDate: candidate,
          daysUntil,
        };
      })
      .filter((entry) => entry.daysUntil >= 0 && entry.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const todaysJoinings = people.filter((person) => person.joiningDate === todayISO);

    const todaysAnniversaries = people
      .filter((person) => {
        if (!person.joiningDate) return false;
        if (person.joiningDate === todayISO) return false; // handle as joining today
        const joinDate = new Date(person.joiningDate);
        return (
          joinDate.getMonth() === today.getMonth() &&
          joinDate.getDate() === today.getDate() &&
          joinDate.getFullYear() < currentYear
        );
      })
      .map((person) => {
        const joinYear = new Date(person.joiningDate).getFullYear();
        return {
          id: person.id,
          name: person.fullName || `${person.firstName} ${person.lastName}`.trim(),
          designation: person.designationName || person.roleName || 'Team member',
          years: currentYear - joinYear,
        };
      });

    setBirthdays(upcomingBirthdays);
    setJoiningToday(todaysJoinings);
    setAnniversaryToday(todaysAnniversaries);
  };

  useEffect(() => {
    loadDashboardData();
  }, [isAdvancedView]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Real-time refresh for clocked-in employees
  useEffect(() => {
    const refreshClockedInEmployees = async () => {
      try {
        const response = await attendanceService.getTodayClockedIn();
        const locations = response.data || [];
        // Store only employees who have clocked in today but NOT clocked out
        const clockedIn = locations.filter((entry) => entry.clockIn && !entry.clockOut);
        setClockedInEmployees(clockedIn);
      } catch (error) {
        // Error refreshing clocked-in employees
      }
    };

    // Refresh immediately on mount
    refreshClockedInEmployees();

    // Set up interval to refresh every 30 seconds
    const interval = setInterval(refreshClockedInEmployees, 30000);

    return () => clearInterval(interval);
  }, []);

  // Refresh tasks when returning from Tasks page to ensure latest status
  useEffect(() => {
    const refreshTasks = async () => {
      try {
        const res = await taskService.getMyTasks();
        setTasks(res.data || []);
      } catch (error) {
        // Error refreshing tasks
      }
    };

    // Refresh tasks on mount and when location changes (e.g., returning from Tasks page)
    refreshTasks();
  }, [location.pathname]);

  const loadDashboardData = async () => {
    try {
      const loadToday = new Date();
      const loadTodayISO = loadToday.toISOString().slice(0, 10);
      const loadCurrentYear = loadToday.getFullYear();
      const loadCurrentMonth = loadToday.getMonth() + 1;

      // Parallelize all API calls for faster loading
      const promises = [];

      // Add stats for admin
      if (isAdmin()) {
        promises.push(dashboardService.getStats().then(res => ({ type: 'stats', data: res.data })).catch(() => ({ type: 'stats', data: null })));
      }

      // Add tasks and projects
      promises.push(
        taskService.getMyTasks().then(res => ({ type: 'tasks', data: res.data })).catch(() => ({ type: 'tasks', data: [] })),
        projectService.getMyProjects().then(res => ({ type: 'projects', data: res.data })).catch(() => ({ type: 'projects', data: [] }))
      );
      promises.push(
        ticketService.getAll()
          .then((res) => ({ type: 'tickets', data: res.data }))
          .catch(() => ({ type: 'tickets', data: [] }))
      );
      promises.push(
        leaveService
          .getAll({ startDate: loadTodayISO, endDate: loadTodayISO, status: 'APPROVED' })
          .then((res) => ({ type: 'leaves', data: res.data }))
          .catch(() => ({ type: 'leaves', data: [] }))
      );

      // Add employee profile
      if (user?.userId) {
        promises.push(
          employeeService.getById(user.userId).then(res => ({ type: 'profile', data: res.data })).catch(() => ({ type: 'profile', data: null }))
        );
      }

      // Add attendance
      promises.push(
        attendanceService.getMyAttendance().then(res => ({ type: 'attendance', data: res.data })).catch(() => ({ type: 'attendance', data: [] }))
      );
      promises.push(
        attendanceService
          .getTodayClockedIn()
          .then((res) => ({ type: 'locations', data: res.data }))
          .catch(() => ({ type: 'locations', data: [] }))
      );

      // Fetch current month's shift roster
      promises.push(
        shiftRosterService
          .getRoster(loadCurrentYear, loadCurrentMonth)
          .then((res) => {
            return { type: 'shifts', data: res.data, month: loadCurrentMonth, year: loadCurrentYear };
          })
          .catch((error) => {
            return { type: 'shifts', data: null, month: loadCurrentMonth, year: loadCurrentYear };
          })
      );

      // If we're near the end of the month, also fetch next month's roster
      const daysInMonth = new Date(loadCurrentYear, loadCurrentMonth, 0).getDate();
      const todayDate = loadToday.getDate();
      if (todayDate > daysInMonth - 5) {
        const nextMonth = loadCurrentMonth === 12 ? 1 : loadCurrentMonth + 1;
        const nextYear = loadCurrentMonth === 12 ? loadCurrentYear + 1 : loadCurrentYear;
        promises.push(
          shiftRosterService
            .getRoster(nextYear, nextMonth)
            .then((res) => {
              return { type: 'shiftsNextMonth', data: res.data, month: nextMonth, year: nextYear };
            })
            .catch((error) => {
              return { type: 'shiftsNextMonth', data: null, month: nextMonth, year: nextYear };
            })
        );
      }

      promises.push(
        employeeService
          .getAll()
          .then((res) => ({ type: 'employeesDirectory', data: res.data }))
          .catch(() => ({ type: 'employeesDirectory', data: [] }))
      );

      // Fetch today's attendance data for both private and advanced dashboards (for clocked in employees)
      promises.push(
        attendanceService.getAllByMonth(loadCurrentYear, loadCurrentMonth).then(res => ({ type: 'todayAttendanceData', data: res.data })).catch(() => ({ type: 'todayAttendanceData', data: [] }))
      );

      // Fetch additional data for Advanced Dashboard
      if (isAdmin() && isAdvancedView) {
        promises.push(
          projectService.getAll().then(res => ({ type: 'allProjects', data: res.data })).catch(() => ({ type: 'allProjects', data: [] })),
          employeeService.getAll().then(res => ({ type: 'allEmployees', data: res.data })).catch(() => ({ type: 'allEmployees', data: [] })),
          leaveService.getAll().then(res => ({ type: 'allLeaves', data: res.data })).catch(() => ({ type: 'allLeaves', data: [] })),
          ticketService.getAll().then(res => ({ type: 'allTickets', data: res.data })).catch(() => ({ type: 'allTickets', data: [] })),
          ticketService.getSummary().then(res => ({ type: 'ticketSummary', data: res.data })).catch(() => ({ type: 'ticketSummary', data: null })),
          taskService.getAll().then(res => ({ type: 'allTasks', data: res.data })).catch(() => ({ type: 'allTasks', data: [] }))
        );
      }

      // Execute all calls in parallel
      const results = await Promise.all(promises);

      // Process results
      results.forEach(result => {
        switch (result.type) {
          case 'stats':
            setStats(result.data);
            break;
          case 'tasks':
            setTasks(result.data);
            break;
          case 'projects':
            setProjects(result.data);
            break;
          case 'profile':
            setProfile(result.data);
            break;
          case 'attendance':
            // Determine today's clock-in status
            const todayStr = new Date().toISOString().slice(0, 10);
            const todayRecord = result.data
              ?.filter((a) => a.attendanceDate)
              .find((a) => a.attendanceDate === todayStr);
            if (todayRecord && todayRecord.clockIn && !todayRecord.clockOut) {
              setIsClockedIn(true);
              setClockInTime(todayRecord.clockIn);
            } else {
              setIsClockedIn(false);
              setClockInTime(null);
            }
            break;
          case 'tickets':
            setTickets(result.data || []);
            break;
          case 'leaves':
            setLeavesToday(result.data || []);
            break;
          case 'locations': {
            const locations = result.data || [];
            // Store only employees who have clocked in today but NOT clocked out
            // getTodayLocations() returns all employees with location who clocked in today
            const clockedIn = locations.filter((entry) => entry.clockIn && !entry.clockOut);
            setClockedInEmployees(clockedIn);
            break;
          }
          case 'shifts': {
            const roster = result.data;

            if (roster?.employees?.length) {
              // Try to find user by userId or id
              const currentUserId = user?.userId || user?.id;
              const rosterForUser = roster.employees.find((emp) => {
                const empUserId = emp.userId || emp.id;
                return empUserId === currentUserId;
              });

              const days = rosterForUser?.days || [];

              // Process and normalize dates
              const processedDays = days
                .map(day => {
                  // Handle date - it might be a string or LocalDate object
                  let dateStr = day.date;
                  if (dateStr instanceof Date) {
                    dateStr = dateStr.toISOString().slice(0, 10);
                  } else if (typeof dateStr === 'string') {
                    // Ensure it's in YYYY-MM-DD format
                    dateStr = dateStr.split('T')[0];
                  } else if (dateStr) {
                    // If it's an object with date properties, try to extract
                    dateStr = dateStr.toString().split('T')[0];
                  }
                  return {
                    ...day,
                    date: dateStr,
                    hasShift: !!day.shift
                  };
                })
                .filter(day => day.date && day.shift); // Only include days with valid dates AND shifts

              // Merge with existing shift entries
              setShiftEntries(prev => {
                const merged = [...(prev || []), ...processedDays];
                // Remove duplicates and sort
                const unique = Array.from(new Map(merged.map(item => [item.date, item])).values());
                return unique.sort((a, b) => {
                  const dateA = new Date(a.date);
                  const dateB = new Date(b.date);
                  return dateA - dateB;
                });
              });
            }
            break;
          }
          case 'shiftsNextMonth': {
            const roster = result.data;

            if (roster?.employees?.length) {
              const currentUserId = user?.userId || user?.id;
              const rosterForUser = roster.employees.find((emp) => {
                const empUserId = emp.userId || emp.id;
                return empUserId === currentUserId;
              });

              const days = rosterForUser?.days || [];

              const processedDays = days
                .map(day => {
                  let dateStr = day.date;
                  if (dateStr instanceof Date) {
                    dateStr = dateStr.toISOString().slice(0, 10);
                  } else if (typeof dateStr === 'string') {
                    dateStr = dateStr.split('T')[0];
                  } else if (dateStr) {
                    dateStr = dateStr.toString().split('T')[0];
                  }
                  return {
                    ...day,
                    date: dateStr,
                    hasShift: !!day.shift
                  };
                })
                .filter(day => day.date && day.shift);

              // Merge with existing shift entries
              setShiftEntries(prev => {
                const merged = [...(prev || []), ...processedDays];
                const unique = Array.from(new Map(merged.map(item => [item.date, item])).values());
                return unique.sort((a, b) => {
                  const dateA = new Date(a.date);
                  const dateB = new Date(b.date);
                  return dateA - dateB;
                });
              });
            }
            break;
          }
          case 'employeesDirectory': {
            const employeesList = result.data || [];
            updatePeopleInsights(employeesList);
            // Create a map for quick employee lookup by ID
            const empMap = new Map();
            employeesList.forEach(emp => {
              if (emp.id) {
                empMap.set(emp.id, emp);
              }
            });
            setEmployeesMap(empMap);
            break;
          }
          case 'allProjects':
            setAllProjects(result.data || []);
            break;
          case 'allEmployees':
            setAllEmployees(result.data || []);
            break;
          case 'allLeaves':
            setAllLeaves(result.data || []);
            break;
          case 'allTickets':
            setAllTickets(result.data || []);
            break;
          case 'ticketSummary':
            setTicketSummary(result.data);
            break;
          case 'allTasks':
            setAllTasks(result.data || []);
            break;
          case 'todayAttendanceData':
            setTodayAttendanceData(result.data || []);
            break;
        }
      });
    } catch (error) {
      // Error loading dashboard data
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = (retryCount = 0) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      // Optimized geolocation options - faster timeout, allow cached location
      const timeout = retryCount === 0 ? 5000 : 8000; // Reduced from 10s/15s to 5s/8s

      const options = {
        enableHighAccuracy: false, // Use network location first for speed
        timeout: timeout,
        maximumAge: 60000 // Accept cached position up to 1 minute old
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Validate coordinates are reasonable (not 0,0 or null)
          if (lat === 0 && lng === 0) {
            if (retryCount < 1) {
              setTimeout(() => {
                getCurrentLocation(retryCount + 1).then(resolve).catch(reject);
              }, 300);
              return;
            }
            resolve(null);
            return;
          }

          resolve({
            latitude: lat,
            longitude: lng,
            accuracy: position.coords.accuracy,
            location: 'Current Location',
            workingFrom: 'office'
          });
        },
        (error) => {
          // Retry once if timeout or position unavailable
          if (retryCount < 1 && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
            setTimeout(() => {
              getCurrentLocation(retryCount + 1).then(resolve).catch(reject);
            }, 500);
            return;
          }

          resolve(null); // Resolve with null instead of rejecting
        },
        options
      );
    });
  };

  const handleClockToggle = async () => {
    if (clockLoading) return;
    setClockLoading(true);
    try {
      if (!isClockedIn) {
        // Check geolocation permission state to determine timeout duration
        let permissionState = 'prompt';
        try {
          if (navigator.permissions && navigator.permissions.query) {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            permissionState = permission.state;
          }
        } catch (e) {
          // Permission API not supported or failed, use default timeout
          console.warn('Permission API not available:', e);
        }
        
        // If permission is 'prompt' (first time), wait longer for user to grant permission
        // If 'granted', normal timeout is fine. If 'denied', location won't be available anyway
        const timeoutDuration = permissionState === 'prompt' ? 8000 : 3000;
        
        // Start location fetch with appropriate timeout
        const locationPromise = getCurrentLocation();
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), timeoutDuration));
        
        // Race between location fetch and timeout
        let locationData = await Promise.race([locationPromise, timeoutPromise]);

        // If still no location and permission was just granted (was 'prompt'), try once more
        if (!locationData && permissionState === 'prompt') {
          // Wait a bit more for location after permission is granted
          const retryPromise = new Promise(async (resolve) => {
            setTimeout(async () => {
              const retryLocation = await getCurrentLocation();
              resolve(retryLocation);
            }, 2000);
          });
          locationData = await Promise.race([
            retryPromise, 
            new Promise(resolve => setTimeout(() => resolve(null), 5000))
          ]);
        }

        // Clock in with location data (or null if still not available)
        const res = await attendanceService.clockIn(locationData || null);
        setIsClockedIn(true);
        setClockInTime(res.data?.clockIn || null);

        // If location was null but we have an attendance record, retry getting location in background
        // Permission is now granted, so location should be available on retry
        if (!locationData && res.data?.id) {
          // Retry location after permission is granted (with longer timeout)
          setTimeout(async () => {
            try {
              const retryLocationData = await getCurrentLocation();
              if (retryLocationData && retryLocationData.latitude && retryLocationData.longitude) {
                // Update attendance with location
                await attendanceService.updateLocation({
                  latitude: retryLocationData.latitude,
                  longitude: retryLocationData.longitude,
                  location: retryLocationData.location || 'Current Location',
                  workingFrom: retryLocationData.workingFrom || 'office'
                });
              }
            } catch (error) {
              // Silently fail - location update is optional
              console.warn('Failed to update location after clock-in:', error);
            }
          }, 1000); // Wait 1 second after clock-in, then retry
        }
      } else {
        // For clock-out, try to get location quickly but don't block
        const locationPromise = getCurrentLocation();
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2000));
        const locationData = await Promise.race([locationPromise, timeoutPromise]);
        
        await attendanceService.clockOut(locationData || null);
        setIsClockedIn(false);
      }
    } catch (error) {
      alert(error?.response?.data?.message || 'Error updating attendance');
    } finally {
      setClockLoading(false);
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  };

  const formatTimeLabel = (timeStr) => {
    if (!timeStr) return '--';
    return timeStr.slice(0, 5);
  };

  const buildCalendarDays = (referenceDate) => {
    const firstOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const startDate = new Date(firstOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const days = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push({
        key: date.toISOString().slice(0, 10),
        date,
        isCurrentMonth: date.getMonth() === referenceDate.getMonth(),
        isToday:
          date.getFullYear() === referenceDate.getFullYear() &&
          date.getMonth() === referenceDate.getMonth() &&
          date.getDate() === referenceDate.getDate(),
      });
    }
    return days;
  };

  const getTaskStatusClass = (status) => {
    if (status === 'COMPLETED') return 'bg-emerald-500/20 text-emerald-300';
    if (status === 'OVERDUE') return 'bg-rose-500/20 text-rose-200';
    return 'bg-amber-500/20 text-amber-200';
  };

  const getTicketStatusClass = (status) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'text-emerald-300';
      case 'IN_PROGRESS':
        return 'text-amber-200';
      case 'OPEN':
      default:
        return 'text-slate-200';
    }
  };

  const uniqueByUser = (entries = []) => {
    const map = new Map();
    entries.forEach((entry) => {
      if (entry?.userId && !map.has(entry.userId)) {
        map.set(entry.userId, entry);
      }
    });
    return Array.from(map.values());
  };

  // Uniform height constant for all dashboard cards
  const CARD_HEIGHT = '320px';
  const TALL_CARD_HEIGHT = '380px'; // Taller height for My Tasks, Projects, and Tickets cards
  const CARD_HEADER_HEIGHT = '3rem'; // Approximate header height (title + padding)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  const openTasksCount = tasks.filter((t) => t.status && t.status !== 'COMPLETED').length;
  const projectsCount = projects.length;
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayString = now.toLocaleDateString(undefined, { weekday: 'long' });
  const calendarDays = buildCalendarDays(now);
  const displayedTasks = tasks; // Show all tasks, scrollbar will appear if > 5
  const displayedProjects = projects; // Show all projects, scrollbar will appear if > 5
  const isAdminUser = isAdmin();
  const ticketsForView = (isAdminUser
    ? tickets
    : tickets.filter(
      (ticket) =>
        ticket.requesterId === user?.userId || ticket.assignedAgentId === user?.userId,
    )
  ); // Show all tickets, scrollbar will appear if > 5
  const leavesList = leavesToday || [];
  // Fix shift schedule to show today's shift and next 4 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().slice(0, 10);
  
  // Get only employees who have clocked in today but NOT clocked out
  // Use getTodayLocations() data which is available to all users, or fallback to todayAttendanceData
  // getTodayLocations() returns all employees with location data who clocked in today
  // We want to show only those currently clocked in (not clocked out), so combine both sources
  const todayClockedInFromLocations = (clockedInEmployees || [])
    .filter(entry => entry.clockIn && !entry.clockOut) // Has clocked in but NOT clocked out
    .map(entry => ({
      id: entry.id,
      userId: entry.userId,
      userName: entry.userName || 'Unknown',
      clockIn: entry.clockIn,
      clockOut: entry.clockOut,
      clockInWorkingFrom: entry.clockInWorkingFrom || 'Office',
      attendanceDate: entry.attendanceDate
    }));
  
  // Also try to get from todayAttendanceData if available (for users without location)
  const todayClockedInFromAttendance = (todayAttendanceData || [])
    .filter(att => {
      const attDate = att.attendanceDate ? new Date(att.attendanceDate).toISOString().slice(0, 10) : null;
      return attDate === todayISO && att.clockIn && !att.clockOut; // Has clocked in today but NOT clocked out
    })
    .map(att => ({
      id: att.id,
      userId: att.userId,
      userName: att.userName || 'Unknown',
      clockIn: att.clockIn,
      clockOut: att.clockOut,
      clockInWorkingFrom: att.clockInWorkingFrom || 'Office',
      attendanceDate: att.attendanceDate
    }));
  
  // Combine both sources and remove duplicates by userId
  const allTodayClockedIn = [...todayClockedInFromLocations, ...todayClockedInFromAttendance];
  const clockedInList = uniqueByUser(allTodayClockedIn);

  // Generate next 5 days (including today) and match with shift entries
  const next5Days = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    next5Days.push(date.toISOString().slice(0, 10));
  }

  // Process shift entries and create a map for quick lookup
  const shiftMap = new Map();
  (shiftEntries || []).forEach(entry => {
    if (!entry?.date || !entry?.shift) return;
    // Normalize date string
    let dateStr = entry.date;
    if (dateStr instanceof Date) {
      dateStr = dateStr.toISOString().slice(0, 10);
    } else if (typeof dateStr === 'string') {
      dateStr = dateStr.split('T')[0];
    }
    shiftMap.set(dateStr, entry);
  });

  // Create shift rows for the next 5 days
  const upcomingShiftRows = next5Days.map(dateStr => {
    const entry = shiftMap.get(dateStr);
    if (entry) {
      return {
        date: dateStr,
        shift: entry.shift
      };
    }
    return null;
  }).filter(Boolean); // Remove null entries (days without shifts)

  // Premium Corporate UI Theme Constants
  const pageBgClass = 'bg-slate-50 text-slate-800';
  const mainSurfaceClass = 'bg-white';
  const cardBaseClass = 'bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300';
  const heroCardClass = 'bg-slate-900 text-white shadow-xl shadow-slate-200/50 relative overflow-hidden';
  const mutedTextClass = 'text-slate-500 font-light';
  const multiplierHeaderClass = 'text-lg font-semibold text-slate-800 tracking-tight';
  const dividerClass = 'border-slate-100';

  const renderTaskCard = () => (
    <div 
      className={`${cardBaseClass} rounded-2xl p-4 flex flex-col cursor-pointer`} 
      style={{ height: CARD_HEIGHT }}
      onClick={() => navigate('/work/tasks')}
    >
      <div className={`flex items-center justify-between mb-4 flex-shrink-0 ${dividerClass} border-b pb-3`}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
            <CheckSquare className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">My Tasks</h2>
        </div>
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">{tasks.length} PENDING</span>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full w-full overflow-y-auto scroll-smooth pr-1" style={{ scrollBehavior: 'smooth' }}>
          <div className="space-y-2.5">
            {displayedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500 font-medium">All caught up!</p>
                <p className="text-[10px] text-slate-400">No tasks assigned to you</p>
              </div>
            ) : (
              displayedTasks.map((task) => (
                <div key={task.id} className="group flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-200">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-[10px] ${mutedTextClass} flex items-center gap-1`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-1 rounded-md font-semibold tracking-wide border ${getTaskStatusClass(task.status)} bg-opacity-10 border-opacity-20 text-black`}>
                    {task.status || 'PENDING'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProjectsCard = () => (
    <div 
      className={`${cardBaseClass} rounded-2xl p-4 flex flex-col cursor-pointer`} 
      style={{ height: CARD_HEIGHT }}
      onClick={() => navigate('/work/projects')}
    >
      <div className={`flex items-center justify-between mb-4 flex-shrink-0 ${dividerClass} border-b pb-3`}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
            <FolderKanban className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Projects</h2>
        </div>
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">{projects.length} ACTIVE</span>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full w-full overflow-y-auto scroll-smooth pr-1" style={{ scrollBehavior: 'smooth' }}>
          <div className="space-y-2">
            {displayedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500 font-medium">No active projects</p>
              </div>
            ) : (
              displayedProjects.map((project) => (
                <div key={project.id} className="group p-3 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50/50 hover:bg-emerald-50/30 transition-all duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate group-hover:text-emerald-700 transition-colors">{project.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className={`text-[10px] ${mutedTextClass} flex items-center gap-1`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {project.deadline ? formatDate(project.deadline) : 'No deadline'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded bg-white border border-slate-100 shadow-sm text-slate-600 uppercase tracking-wider">
                      {project.status || 'IN_PROGRESS'}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, Math.max(0, project.progressPercentage || 0))}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTicketsCard = () => (
    <div 
      className={`${cardBaseClass} rounded-2xl p-4 flex flex-col overflow-hidden cursor-pointer`} 
      style={{ height: CARD_HEIGHT }}
      onClick={() => navigate('/tickets')}
    >
      <div className={`flex items-center justify-between mb-4 flex-shrink-0 ${dividerClass} border-b pb-3`}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
            <Ticket className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Tickets</h2>
        </div>
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">{ticketsForView.length} TOTAL</span>
      </div>
      <div className="flex-1 overflow-hidden min-h-0 bg-white">
        <div className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth pr-1" style={{ scrollBehavior: 'smooth' }}>
          <table className="w-full text-xs table-fixed">
            <thead className="sticky top-0 bg-slate-50/80 backdrop-blur z-10">
              <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-3 py-3 w-20">Ticket#</th>
                <th className="px-3 py-3">Subject</th>
                <th className="px-3 py-3 w-20">Status</th>
                <th className="px-3 py-3 text-right w-16">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ticketsForView.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center">
                    <p className="text-xs text-slate-500">No tickets found</p>
                  </td>
                </tr>
              ) : (
                ticketsForView.map((ticket, idx) => (
                  <tr key={ticket.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-3 py-3 font-mono text-slate-600 text-[11px] font-medium truncate">{ticket.ticketNumber}</td>
                    <td className="px-3 py-3 font-medium text-slate-800 truncate">{ticket.subject}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${getTicketStatusClass(ticket.status)} bg-opacity-10`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400 text-[10px]">
                      {ticket.createdAt
                        ? new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBirthdaysCard = () => {
    const getEmployeeProfile = (personId) => {
      return employeesMap.get(personId);
    };

    return (
      <div className={`${cardBaseClass} rounded-2xl p-4 flex flex-col`} style={{ height: CARD_HEIGHT }}>
        <div className={`flex items-center justify-between mb-4 flex-shrink-0 ${dividerClass} border-b pb-3`}>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-full">
              <Gift className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Upcoming Birthdays</h2>
          </div>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">{birthdays.length} Upcoming</span>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="h-full w-full overflow-y-auto scroll-smooth table-scrollbar" style={{ maxHeight: '100%', scrollBehavior: 'smooth' }}>
            <div className="space-y-1.5">
              {birthdays.length === 0 ? (
                <div className="flex items-center justify-center" style={{ minHeight: '200px' }}>
                  <p className={`text-[11px] ${mutedTextClass}`}>No upcoming birthdays</p>
                </div>
              ) : (
                birthdays.map((person) => {
                  const employee = getEmployeeProfile(person.id);

                  return (
                    <div key={person.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar
                          profilePictureUrl={employee?.profilePictureUrl}
                          fullName={person.name}
                          size="w-7 h-7"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{person.name}</p>
                          <p className={`text-[10px] ${mutedTextClass} truncate`}>{person.designation}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[11px] font-semibold">{formatShortDate(person.date)}</div>
                        <div className={`text-[9px] ${mutedTextClass}`}>
                          {person.daysUntil === 0
                            ? 'Today'
                            : `${person.daysUntil} day${person.daysUntil === 1 ? '' : 's'} after`}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderShiftCard = () => {
    // Generate display rows for next 5 days (including today)
    const displayShifts = next5Days.map(dateStr => {
      const shiftEntry = shiftMap.get(dateStr);
      const dateObj = new Date(dateStr);
      const isToday = dateStr === todayISO;

      return {
        date: dateStr,
        dateObj,
        isToday,
        shift: shiftEntry?.shift || null
      };
    }).filter(day => day.shift); // Only show days with assigned shifts

    return (
      <div className={`${cardBaseClass} rounded-2xl p-4 flex flex-col`} style={{ height: CARD_HEIGHT }}>
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Shift Schedule</h2>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Next 5 Days</span>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <div className="h-full w-full overflow-y-auto scroll-smooth custom-scrollbar pr-1">
            <div className="space-y-2">
              {displayShifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">No shifts scheduled</p>
                </div>
              ) : (
                displayShifts.map((day, index) => (
                  <div key={`${day.date}-${index}`} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${day.isToday ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg ${day.isToday ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                        <span className="text-[10px] font-bold uppercase">{day.dateObj.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                        <span className="text-xs font-bold">{day.dateObj.getDate()}</span>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${day.isToday ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {day.isToday ? 'Today' : formatShortDate(day.date)}
                        </p>
                        <p className="text-[10px] text-slate-400">Shift Details</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium ${day.isToday ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        {day.shift?.name || day.shift?.shiftName || '�'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLeaveCard = () => {
    const getEmployeeProfile = (userId) => {
      return employeesMap.get(userId);
    };

    return (
      <div className={`${cardBaseClass} rounded-2xl p-4 flex flex-col`} style={{ height: CARD_HEIGHT }}>
        <div className={`flex items-center justify-between mb-4 flex-shrink-0 ${dividerClass} border-b pb-3`}>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-full">
              <LogOut className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">On Leave Today</h2>
          </div>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">{leavesList.length} AWAY</span>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="h-full w-full overflow-y-auto scroll-smooth pr-1" style={{ scrollBehavior: 'smooth' }}>
            <div className="space-y-1.5">
              {leavesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                    <UserCheck className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Full attendance!</p>
                  <p className="text-[10px] text-slate-400">No one is on leave today</p>
                </div>
              ) : (
                leavesList.map((leave) => {
                  const employee = getEmployeeProfile(leave.userId);
                  const name = leave.userFullName || leave.userName || 'Unknown';

                  return (
                    <div key={leave.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar
                          profilePictureUrl={employee?.profilePictureUrl}
                          fullName={name}
                          size="w-7 h-7"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{name}</p>
                          <p className={`text-[10px] ${mutedTextClass} truncate`}>{leave.leaveTypeName}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded bg-orange-50 text-orange-600 border border-orange-100 font-medium flex-shrink-0`}>{leave.durationType}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClockedInCard = () => {
    const getEmployeeProfile = (userId) => {
      return employeesMap.get(userId);
    };

    return (
      <div className={`${cardBaseClass} rounded-2xl p-4 flex flex-col`} style={{ height: CARD_HEIGHT }}>
        <div className={`flex items-center justify-between mb-4 flex-shrink-0 ${dividerClass} border-b pb-3`}>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Clocked In</h2>
          </div>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">{clockedInList.length} PRESENT</span>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="h-full w-full overflow-y-auto scroll-smooth pr-1" style={{ scrollBehavior: 'smooth' }}>
            <div className="space-y-1.5">
              {clockedInList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                    <Clock className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">No clock-ins yet</p>
                </div>
              ) : (
                clockedInList.map((entry) => {
                  const employee = getEmployeeProfile(entry.userId);
                  const name = entry.userName || 'Unknown';

                  return (
                    <div key={entry.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar
                          profilePictureUrl={employee?.profilePictureUrl}
                          fullName={name}
                          size="w-7 h-7"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{name}</p>
                          <p className={`text-[10px] ${mutedTextClass} truncate`}>
                            In at {formatTimeLabel(entry.clockIn)} || {entry.clockInWorkingFrom || 'Office'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderJoiningCard = () => {
    const allItems = [...joiningToday, ...anniversaryToday];
    return (
      <div className={`${cardBaseClass} rounded-2xl p-4 flex flex-col`} style={{ height: CARD_HEIGHT }}>
        <div className={`flex items-center justify-between mb-4 flex-shrink-0 ${dividerClass} border-b pb-3`}>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-full">
              <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">People Updates</h2>
          </div>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">TODAY</span>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="h-full w-full overflow-y-auto scroll-smooth pr-1" style={{ scrollBehavior: 'smooth' }}>
            <div className="space-y-4">
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Joiners</h3>
                {joiningToday.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-1">No new joiners today</p>
                ) : (
                  joiningToday.map((person) => (
                    <div key={person.id} className="flex items-center justify-between p-2 rounded-lg bg-violet-50/50 mb-1.5 border border-violet-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-200 flex items-center justify-center text-[10px] font-bold text-violet-700">
                          {person.fullName.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{person.fullName}</span>
                      </div>
                      <span className="text-[10px] text-violet-600 font-medium">{person.designationName}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-slate-100 pt-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Work Anniversaries</h3>
                {anniversaryToday.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-1">No anniversaries today</p>
                ) : (
                  anniversaryToday.map((person) => (
                    <div key={person.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 mb-1.5 border border-amber-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-700">
                          {person.name.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{person.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{person.years} Years</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAppreciationCard = () => (
    <div className={`${cardBaseClass} rounded-2xl p-4 flex flex-col`} style={{ height: CARD_HEIGHT }}>
      <div className={`flex items-center justify-between mb-4 flex-shrink-0 ${dividerClass} border-b pb-3`}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-pink-50 text-pink-600 rounded-full">
            <Award className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Appreciations</h2>
        </div>
      </div>
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mb-3">
          <Award className="w-8 h-8 text-pink-300" />
        </div>
        <p className="text-xs text-slate-500 font-medium">No appreciations yet.</p>
        <p className="text-[10px] text-slate-400 mt-1">Great work gets noticed!</p>
      </div>
    </div>
  );

  const renderCalendarCard = () => (
    <div className={`${cardBaseClass} rounded-2xl p-4 flex flex-col`} style={{ height: CARD_HEIGHT }}>
      <div className={`flex items-center justify-between mb-4 flex-shrink-0 ${dividerClass} border-b pb-3`}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
            <Calendar className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Calendar</h2>
        </div>
        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">
          {now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-[11px] flex-1">
          {calendarDays.map((day) => (
            <div
              key={day.key}
              className={`
                relative flex items-center justify-center rounded-lg transition-all
                ${day.isToday
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/30'
                  : day.isCurrentMonth
                    ? 'bg-transparent text-slate-700 hover:bg-slate-50 hover:text-indigo-600 cursor-pointer'
                    : 'text-slate-300'
                }
              `}
            >
              <span className="relative z-10">{day.date.getDate()}</span>
              {day.isToday && <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHeroCard = () => (
    <div className={`${heroCardClass} rounded-2xl p-6 relative overflow-hidden flex flex-col xl:flex-row gap-8 items-center`}>
      {/* Decorative background shapes */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center flex-1 relative z-10 w-full xl:w-auto">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar
              profilePictureUrl={profile?.profilePictureUrl}
              fullName={profile?.fullName || user?.fullName}
              size="w-20 h-20"
              className="rounded-2xl ring-4 ring-white/20 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-indigo-600 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <div className="text-indigo-100 text-xs font-medium uppercase tracking-wider mb-1">Welcome Back</div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {profile?.fullName || user?.fullName || 'Team member'}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-indigo-100/80 text-sm">
              <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-medium">{profile?.roleName || user?.role || 'Employee'}</span>
              <span className="text-white/50">| |</span>
              <span>{profile?.designationName || 'Designation'}</span>
            </div>
            <div className="text-indigo-200/60 text-xs mt-1">
              ID: <span className="font-mono">{profile?.employeeId || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full xl:w-auto flex flex-col sm:flex-row items-center justify-between gap-6 xl:border-l xl:border-white/10 xl:pl-8 relative z-10">

        <div className="flex gap-8 w-full sm:w-auto justify-around sm:justify-start">
          <div className="text-center sm:text-left">
            <div className="text-indigo-200 text-xs font-medium mb-1">Open Tasks</div>
            <div className="text-3xl font-bold text-white">{openTasksCount}</div>
            <div className="text-indigo-100/50 text-[10px]">Pending Actions</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-indigo-200 text-xs font-medium mb-1">Total Projects</div>
            <div className="text-3xl font-bold text-white">{projectsCount}</div>
            <div className="text-indigo-100/50 text-[10px]">Active Work</div>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-col items-end gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xl font-semibold text-white">{timeString}</div>
            <div className="text-indigo-200 text-xs">{dayString}</div>
            {clockInTime && (
              <div className="text-emerald-300 text-xs mt-1 font-medium bg-emerald-500/20 px-2 py-0.5 rounded-full inline-block">
                Clocked in: {clockInTime}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleClockToggle}
            disabled={clockLoading}
            className={`
              relative group overflow-hidden px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-300 w-full sm:w-auto
              ${isClockedIn
                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
              }
              disabled:opacity-70 disabled:cursor-not-allowed
            `}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {clockLoading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <span className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-white animate-pulse' : 'bg-indigo-500'}`}></span>
                  {isClockedIn ? 'Clock Out' : 'Clock In Now'}
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPrivateDashboard = () => (
    <div className="space-y-6">
      {renderHeroCard()}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderTaskCard()}
            {renderProjectsCard()}
            {renderTicketsCard()}
            {renderClockedInCard()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderShiftCard()}
            {renderLeaveCard()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderJoiningCard()}
            {renderAppreciationCard()}
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="flex flex-col gap-6">
            {renderCalendarCard()}
            {renderBirthdaysCard()}
          </div>
        </div>
      </div>
    </div>
  );

  // Advanced Dashboard Tab Navigation
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'project', label: 'Project' },
    { id: 'hr', label: 'HR' },
    { id: 'ticket', label: 'Ticket' },
  ];

  // Overview Tab Content
  const renderOverviewTab = () => {
    const pendingLeaves = allLeaves.filter(l => l.status === 'PENDING').length;
    const openTicketsCount = allTickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
    const unresolvedTicketsCount = allTickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const resolvedTicketsCount = allTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

    // Project Activity Timeline - using tasks as activity
    const projectActivities = allTasks
      .filter(t => t.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(task => ({
        id: task.id,
        date: task.createdAt,
        activity: `New task added to the project.`,
        project: task.projectName || 'N/A',
        time: new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

    return (
      <div className="space-y-6">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => navigate('/employees')}
              className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="w-16 h-16 text-indigo-600" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">Total Employees</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 ml-1">{stats.totalEmployees}</div>
            </div>

            <div 
              onClick={() => navigate('/work/projects')}
              className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <FolderKanban className="w-16 h-16 text-violet-600" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">Total Projects</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 ml-1">{stats.totalProjects}</div>
            </div>

            <div 
              onClick={() => navigate('/work/tasks')}
              className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <CheckSquare className="w-16 h-16 text-emerald-600" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">Pending Tasks</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 ml-1">{stats.pendingTasks}</div>
            </div>

            <div 
              onClick={() => navigate('/attendance')}
              className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <UserCheck className="w-16 h-16 text-blue-600" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">Today Attendance</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 ml-1">{stats.todayAttendance}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            onClick={() => navigate('/tickets')}
            className={`${cardBaseClass} rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-700">Unresolved Tickets</span>
              </div>
              <span className="p-1 bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer">
                <HelpCircle className="w-3 h-3" />
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800 pl-6">{unresolvedTicketsCount}</div>
          </div>

          <div 
            onClick={() => navigate('/leaves')}
            className={`${cardBaseClass} rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-slate-700">Pending Leaves</span>
              </div>
              <span className="p-1 bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer">
                <HelpCircle className="w-3 h-3" />
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800 pl-6">{pendingLeaves}</div>
          </div>

          <div 
            onClick={() => navigate('/tickets')}
            className={`${cardBaseClass} rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-semibold text-slate-700">Open Tickets</span>
              </div>
              <span className="p-1 bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer">
                <HelpCircle className="w-3 h-3" />
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800 pl-6">{openTicketsCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Follow Up */}
          <div className={`${cardBaseClass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-bold text-slate-800">Pending FollowUp</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-slate-300" />
              </div>
              <div className="text-xs font-medium">- No record found -</div>
            </div>
          </div>

          {/* Project Activity */}
          <div className={`${cardBaseClass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-bold text-slate-800">Project Activity Timeline</span>
              </div>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {projectActivities.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">No activity found</div>
              ) : (
                projectActivities.map((activity) => (
                  <div key={activity.id} className="relative pl-4 border-l-2 border-slate-100 pb-4 last:pb-0 last:border-0">
                    <div className="absolute top-0 -left-[5px] w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white"></div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full w-fit">
                        {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} <span className="text-white/50">�</span> {activity.time}
                      </span>
                      <p className="text-sm font-medium text-slate-700">{activity.activity}</p>
                      <p className="text-xs text-indigo-500">{activity.project}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Projects Tab Content
  const renderProjectsTab = () => {
    const totalProjects = allProjects.length;
    const overdueProjects = allProjects.filter(p => {
      if (!p.deadline) return false;
      return new Date(p.deadline) < new Date() && p.status !== 'COMPLETED';
    }).length;

    // Calculate hours logged from tasks
    const totalHours = allTasks.reduce((sum, task) => {
      return sum + (task.estimatedHours || 0);
    }, 0);
    const hoursLogged = `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`;

    // Status Wise Projects
    const statusCounts = allProjects.reduce((acc, project) => {
      const status = project.status || 'PLANNING';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => navigate('/work/projects')}
            className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FolderKanban className="w-16 h-16 text-indigo-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
                <FolderKanban className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Projects</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 ml-1">{totalProjects}</div>
          </div>

          <div 
            onClick={() => navigate('/work/projects')}
            className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertCircle className="w-16 h-16 text-rose-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-full">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Overdue Projects</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 ml-1">{overdueProjects}</div>
          </div>

          <div 
            onClick={() => navigate('/work/projects')}
            className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Clock className="w-16 h-16 text-amber-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-full">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Hours Logged</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 ml-1">{hoursLogged}</div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/work/projects')}
          className={`${cardBaseClass} rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-slate-800">Status Wise Projects</span>
            </div>
          </div>
          {Object.keys(statusCounts).length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium">
              <div className="text-4xl mb-3 opacity-20">📊</div>
              <div>- Not enough data -</div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'COMPLETED' ? 'bg-emerald-500' :
                      status === 'IN_PROGRESS' ? 'bg-blue-500' :
                        status === 'PLANNING' ? 'bg-amber-500' : 'bg-slate-400'
                      }`}></span>
                    <span className="text-sm font-semibold text-slate-700">{status}</span>
                  </div>
                  <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // HR Tab Content
  const renderHRTab = () => {
    const leavesApproved = allLeaves.filter(l => l.status === 'APPROVED').length;
    const totalEmployees = allEmployees.length;
    const newEmployees = allEmployees.filter(e => {
      if (!e.joiningDate) return false;
      const joinDate = new Date(e.joiningDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return joinDate >= thirtyDaysAgo;
    }).length;
    const employeeExits = allEmployees.filter(e => e.exitDate).length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayAttendanceCount = clockedInEmployees.length;
    const totalEmployeesCount = allEmployees.length;
    const todayAttendanceStr = `${todayAttendanceCount}/${totalEmployeesCount}`;

    // Calculate average attendance (simplified - using today's as example)
    const avgAttendance = totalEmployeesCount > 0 ? ((todayAttendanceCount / totalEmployeesCount) * 100).toFixed(2) : '0.00';

    // Department, Designation, Gender, Role distributions
    const departmentCounts = allEmployees.reduce((acc, emp) => {
      const dept = emp.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    const designationCounts = allEmployees.reduce((acc, emp) => {
      const des = emp.designationName || 'Unassigned';
      acc[des] = (acc[des] || 0) + 1;
      return acc;
    }, {});

    const genderCounts = allEmployees.reduce((acc, emp) => {
      const gender = emp.gender || 'Not Specified';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});

    const roleCounts = allEmployees.reduce((acc, emp) => {
      const role = emp.roleName || 'Unassigned';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    // Headcount over months (last 12 months)
    const headcountData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const count = allEmployees.filter(e => {
        if (!e.joiningDate) return false;
        const joinDate = new Date(e.joiningDate);
        return joinDate <= monthStart && (!e.exitDate || new Date(e.exitDate) > monthStart);
      }).length;
      headcountData.push({ month: date.toLocaleDateString('en-US', { month: 'short' }), count });
    }

    // Joining vs Attrition
    const joiningVsAttrition = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const joining = allEmployees.filter(e => {
        if (!e.joiningDate) return false;
        const joinDate = new Date(e.joiningDate);
        return joinDate >= monthStart && joinDate <= monthEnd;
      }).length;
      const attrition = allEmployees.filter(e => {
        if (!e.exitDate) return false;
        const exitDate = new Date(e.exitDate);
        return exitDate >= monthStart && exitDate <= monthEnd;
      }).length;
      joiningVsAttrition.push({ month: date.toLocaleDateString('en-US', { month: 'short' }), joining, attrition });
    }

    // Leaves Taken - Get all approved leaves with employee details
    const leavesTakenList = allLeaves
      .filter(l => l.status === 'APPROVED')
      .map(leave => {
        const employee = allEmployees.find(emp => emp.id === leave.userId);
        return {
          id: leave.id,
          employeeName: leave.userFullName || leave.userName || employee?.fullName || 'Unknown',
          leaveType: leave.leaveTypeName || 'Leave',
          startDate: leave.startDate,
          endDate: leave.endDate,
          designation: employee?.designationName || 'Employee',
        };
      })
      .slice(0, 10); // Show top 10

    // Upcoming Birthdays - Get employees with upcoming birthdays (next 10 days)
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Normalize to start of day
    const currentYear = todayDate.getFullYear();

    const upcomingBirthdaysList = allEmployees
      .filter(emp => {
        // Filter out employees without dateOfBirth
        if (!emp.dateOfBirth) return false;
        try {
          const dob = new Date(emp.dateOfBirth);
          // Validate date
          if (isNaN(dob.getTime())) return false;
          return true;
        } catch (e) {
          return false;
        }
      })
      .map(emp => {
        const dob = new Date(emp.dateOfBirth);
        const thisYearBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());
        thisYearBirthday.setHours(0, 0, 0, 0);
        const nextYearBirthday = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
        nextYearBirthday.setHours(0, 0, 0, 0);

        // Determine which birthday is upcoming
        let upcomingBirthday;
        if (thisYearBirthday >= todayDate) {
          upcomingBirthday = thisYearBirthday;
        } else {
          upcomingBirthday = nextYearBirthday;
        }

        const daysUntil = Math.ceil((upcomingBirthday - todayDate) / (1000 * 60 * 60 * 24));

        return {
          id: emp.id,
          name: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
          designation: emp.designationName || emp.roleName || 'Employee',
          dateOfBirth: emp.dateOfBirth,
          daysUntil,
          upcomingDate: upcomingBirthday,
        };
      })
      .filter(b => b.daysUntil >= 0 && b.daysUntil <= 7) // Next 7 days
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // Late Attendance - Get employees with LATE status today
    const lateAttendanceList = todayAttendanceData
      .filter(att => {
        const attDate = att.attendanceDate ? new Date(att.attendanceDate).toISOString().slice(0, 10) : null;
        return attDate === todayStr && att.status === 'LATE';
      })
      .map(att => {
        const employee = allEmployees.find(emp => emp.id === att.userId);
        return {
          id: att.id,
          userId: att.userId,
          userName: att.userName || employee?.fullName || 'Unknown',
          designation: employee?.designationName || employee?.roleName || 'Employee',
          clockIn: att.clockIn,
          profilePictureUrl: employee?.profilePictureUrl || att.profilePictureUrl,
        };
      });

    // Helper function to convert counts to pie chart data
    const convertToPieData = (counts) => {
      return Object.entries(counts).map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        value,
      }));
    };

    // Colors for pie charts
    // Colors for pie charts - Corporate Palette
    const COLORS = ['#3b82f6', '#6366f1', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

    // Prepare pie chart data
    const departmentPieData = convertToPieData(departmentCounts);
    const designationPieData = convertToPieData(designationCounts);
    const genderPieData = convertToPieData(genderCounts);
    const rolePieData = convertToPieData(roleCounts);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => navigate('/leaves')}
            className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FileText className="w-16 h-16 text-indigo-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Leaves Approved</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 ml-1">{leavesApproved}</div>
          </div>

          <div 
            onClick={() => navigate('/employees')}
            className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users className="w-16 h-16 text-violet-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-violet-50 text-violet-600 rounded-full">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Employees</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 ml-1">{totalEmployees}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium">
              <span className="p-0.5 bg-emerald-50 rounded-full"><TrendingUp className="w-3 h-3" /></span>
              <span>{newEmployees} New Joiners</span>
            </div>
          </div>

          <div 
            onClick={() => navigate('/employees')}
            className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <LogOut className="w-16 h-16 text-rose-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-full">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Employee Exits</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 ml-1">{employeeExits}</div>
          </div>

          <div 
            onClick={() => navigate('/attendance')}
            className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <UserCheck className="w-16 h-16 text-blue-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Today Attendance</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 ml-1">{todayAttendanceStr}</div>
            <div className="text-xs text-slate-400 mt-1">Avg: {avgAttendance}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${cardBaseClass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-bold text-slate-800">Department Distribution</span>
              </div>
            </div>
            {departmentPieData.length === 0 ? (
              <div className="text-center py-10 text-slate-400">- Not enough data -</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={departmentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {departmentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className={`${cardBaseClass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-slate-800">Designation Distribution</span>
              </div>
            </div>
            {designationPieData.length === 0 ? (
              <div className="text-center py-10 text-slate-400">- Not enough data -</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={designationPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {designationPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gender and Role Charts similar to above */}
          <div className={`${cardBaseClass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-500" />
                <span className="text-sm font-bold text-slate-800">Gender Distribution</span>
              </div>
            </div>
            {genderPieData.length === 0 ? (
              <div className="text-center py-10 text-slate-400">- Not enough data -</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={genderPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {genderPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className={`${cardBaseClass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-slate-800">Role Distribution</span>
              </div>
            </div>
            {rolePieData.length === 0 ? (
              <div className="text-center py-10 text-slate-400">- Not enough data -</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={rolePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {rolePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={`${cardBaseClass} rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-slate-800">Headcount Growth</span>
            </div>
          </div>
          {headcountData.length === 0 ? (
            <div className="text-center py-10 text-slate-400">- Not enough data -</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={headcountData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`${cardBaseClass} rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-slate-800">Joining Vs Attrition</span>
            </div>
          </div>
          {joiningVsAttrition.length === 0 ? (
            <div className="text-center py-10 text-slate-400">- Not enough data -</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={joiningVsAttrition}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="joining" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Joined" />
                <Line type="monotone" dataKey="attrition" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} name="Left" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${cardBaseClass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-bold text-slate-800">Leaves Taken</span>
              </div>
            </div>
            {leavesTakenList.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <div className="text-4xl mb-2 grayscale opacity-50">✈️</div>
                <div>- No record found. -</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {leavesTakenList.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{leave.employeeName}</div>
                      <div className="text-xs text-slate-500">{leave.leaveType} • {leave.designation}</div>
                    </div>
                    <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {leave.startDate ? formatDate(leave.startDate) : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${cardBaseClass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-pink-500" />
                <span className="text-sm font-bold text-slate-800">Upcoming Birthdays</span>
              </div>
            </div>
            {upcomingBirthdaysList.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <div className="text-4xl mb-2 grayscale opacity-50">🎂</div>
                <div>- No record found. -</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {upcomingBirthdaysList.map((birthday) => (
                  <div key={birthday.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{birthday.name}</div>
                      <div className="text-xs text-slate-500">{birthday.designation}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-700">
                        {birthday.upcomingDate ? new Date(birthday.upcomingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(birthday.dateOfBirth).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${birthday.daysUntil === 0 ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-500'}`}>
                        {birthday.daysUntil === 0 ? 'Today' : birthday.daysUntil === 1 ? '1 day' : `${birthday.daysUntil} days`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${cardBaseClass} rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-bold text-slate-800">Late Attendance</span>
            </div>
          </div>
          {lateAttendanceList.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No late attendance records for today</div>
          ) : (
            <div className="space-y-3">
              {lateAttendanceList.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-rose-100 hover:bg-rose-50/30 transition-all">
                  <div className="flex items-center gap-3">
                    <Avatar
                      profilePictureUrl={emp.profilePictureUrl}
                      fullName={emp.userName}
                      size="w-10 h-10"
                      className="shadow-sm"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-700">{emp.userName}</div>
                      <div className="text-xs text-slate-500">{emp.designation}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                      {emp.clockIn ? new Date(`2000-01-01T${emp.clockIn}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Tickets Tab Content
  const renderTicketsTab = () => {
    const unresolvedTickets = allTickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const resolvedTickets = allTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    const unassignedTickets = allTickets.filter(t => !t.assignedAgentId).length;
    const openTickets = allTickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

    // Type Wise Tickets
    const typeCounts = allTickets.reduce((acc, ticket) => {
      const type = ticket.ticketType || 'Unspecified';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Status Wise Tickets
    const statusCounts = allTickets.reduce((acc, ticket) => {
      const status = ticket.status || 'OPEN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Channel Wise Tickets
    const channelCounts = allTickets.reduce((acc, ticket) => {
      const channel = ticket.channelName || 'Unspecified';
      acc[channel] = (acc[channel] || 0) + 1;
      return acc;
    }, {});

    // Helper function to convert counts to pie chart data
    const convertTicketCountsToPieData = (counts) => {
      return Object.entries(counts).map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        value,
      }));
    };

    // Colors for pie charts
    // Colors for pie charts - Corporate Palette
    const TICKET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];

    // Prepare pie chart data for tickets
    const typePieData = convertTicketCountsToPieData(typeCounts);
    const statusPieData = convertTicketCountsToPieData(statusCounts);
    const channelPieData = convertTicketCountsToPieData(channelCounts);



    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => navigate('/tickets')}
            className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertCircle className="w-16 h-16 text-amber-600" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-full">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Ticket Status</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="text-sm text-slate-600">Unresolved Tickets</span>
                <span className="text-lg font-bold text-slate-800">{unresolvedTickets}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="text-sm text-slate-600">Resolved Tickets</span>
                <span className="text-lg font-bold text-slate-800">{resolvedTickets}</span>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/tickets')}
            className={`${cardBaseClass} rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <HelpCircle className="w-16 h-16 text-rose-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-full">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Unassigned Ticket</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 ml-1">{unassignedTickets}</div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-500">Open Tickets</span>
              <span className="text-sm font-bold text-slate-800">{openTickets}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => navigate('/tickets')}
            className={`${cardBaseClass} rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-slate-800">Type Wise Ticket</span>
              </div>
            </div>
            {typePieData.length === 0 ? (
              <div className="text-center py-10 text-slate-400">- Not enough data -</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={typePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {typePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TICKET_COLORS[index % TICKET_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div 
            onClick={() => navigate('/tickets')}
            className={`${cardBaseClass} rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-slate-800">Status Wise Ticket</span>
              </div>
            </div>
            {statusPieData.length === 0 ? (
              <div className="text-center py-10 text-slate-400">- Not enough data -</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TICKET_COLORS[index % TICKET_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className={`${cardBaseClass} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-slate-800">Channel Wise Ticket</span>
              </div>
            </div>
            {channelPieData.length === 0 ? (
              <div className="text-center py-10 text-slate-400">- Not enough data -</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={channelPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {channelPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TICKET_COLORS[index % TICKET_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdvancedDashboard = () => {
    const renderTabContent = () => {
      switch (activeTab) {
        case 'overview':
          return renderOverviewTab();
        case 'project':
          return renderProjectsTab();
        case 'hr':
          return renderHRTab();
        case 'ticket':
          return renderTicketsTab();
        default:
          return renderOverviewTab();
      }
    };

    return (
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    );
  };

  return (
    <div className={`flex h-screen ${mainSurfaceClass}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 ${pageBgClass}`}>
          {isPrivateView ? renderPrivateDashboard() : renderAdvancedDashboard()}
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

