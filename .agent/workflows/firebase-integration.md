---
description: Firebase Integration Plan - Authentication, Firestore, and Storage
---

# 🔥 Firebase Integration Plan for Inflow

This document outlines the complete step-by-step plan to integrate Firebase into Inflow.
Items marked with **🔴 USER ACTION REQUIRED** need your direct input.
Items marked with **🟢 AUTOMATED** will be handled by the assistant.

---

## Phase 0: Firebase Project Setup
**🔴 USER ACTION REQUIRED - Cannot be automated**

### Step 0.1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or select existing project)
3. Enter project name (e.g., "Inflow" or "Inflow-Production")
4. Choose whether to enable Google Analytics (optional)
5. Wait for project creation to complete

### Step 0.2: Register Web App
1. In Firebase Console, click the gear icon → "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon `</>` to add a web app
4. Enter app nickname: "Inflow Web"
5. ❌ Do NOT check "Firebase Hosting" for now
6. Click "Register app"
7. **COPY THE ENTIRE CONFIG OBJECT** - you'll provide this to me:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 0.3: Enable Authentication Methods
1. In Firebase Console sidebar, click "Build" → "Authentication"
2. Click "Get started"
3. Under "Sign-in method" tab, enable:
   - ✅ **Email/Password** (required)
   - ✅ **Google** (recommended - easiest for users)
   - Optional: Apple, Microsoft, Phone, etc.
4. For Google sign-in:
   - Click "Google"
   - Toggle "Enable"
   - Set project support email
   - Click "Save"

### Step 0.4: Create Firestore Database
1. In Firebase Console sidebar, click "Build" → "Firestore Database"
2. Click "Create database"
3. Choose **Start in production mode** (we'll set proper rules)
4. Select a Cloud Firestore location closest to your users
5. Click "Enable"

### Step 0.5: Enable Cloud Storage (for template images)
1. In Firebase Console sidebar, click "Build" → "Storage"
2. Click "Get started"
3. Choose **Start in production mode**
4. Select the same location as Firestore
5. Click "Done"

**👉 After completing Phase 0, provide me with:**
1. Your Firebase config object (from Step 0.2)
2. Confirmation that Auth, Firestore, and Storage are enabled

---

## Phase 1: Install Dependencies & Configuration
**🟢 AUTOMATED**

### Step 1.1: Install Firebase SDK
```bash
npm install firebase
```

### Step 1.2: Create Firebase Configuration
Create `/src/lib/firebase/config.ts` with your provided config.

### Step 1.3: Create Firebase Service Files
- `/src/lib/firebase/auth.ts` - Authentication functions
- `/src/lib/firebase/firestore.ts` - Database operations
- `/src/lib/firebase/storage.ts` - File storage operations
- `/src/lib/firebase/index.ts` - Exports

---

## Phase 2: Authentication Implementation
**🟢 AUTOMATED**

### Step 2.1: Create Auth Context/Provider
- AuthProvider component wrapping the app
- `useAuth` hook for accessing auth state
- Handles: login, logout, signup, password reset

### Step 2.2: Create Auth Pages
- `/login` - Login page with email/password + Google
- `/signup` - Registration page
- `/forgot-password` - Password reset
- Protected route wrapper

### Step 2.3: Update App Layout
- Add AuthProvider to root layout
- Add user menu to header
- Redirect unauthenticated users

### Auth Features:
- ✅ Email/Password login & signup
- ✅ Google OAuth login
- ✅ Password reset via email
- ✅ Session persistence
- ✅ Auth state listener
- ✅ Protected routes

---

## Phase 3: Firestore Data Structure Design
**🟢 AUTOMATED (with your approval)**

### Proposed Collections Structure:

```
/users/{userId}
  - email: string
  - displayName: string
  - photoURL: string
  - createdAt: timestamp
  - settings: { company, taxRate, numbering, etc. }

/users/{userId}/templates/{templateId}
  - name, type, imageUrl, fields, etc.

/users/{userId}/customers/{customerId}
  - name, email, phone, address, etc.

/users/{userId}/products/{productId}
  - name, description, price, etc.

/users/{userId}/documents/{documentId}
  - type, templateId, customerId, lineItems, etc.

/users/{userId}/discounts/{discountId}
  - name, percentage, etc.
```

**Benefits of this structure:**
- Each user has their own isolated data
- Easy to query "all documents for user X"
- Scalable and secure
- Natural fit with security rules

---

## Phase 4: Create Firebase Services
**🟢 AUTOMATED**

### Step 4.1: Auth Service (`/src/lib/firebase/auth.ts`)
```typescript
// Functions to implement:
- signInWithEmail(email, password)
- signUpWithEmail(email, password, displayName)
- signInWithGoogle()
- signOut()
- resetPassword(email)
- updateProfile(data)
- onAuthStateChange(callback)
```

### Step 4.2: Firestore Service (`/src/lib/firebase/firestore.ts`)
```typescript
// Generic CRUD for each collection:
- createDocument(collection, data)
- getDocument(collection, id)
- getDocuments(collection, filters?)
- updateDocument(collection, id, data)
- deleteDocument(collection, id)
- subscribeToCollection(collection, callback) // Real-time
```

### Step 4.3: Storage Service (`/src/lib/firebase/storage.ts`)
```typescript
// For template images:
- uploadTemplateImage(file, templateId)
- deleteTemplateImage(templateId)
- getTemplateImageUrl(templateId)
```

---

## Phase 5: Create Firestore-Backed Stores
**🟢 AUTOMATED**

### Strategy: Hybrid Approach
1. Keep Zustand for local state management (fast UI updates)
2. Add Firebase sync layer for persistence
3. Real-time listeners for multi-device sync

### Step 5.1: Create Base Firebase Store Hook
```typescript
// useFirestoreSync hook pattern:
- On mount: Load data from Firestore
- On change: Sync to Firestore
- Real-time: Listen for external changes
```

### Step 5.2: Update Each Store

| Store | Changes |
|-------|---------|
| `settingsStore` | Sync to `/users/{uid}/settings` (single doc) |
| `templateStore` | Sync to `/users/{uid}/templates` subcollection |
| `customerStore` | Sync to `/users/{uid}/customers` subcollection |
| `productStore` | Sync to `/users/{uid}/products` subcollection |
| `documentStore` | Sync to `/users/{uid}/documents` subcollection |
| `discountStore` | Sync to `/users/{uid}/discounts` subcollection |
| `ledgerStore` | Computed from documents (no separate sync) |

---

## Phase 6: Security Rules
**🔴 USER ACTION REQUIRED - Deploy to Firebase Console**

### Step 6.1: Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcollections inherit the same rule
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Step 6.2: Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only access their own files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**👉 You will need to:**
1. Go to Firebase Console → Firestore → Rules
2. Paste the Firestore rules and publish
3. Go to Firebase Console → Storage → Rules
4. Paste the Storage rules and publish

---

## Phase 7: Data Migration Strategy
**🟢 AUTOMATED**

### For Existing Users (localStorage → Firestore):
1. On first login, check if Firestore has data
2. If not, offer to migrate localStorage data
3. Upload all local data to Firestore
4. Clear localStorage after successful migration

### Migration UI:
- Show migration progress
- Handle errors gracefully
- Allow retry on failure

---

## Phase 8: UI Updates
**🟢 AUTOMATED**

### Step 8.1: Auth UI Components
- Login form with email/password
- Google sign-in button
- Sign up form
- Forgot password form
- User avatar/menu in header
- Logout button

### Step 8.2: Loading States
- Show skeleton/loading while fetching data
- Handle offline state gracefully

### Step 8.3: Error Handling
- Display user-friendly error messages
- Retry mechanisms for failed operations

---

## Phase 9: Testing & Verification
**🔴 USER ACTION REQUIRED**

### Test Checklist:
- [ ] Sign up with email/password works
- [ ] Sign in with email/password works
- [ ] Sign in with Google works
- [ ] Password reset email is received
- [ ] Creating a document saves to Firestore
- [ ] Data persists after logout/login
- [ ] Template images upload to Storage
- [ ] Data is isolated per user
- [ ] Real-time sync works (open in two tabs)

---

## Implementation Order Summary

| Step | Description | Who |
|------|-------------|-----|
| 0.1-0.5 | Firebase Console Setup | 🔴 YOU |
| 1.1-1.3 | Install & Configure | 🟢 ME |
| 2.1-2.3 | Auth Implementation | 🟢 ME |
| 3 | Data Structure (Review) | 🟡 REVIEW |
| 4.1-4.3 | Firebase Services | 🟢 ME |
| 5.1-5.2 | Update Stores | 🟢 ME |
| 6.1-6.2 | Security Rules | 🔴 YOU (deploy) |
| 7 | Migration Logic | 🟢 ME |
| 8.1-8.3 | UI Updates | 🟢 ME |
| 9 | Testing | 🔴 YOU |

---

## Estimated Time

| Phase | Time |
|-------|------|
| Phase 0 (User Setup) | 15-20 minutes |
| Phase 1-8 (Development) | 2-3 hours |
| Phase 9 (Testing) | 30 minutes |

---

## What I Need From You to Start

1. **Firebase Config Object** from Step 0.2
2. **Confirmation** that you've enabled:
   - Email/Password authentication
   - Google authentication
   - Firestore Database
   - Cloud Storage

Once you provide these, I'll begin Phase 1 immediately!
