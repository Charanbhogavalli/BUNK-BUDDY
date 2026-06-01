import { db, auth, isFirebaseConfigured } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// Define Interfaces
export interface User {
  studentId: string;
  name: string;
  passwordHash: string;
  semester: number;
  requiredAttendance: number; // e.g. 75
  admin: boolean;
  createdAt: string;
}

export interface Subject {
  subjectId: string;
  userId: string;
  subjectName: string;
  attendedClasses: number;
  totalClasses: number;
  createdAt: string;
}

export interface AttendanceHistory {
  attendanceId: string;
  userId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  status: "PRESENT" | "ABSENT";
  timestamp: string;
}

export interface Dialogue {
  dialogueId: string;
  category: "PRESENT" | "ABSENT" | "SAFE" | "WARNING" | "CRITICAL" | "ROAST";
  text: string;
  rarity: "common" | "rare" | "legendary";
  active: boolean;
  createdAt: string;
}

// Default Seed Dialogues
export const DEFAULT_DIALOGUES: Dialogue[] = [
  // PRESENT
  { dialogueId: "p1", category: "PRESENT", text: "Character development detected.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "p2", category: "PRESENT", text: "Look who decided to show up.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "p3", category: "PRESENT", text: "A miracle has occurred. You're in class.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "p4", category: "PRESENT", text: "Your parents would be proud. For once.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  // ABSENT
  { dialogueId: "ab1", category: "ABSENT", text: "Attendance left the chat.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "ab2", category: "ABSENT", text: "The bed was too comfortable, huh?", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "ab3", category: "ABSENT", text: "Priorities, I guess.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "ab4", category: "ABSENT", text: "Academic downfall speedrun begins.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  // SAFE
  { dialogueId: "sf1", category: "SAFE", text: "Relax. Your academic career survives.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "sf2", category: "SAFE", text: "You still have a buffer. Bunk away.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "sf3", category: "SAFE", text: "Enjoy your freedom. For now.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  // WARNING
  { dialogueId: "wr1", category: "WARNING", text: "Interesting strategy.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "wr2", category: "WARNING", text: "One more bad decision and you're cooked.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "wr3", category: "WARNING", text: "Walking on thin ice, buddy.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  // CRITICAL
  { dialogueId: "cr1", category: "CRITICAL", text: "One more bunk and it's over.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "cr2", category: "CRITICAL", text: "You're cooked. Go buy a study guide.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "cr3", category: "CRITICAL", text: "Debarred list is currently loading...", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "cr4", category: "CRITICAL", text: "Write your apology letter to the HOD now.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  // ROAST
  { dialogueId: "rs1", category: "ROAST", text: "You have 95% attendance. Do you live here?", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "rs2", category: "ROAST", text: "Academic weapon status, but at what cost?", rarity: "common", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "rs3", category: "ROAST", text: "Why are you tracking this? You never bunk anyway.", rarity: "common", active: true, createdAt: new Date().toISOString() },
  // RARE
  { dialogueId: "ra1", category: "SAFE", text: "✨ RARE REACTION: You are playing a dangerous game with your future.", rarity: "rare", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "ra2", category: "ROAST", text: "✨ RARE REACTION: Go study. Just kidding, do what you want.", rarity: "rare", active: true, createdAt: new Date().toISOString() },
  // LEGENDARY
  { dialogueId: "lg1", category: "SAFE", text: "🏆 LEGENDARY MESSAGE UNLOCKED: The academic gods approve.", rarity: "legendary", active: true, createdAt: new Date().toISOString() },
  { dialogueId: "lg2", category: "ABSENT", text: "🏆 LEGENDARY MESSAGE UNLOCKED: You skipped class and the universe didn't collapse.", rarity: "legendary", active: true, createdAt: new Date().toISOString() },
];

// Simple password hashing client-side (SHA-256 helper)
export async function hashPassword(password: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}

// ----------------------------------------------------
// Calculations Engine
// ----------------------------------------------------

export function calculateAttendancePercentage(attended: number, total: number): number {
  if (total === 0) return 100;
  const pct = (attended / total) * 100;
  return Math.round(pct * 10) / 10;
}

export function calculateSafeBunks(attended: number, total: number, requiredPct: number): number {
  if (total === 0) return 0;
  const targetFraction = requiredPct / 100;
  const maxBunks = Math.floor(attended / targetFraction - total);
  return Math.max(0, maxBunks);
}

export function calculateRecoveryClasses(attended: number, total: number, requiredPct: number): number {
  const currentPct = calculateAttendancePercentage(attended, total);
  if (currentPct >= requiredPct) return 0;

  const targetFraction = requiredPct / 100;
  if (targetFraction >= 1) return 999;

  const needed = Math.ceil((targetFraction * total - attended) / (1 - targetFraction));
  return Math.max(0, needed);
}

export type SubjectRiskLevel = "Academic Weapon" | "Safe" | "Careful" | "Danger" | "Cooked";

export function getSubjectRiskLevel(pct: number): SubjectRiskLevel {
  if (pct >= 90) return "Academic Weapon";
  if (pct >= 80) return "Safe";
  if (pct >= 75) return "Careful";
  if (pct >= 70) return "Danger";
  return "Cooked";
}

export type UserStatusBadge = "Academic Survivor" | "Faculty Favorite" | "Living Dangerously";

export function getUserStatusBadge(overallPct: number): UserStatusBadge {
  if (overallPct >= 90) return "Faculty Favorite";
  if (overallPct >= 75) return "Academic Survivor";
  return "Living Dangerously";
}

// Local Session storage helper
const LOCAL_SESSION_KEY = "bunk_current_user_session_uid";
const LOCAL_SESSION_DATA_KEY = "bunk_current_user_session_data";

const getSessionUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const item = localStorage.getItem(LOCAL_SESSION_DATA_KEY);
  return item ? JSON.parse(item) : null;
};

const setSessionUser = (u: User | null, uid: string | null) => {
  if (typeof window !== "undefined") {
    if (u && uid) {
      localStorage.setItem(LOCAL_SESSION_KEY, uid);
      localStorage.setItem(LOCAL_SESSION_DATA_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      localStorage.removeItem(LOCAL_SESSION_DATA_KEY);
    }
  }
};

const getSessionUid = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOCAL_SESSION_KEY);
};

const ensureFirestore = () => {
  if (!isFirebaseConfigured || !db || !auth) {
    throw new Error(
      "Firebase is NOT configured. Please add the Firebase credentials to your .env.local file to initialize the database."
    );
  }
};

const ensureAuthenticatedUser = async (): Promise<string> => {
  ensureFirestore();
  
  // If we have a local session UID but Firebase Auth hasn't loaded it yet, wait for Auth
  const sessionUid = getSessionUid();
  if (sessionUid && auth && !auth.currentUser) {
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
      // Timeout fallback of 2 seconds
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 2000);
    });
  }
  
  const uid = auth.currentUser ? auth.currentUser.uid : sessionUid;
  if (!uid) {
    throw new Error("Unauthorized access. Please login.");
  }
  return uid;
};

// Dialogue in-memory cache
let cachedDialogues: Dialogue[] | null = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

// ----------------------------------------------------
// Unified Database Access Layer
// ----------------------------------------------------

export const dbService = {
  // --------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------
  async register(studentId: string, name: string, passwordHash: string, semester: number, requiredAttendance: number = 75): Promise<User> {
    ensureFirestore();
    const cleanId = studentId.trim().toLowerCase();
    const email = `${cleanId}@bunkbuddy.local`;
    
    // Check if ID is "admin" to assign admin rights
    const isAdmin = cleanId === "admin";

    // 1. Create User in Firebase Authentication
    // Note: Password length must be at least 6 characters in Firebase Auth.
    // If user inputs a shorter one, we use a padded hash to ensure it exceeds 6 chars!
    const authPassword = passwordHash.length >= 6 ? passwordHash : `${passwordHash}__securepad`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, authPassword);
    const uid = userCredential.user.uid;

    const newUser: User = {
      studentId: cleanId,
      name: name.trim(),
      passwordHash,
      semester: Number(semester),
      requiredAttendance: Number(requiredAttendance),
      admin: isAdmin,
      createdAt: new Date().toISOString(),
    };

    // 2. Save User details document in Firestore using uid as document ID
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, newUser);
    
    setSessionUser(newUser, uid);
    return newUser;
  },

  async login(studentId: string, passwordHash: string): Promise<User> {
    ensureFirestore();
    const cleanId = studentId.trim().toLowerCase();
    const email = `${cleanId}@bunkbuddy.local`;
    const authPassword = passwordHash.length >= 6 ? passwordHash : `${passwordHash}__securepad`;

    // 1. Sign in via Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, authPassword);
    const uid = userCredential.user.uid;

    // 2. Fetch User document from Firestore
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      throw new Error("Student record not found in database!");
    }
    const userData = docSnap.data() as User;
    
    setSessionUser(userData, uid);
    return userData;
  },

  getCurrentUser(): User | null {
    return getSessionUser();
  },

  async logout(): Promise<void> {
    ensureFirestore();
    await signOut(auth);
    setSessionUser(null, null);
  },

  // --------------------------------------------------
  // SUBJECTS
  // --------------------------------------------------
  async getSubjects(userId: string): Promise<Subject[]> {
    const uid = await ensureAuthenticatedUser();

    const q = query(
      collection(db, "subjects"),
      where("userId", "==", uid)
    );
    const querySnapshot = await getDocs(q);
    const subjects: Subject[] = [];
    querySnapshot.forEach((doc) => {
      subjects.push({ ...doc.data() } as Subject);
    });
    return subjects.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async getSubject(subjectId: string): Promise<Subject> {
    const uid = await ensureAuthenticatedUser();

    const docRef = doc(db, "subjects", subjectId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Subject not found.");
    }
    const data = docSnap.data() as Subject;
    if (data.userId !== uid) {
      throw new Error("Unauthorized access to this subject.");
    }
    return data;
  },

  async addSubject(userId: string, subjectName: string, attendedClasses: number, totalClasses: number): Promise<Subject> {
    const uid = await ensureAuthenticatedUser();
    const batch = writeBatch(db);

    const subjectId = doc(collection(db, "subjects")).id;
    const newSubject: Subject = {
      subjectId,
      userId: uid, // Enforce logged-in UID mapping
      subjectName: subjectName.trim(),
      attendedClasses: Number(attendedClasses),
      totalClasses: Number(totalClasses),
      createdAt: new Date().toISOString(),
    };

    // 1. Queue subject creation in batch
    batch.set(doc(db, "subjects", subjectId), newSubject);
    
    // 2. Queue initial history logs creation in batch
    const date = new Date();
    for (let i = 0; i < totalClasses; i++) {
      const attendanceId = doc(collection(db, "attendanceHistory")).id;
      const prevDate = new Date();
      prevDate.setDate(date.getDate() - (i + 1));
      const dateStr = prevDate.toISOString().split("T")[0];
      const status = i < attendedClasses ? "PRESENT" : "ABSENT";
      
      const histItem: AttendanceHistory = {
        attendanceId,
        userId: uid,
        subjectId,
        date: dateStr,
        status,
        timestamp: prevDate.toISOString(),
      };
      batch.set(doc(db, "attendanceHistory", attendanceId), histItem);
    }
    
    // 3. Commit all changes atomically
    await batch.commit();
    return newSubject;
  },

  async deleteSubject(userId: string, subjectId: string): Promise<void> {
    const uid = await ensureAuthenticatedUser();
    const batch = writeBatch(db);

    // 1. Delete subject doc
    batch.delete(doc(db, "subjects", subjectId));
    
    // 2. Fetch history records
    const q = query(
      collection(db, "attendanceHistory"),
      where("userId", "==", uid),
      where("subjectId", "==", subjectId)
    );
    const histSnap = await getDocs(q);
    
    // 3. Queue deletions for all history records
    histSnap.forEach((d) => {
      batch.delete(doc(db, "attendanceHistory", d.id));
    });
    
    // 4. Commit batch atomically
    await batch.commit();
  },

  async logAttendanceDirect(userId: string, subjectId: string, status: "PRESENT" | "ABSENT"): Promise<{ subject: Subject; dialog: Dialogue }> {
    const uid = await ensureAuthenticatedUser();
    const dateStr = new Date().toISOString().split("T")[0];
    
    // Duplicate check
    const dupQuery = query(
      collection(db, "attendanceHistory"),
      where("userId", "==", uid),
      where("subjectId", "==", subjectId),
      where("date", "==", dateStr)
    );
    const dupSnap = await getDocs(dupQuery);
    if (!dupSnap.empty) {
      throw new Error("Already marked! Attendance has already been logged for this course today.");
    }

    const attendanceId = doc(collection(db, "attendanceHistory")).id;
    const newHistory: AttendanceHistory = {
      attendanceId,
      userId: uid,
      subjectId,
      date: dateStr,
      status,
      timestamp: new Date().toISOString(),
    };

    await setDoc(doc(db, "attendanceHistory", attendanceId), newHistory);

    const subjRef = doc(db, "subjects", subjectId);
    const docSnap = await getDoc(subjRef);
    if (!docSnap.exists()) {
      throw new Error("Subject not found!");
    }
    
    const subj = docSnap.data() as Subject;
    const attendedInc = status === "PRESENT" ? 1 : 0;
    const updated = {
      attendedClasses: subj.attendedClasses + attendedInc,
      totalClasses: subj.totalClasses + 1,
    };
    await updateDoc(subjRef, updated);
    const updatedSubject = { ...subj, ...updated };

    const category = status === "PRESENT" ? "PRESENT" : "ABSENT";
    const dialog = await this.getRandomDialogue(category);

    return { subject: updatedSubject, dialog };
  },

  // --------------------------------------------------
  // ATTENDANCE HISTORY (EDIT PREVIOUS)
  // --------------------------------------------------
  async getAttendanceHistory(userId: string, subjectId: string): Promise<AttendanceHistory[]> {
    const uid = await ensureAuthenticatedUser();

    const q = query(
      collection(db, "attendanceHistory"),
      where("userId", "==", uid),
      where("subjectId", "==", subjectId)
    );
    const querySnapshot = await getDocs(q);
    const history: AttendanceHistory[] = [];
    querySnapshot.forEach((doc) => {
      history.push({ ...doc.data() } as AttendanceHistory);
    });
    return history.sort((a, b) => a.date.localeCompare(b.date));
  },

  async getTodayAttendanceLogs(userId: string, dateStr: string): Promise<Record<string, AttendanceHistory>> {
    const uid = await ensureAuthenticatedUser();

    const q = query(
      collection(db, "attendanceHistory"),
      where("userId", "==", uid),
      where("date", "==", dateStr)
    );
    const querySnapshot = await getDocs(q);
    const logsMap: Record<string, AttendanceHistory> = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AttendanceHistory;
      logsMap[data.subjectId] = data;
    });
    return logsMap;
  },

  async getRecentActivity(userId: string, limitCount: number = 5): Promise<(AttendanceHistory & { subjectName: string })[]> {
    const uid = await ensureAuthenticatedUser();

    const q = query(
      collection(db, "attendanceHistory"),
      where("userId", "==", uid)
    );
    const snapshot = await getDocs(q);
    
    const subjects = await this.getSubjects(uid);
    const subjectMap = new Map(subjects.map((s) => [s.subjectId, s.subjectName]));

    const activity: (AttendanceHistory & { subjectName: string })[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as AttendanceHistory;
      activity.push({
        ...data,
        subjectName: subjectMap.get(data.subjectId) || "Unknown Subject",
      });
    });
    
    return activity
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limitCount);
  },

  async updateHistoryRecord(userId: string, subjectId: string, dateStr: string, status: "PRESENT" | "ABSENT" | null): Promise<Subject> {
    const uid = await ensureAuthenticatedUser();
    let finalSubject: Subject | null = null;

    const q = query(
      collection(db, "attendanceHistory"),
      where("userId", "==", uid),
      where("subjectId", "==", subjectId),
      where("date", "==", dateStr)
    );
    const querySnapshot = await getDocs(q);
    let existingRecord: AttendanceHistory | null = null;
    let recordId = "";
    querySnapshot.forEach((d) => {
      existingRecord = d.data() as AttendanceHistory;
      recordId = d.id;
    });

    if (existingRecord) {
      if (status === null) {
        await deleteDoc(doc(db, "attendanceHistory", recordId));
      } else {
        await updateDoc(doc(db, "attendanceHistory", recordId), { status });
      }
    } else if (status !== null) {
      const newId = doc(collection(db, "attendanceHistory")).id;
      await setDoc(doc(db, "attendanceHistory", newId), {
        attendanceId: newId,
        userId: uid,
        subjectId,
        date: dateStr,
        status,
        timestamp: new Date().toISOString(),
      });
    }

    const allHistQ = query(
      collection(db, "attendanceHistory"),
      where("userId", "==", uid),
      where("subjectId", "==", subjectId)
    );
    const allHistSnapshot = await getDocs(allHistQ);
    let total = 0;
    let attended = 0;
    allHistSnapshot.forEach((d) => {
      const h = d.data() as AttendanceHistory;
      total++;
      if (h.status === "PRESENT") attended++;
    });

    const subjRef = doc(db, "subjects", subjectId);
    await updateDoc(subjRef, { attendedClasses: attended, totalClasses: total });
    const currentSubjSnap = await getDoc(subjRef);
    finalSubject = currentSubjSnap.data() as Subject;

    if (!finalSubject) throw new Error("Subject not found");
    return finalSubject;
  },

  // --------------------------------------------------
  // DIALOGUES
  // --------------------------------------------------
  async getDialogues(): Promise<Dialogue[]> {
    ensureFirestore();
    const now = Date.now();
    // Use cache if still valid (5 minutes TTL)
    if (cachedDialogues && (now - lastCacheFetchTime < CACHE_TTL_MS)) {
      return cachedDialogues;
    }

    const q = query(collection(db, "dialogues"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const dialogues: Dialogue[] = [];
    snapshot.forEach((d) => {
      dialogues.push({ ...d.data() } as Dialogue);
    });

    if (dialogues.length === 0) {
      const seedPromises = DEFAULT_DIALOGUES.map((d) =>
        setDoc(doc(db, "dialogues", d.dialogueId), d)
      );
      await Promise.all(seedPromises);
      cachedDialogues = DEFAULT_DIALOGUES;
      lastCacheFetchTime = Date.now();
      return DEFAULT_DIALOGUES;
    }

    cachedDialogues = dialogues;
    lastCacheFetchTime = Date.now();
    return dialogues;
  },

  async addDialogue(category: Dialogue["category"], text: string, rarity: Dialogue["rarity"] = "common"): Promise<Dialogue> {
    ensureFirestore();
    const dialogueId = doc(collection(db, "dialogues")).id;
    const newDialogue: Dialogue = {
      dialogueId,
      category,
      text: text.trim(),
      rarity,
      active: true,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "dialogues", dialogueId), newDialogue);
    // Invalidate dialogue cache
    cachedDialogues = null;
    return newDialogue;
  },

  async updateDialogue(dialogueId: string, updates: Partial<Omit<Dialogue, "dialogueId">>): Promise<void> {
    ensureFirestore();
    await updateDoc(doc(db, "dialogues", dialogueId), updates);
    // Invalidate dialogue cache
    cachedDialogues = null;
  },

  async deleteDialogue(dialogueId: string): Promise<void> {
    ensureFirestore();
    await deleteDoc(doc(db, "dialogues", dialogueId));
    // Invalidate dialogue cache
    cachedDialogues = null;
  },

  async getRandomDialogue(category: Dialogue["category"]): Promise<Dialogue> {
    ensureFirestore();
    
    // Fetch all dialogues (warmed via in-memory cache)
    const allDialogues = await this.getDialogues();
    
    // Filter active matching dialogues in-memory (0ms query latency!)
    let dialogues = allDialogues.filter((d) => d.category === category && d.active);

    if (dialogues.length === 0) {
      dialogues = DEFAULT_DIALOGUES.filter((d) => d.category === category && d.active);
    }

    if (dialogues.length === 0) {
      return {
        dialogueId: "fallback",
        category,
        text: `Logged a ${category.toLowerCase()} event. Stay casual.`,
        rarity: "common",
        active: true,
        createdAt: new Date().toISOString(),
      };
    }

    const rand = Math.random() * 100;
    let targetRarity: Dialogue["rarity"] = "common";
    if (rand < 1) {
      targetRarity = "legendary";
    } else if (rand < 11) {
      targetRarity = "rare";
    }

    let matched = dialogues.filter((d) => d.rarity === targetRarity);
    if (matched.length === 0 && targetRarity === "legendary") {
      targetRarity = "rare";
      matched = dialogues.filter((d) => d.rarity === "rare");
    }
    if (matched.length === 0) {
      matched = dialogues.filter((d) => d.rarity === "common");
    }
    if (matched.length === 0) {
      matched = dialogues;
    }

    const randomIndex = Math.floor(Math.random() * matched.length);
    return matched[randomIndex];
  },
  
  async resetSessionCache(): Promise<void> {
    ensureFirestore();
    await signOut(auth);
    setSessionUser(null, null);
  },
};
