# Dashboard Frontend

React frontend application for the Dashboard Management System.

## Features

- User authentication with JWT
- Role-based UI (Admin vs Employee)
- Responsive design with Tailwind CSS
- Employee management (Admin only)
- Project and Task management
- Attendance tracking
- Designation and Role management

## Tech Stack

- React 18
- Vite
- React Router
- Axios
- Tailwind CSS
- date-fns

## Setup

1. **Prerequisites**
   - Node.js 18+ and npm

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```
   Application will run on http://localhost:3000

4. **Build for Production**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── api/              # API service files
├── components/       # Reusable components
│   ├── Layout/      # Layout components (Topbar, Sidebar)
│   └── UI/          # UI components (Table, Modal, etc.)
├── context/         # React Context (AuthContext)
├── hooks/           # Custom hooks
├── pages/           # Page components
│   ├── Auth/       # Authentication pages
│   ├── Dashboard/  # Dashboard pages
│   ├── Employees/  # Employee management
│   ├── HR/         # HR management
│   ├── Work/       # Project and Task management
│   └── Attendance/ # Attendance tracking
├── routes/         # Route configuration
└── utils/          # Utility functions
```

## Role-Based Access

### Admin
- Full access to all modules
- Can manage employees, designations, roles
- Can create and assign projects and tasks
- Can view all data

### Employee
- Limited access to assigned projects and tasks
- Can view own attendance
- Cannot manage employees or roles
- Cannot assign work to others

## API Integration

The frontend communicates with the backend API at `http://localhost:8080/api`. The API client automatically includes JWT tokens in requests and handles authentication errors.

## Environment Variables

Create a `.env` file if needed:
```
VITE_API_BASE_URL=http://localhost:8080/api
```
