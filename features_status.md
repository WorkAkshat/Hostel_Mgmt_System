# Hostel Management System - Feature Specification & Implementation Status

This document provides a comprehensive list of system features mapped by user role (Admin, Student, Guard), highlighting what is currently implemented, what was newly added, and what tasks remain pending.

---

## Role-Based Feature Matrices

### 1. Student Module

| Feature Area | Sub-Feature | Implementation Status | Technical Details |
| :--- | :--- | :---: | :--- |
| **Authentication** | Mobile OTP / Email Login | **Implemented** | Context-driven login flow with SecureStore JWT persist. |
| | Forgot Password | **Implemented** | Secure password recovery workflow. |
| | Biometric Login | **Implemented** | `expo-local-authentication` dynamic verification fallback. |
| | Multi-Language Support | **Implemented** | English (Default) and Hindi context state toggles. |
| **Dashboard** | Hostel Information & Notices | **Implemented** | Notices fetched from database, styled cleanly. |
| | Dynamic Daily Quotes | **Implemented** | 365 date-indexed quotes utility. |
| | Room Details & Roommates | **Implemented** | Complete sharing details & room allocation specs. |
| | Rent & Invoice Status | **Implemented** | Invoices list with tab filters (Pending / Paid History) and PDF receipt downloads. |
| | Daily Meal Status | **Implemented** | Marks Breakfast, Lunch, Snacks, Dinner logs. |
| **Leave Management**| Apply Leave | **Implemented** | Custom modal submission form (Night Out, Emergency, Out of Station). |
| | Leave Logs & Gate History | **Implemented** | Dynamic tracking of checked-out & checked-in times. |
| **Complaint System**| File Complaint | **Implemented** | Interactive form with priority classification & category selection. Support for 'App / Web Issue' ticket category. |
| | Complaint Tracker | **Implemented** | Track status (Pending, Assigned, Completed). |
| **Room Management** | Request Room Change | **Implemented** | Complete animated transfer request flow page without arrows. |
| **Profile & Docs** | Edit Profile Details | **Implemented** | Student edits contact/coaching info, submitting for Warden review. |
| | ID Documents Upload | **Implemented** | Upload panel for Aadhaar Card, PAN Card, and Passport with number records. |

---

### 2. Warden / Admin Module

| Feature Area | Sub-Feature | Implementation Status | Technical Details |
| :--- | :--- | :---: | :--- |
| **Overview Stats** | Occupancy, Approvals, Issues | **Implemented** | Interactive StatHero grid without arrows. |
| **Student Directory**| Add/Edit Students | **Implemented** | Form modal to register new students (Roll, Email, Phone, Parents). |
| | Searchable Registry | **Implemented** | Search student profiles, including roommate assignment list. |
| **Room Allocation** | Add Room & Capacity | **Implemented** | Form to add new rooms (Beds/Sharing, A/C toggle, block summary). |
| **Request Desk** | Profile Change Approvals| **Implemented** | Review requested edits (Old vs New values) and approve/reject changes. |
| | ID Document Verifications| **Implemented** | Verify/Reject uploaded Aadhaar, PAN, and Passport documents inside student details. |
| | Registrations Approval | **Implemented** | Interactive approve/reject workflow for user sign-ups. |
| | Leave Approvals | **Implemented** | Process leave forms with warden resolution notes. |
| | Generate Invoice Bills | **Implemented** | Generate custom rent/fee invoices for any student by roll number. |
| **Mess & Notices** | Mess Menu Planning | **Implemented** | Edit daily weekly meals list, synced dynamically with student views. |
| | Notice Board Announcements| **Implemented** | Create notices with title, details, and priority levels. |
| **Dev Escalation** | Developer Escalations | **Implemented** | Forward technical app/web issues to developer support email queue via nodemailer. |

---

### 3. Security Guard Module

| Feature Area | Sub-Feature | Implementation Status | Technical Details |
| :--- | :--- | :---: | :--- |
| **Gate Pass Activity**| Active Departure / Return | **Implemented** | Check out and check in students holding approved leaves. |
| **Visitor Registry** | Log New Visitor | **Implemented** | Roll number-validated visitor registration forms. |
| | Visitor Departure | **Implemented** | Log exit times for active visitors inside the building. |

---

## Technical Suggestions & Future Recommendations

1. **Push Notification Service Setup:**
   We have added push notifications integration stubs. To take this production-ready, register the application with FCM (Firebase Cloud Messaging) and Apple APNS, generating certificates to connect with the Expo push engine.
2. **Dynamic File Upload Storage (AWS S3):**
   Currently, document uploads are persistent JSON mocks. For production deployments, integrate active storage (e.g. AWS S3 bucket, Cloudinary, or Firebase Storage) inside the `/documents/upload` express controller.
3. **Hardware Biometrics Fallback:**
   For student logins, standard biometrics is supported. We suggest adding a secondary PIN lock entry option for devices lacking fingerprint or face sensors.
4. **Active Payment Gateway integration:**
   Currently student payments are simulated sandboxes. We recommend integrating UPI and credit card processing via Razorpay SDK on the mobile frontend and verifying payment webhooks on the backend.
