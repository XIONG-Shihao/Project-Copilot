#  ProjectCopilot – Lightweight Team Collaboration Tool

ProjectCopilot is a **full-stack web app for small team management**, built with **React, Node.js/Express, and MongoDB**, and containerized with Docker.  
It helps teams collaborate through **projects, tasks, posts, comments, invites, and AI assistance**.


It is a **streamlined collaboration platform** built for small teams that want clarity without heavy enterprise tools. It brings projects, tasks, and discussions into one place so teams can stay organized without extra overhead.  

Each project has its own space with tasks, deadlines, posts, and comments, supported by **role-based access control** to keep responsibilities clear. Members can join easily through invite links, making onboarding fast and simple.  

The ProjectCopilot also includes an **AI-powered assistant** that understands your project’s tasks, deadlines, and members. You can ask it questions like *“What’s overdue this week?”* or *“Who owns the client deliverable?”*, and get instant answers. It works like a built-in project analyst, keeping teams aware without manual reporting.  

For sharing outside the app, projects can be exported as **PDF summaries**, giving stakeholders a quick, professional view of progress. With a modern React frontend and reliable Node/Express backend, it is lightweight, fast to set up, and tailored to the needs of small, dynamic teams.  

---

##  Features

-  **Projects & Roles** — create projects, invite members via shareable links, and manage roles (Admin / Developer / Viewer).  
-  **Tasks** — create, assign, and track tasks with progress history and deadlines.  
-  **Posts & Comments** — share announcements, discussions, and threaded comments, with likes and task mentions.  
-  **Invites** — join projects securely via one-time invite links.  
-  **Exports** — generate project summary reports as PDFs.  
-  **AI Chatbot** — project-aware assistant for summarization and Q&A (powered by Groq API).  
-  **Authentication** — JWT-based login with secure cookies.  

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Bootstrap 5, Chart.js, Cypress for E2E tests.  
- **Backend**: Node.js, Express, Mongoose, JWT auth, Puppeteer for PDF export.  
- **Database**: MongoDB.  
- **Containerization**: Docker + Docker Compose.  

---

## ⚡ Quick Start (with Docker)

1. Clone the repository:  
   ```bash
   git clone https://github.com/your-org/collabmate.git
   cd collabmate
2.	Start the full stack:
    ```bash
    docker-compose up -d
3. Access the app:
    ```bash
	Frontend → http://localhost:3001
	Backend API → http://localhost:3000
4. Stop everything:
    ```bash
    docker-compose down
5.	Stop and clear the database:
    ```bash
    docker-compose down -v

## Project Structure
.
├── backend/
│   ├── routes/         # REST API endpoints
│   ├── controllers/    # Request handling logic
│   ├── services/       # Business logic & integrations
│   ├── models/         # MongoDB schemas
│   ├── middleware/     # JWT auth & cross-cutting concerns
│   ├── config/         # Database & environment config
│   └── templates/      # Handlebars templates for PDF export
│
├── frontend/
│   ├── src/components/ # React UI components
│   ├── src/services/   # API service wrappers (axios)
│   ├── src/            # Routes, global styles, entrypoint
│   └── public/         # CRA static assets
│
├── docker-compose.yml
└── README.md

##  Testing
Make sure the app is running (docker-compose up -d) before running tests.
    
# Backend Tests
    
    docker-compose exec backend npm run test -- --coverage 
    --watchAll=false

# Frontend Tests
    docker-compose exec frontend npm run test -- --coverage --watchAll=false
# End-to-End (E2E) Tests
Requires local Node.js + npm:
    
    cd frontend
    npm install
    npm run cypress:open   # interactive mode
    npm run cypress:run    # headless mode

#  Database Access
Connect with MongoDB Compass:

    mongodb://admin:password@localhost:27017/collabmate_db?authSource=admin

# Deployment
Production builds of the frontend should be created with:

    cd frontend
    npm run build

Serve static files via Nginx or your backend.
Configure environment variables for API URL, DB credentials, and JWT secret.
Ensure cookies use SameSite=None; Secure in production.

# Security Notes
Always sanitize user-generated content before rendering (e.g. Markdown → HTML).
Enforce HTTPS in production.
Limit MongoDB exposure to localhost or secure VPN.

