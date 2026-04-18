# Dashboard Backend

Spring Boot backend application for the Dashboard Management System.

## Features

- JWT-based authentication
- Role-based access control (RBAC)
- Employee management
- Project and Task management
- Attendance tracking
- Designation and Role management
- RESTful API with Swagger documentation

## Tech Stack

- Java 17
- Spring Boot 3.2.0
- Spring Security
- Spring Data JPA
- MySQL
- Flyway (Database migrations)
- JWT (JSON Web Tokens)
- Lombok
- Swagger/OpenAPI

## Setup

1. **Prerequisites**
   - Java 17 or higher
   - Maven 3.6+
   - MySQL 8.0+

2. **Database Configuration**
   - Update `application.yml` with your MySQL credentials
   - Database will be created automatically if it doesn't exist

3. **Build and Run**
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

4. **API Documentation**
   - Swagger UI: http://localhost:8080/swagger-ui.html
   - API Docs: http://localhost:8080/v3/api-docs

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Employees (Admin only)
- `GET /api/employees` - Get all employees
- `GET /api/employees/{id}` - Get employee by ID
- `POST /api/employees` - Create employee
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Delete employee

### Projects
- `GET /api/projects` - Get all projects (Admin) or my projects (Employee)
- `GET /api/projects/{id}` - Get project by ID
- `POST /api/projects` - Create project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Tasks
- `GET /api/tasks` - Get all tasks (Admin) or my tasks (Employee)
- `GET /api/tasks/{id}` - Get task by ID
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Attendance
- `GET /api/attendance/my-attendance` - Get my attendance
- `GET /api/attendance/month?year={year}&month={month}` - Get attendance by month
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out

### Designations (Admin only)
- `GET /api/designations` - Get all designations
- `POST /api/designations` - Create designation
- `PUT /api/designations/{id}` - Update designation
- `DELETE /api/designations/{id}` - Delete designation

### Roles (Admin only)
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create role
- `PUT /api/roles/{id}` - Update role
- `DELETE /api/roles/{id}` - Delete role

## Security

- JWT tokens are used for authentication
- Role-based access control is enforced
- Admin role has full access
- Employee role has restricted access based on permissions

## Database Schema

The application uses Flyway for database migrations. Initial schema will be created automatically on first run.

