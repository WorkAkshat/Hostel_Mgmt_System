# React Native Frontend Production Checklist

This document catalogs the required frontend production standards for the **Hari Pushp PG** application, maps our current mobile and web client implementations to these standards, and provides recommendations for scaling, performance, and security.

---

## 1. Frontend Checklist & Current Status

### 1. Project Structure & TS
- [x] **TypeScript Integration:** Used across the Expo mobile codebase. Checked using `npx tsc --noEmit`.
- [x] **Modular Architecture:** App features are grouped under `mobile/src/app` (pages/routing) and helpers under `mobile/utils/api`.
- [x] **Prop & Interface Types:** Types are defined for student profiles, notices, leaves, and polls.

### 2. State & API Client
- [x] **Centralized API Client:** Base URL detection, bearer token injection, and timeout handling are managed inside `mobile/utils/api/client.js` and `frontend/src/utils/api/client.js`.
- [x] **TanStack Query / Zustand:** Integrated TanStack Query (`RootLayout`) for server query caching and custom Zustand auth stores for credentials persistence.
- [x] **Authentication State:** Context-managed (`AuthContext.js` / `AuthContext.jsx`) token storage and session tracking.

### 3. Security
- [x] **Secure Token Storage:** Using Expo `SecureStore` (iOS Keychain / Android Keystore) on mobile.
- [x] **Silent Token Refresh:** Silently refreshes expired access tokens during initialization.
- [x] **Role Validation:** Roles are validated on every request via the server-side middleware (RBAC).

### 4. UI & Performance
- [x] **Re-render Optimization:** Cleaned up focus and typing jitter (nested components unmounting on state updates) by moving `InputField` and `FormModal` to the file module level.
- [x] **Keyboard Handling:** Using `KeyboardAvoidingView` to prevent keyboard overlaps on forms.
- [x] **FlatList Optimization:** Using `FlatList` and item cards for list rendering.
- [x] **Pagination/Infinite Scroll:** Integrated `onEndReached` page increments and footer loaders inside `gate-history.tsx` list layout.

### 5. Multi-Language & Locales
- [x] **Language Context (i18n):** Mobile client supports dual-language locale state (English & Hindi) mapped to dictionary configs.
- [x] **Standard Time Formatting:** Using ISO 8601 timestamps from backend and formatting dates locally.

---

## 2. Recommendations & Next Action Steps

### A. Dynamic Input & Form Handling
* **Integrate React Hook Form & Zod:** [Implemented] Added dynamic validation schema logic and controlled controller inputs to the ID Document Upload modal in [dashboard.tsx](file:///Users/apple/Documents/HMS/Hostel_Mgmt_System/mobile/src/app/dashboard.tsx) to enforce digit boundaries on Aadhaar and formatting checks on PAN Card inputs.

### B. Image & Media Performance
* **Direct-to-S3 Uploads & Compression:** [Implemented] Wired up image resizing and size compression wrappers using `expo-image-manipulator` to shrink files to under 300 KB before upload triggers.

### C. Network & Offline Resilience
* **Network Status Listeners:** [Implemented] Embedded `@react-native-community/netinfo` listener in the main dashboard view, rendering a warning banner whenever the device goes offline.
