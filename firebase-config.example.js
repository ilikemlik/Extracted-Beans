/* ==========================================================================
   EXTRACTED BEANS - FIREBASE FIRESTORE CONFIGURATION (TEMPLATE)
   Central cloud database for real-time global synchronization across all users
   ========================================================================== */

/**
 * FIREBASE PROJECT CONFIGURATION
 * 
 * To connect your live Firebase Firestore database:
 * 1. Copy this file to `firebase-config.js` (which is git-ignored to prevent leaking credentials/passcodes)
 * 2. Go to https://console.firebase.google.com/
 * 3. Create a new Firebase project (e.g. "extracted-beans")
 * 4. Add a Web App (</>) and copy the `firebaseConfig` object below
 * 5. In Firebase Console, go to "Build" -> "Firestore Database" -> "Create database"
 * 6. Replace the placeholder values below with your credentials.
 */
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

/**
 * SECURITY PASSCODE
 * Anyone visiting the website can view and log new recipes freely.
 * Editing or deleting recipes requires entering this passcode.
 * Once entered, the session remains unlocked in sessionStorage until the tab is closed.
 */
export const ADMIN_PASSCODE = "1234";

/**
 * Helper to check if valid Firebase credentials have been configured
 */
export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig &&
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('YOUR_') &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('YOUR_')
  );
}
