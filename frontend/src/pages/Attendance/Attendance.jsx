import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { FiFilter, FiX } from 'react-icons/fi';
import { attendanceService } from '../../api/attendanceService';
import { employeeService } from '../../api/employeeService';
import { dashboardService } from '../../api/dashboardService';
import { departmentService } from '../../api/departmentService';
import { designationService } from '../../api/designationService';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import Modal from '../../components/UI/Modal';
import Avatar from '../../components/UI/Avatar';
import SearchableEmployeeSelect from '../../components/UI/SearchableEmployeeSelect';
import { formatDate, formatTime } from '../../utils/formatters';
import { getFullImageUrl } from '../../utils/imageUrl';
import { useDebounce } from '../../hooks/useDebounce';

// Constants for Google Maps - must be outside component to prevent re-renders
const GOOGLE_MAPS_LIBRARIES = ['marker'];

// Helper function to create info window content
// Note: getFullImageUrl is imported at the top of the file
const createInfoWindowContent = (employee) => {
  const formatTime = (time) => {
    if (!time) return 'N/A';
    if (typeof time === 'string') {
      return time.substring(0, 5); // HH:mm format
    }
    return time;
  };

  const formatDate = (date) => {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
      return '';
    }
  };

  const clockInTime = formatTime(employee.clockIn);
  const clockOutTime = formatTime(employee.clockOut);
  const attendanceDate = employee.attendanceDate ? formatDate(employee.attendanceDate) : '';
  const workingFrom = (employee.clockInWorkingFrom || 'N/A').charAt(0).toUpperCase() + (employee.clockInWorkingFrom || 'N/A').slice(1);

  // Show coordinates for debugging location accuracy
  const coordinates = (employee.lat && employee.lng)
    ? `${employee.lat.toFixed(6)}, ${employee.lng.toFixed(6)}`
    : 'N/A';

  // Generate initials for fallback
  const getInitials = (nameStr) => {
    if (!nameStr || !nameStr.trim()) return '?';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  };

  const initials = getInitials(employee.fullName);
  const hasProfilePic = employee.profilePictureUrl;
  const fullProfilePicUrl = hasProfilePic ? getFullImageUrl(employee.profilePictureUrl) : null;

  return `
    <div style="padding: 8px; min-width: 200px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        ${hasProfilePic && fullProfilePicUrl ? `
        <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; position: relative; flex-shrink: 0;">
          <img 
            src="${fullProfilePicUrl}" 
            alt="${employee.fullName}"
            style="width: 100%; height: 100%; object-fit: cover;"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div style="width: 100%; height: 100%; background-color: #3b82f6; display: none; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
            ${initials}
          </div>
        </div>
        ` : `
        <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px; flex-shrink: 0;">
          ${initials}
        </div>
        `}
        <div style="font-weight: 600; font-size: 16px;">${employee.fullName || 'Employee'}</div>
      </div>
      <div style="font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; flex-direction: column; gap: 8px;">
        <div>
          <span style="font-weight: 600;">Clock In:</span>
          <div style="color: #374151;">${clockInTime}</div>
          ${attendanceDate ? `<div style="font-size: 12px; color: #6b7280;">${attendanceDate}</div>` : ''}
        </div>
        <div>
          <span style="font-weight: 600;">Clock Out:</span>
          <div style="color: #374151;">${clockOutTime === 'N/A' ? 'Did not clock out' : clockOutTime}</div>
          ${attendanceDate && clockOutTime !== 'N/A' ? `<div style="font-size: 12px; color: #6b7280;">${attendanceDate}</div>` : ''}
        </div>
        <div>
          <span style="font-weight: 600;">Working From:</span>
          <div style="color: #374151; text-transform: capitalize;">${workingFrom}</div>
        </div>
        ${employee.clockInLocation ? `
        <div>
          <span style="font-weight: 600;">Location:</span>
          <div style="color: #374151; font-size: 12px;">${employee.clockInLocation}</div>
        </div>
        ` : ''}
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
          <span style="font-weight: 600; font-size: 11px; color: #6b7280;">Coordinates:</span>
          <div style="color: #6b7280; font-size: 10px; font-family: monospace;">${coordinates}</div>
        </div>
      </div>
    </div>
  `;
};

// Map Component to isolate Google Maps loading
const MapComponent = ({ apiKey, mapEmployees, selectedMapEmployee, setSelectedMapEmployee }) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const mapCenter = useMemo(() => {
    if (mapEmployees.length > 0) {
      return { lat: mapEmployees[0].lat, lng: mapEmployees[0].lng };
    }
    return { lat: 18.5204, lng: 73.8567 };
  }, [mapEmployees]);

  // Check if AdvancedMarkerElement is available for mapId requirement
  const useMapId = useMemo(() => {
    return typeof window !== 'undefined' && 
           window.google?.maps?.marker?.AdvancedMarkerElement;
  }, [isLoaded]);

  // Create markers when map is loaded and data is available
  useEffect(() => {
    // Wait for map to be fully loaded and ready
    if (!isLoaded || !mapRef.current || !mapReady) return;

    // Wait for map employees data to be available
    if (!mapEmployees || mapEmployees.length === 0) {
      // Clear existing markers if data is empty
      markersRef.current.forEach(marker => {
        if (marker) {
          if (marker.map) marker.map = null;
          if (marker.setMap) marker.setMap(null);
        }
      });
      markersRef.current = [];
      return;
    }

    const map = mapRef.current;

    // Ensure map is fully initialized
    if (!map || typeof map.setCenter !== 'function') {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker) {
        if (marker.map) marker.map = null;
        if (marker.setMap) marker.setMap(null);
      }
    });
    markersRef.current = [];

    // Check if AdvancedMarkerElement is available
    const useAdvancedMarker = window.google?.maps?.marker?.AdvancedMarkerElement;

    // Helper function to calculate distance between two points (in meters)
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Helper function to offset overlapping markers
    const getOffsetPosition = (lat, lng, existingBasePositions, index) => {
      const MIN_DISTANCE = 30; // Minimum distance between markers in meters (about 30m)
      let offsetLat = lat;
      let offsetLng = lng;
      let needsOffset = false;
      let samePositionCount = 0; // Count how many markers are at the exact same position

      // Check if this position is too close to any existing marker's base position
      for (const existingPos of existingBasePositions) {
        const distance = calculateDistance(lat, lng, existingPos.lat, existingPos.lng);
        if (distance < MIN_DISTANCE) {
          needsOffset = true;
          // Count exact matches (distance === 0 or very close to 0 due to floating point precision)
          if (distance < 0.1) { // Less than 0.1 meters = essentially the same position
            samePositionCount++;
          }
        }
      }

      if (needsOffset) {
        // Calculate offset - move marker in a circular pattern around the base position
        // For exact same positions, use a better distribution pattern
        // samePositionCount is the number of previous markers at this position
        // So current marker index in the group is samePositionCount (0-indexed)
        const totalOverlapping = samePositionCount + 1; // +1 for current marker
        const angleStep = 360 / Math.max(totalOverlapping, 2); // At least 2 to avoid division issues
        const angle = (samePositionCount * angleStep) * (Math.PI / 180);
        const offsetDistance = MIN_DISTANCE / 111000; // Convert meters to degrees (approx 111km per degree)
        offsetLat = lat + (offsetDistance * Math.cos(angle));
        offsetLng = lng + (offsetDistance * Math.sin(angle) / Math.cos(lat * Math.PI / 180));

      }

      return { lat: offsetLat, lng: offsetLng };
    };

    // Small delay to ensure map is fully rendered, then create markers
    const timer = setTimeout(() => {
      if (!mapRef.current || !window.google || !window.google.maps) return;

      const currentMap = mapRef.current;

      // Create markers immediately for faster rendering
      // Images will load asynchronously
      requestAnimationFrame(() => {
        if (!currentMap) return; // Double check map is still available

        const existingBasePositions = []; // Track base positions to detect overlaps


        mapEmployees.forEach((employee, index) => {
          if (!employee.lat || !employee.lng) {
            return;
          }

          // Get position with offset if needed to prevent overlapping
          const basePosition = { lat: employee.lat, lng: employee.lng };
          const position = getOffsetPosition(basePosition.lat, basePosition.lng, existingBasePositions, index);
          existingBasePositions.push(basePosition); // Store base position for overlap detection


          if (useAdvancedMarker) {
            // Use AdvancedMarkerElement with profile picture
            const markerElement = document.createElement('div');
            markerElement.style.width = '50px';
            markerElement.style.height = '50px';
            markerElement.style.borderRadius = '50%';
            markerElement.style.overflow = 'hidden';
            markerElement.style.border = '3px solid white';
            markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            markerElement.style.cursor = 'pointer';
            markerElement.style.background = '#4285f4';
            markerElement.style.display = 'flex';
            markerElement.style.alignItems = 'center';
            markerElement.style.justifyContent = 'center';

            // Generate initials for fallback
            const getInitials = (nameStr) => {
              if (!nameStr || !nameStr.trim()) return '?';
              const parts = nameStr.trim().split(/\s+/);
              if (parts.length === 0) return '?';
              if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
              const firstInitial = parts[0].charAt(0).toUpperCase();
              const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
              return `${firstInitial}${lastInitial}`;
            };
            
            const initials = getInitials(employee.fullName);
            
            if (employee.profilePictureUrl) {
              const img = document.createElement('img');
              // Convert relative URL to full URL in production
              const fullImageUrl = getFullImageUrl(employee.profilePictureUrl);
              img.src = fullImageUrl || employee.profilePictureUrl;
              img.style.width = '100%';
              img.style.height = '100%';
              img.style.objectFit = 'cover';
              img.alt = employee.fullName;
              img.loading = 'eager';
              img.onerror = () => {
                // Fallback to initials if image fails
                markerElement.innerHTML = `<div style="color: white; font-weight: bold; font-size: 18px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${initials}</div>`;
              };
              markerElement.appendChild(img);
            } else {
              // Show initials directly if no profile picture
              markerElement.innerHTML = `<div style="color: white; font-weight: bold; font-size: 18px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${initials}</div>`;
            }

            const marker = new window.google.maps.marker.AdvancedMarkerElement({
              map: currentMap,
              position: position,
              content: markerElement,
              title: employee.fullName
            });

            markerElement.addEventListener('click', () => {
              setSelectedMapEmployee(employee);
              // Show info window at original position (not offset)
              if (infoWindowRef.current) {
                infoWindowRef.current.close();
              }
              const infoWindow = new window.google.maps.InfoWindow({
                content: createInfoWindowContent(employee),
                position: basePosition // Use original position for info window
              });
              infoWindow.open(currentMap);
              infoWindowRef.current = infoWindow;
            });

            markersRef.current.push(marker);
          } else {
            // Fallback to regular Marker with custom icon
            const icon = employee.profilePictureUrl ? {
              url: getFullImageUrl(employee.profilePictureUrl) || '/assets/noprofilePic.jpg',
              scaledSize: new window.google.maps.Size(50, 50),
              anchor: new window.google.maps.Point(25, 25),
              shape: { type: 'circle', coords: [25, 25, 25] }
            } : undefined;

            const marker = new window.google.maps.Marker({
              map: currentMap,
              position: position,
              icon: icon,
              title: employee.fullName,
              optimized: true // Use optimized rendering
            });

            marker.addListener('click', () => {
              setSelectedMapEmployee(employee);
              // Show info window at original position (not offset)
              if (infoWindowRef.current) {
                infoWindowRef.current.close();
              }
              const infoWindow = new window.google.maps.InfoWindow({
                content: createInfoWindowContent(employee),
                position: basePosition // Use original position for info window
              });
              infoWindow.open(currentMap);
              infoWindowRef.current = infoWindow;
            });

            markersRef.current.push(marker);
          }
        });

      }); // End of requestAnimationFrame
    }, 50); // Small delay to ensure map is ready

    return () => {
      clearTimeout(timer);
      // Cleanup markers
      markersRef.current.forEach(marker => {
        if (marker) {
          if (marker.map) marker.map = null;
          if (marker.setMap) marker.setMap(null);
        }
      });
      markersRef.current = [];
      // Close info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, [isLoaded, mapEmployees, mapReady, setSelectedMapEmployee]);

  // Close info window when selectedMapEmployee changes to null
  useEffect(() => {
    if (!selectedMapEmployee && infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }
  }, [selectedMapEmployee]);

  if (!isLoaded) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">Loading map...</p>
        </div>
      </div>
    );
  }

  // Check if AdvancedMarkerElement is available to determine if mapId is needed
  const needsMapId = typeof window !== 'undefined' && 
                     window.google?.maps?.marker?.AdvancedMarkerElement;

  return (
    <div className="h-96">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={mapCenter}
        zoom={mapEmployees.length > 0 ? 13 : 12}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          // Only use mapId if AdvancedMarkerElement is available
          // This allows production to work without creating Map ID in Google Cloud Console
          // Development will still work if AdvancedMarkerElement is available
          ...(useMapId ? { mapId: 'EMPLOYEE_LOCATIONS_MAP' } : {})
        }}
        onLoad={(map) => {
          mapRef.current = map;
          setMapReady(true); // Trigger marker creation when map is ready
        }}
      >
      </GoogleMap>
    </div>
  );
};

const Attendance = () => {
  const { user, isAdmin, getModulePermission } = useAuth();

  // Get permissions for Attendance module
  const canAdd = isAdmin() || getModulePermission('Attendance', 'add') !== 'None';
  const canUpdate = isAdmin() || getModulePermission('Attendance', 'update') !== 'None';
  const canDelete = isAdmin() || getModulePermission('Attendance', 'delete') !== 'None';
  const hasAllViewPermission = isAdmin() || getModulePermission('Attendance', 'view') === 'All';
  const [activeTab, setActiveTab] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Pagination state
  const [attendancePage, setAttendancePage] = useState(0);
  const [attendancePageSize] = useState(25); // Show 25 employees per page
  
  // Search state with debouncing
  const [searchInput, setSearchInput] = useState(''); // Local input value (updates immediately)
  const debouncedSearch = useDebounce(searchInput, 300); // Debounced value for filtering
  const searchInputRef = useRef(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    employee: '',
    department: '',
    designation: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [departmentFilterSearchTerm, setDepartmentFilterSearchTerm] = useState('');
  const [designationFilterSearchTerm, setDesignationFilterSearchTerm] = useState('');
  const [isDepartmentFilterOpen, setIsDepartmentFilterOpen] = useState(false);
  const [isDesignationFilterOpen, setIsDesignationFilterOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const departmentFilterRef = useRef(null);
  const designationFilterRef = useRef(null);

  // Modals
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const [showAttendanceDetail, setShowAttendanceDetail] = useState(false);
  const [showEditAttendance, setShowEditAttendance] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [editAttendanceData, setEditAttendanceData] = useState(null);
  const [loadingAttendanceDetail, setLoadingAttendanceDetail] = useState(false);
  const [attendanceDetailError, setAttendanceDetailError] = useState(null);

  // Form states
  const [markAttendanceForm, setMarkAttendanceForm] = useState({
    department: '',
    employees: [],
    location: 'WorkSphere India Pune',
    markBy: 'month',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    fromDate: '',
    toDate: '',
    clockIn: '09:00',
    clockInLocation: 'WorkSphere India Pune',
    clockInWorkingFrom: 'office',
    clockOut: '18:00',
    clockOutLocation: 'WorkSphere India Pune',
    clockOutWorkingFrom: 'office',
    late: false,
    halfDay: false,
    attendanceOverwrite: false
  });

  // Tab 2 states
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [summaryData, setSummaryData] = useState(null);

  // Map states
  const [mapEmployees, setMapEmployees] = useState([]);
  const [selectedMapEmployee, setSelectedMapEmployee] = useState(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState(null);

  useEffect(() => {
    loadInitialData();
    // Only load Google Maps API key when Map View tab is accessed
  }, []);


  const loadGoogleMapsApiKey = useCallback(async () => {
    if (googleMapsApiKey) return; // Already loaded
    try {
      const response = await dashboardService.getGoogleMapsApiKey();
      setGoogleMapsApiKey(response.data.apiKey);
    } catch (error) {
    }
  }, [googleMapsApiKey]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (departmentFilterRef.current && !departmentFilterRef.current.contains(event.target)) {
        setIsDepartmentFilterOpen(false);
        setDepartmentFilterSearchTerm('');
      }
      if (designationFilterRef.current && !designationFilterRef.current.contains(event.target)) {
        setIsDesignationFilterOpen(false);
        setDesignationFilterSearchTerm('');
      }
      // Employee dropdowns are now handled by SearchableEmployeeSelect component
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset pagination when filters or search change
  useEffect(() => {
    if (activeTab === 1) {
      setAttendancePage(0);
    }
  }, [filters.employee, filters.department, filters.designation, filters.month, filters.year, currentMonth, currentYear, debouncedSearch, activeTab]);

  useEffect(() => {
    if (activeTab === 1) {
      loadAttendanceTable();
      // Set up auto-refresh every 30 seconds when attendance tab is active
      const interval = setInterval(() => {
        loadAttendanceTable();
      }, 30000);
      return () => clearInterval(interval);
    } else if (activeTab === 2) {
      // Set default employee for non-admin users and users without "All" permission
      // Non-admin users can only view their own data
      if (!hasAllViewPermission) {
        setSelectedEmployee(user.userId.toString());
      } else if (!selectedEmployee) {
        // For admin users, if no employee selected, don't load summary
        setSummaryData(null);
        return;
      }
      if (selectedEmployee) {
        loadMonthlySummary();
      }
    } else if (activeTab === 4) {
      // Load Google Maps API key only when Map View tab is accessed
      if (!googleMapsApiKey) {
        loadGoogleMapsApiKey();
      }
      loadMapData();
      // Set up auto-refresh every 30 seconds for map view
      const interval = setInterval(() => {
        loadMapData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, filters.month, filters.year, filters.employee, filters.department, filters.designation, currentMonth, currentYear, selectedEmployee, summaryMonth, summaryYear, isAdmin, user.userId, hasAllViewPermission, googleMapsApiKey]);

  const loadInitialData = async () => {
    try {
      // Load employees if admin or user has "All" view or add permission (needed for attendance table and mark attendance)
      // Don't load attendance table here - let it load when tab is accessed
      const viewPermission = getModulePermission('Attendance', 'view');
      const addPermission = getModulePermission('Attendance', 'add');
      const hasAllViewPermission = isAdmin() || viewPermission === 'All';
      const hasAllAddPermission = isAdmin() || addPermission === 'All';

      // OPTIMIZED: Don't load all employees upfront - use pagination in SearchableEmployeeSelect
      // Employees will be loaded on-demand when needed (filters, mark attendance, etc.)
      // This prevents loading 500+ employees and causing performance issues
      
      // Load departments and designations for filters
      try {
        const [departmentsRes, designationsRes] = await Promise.all([
          departmentService.getAll(),
          designationService.getAll()
        ]);
        setDepartments(departmentsRes.data || []);
        setDesignations(designationsRes.data || []);
      } catch (error) {
      }
      
      // Load attendance table for initial tab
      await loadAttendanceTable();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceTable = async () => {
    try {
      // Check if user has "All" view permission
      const viewPermission = getModulePermission('Attendance', 'view');
      const hasAllPermission = isAdmin() || viewPermission === 'All';

      // Use filters for month and year
      const filterMonth = filters.month || currentMonth;
      const filterYear = filters.year || currentYear;

      // Use getAllByMonth for better performance - it's much faster than individual calls
      // This endpoint handles both "All" and filtered permissions
      const response = await attendanceService.getAllByMonth(filterYear, filterMonth);

      if (!response || !response.data) {
        setAttendance([]);
        return;
      }

      // Group attendance by employee
      const attendanceByEmployee = {};
      response.data.forEach(att => {
        if (!attendanceByEmployee[att.userId]) {
          attendanceByEmployee[att.userId] = [];
        }
        attendanceByEmployee[att.userId].push(att);
      });

      // OPTIMIZED: Use employee names from attendance response (already included)
      // Don't load all employees - use pagination when needed
      // For filtering, we'll get employee details from attendance data or load on-demand
      let employeesList = employees;
      
      // Create a map from attendance data for quick lookup (fallback if employees not loaded)
      const employeeMapFromAttendance = {};
      response.data.forEach(att => {
        if (att.userId && att.userName && !employeeMapFromAttendance[att.userId]) {
          employeeMapFromAttendance[att.userId] = {
            id: att.userId,
            fullName: att.userName,
            profilePictureUrl: att.profilePictureUrl || null,
            // Other fields will be undefined, but that's okay for attendance display
          };
        }
      });

      // Build attendance array with employee details
      const attendanceArray = Object.keys(attendanceByEmployee).map(userId => {
        // For non-admin users, get employee info from the first attendance record
        const firstAttendance = attendanceByEmployee[userId][0];
        // Get profilePictureUrl from attendance response (most up-to-date)
        const attendanceProfilePictureUrl = firstAttendance?.profilePictureUrl || null;
        let employee;

        if (hasAllPermission) {
          // For admin/users with "All" permission, try to find in employees list
          // Use fallback from attendance data if employees not loaded yet
          const foundEmployee = employeesList.find(emp => emp.id === parseInt(userId));
          if (foundEmployee) {
            // Merge employee data with profilePictureUrl from attendance response (more up-to-date)
            employee = {
              ...foundEmployee,
              profilePictureUrl: attendanceProfilePictureUrl || foundEmployee.profilePictureUrl || null
            };
          } else {
            employee = employeeMapFromAttendance[userId]
              || {
                id: parseInt(userId),
                fullName: firstAttendance?.userName || 'Unknown',
                designationName: 'Employee',
                profilePictureUrl: attendanceProfilePictureUrl
              };
          }
        } else {
          // For non-admin users, use userName from attendance response
          // Also try to get current user's info from auth context if it matches
          if (parseInt(userId) === user.userId) {
            employee = {
              id: user.userId,
              fullName: user.fullName || firstAttendance?.userName || 'Unknown',
              designationName: user.designationName || 'Employee',
              // Prioritize attendance response profilePictureUrl over user context
              profilePictureUrl: attendanceProfilePictureUrl || user.profilePictureUrl || null
            };
          } else {
            // Should not happen for non-admin, but use userName from response
            employee = {
              id: parseInt(userId),
              fullName: firstAttendance?.userName || 'Unknown',
              designationName: 'Employee',
              profilePictureUrl: attendanceProfilePictureUrl
            };
          }
        }

        return {
          employee,
          attendance: attendanceByEmployee[userId]
        };
      });

      // If user has "All" permission, also include employees without attendance records
      if (hasAllPermission && employeesList.length > 0) {
        const employeesWithAttendance = new Set(attendanceArray.map(item => item.employee.id));
        employeesList.forEach(employee => {
          if (!employeesWithAttendance.has(employee.id)) {
            attendanceArray.push({
              employee,
              attendance: []
            });
          }
        });
        // Sort by employee name for consistent display
        attendanceArray.sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));
      }

      // Apply filters
      let filteredAttendance = attendanceArray;
      
      // Filter by employee
      if (filters.employee) {
        filteredAttendance = filteredAttendance.filter(item => 
          String(item.employee.id) === String(filters.employee)
        );
      }
      
      // Filter by department
      if (filters.department) {
        filteredAttendance = filteredAttendance.filter(item => {
          const emp = employeesList.find(e => e.id === item.employee.id);
          return emp && emp.department === filters.department;
        });
      }
      
      // Filter by designation
      if (filters.designation) {
        filteredAttendance = filteredAttendance.filter(item => {
          const emp = employeesList.find(e => e.id === item.employee.id);
          return emp && String(emp.designationId) === String(filters.designation);
        });
      }

      // Don't apply search filter here - apply it in useMemo for client-side filtering
      setAttendance(filteredAttendance);
      // Don't reset page here - only reset when filters/search actually change (handled by useEffect above)
    } catch (error) {
      setAttendance([]);
      // Only reset page on error if it's not an auto-refresh
      // For now, we'll keep it reset on error to avoid showing wrong data
      setAttendancePage(0);
    }
  };

  const loadMonthlySummary = async () => {
    try {
      // For non-admin users, ensure they can only view their own data
      const viewPermission = getModulePermission('Attendance', 'view');
      const hasAllViewPermission = isAdmin() || viewPermission === 'All';
      const employeeId = hasAllViewPermission ? selectedEmployee : user.userId.toString();

      if (!employeeId) {
        setSummaryData(null);
        return;
      }

      const response = await attendanceService.getByEmployeeAndMonth(employeeId, summaryYear, summaryMonth);
      const attendanceData = response.data || [];

      const totalDays = getDaysInMonth(summaryYear, summaryMonth);
      
      // Count holidays from attendance data (includes Sundays and actual holidays)
      // Backend marks both Sundays and actual holidays as HOLIDAY status
      const holidays = attendanceData.filter(a => a.status === 'HOLIDAY').length;
      
      // Count leave days from attendance data (ON_LEAVE status)
      // Backend only marks working days as ON_LEAVE (holidays/Sundays take precedence)
      const onLeave = attendanceData.filter(a => a.status === 'ON_LEAVE').length;
      
      // Working days = total days - holidays - leave days
      // Holidays already include Sundays, and leave days only count working days
      const workingDays = totalDays - holidays - onLeave;
      
      // Count attendance statuses
      const present = attendanceData.filter(a => a.status === 'PRESENT').length;
      const late = attendanceData.filter(a => a.status === 'LATE').length;
      const halfDay = attendanceData.filter(a => a.status === 'HALF_DAY').length;
      // Absent should not count holidays or leave days
      const absent = attendanceData.filter(a => a.status === 'ABSENT').length;

      setSummaryData({
        workingDays,
        present,
        late,
        halfDay,
        absent,
        holidays,
        onLeave,
        attendanceData
      });
    } catch (error) {
    }
  };

  const loadMapData = async () => {
    try {
      // Fetch today's attendance with locations from backend
      const response = await attendanceService.getTodayLocations();
      const locations = response.data || [];

      // Map the response to the format needed for the map
      const employeesWithLocation = locations
        .filter(loc => loc.clockInLatitude != null && loc.clockInLongitude != null) // Additional filter
        .map(loc => ({
          id: loc.userId,
          fullName: loc.userName,
          profilePictureUrl: loc.profilePictureUrl,
          lat: loc.clockInLatitude,
          lng: loc.clockInLongitude,
          clockIn: loc.clockIn,
          clockOut: loc.clockOut,
          clockInLocation: loc.clockInLocation,
          clockInWorkingFrom: loc.clockInWorkingFrom,
          clockOutLocation: loc.clockOutLocation,
          clockOutWorkingFrom: loc.clockOutWorkingFrom,
          attendanceDate: loc.attendanceDate
        }));

      setMapEmployees(employeesWithLocation);
    } catch (error) {
      setMapEmployees([]);
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const getSundaysInMonth = (year, month) => {
    const daysInMonth = getDaysInMonth(year, month);
    let sundays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      if (date.getDay() === 0) sundays++;
    }
    return sundays;
  };

  // Apply search filter to attendance data using useMemo for client-side filtering
  const filteredAttendanceBySearch = useMemo(() => {
    if (!debouncedSearch || !debouncedSearch.trim()) {
      return attendance;
    }
    
    const searchLower = debouncedSearch.toLowerCase().trim();
    return attendance.filter(item => {
      const fullName = (item.employee?.fullName || '').toLowerCase();
      const designation = (item.employee?.designationName || '').toLowerCase();
      const employeeId = (item.employee?.employeeId || '').toLowerCase();
      return fullName.includes(searchLower) || designation.includes(searchLower) || employeeId.includes(searchLower);
    });
  }, [attendance, debouncedSearch]);

  const getDateColumns = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const columns = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      const dayName = date.toLocaleDateString('en', { weekday: 'short' });
      columns.push({
        key: `day-${day}`,
        label: `${day}`,
        subLabel: dayName,
        render: (employeeData) => renderAttendanceIcon(employeeData, day, date)
      });
    }

    return columns;
  };

  const renderAttendanceIcon = (employeeData, day, date) => {
    // Normalize the target date to YYYY-MM-DD format for comparison
    const targetDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const attendanceRecord = employeeData.attendance.find(a => {
      if (!a.attendanceDate) return false;

      // Handle both string and Date object formats
      let recordDateStr;
      if (typeof a.attendanceDate === 'string') {
        // If it's a string, extract just the date part (YYYY-MM-DD)
        recordDateStr = a.attendanceDate.split('T')[0];
      } else {
        // If it's a Date object, format it
        const d = new Date(a.attendanceDate);
        recordDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      // Compare normalized date strings
      return recordDateStr === targetDateStr;
    });

    const isSunday = date.getDay() === 0;

    // Check if it's a holiday first (backend marks both holidays and Sundays as HOLIDAY)
    if (attendanceRecord && attendanceRecord.status === 'HOLIDAY') {
      return <span className="text-yellow-500 text-lg">⭐</span>;
    }

    // Fallback: if no attendance record but it's Sunday, show as holiday
    if (isSunday && !attendanceRecord) {
      return <span className="text-yellow-500 text-lg">⭐</span>;
    }

    if (!attendanceRecord) {
      if (canAdd || canUpdate) {
        return (
          <span
            onClick={() => {
              setEditAttendanceData({
                employee: employeeData.employee,
                date: date,
                existingAttendance: null,
                location: 'WorkSphere India Pune',
                clockIn: '09:00',
                clockInLocation: 'WorkSphere India Pune',
                clockInWorkingFrom: 'office',
                clockOut: '18:00',
                clockOutLocation: 'WorkSphere India Pune',
                clockOutWorkingFrom: 'office',
                late: false,
                halfDay: false,
                attendanceOverwrite: false
              });
              setShowEditAttendance(true);
            }}
            className="text-gray-400 text-lg cursor-pointer hover:text-gray-600"
            title="Click to mark attendance"
          >
            ✕
          </span>
        );
      }
      return <span className="text-gray-400 text-lg">✕</span>;
    }

    const handleIconClick = () => {
      if (attendanceRecord.status === 'PRESENT' || attendanceRecord.status === 'LATE') {
        setSelectedAttendance({
          employee: employeeData.employee,
          attendance: attendanceRecord,
          date: date
        });
        setShowAttendanceDetail(true);
      }
    };

    const handleEditClick = () => {
      setEditAttendanceData({
        employee: employeeData.employee,
        date: date,
        existingAttendance: attendanceRecord,
        location: attendanceRecord.clockInLocation || 'WorkSphere India Pune',
        clockIn: attendanceRecord.clockIn || '09:00',
        clockInLocation: attendanceRecord.clockInLocation || 'WorkSphere India Pune',
        clockInWorkingFrom: attendanceRecord.clockInWorkingFrom || 'office',
        clockOut: attendanceRecord.clockOut || '18:00',
        clockOutLocation: attendanceRecord.clockOutLocation || 'WorkSphere India Pune',
        clockOutWorkingFrom: attendanceRecord.clockOutWorkingFrom || 'office',
        late: attendanceRecord.status === 'LATE' || false,
        halfDay: attendanceRecord.status === 'HALF_DAY' || false,
        attendanceOverwrite: true // Always overwrite when editing
      });
      setShowEditAttendance(true);
    };

    // Ensure status is uppercase to match enum values
    const status = attendanceRecord.status ? attendanceRecord.status.toUpperCase() : 'ABSENT';

    switch (status) {
      case 'PRESENT':
        return <span onClick={handleIconClick} className="text-green-500 text-lg cursor-pointer">✓</span>;
      case 'LATE':
        return <span onClick={handleIconClick} className="text-orange-500 text-lg cursor-pointer">⚠</span>;
      case 'HALF_DAY':
        // Make half day clickable if user can update
        if (canUpdate) {
          return <span onClick={handleEditClick} className="text-blue-500 text-lg cursor-pointer">🕐</span>;
        }
        return <span className="text-blue-500 text-lg">🕐</span>;
      case 'ABSENT':
        // Make absent clickable if user can add or update - allows marking attendance
        if (canAdd || canUpdate) {
          return (
            <span
              onClick={handleEditClick}
              className="text-red-500 text-lg cursor-pointer hover:text-red-700"
              title="Click to mark attendance (Present/Late/Half Day)"
            >
              ✕
            </span>
          );
        }
        return <span className="text-red-500 text-lg">✕</span>;
      case 'ON_LEAVE':
        // Make on leave clickable if user can update
        if (canUpdate) {
          return <span onClick={handleEditClick} className="text-purple-500 text-lg cursor-pointer">🏖</span>;
        }
        return <span className="text-purple-500 text-lg">🏖</span>;
      case 'HOLIDAY':
        return <span className="text-yellow-500 text-lg">⭐</span>;
      default:
        // For any other status or null, check if clockIn exists - if yes, show as PRESENT
        if (attendanceRecord.clockIn) {
          // Has clock-in but status is missing/unknown - treat as PRESENT
          return <span onClick={handleIconClick} className="text-green-500 text-lg cursor-pointer">✓</span>;
        }
        // No clock-in and no status - make clickable if user can add or update
        if (canAdd || canUpdate) {
          return (
            <span
              onClick={handleEditClick}
              className="text-gray-400 text-lg cursor-pointer hover:text-gray-600"
              title="Click to mark attendance"
            >
              ✕
            </span>
          );
        }
        return <span className="text-gray-400 text-lg">✕</span>;
    }
  };

  const renderHoursWorked = (employeeData, day) => {
    const date = new Date(currentYear, currentMonth - 1, day);
    // Normalize the target date to YYYY-MM-DD format for comparison
    const targetDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const attendanceRecord = employeeData.attendance.find(a => {
      if (!a.attendanceDate) return false;

      // Handle both string and Date object formats
      let recordDateStr;
      if (typeof a.attendanceDate === 'string') {
        // If it's a string, extract just the date part (YYYY-MM-DD)
        recordDateStr = a.attendanceDate.split('T')[0];
      } else {
        // If it's a Date object, format it
        const d = new Date(a.attendanceDate);
        recordDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      // Compare normalized date strings
      return recordDateStr === targetDateStr;
    });
    const isSunday = date.getDay() === 0;

    if (isSunday) {
      return <span className="text-yellow-500 text-lg">⭐</span>;
    }

    if (!attendanceRecord || !attendanceRecord.durationMinutes) {
      return <span className="text-gray-400">-</span>;
    }

    const hours = Math.floor(attendanceRecord.durationMinutes / 60);
    const minutes = attendanceRecord.durationMinutes % 60;
    return <span className="text-sm">{hours}h {minutes}m</span>;
  };

  const handleMarkAttendance = async () => {
    try {
      const requestData = {
        employeeIds: markAttendanceForm.employees.map(id => parseInt(id)),
        department: markAttendanceForm.department,
        location: markAttendanceForm.location,
        markBy: markAttendanceForm.markBy,
        year: markAttendanceForm.year,
        month: markAttendanceForm.month,
        fromDate: markAttendanceForm.fromDate,
        toDate: markAttendanceForm.toDate,
        clockIn: markAttendanceForm.clockIn,
        clockInLocation: markAttendanceForm.clockInLocation,
        clockInWorkingFrom: markAttendanceForm.clockInWorkingFrom,
        clockOut: markAttendanceForm.clockOut,
        clockOutLocation: markAttendanceForm.clockOutLocation,
        clockOutWorkingFrom: markAttendanceForm.clockOutWorkingFrom,
        late: markAttendanceForm.late,
        halfDay: markAttendanceForm.halfDay,
        attendanceOverwrite: markAttendanceForm.attendanceOverwrite
      };

      await attendanceService.markBulkAttendance(requestData);
      setShowMarkAttendance(false);
      // Force refresh by clearing attendance state first, then reloading
      setAttendance([]);
      // Small delay to ensure backend has processed the request
      setTimeout(async () => {
        await loadAttendanceTable();
      }, 100);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error marking attendance';
      alert(errorMessage);
    }
  };

  const handleEditAttendance = async () => {
    try {
      if (!editAttendanceData) return;

      // Format date using local date components to avoid timezone issues
      const d = editAttendanceData.date;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const requestData = {
        employeeIds: [editAttendanceData.employee.id],
        location: editAttendanceData.location || 'WorkSphere India Pune',
        markBy: 'date',
        fromDate: dateStr,
        toDate: dateStr,
        clockIn: editAttendanceData.clockIn,
        clockInLocation: editAttendanceData.clockInLocation || 'WorkSphere India Pune',
        clockInWorkingFrom: editAttendanceData.clockInWorkingFrom || 'office',
        clockOut: editAttendanceData.clockOut,
        clockOutLocation: editAttendanceData.clockOutLocation || 'WorkSphere India Pune',
        clockOutWorkingFrom: editAttendanceData.clockOutWorkingFrom || 'office',
        late: editAttendanceData.late || false,
        halfDay: editAttendanceData.halfDay || false,
        attendanceOverwrite: true // Always overwrite when editing
      };

      await attendanceService.markBulkAttendance(requestData);
      setShowEditAttendance(false);
      setEditAttendanceData(null);
      // Force refresh by clearing attendance state first, then reloading
      setAttendance([]);
      // Small delay to ensure backend has processed the request
      setTimeout(async () => {
        await loadAttendanceTable();
      }, 100);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error editing attendance';
      alert(errorMessage);
    }
  };

  const handleExportCSV = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const headers = ['Employee Name'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add date columns with ISO-like readable format to avoid Excel ####
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      headers.push("'" + dateStr);

    }

    const rows = filteredAttendanceBySearch.map((employeeData) => {
      const row = [employeeData.employee.fullName];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth - 1, day);
        const isFutureDate = date > today;
        const attendanceRecord = employeeData.attendance.find(a => {
          const recordDate = new Date(a.attendanceDate);
          return recordDate.getDate() === day &&
            recordDate.getMonth() === date.getMonth() &&
            recordDate.getFullYear() === date.getFullYear();
        });

        if (!attendanceRecord || !attendanceRecord.clockIn) {
          // Mark Absent only for dates up to today; leave future dates blank
          row.push(isFutureDate ? '' : 'Absent');
        } else {
          let hours = 0;
          if (attendanceRecord.clockOut) {
            // Calculate hours from clock in to clock out
            const clockInTime = new Date(`2000-01-01T${attendanceRecord.clockIn}`);
            const clockOutTime = new Date(`2000-01-01T${attendanceRecord.clockOut}`);
            hours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
          } else {
            // Use current time if no clock out
            const clockInTime = new Date(`2000-01-01T${attendanceRecord.clockIn}`);
            const now = new Date();
            const currentTime = new Date(`2000-01-01T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
            hours = (currentTime - clockInTime) / (1000 * 60 * 60);
            if (hours < 0) hours += 24; // Handle day rollover
          }
          row.push(hours.toFixed(2));
        }
      }

      return row;
    });

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const exportYear = filters.year || currentYear;
    const exportMonth = filters.month || currentMonth;
    link.setAttribute('download', `attendance_${exportYear}_${String(exportMonth).padStart(2, '0')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div className="hidden">
            {/* Page title removed - shown in topbar */}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto scrollbar-hide">
              {[
                { id: 1, label: 'Attendance' },
                { id: 2, label: 'Monthly Summary' },
                { id: 3, label: 'Hours Worked' },
                { id: 4, label: 'Map View' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 1: Main Attendance Table */}
        {activeTab === 1 && (
          <div className="space-y-4">
            {/* Filter Toggle Button */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
              >
                <FiFilter className="w-4 h-4" />
                <span>Filter</span>
                {showFilters && <FiX className="w-4 h-4 ml-1" />}
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Employee Filter - Using SearchableEmployeeSelect for pagination */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <div className="relative">
                    <SearchableEmployeeSelect
                      selectedIds={filters.employee ? [filters.employee] : []}
                      onSelectionChange={(selectedIds) => {
                        setFilters({ ...filters, employee: selectedIds[0] || '' });
                      }}
                      multiple={false}
                      placeholder="All Employees"
                      className="w-full"
                    />
                    {filters.employee && (
                      <button
                        type="button"
                        onClick={() => setFilters({ ...filters, employee: '' })}
                        className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Clear filter"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Department Filter */}
                <div className="relative" ref={departmentFilterRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <button
                    type="button"
                    onClick={() => setIsDepartmentFilterOpen(!isDepartmentFilterOpen)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left bg-white flex items-center justify-between text-sm"
                  >
                    <span className={filters.department ? 'text-gray-900' : 'text-gray-500'}>
                      {filters.department
                        ? departments.find(dept => dept.name === filters.department)?.name || filters.department
                        : 'All Departments'
                      }
                    </span>
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isDepartmentFilterOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          value={departmentFilterSearchTerm}
                          onChange={(e) => setDepartmentFilterSearchTerm(e.target.value)}
                          placeholder="Search departments..."
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setFilters({ ...filters, department: '' });
                            setIsDepartmentFilterOpen(false);
                            setDepartmentFilterSearchTerm('');
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${!filters.department ? 'bg-blue-50' : ''}`}
                        >
                          All Departments
                        </button>
                        {departments
                          .filter(dept =>
                            dept.name?.toLowerCase().includes(departmentFilterSearchTerm.toLowerCase())
                          )
                          .map((dept) => (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() => {
                                setFilters({ ...filters, department: dept.name });
                                setIsDepartmentFilterOpen(false);
                                setDepartmentFilterSearchTerm('');
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${filters.department === dept.name ? 'bg-blue-50' : ''}`}
                            >
                              {dept.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Designation Filter */}
                <div className="relative" ref={designationFilterRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <button
                    type="button"
                    onClick={() => setIsDesignationFilterOpen(!isDesignationFilterOpen)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left bg-white flex items-center justify-between text-sm"
                  >
                    <span className={filters.designation ? 'text-gray-900' : 'text-gray-500'}>
                      {filters.designation
                        ? designations.find(des => String(des.id) === String(filters.designation))?.name || 'Select Designation'
                        : 'All Designations'
                      }
                    </span>
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isDesignationFilterOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          value={designationFilterSearchTerm}
                          onChange={(e) => setDesignationFilterSearchTerm(e.target.value)}
                          placeholder="Search designations..."
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setFilters({ ...filters, designation: '' });
                            setIsDesignationFilterOpen(false);
                            setDesignationFilterSearchTerm('');
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${!filters.designation ? 'bg-blue-50' : ''}`}
                        >
                          All Designations
                        </button>
                        {designations
                          .filter(des =>
                            des.name?.toLowerCase().includes(designationFilterSearchTerm.toLowerCase())
                          )
                          .map((des) => (
                            <button
                              key={des.id}
                              type="button"
                              onClick={() => {
                                setFilters({ ...filters, designation: String(des.id) });
                                setIsDesignationFilterOpen(false);
                                setDesignationFilterSearchTerm('');
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${String(filters.designation) === String(des.id) ? 'bg-blue-50' : ''}`}
                            >
                              {des.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Month Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={filters.month}
                    onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            )}

            {canAdd && canUpdate && (
              <div className="flex justify-end gap-2">
                {(isAdmin() || getModulePermission('Attendance', 'view') === 'All') && (
                  <button
                    onClick={handleExportCSV}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Export
                  </button>
                )}
                <button
                  onClick={() => {
                    // No need to load all employees - SearchableEmployeeSelect handles pagination
                    setShowMarkAttendance(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Mark Attendance
                </button>
              </div>
            )}

            {/* Month/Year Selector and Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="flex space-x-4">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 max-w-md">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name, designation, or employee ID..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setAttendancePage(0); // Reset to first page when search changes
                  }}
                  onFocus={(e) => e.target.select()} // Select all text on focus for easier editing
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Attendance Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center space-x-1">
                <span className="text-yellow-500 text-lg">⭐</span>
                <span>Holiday</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-red-500 text-lg">🏮</span>
                <span>Day Off</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-green-500 text-lg">✓</span>
                <span>Present</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-blue-500 text-lg">🕐</span>
                <span>Half Day</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-orange-500 text-lg">⚠</span>
                <span>Late</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-red-500 text-lg">✕</span>
                <span>Absent</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-purple-500 text-lg">🏖</span>
                <span>On Leave</span>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Employee
                    </th>
                    {getDateColumns().map((col, index) => (
                      <th key={col.key} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div>{col.label}</div>
                        <div className="text-xs text-gray-400">{col.subLabel}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Calculate pagination using filteredAttendanceBySearch
                    const totalEmployees = filteredAttendanceBySearch.length;
                    const totalPages = Math.ceil(totalEmployees / attendancePageSize);
                    const startIndex = attendancePage * attendancePageSize;
                    const endIndex = startIndex + attendancePageSize;
                    const paginatedAttendance = filteredAttendanceBySearch.slice(startIndex, endIndex);
                    
                    return paginatedAttendance.map((employeeData, index) => (
                      <tr key={employeeData.employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="sticky left-0 bg-inherit px-6 py-4 whitespace-nowrap min-w-[200px]">
                          <div className="flex items-center">
                            <Avatar
                              profilePictureUrl={employeeData.employee.profilePictureUrl}
                              fullName={employeeData.employee.fullName}
                              size="w-10 h-10"
                              className="flex-shrink-0"
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {employeeData.employee.fullName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {employeeData.employee.designationName}
                              </div>
                            </div>
                          </div>
                        </td>
                        {getDateColumns().map((col) => (
                          <td key={col.key} className="px-2 py-4 text-center">
                            {col.render(employeeData)}
                          </td>
                        ))}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {(() => {
              const totalEmployees = filteredAttendanceBySearch.length;
              const totalPages = Math.ceil(totalEmployees / attendancePageSize);
              const startIndex = attendancePage * attendancePageSize;
              const endIndex = Math.min(startIndex + attendancePageSize, totalEmployees);
              
              if (totalPages <= 1) return null;
              
              return (
                <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 rounded-b-lg">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setAttendancePage(Math.max(0, attendancePage - 1))}
                      disabled={attendancePage === 0}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setAttendancePage(Math.min(totalPages - 1, attendancePage + 1))}
                      disabled={attendancePage >= totalPages - 1}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">{endIndex}</span> of{' '}
                        <span className="font-medium">{totalEmployees}</span> employees
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setAttendancePage(0)}
                          disabled={attendancePage === 0}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">First</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setAttendancePage(Math.max(0, attendancePage - 1))}
                          disabled={attendancePage === 0}
                          className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          Page {attendancePage + 1} of {totalPages}
                        </span>
                        <button
                          onClick={() => setAttendancePage(Math.min(totalPages - 1, attendancePage + 1))}
                          disabled={attendancePage >= totalPages - 1}
                          className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setAttendancePage(totalPages - 1)}
                          disabled={attendancePage >= totalPages - 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Last</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 111.414-1.414l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab 2: Monthly Summary */}
        {activeTab === 2 && (
          <div className="space-y-4">
            {/* Employee Selector - Only show for admin/users with "All" permission */}
            {hasAllViewPermission && (
              <div className="flex space-x-3">
                <SearchableEmployeeSelect
                  selectedIds={selectedEmployee ? [selectedEmployee] : []}
                  onSelectionChange={(selectedIds) => {
                    setSelectedEmployee(selectedIds[0] || '');
                  }}
                  multiple={false}
                  placeholder="Select Employee"
                  className="min-w-[200px]"
                />
              </div>
            )}
            <div className="flex space-x-3">
              <select
                value={summaryMonth}
                onChange={(e) => setSummaryMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={summaryYear}
                onChange={(e) => setSummaryYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {summaryData && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-blue-600">{summaryData.workingDays}</div>
                    <div className="text-xs text-blue-800 mt-1">Working Days</div>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-green-600">{summaryData.present}</div>
                    <div className="text-xs text-green-800 mt-1">Present</div>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-orange-600">{summaryData.late}</div>
                    <div className="text-xs text-orange-800 mt-1">Late</div>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-purple-600">{summaryData.halfDay}</div>
                    <div className="text-xs text-purple-800 mt-1">Half Day</div>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-red-600">{summaryData.absent}</div>
                    <div className="text-xs text-red-800 mt-1">Absent</div>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-yellow-600">{summaryData.holidays}</div>
                    <div className="text-xs text-yellow-800 mt-1">Holidays</div>
                  </div>
                  <div className="bg-indigo-100 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-indigo-600">{summaryData.onLeave || 0}</div>
                    <div className="text-xs text-indigo-800 mt-1">On Leave</div>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {summaryData.attendanceData.map((record) => (
                        <tr key={record.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(record.attendanceDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                              record.status === 'LATE' ? 'bg-orange-100 text-orange-800' :
                              record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                              record.status === 'ON_LEAVE' ? 'bg-indigo-100 text-indigo-800' :
                              record.status === 'HOLIDAY' ? 'bg-yellow-100 text-yellow-800' :
                              record.status === 'HALF_DAY' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status === 'LATE' ? 'Late' : 
                               record.status === 'ON_LEAVE' ? 'On Leave' :
                               record.status === 'HOLIDAY' ? 'Holiday' :
                               record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.clockIn)}
                            {record.status === 'LATE' && <span className="text-orange-500 ml-1">(Late)</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.clockOut)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {record.durationMinutes ? `${Math.floor(record.durationMinutes / 60)}h ${record.durationMinutes % 60}m` : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {(record.status === 'PRESENT' || record.status === 'LATE') && (() => {
                              const viewPermission = getModulePermission('Attendance', 'view');
                              const hasAllViewPermission = isAdmin() || viewPermission === 'All';
                              // For "Added & Owned" or "Owned" permission, only show if user owns the record
                              const canViewThisRecord = hasAllViewPermission || 
                                (viewPermission !== 'None' && record.userId === user.userId);
                              
                              if (!canViewThisRecord) {
                                return null;
                              }
                              
                              return (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    try {
                                      setLoadingAttendanceDetail(true);
                                      setAttendanceDetailError(null);
                                      setShowAttendanceDetail(false);
                                      
                                      // Fetch attendance detail from backend to enforce permission check
                                      const detailResponse = await attendanceService.getById(record.id);
                                      const attendanceDetail = detailResponse.data;
                                      
                                      if (!attendanceDetail) {
                                        throw new Error('Attendance details not found');
                                      }
                                      
                                      // Try to find employee in employees list, or use user data or attendanceDetail data
                                      let employee = employees.find(e => e.id === parseInt(selectedEmployee));
                                      if (!employee) {
                                        // If employee not found, construct from attendanceDetail or user data
                                        if (attendanceDetail.userId === user.userId) {
                                          employee = {
                                            id: user.userId,
                                            fullName: user.fullName || attendanceDetail.userName || 'Unknown',
                                            designationName: user.designationName || 'Employee',
                                            profilePictureUrl: user.profilePictureUrl || null
                                          };
                                        } else {
                                          employee = {
                                            id: attendanceDetail.userId,
                                            fullName: attendanceDetail.userName || 'Unknown',
                                            designationName: 'Employee',
                                            profilePictureUrl: null
                                          };
                                        }
                                      }
                                      
                                      // Parse date safely
                                      let attendanceDate;
                                      try {
                                        if (attendanceDetail.attendanceDate) {
                                          attendanceDate = new Date(attendanceDetail.attendanceDate);
                                          // Check if date is valid
                                          if (isNaN(attendanceDate.getTime())) {
                                            attendanceDate = new Date(record.attendanceDate);
                                          }
                                        } else {
                                          attendanceDate = new Date(record.attendanceDate);
                                        }
                                      } catch (dateError) {
                                        attendanceDate = new Date(record.attendanceDate);
                                      }
                                      
                                      setSelectedAttendance({
                                        employee: employee,
                                        attendance: attendanceDetail,
                                        date: attendanceDate
                                      });
                                      setShowAttendanceDetail(true);
                                    } catch (error) {
                                      console.error('Error loading attendance details:', error);
                                      setAttendanceDetailError(
                                        error.response?.data?.message || error.message || 'Failed to load attendance details'
                                      );
                                      setShowAttendanceDetail(true); // Show modal with error
                                    } finally {
                                      setLoadingAttendanceDetail(false);
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                  disabled={loadingAttendanceDetail}
                                >
                                  {loadingAttendanceDetail ? 'Loading...' : 'View Details'}
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Hours Worked View */}
        {activeTab === 3 && (
          <div className="space-y-4">
            {/* Month/Year Selector */}
            <div className="flex space-x-4">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Hours Worked Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Employee
                    </th>
                    {getDateColumns().map((col, index) => (
                      <th key={col.key} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div>{col.label}</div>
                        <div className="text-xs text-gray-400">{col.subLabel}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.map((employeeData, index) => (
                    <tr key={employeeData.employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="sticky left-0 bg-inherit px-6 py-4 whitespace-nowrap min-w-[200px]">
                        <div className="flex items-center">
                          <Avatar
                            profilePictureUrl={employeeData.employee.profilePictureUrl}
                            fullName={employeeData.employee.fullName}
                            size="w-10 h-10"
                            className="flex-shrink-0"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {employeeData.employee.fullName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employeeData.employee.designationName}
                            </div>
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }, (_, day) => day + 1).map((day) => (
                        <td key={`day-${day}`} className="px-2 py-4 text-center">
                          {renderHoursWorked(employeeData, day)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Map View */}
        {activeTab === 4 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium mb-4">Employee Locations - Today</h3>
              {!googleMapsApiKey ? (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">Loading map configuration...</p>
                  </div>
                </div>
              ) : mapEmployees.length === 0 ? (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">No locations available for today</p>
                    <p className="text-sm">Locations will appear here once employees clock in with location services enabled.</p>
                  </div>
                </div>
              ) : (
                <MapComponent
                  apiKey={googleMapsApiKey}
                  mapEmployees={mapEmployees}
                  selectedMapEmployee={selectedMapEmployee}
                  setSelectedMapEmployee={setSelectedMapEmployee}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={showMarkAttendance}
        onClose={() => {
          setShowMarkAttendance(false);
        }}
        title="Mark Attendance"
        size="xl"
        variant="panel"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={markAttendanceForm.department}
                onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, department: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select Department --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employees <span className="text-red-500">*</span>
              </label>
              {(() => {
                const addPermission = getModulePermission('Attendance', 'add');
                const hasAllAddPermission = isAdmin() || addPermission === 'All';
                
                if (!hasAllAddPermission) {
                  // Non-admin users can only select themselves
                  return (
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-sm text-gray-600">
                      {user.fullName}
                    </div>
                  );
                }
                
                return (
                  <SearchableEmployeeSelect
                    selectedIds={markAttendanceForm.employees}
                    onSelectionChange={(selectedIds) => {
                      setMarkAttendanceForm({ ...markAttendanceForm, employees: selectedIds });
                    }}
                    multiple={true}
                    placeholder="Select employees..."
                    className="w-full"
                  />
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mark Attendance By <span className="text-red-500">*</span></label>
              <div className="flex space-x-6 mt-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="month"
                    checked={markAttendanceForm.markBy === 'month'}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, markBy: e.target.value })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Month</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="date"
                    checked={markAttendanceForm.markBy === 'date'}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, markBy: e.target.value })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Date Range</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">General Location</label>
              <select
                value={markAttendanceForm.location}
                onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, location: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="WorkSphere India Pune">WorkSphere India Pune</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            {markAttendanceForm.markBy === 'month' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year <span className="text-red-500">*</span></label>
                  <select
                    value={markAttendanceForm.year}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, year: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month <span className="text-red-500">*</span></label>
                  <select
                    value={markAttendanceForm.month}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, month: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={markAttendanceForm.fromDate}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, fromDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={markAttendanceForm.toDate}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, toDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Time & Location Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Clock In */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clock In Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={markAttendanceForm.clockIn}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, clockIn: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clock In Location</label>
                  <select
                    value={markAttendanceForm.clockInLocation}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, clockInLocation: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="WorkSphere India Pune">WorkSphere India Pune</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clock In Working From</label>
                  <select
                    value={markAttendanceForm.clockInWorkingFrom}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, clockInWorkingFrom: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="office">Office</option>
                    <option value="home">Home</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
              </div>

              {/* Clock Out */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={markAttendanceForm.clockOut}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, clockOut: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out Location</label>
                  <select
                    value={markAttendanceForm.clockOutLocation}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, clockOutLocation: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="WorkSphere India Pune">WorkSphere India Pune</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out Working From</label>
                  <select
                    value={markAttendanceForm.clockOutWorkingFrom}
                    onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, clockOutWorkingFrom: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="office">Office</option>
                    <option value="home">Home</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAttendanceForm.late}
                  onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, late: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Late</span>
              </label>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAttendanceForm.halfDay}
                  onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, halfDay: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Half Day</span>
              </label>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAttendanceForm.attendanceOverwrite}
                  onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, attendanceOverwrite: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Overwrite Existing</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
            <button
              onClick={() => setShowMarkAttendance(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkAttendance}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
            >
              Save Attendance
            </button>
          </div>
        </div>
      </Modal>

      {/* Attendance Detail Modal */}
      <Modal
        isOpen={showAttendanceDetail}
        onClose={() => {
          setShowAttendanceDetail(false);
          setSelectedAttendance(null);
          setAttendanceDetailError(null);
        }}
        title="Attendance Details"
      >
        {attendanceDetailError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{attendanceDetailError}</p>
          </div>
        ) : loadingAttendanceDetail ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Loading attendance details...</p>
          </div>
        ) : selectedAttendance && selectedAttendance.employee && selectedAttendance.attendance ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar
                profilePictureUrl={selectedAttendance.employee.profilePictureUrl}
                fullName={selectedAttendance.employee.fullName}
                size="w-16 h-16"
              />
              <div>
                <h3 className="text-sm font-medium">{selectedAttendance.employee.fullName || 'Unknown'}</h3>
                <p className="text-gray-600">{selectedAttendance.employee.designationName || 'Employee'}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="text-sm text-gray-900">
                    {selectedAttendance.date 
                      ? `${formatDate(selectedAttendance.date)} (${selectedAttendance.date.toLocaleDateString('en', { weekday: 'long' })})`
                      : formatDate(selectedAttendance.attendance.attendanceDate)
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm text-gray-900">{selectedAttendance.attendance.status || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Clock In</label>
                  <p className="text-sm text-gray-900">{formatTime(selectedAttendance.attendance.clockIn)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Clock Out</label>
                  <p className="text-sm text-gray-900">{formatTime(selectedAttendance.attendance.clockOut)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Hours</label>
                  <p className="text-sm text-gray-900">
                    {selectedAttendance.attendance.durationMinutes
                      ? `${Math.floor(selectedAttendance.attendance.durationMinutes / 60)}h ${selectedAttendance.attendance.durationMinutes % 60}m`
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal >

      {/* Edit Attendance Modal */}
      <Modal
        isOpen={showEditAttendance}
        onClose={() => {
          setShowEditAttendance(false);
          setEditAttendanceData(null);
        }}
        title="Edit Attendance"
        size="xl"
        variant="panel"
      >
        {editAttendanceData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employees <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editAttendanceData.employee.fullName}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-not-allowed focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">General Location</label>
                <select
                  value={editAttendanceData.location || 'WorkSphere India Pune'}
                  onChange={(e) => setEditAttendanceData({ ...editAttendanceData, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="WorkSphere India Pune">WorkSphere India Pune</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mark Attendance By <span className="text-red-500">*</span></label>
                <div className="flex space-x-6 mt-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="date"
                      checked={true}
                      disabled
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Date</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={(() => {
                    const d = editAttendanceData.date;
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                  onChange={(e) => {
                    const dateStr = e.target.value;
                    const [year, month, day] = dateStr.split('-').map(Number);
                    setEditAttendanceData({
                      ...editAttendanceData,
                      date: new Date(year, month - 1, day)
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Time & Location Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Clock In */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clock In Time <span className="text-red-500">*</span></label>
                    <input
                      type="time"
                      value={editAttendanceData.clockIn || '09:00'}
                      onChange={(e) => setEditAttendanceData({ ...editAttendanceData, clockIn: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clock In Location</label>
                    <select
                      value={editAttendanceData.clockInLocation || 'WorkSphere India Pune'}
                      onChange={(e) => setEditAttendanceData({ ...editAttendanceData, clockInLocation: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="WorkSphere India Pune">WorkSphere India Pune</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clock In Working From</label>
                    <select
                      value={editAttendanceData.clockInWorkingFrom || 'office'}
                      onChange={(e) => setEditAttendanceData({ ...editAttendanceData, clockInWorkingFrom: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="office">Office</option>
                      <option value="home">Home</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>
                </div>

                {/* Clock Out */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out Time <span className="text-red-500">*</span></label>
                    <input
                      type="time"
                      value={editAttendanceData.clockOut || '18:00'}
                      onChange={(e) => setEditAttendanceData({ ...editAttendanceData, clockOut: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out Location</label>
                    <select
                      value={editAttendanceData.clockOutLocation || 'WorkSphere India Pune'}
                      onChange={(e) => setEditAttendanceData({ ...editAttendanceData, clockOutLocation: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="WorkSphere India Pune">WorkSphere India Pune</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out Working From</label>
                    <select
                      value={editAttendanceData.clockOutWorkingFrom || 'office'}
                      onChange={(e) => setEditAttendanceData({ ...editAttendanceData, clockOutWorkingFrom: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="office">Office</option>
                      <option value="home">Home</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAttendanceData.late || false}
                    onChange={(e) => setEditAttendanceData({ ...editAttendanceData, late: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Late</span>
                </label>
              </div>
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAttendanceData.halfDay || false}
                    onChange={(e) => setEditAttendanceData({ ...editAttendanceData, halfDay: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Half Day</span>
                </label>
              </div>
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAttendanceData.attendanceOverwrite || false}
                    onChange={(e) => setEditAttendanceData({ ...editAttendanceData, attendanceOverwrite: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Overwrite Existing</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowEditAttendance(false);
                  setEditAttendanceData(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditAttendance}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout >
  );
};

export default Attendance;

