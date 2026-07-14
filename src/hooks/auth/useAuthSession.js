/**
 * @typedef {Object} StaffCurrentUser
 * @property {string} id
 * @property {string} username
 * @property {string} role
 * @property {number} [loginTime]
 * @property {string} [tabSessionId]
 * @property {string[]} [allowedEventIds]
 * @property {string[]} [allowedLocations]
 * @property {string} [preferredLandingTab]
 */

/**
 * Target API for staff authentication (Phase C — partial migration from App.jsx).
 *
 * @typedef {Object} AuthSessionReturn
 * @property {import('firebase/auth').User|null} fbUser
 * @property {React.Dispatch<React.SetStateAction<import('firebase/auth').User|null>>} setFbUser
 * @property {StaffCurrentUser|null} currentUser
 * @property {React.Dispatch<React.SetStateAction<StaffCurrentUser|null>>} setCurrentUser
 * @property {{ username: string, password: string }} loginForm
 * @property {React.Dispatch<React.SetStateAction<{ username: string, password: string }>>} setLoginForm
 * @property {boolean} showLoginPassword
 * @property {React.Dispatch<React.SetStateAction<boolean>>} setShowLoginPassword
 * @property {boolean} loginBusy
 * @property {React.Dispatch<React.SetStateAction<boolean>>} setLoginBusy
 * @property {boolean} googleLoginBusy
 * @property {React.Dispatch<React.SetStateAction<boolean>>} setGoogleLoginBusy
 * @property {string} loginError
 * @property {React.Dispatch<React.SetStateAction<string>>} setLoginError
 * @property {React.MutableRefObject<boolean>} loginInProgressRef
 * @property {(e: React.FormEvent) => Promise<void>} handleLogin
 * @property {() => Promise<void>} handleGoogleLogin
 * @property {() => Promise<void>} handleLogout
 * @property {boolean} usersAuthReady
 * @property {string|null} firestoreUsersError
 */

export { useAuthSessionState, resolveStaffLoginEmail, mapStaffLoginFirebaseError } from './useAuthSessionState.js';

/**
 * Full auth session hook — stub until `currentUser`, handlers and Firestore listeners migrate here.
 * Use {@link useAuthSessionState} + App handlers until then.
 *
 * @returns {Partial<AuthSessionReturn>}
 */
export function useAuthSession() {
  return {};
}
