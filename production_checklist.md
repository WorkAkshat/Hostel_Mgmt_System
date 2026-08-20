# React Native & Node.js Production Checklist

This document catalogs the required production standards for the **Hari Pushp PG** application, maps our current implementation to these standards, and provides a clear guide on the security and performance considerations for the final deployment.

---

## 1. Production Standards Checklist

### 1. Project Architecture
- [x] **TypeScript for React Native:** Used across the Expo mobile codebase.
- [ ] **TypeScript for Node.js:** The backend currently uses CommonJS (`server.js`, controllers, routes). Migrating to TypeScript on the backend is recommended.
- [x] **Modular Folder Structure:** Clear separation of directories (backend/frontend/mobile).
- [x] **Layered Architecture:** Separated database (Prisma), routing (Express), and controllers.
- [x] **Environment Separation:** Separate configuration files (`.env` files for development and placeholder specs for production).

### 2. Authentication & Security
- [x] **JWT Access & Refresh Tokens:** Implemented auth token and refresh token endpoints.
- [x] **Short-Lived Access Tokens:** Currently configured for short expiry sessions.
- [ ] **Refresh Token Rotation:** Refresh tokens should be revoked and replaced upon usage to prevent replay attacks.
- [x] **Secure Token Storage:** Using Expo `SecureStore` on mobile (Keychain/Keystore) and `localStorage` on web.
- [x] **Password Hashing:** Passwords are hashed using `bcrypt` during registration and seeding.
- [x] **Role-Based Access Control (RBAC):** Roles (`ADMIN`, `STUDENT`, `STAFF`) are validated inside backend endpoints via the `protect` and `authorize` middlewares.
- [x] **Backend Validation:** Authentication and authorization checks are always performed on the server side; client tokens are validated on every request.

### 3. API Security
- [x] **API Versioning:** Prefix all backend routes under `/api/v1` and map client fetch configurations dynamically.
- [ ] **Zod/Joi Validation:** Currently validating request inputs imperatively in controller blocks. We should integrate Joi or Zod schemas for automated validation.
- [x] **SQL Injection Protection:** Prisma ORM parameterized queries protect the database layer.
- [x] **Rate Limiting:** Configured global and authentication limiters on `/api/v1/auth/login` to prevent brute force attacks.
- [x] **CORS Configuration:** Enabled whitelisted origins specifically (`http://localhost:5173`, `http://localhost:5174`, `http://localhost:8081`).
- [x] **Helmet Security Headers:** Mounted helmet middleware at the top of the middleware stack.
- [x] **Database Error Masking:** Unhandled exceptions return generic messages; stack traces are hidden in production modes.

### 4. API Performance
- [x] **Lightweight Aggregated APIs:** Replaced 7+ parallel frontend requests with a single, role-aware `/api/dashboard` trip.
- [x] **Promise.all Parallelization:** Backend queries execute simultaneously inside `Promise.all` blocks.
- [x] **Pagination:** Implemented cursor-based pagination (`cursor` and `limit`) on Student, Room, and Leave list directories, with raw list fallback logic for existing dashboards.

### 5. Database Optimization
- [x] **Prisma Schema Design:** Structured foreign key relations and compound indices (e.g. `@@unique([pollId, userId])`).
- [x] **Prisma Client Cache:** Leveraged Prisma's connection lifecycle.
- [x] **Database Transactions:** Used transactional operations for profile changes, approvals, and registrations.

### 6. Redis Caching & Queues
- [ ] **Redis Caching:** Cache static details (e.g. Mess Menu, Notice Board) to reduce database load.
- [ ] **Background Queues (BullMQ):** Offload asynchronous tasks (e.g. emailing developers via nodemailer, push notification broadcasts) from the primary event loop.

### 7. File & Image Uploads
- [ ] **Direct S3 Uploads:** Current document uploads use base64 strings and mock persistence. Direct S3/object storage uploads with pre-signed URLs should be set up.

### 8. React Native Performance
- [x] **Inline Component Fixes:** Moved `InputField` and `FormModal` to file level to prevent keyboard and focus resetting during typing.
- [x] **FlatList Rendering:** Using list views instead of scroll containers for rendering complaints, notices, and historical records.
- [x] **Resource Cleanup:** Managed references and component lifecycles correctly.

### 9. API Client Architecture
- [x] **Centralized Fetch Clients:** Unified API configurations (`mobile/utils/api/client.js` and `frontend/src/utils/api/client.js`) managing authorization headers, error parsers, and token refreshes.

---

## 2. Recommendations & Next Action Steps

### A. Implemented Now (Quick Wins)
- [x] **API Security Headers (Helmet):** Installed and mounted `helmet` middleware in `server.js` to protect HTTP response headers from exploitation.
- [x] **API Rate Limiting (`express-rate-limit`):** Configured a global limiter (max 100 requests per 15 minutes) and a strict auth limiter (max 15 attempts per 15 minutes) protecting `/api/v1/auth/login` and `/api/v1/auth/refresh`.
- [x] **API Versioning Prefix:** Prefixed all backend router mounts and updated mobile and web client fetch helpers to target versioned `/api/v1/...` endpoints.

### B. Architectural Changes for Production Deployment
1. **Migrating to AWS S3 for Uploads:**
   Replace the local document mock uploads with pre-signed URLs, allowing mobile clients to upload Aadhaar and PAN documents directly to S3.
2. **BullMQ + Redis Background Processing:**
   Configure a Redis instance to handle technical developer escalation emails and push notification dispatches asynchronously, keeping the main Express thread responsive.
3. **Database Migration to PostgreSQL:**
   To transition from the local developer SQLite database to a production PostgreSQL database, follow these steps:
   
   #### Step 1: Update the Datasource Provider
   In [schema.prisma](file:///Users/apple/Documents/HMS/Hostel_Mgmt_System/backend/prisma/schema.prisma), update the `datasource db` block:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   
   #### Step 2: Configure the Database Connection URL
   In the production environment variables (or `.env` file), configure `DATABASE_URL` with your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/haripushp_db?schema=public"
   ```
   
   #### Step 3: Initialize Database Migrations
   Once the PostgreSQL server is running and the connection string is set, push the Prisma schema and create your first migration:
   ```bash
   npx prisma migrate dev --name init
   ```
   
   #### Step 4: Run the Database Seeder
   Seed the PostgreSQL database with default roles, rooms, and initial records:
   ```bash
   npm run db:seed
   ```
