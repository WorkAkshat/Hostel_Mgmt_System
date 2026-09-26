# 🔑 Hari Pushp PG Hostel Management System — Credentials Directory

This document contains all official System Login IDs, Warden Accounts, Staff Accounts, and Default Passwords for testing & administration.

---

## 🛡️ Admin & Chief Warden Accounts

| Account Name | Assigned Scope | Login Email (User ID) | Default Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Chief Warden (Consolidated)** | All Floors & Analytics | `admin@haripushppg.com` | `password123` | `ADMIN` |
| **Dr. Shalini Sharma** | Super Admin | `warden@haripushppg.com` | `password123` | `ADMIN` |
| **Akshat Sharma** | System Admin | `akshatsharma3132@gmail.com` | *(Registered Password)* | `ADMIN` |

---

## 🏢 Floor Warden Logins (Dedicated Floor Control)

Each Floor Warden login has exclusive rights for room allocation, electric meter readings, and floor directory for their specific floor:

| Floor / Unit | Enterprise / Company | Login Email (User ID) | Default Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Floor 1** | Rajken Enterprises | `floor1@haripushppg.com` | `password123` | `ADMIN` (Floor 1) |
| **Floor 2** | Vandana Enterprises | `floor2@haripushppg.com` | `password123` | `ADMIN` (Floor 2) |
| **Floor 3** | Pushpa Enterprises | `floor3@haripushppg.com` | `password123` | `ADMIN` (Floor 3) |
| **Floor 4** | Harish Chandra Enterprises | `floor4@haripushppg.com` | `password123` | `ADMIN` (Floor 4) |
| **Floor 5 & 6** | Ramesh Enterprises | `floor5@haripushppg.com` | `password123` | `ADMIN` (Floor 5) |

---

## 👮 Staff & Security Guard Accounts

| Staff Name | Department / Role | Login Email (User ID) | Default Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Sunita Devi** | Security / Head Female Guard | `guard@haripushppg.com` | `password123` | `STAFF` |

---

## 🎓 Active Student Accounts

| Student Name | Assigned Room / Roll No | Login Email (User ID) | Default Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Ria Dhanwani** | Room 101 (`HARIPUSHP_HP_001`) | `student@haripushppg.com` | `password123` | `STUDENT` |

---

## 📝 Student Self-Registration Flow

- New students can also register via the **Registration Page** (`/register`).
- Initial registration state is set to `PENDING_STUDENT`.
- Admin reviews, assigns Hostel Room & Roll Number (`HARIPUSHP_XXX`), and approves the student in **User Approvals** (`/approvals`).
- Once approved, the student logs in with their registered Email & Password to access:
  - Monthly Invoices & Online Fee Payments
  - Leave Requests & Complaints
  - Night Attendance & Mess Menu

---

> **Note:** All default passwords for master accounts (`admin@haripushppg.com`, `warden@haripushppg.com`, `floor1` to `floor5`, `guard@haripushppg.com`) are initialized to `password123`.
