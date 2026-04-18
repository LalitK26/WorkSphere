# WorkSphere 🌐

WorkSphere is a comprehensive, enterprise-grade workforce management and recruitment platform designed to streamline organizational workflows. It provides a robust suite of tools for recruitment, employee management, and real-time collaboration.

![WorkSphere Banner](https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200)

## 🚀 Overview

WorkSphere is built with a micro-frontend architecture in mind, separating core dashboard functionalities, recruitment-specific tools, and a powerful backend service. It is designed to be scalable, secure, and visually stunning.

### Key Features
- **Recruitment Management**: End-to-end candidate tracking, application lists, and screening workflows.
- **Enterprise Dashboard**: Real-time analytics and management widgets for high-level organizational oversight.
- **Real-time Communication**: Integrated WebRTC support for seamless video interviews and team calls.
- **Security**: Robust JWT-based authentication and secure environment management.
- **Modern UI**: Built with a focus on "Rich Aesthetics" using TailwindCSS and React for a premium user experience.

---

## 🏗️ Project Structure

The project is organized into several key modules:

| Module | Technology | Description |
| :--- | :--- | :--- |
| **`dashboard/`** | Java (Spring Boot) | The core API service handling data persistence, security, and business logic. |
| **`frontend/`** | React + Vite | The primary administrative interface for workforce management. |
| **`recruitment_frontend/`**| React + Vite | A specialized portal dedicated to recruitment and hiring workflows. |
| **`scripts/`** | PowerShell/Bash | Automation scripts for environment validation and setup. |
| **`deploy/`** | Docker/CI-CD | Deployment configurations and infrastructure-as-code. |

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Spring Boot 3.x
- **Language**: Java
- **Database**: MySQL
- **Security**: Spring Security + JWT
- **Communication**: WebRTC Configuration

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS (Modern, Responsive)
- **State Management**: Context API / Hooks
- **Icons**: Lucide React / FontAwesome

---

## ⚙️ Getting Started

### Prerequisites
- **Java**: JDK 17 or higher
- **Node.js**: v18.x or higher
- **Database**: MySQL 8.0
- **Package Manager**: npm or yarn

### Quick Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/LalitK26/WorkSphere.git
   cd WorkSphere
   ```

2. **Environment Configuration**
   Check the [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed instructions on setting up `.env` files for both backend and frontend.

3. **Backend Setup**
   ```bash
   cd dashboard
   mvn install
   mvn spring-boot:run
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Recruitment Portal Setup**
   ```bash
   cd recruitment_frontend
   npm install
   npm run dev
   ```

---

## 🛡️ Security & Environment
This project uses profile-based configuration (Dev/Prod). Sensitive credentials are managed via `.env` files which are excluded from version control to ensure maximum security.

---

## 👤 Author
**Lalit Katkam**
- GitHub: [@LalitK26](https://github.com/LalitK26)

---


