"use client";

const DB_NAME = "SherwinMail";
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("templates")) {
        const templateStore = db.createObjectStore("templates", { keyPath: "id" });
        templateStore.createIndex("category", "category", { unique: false });
        templateStore.createIndex("name", "name", { unique: false });
      }

      if (!db.objectStoreNames.contains("userProfiles")) {
        db.createObjectStore("userProfiles", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("attachments")) {
        const attachStore = db.createObjectStore("attachments", { keyPath: "id" });
        attachStore.createIndex("emailId", "emailId", { unique: false });
      }

      if (!db.objectStoreNames.contains("auditLog")) {
        const auditStore = db.createObjectStore("auditLog", { keyPath: "id", autoIncrement: true });
        auditStore.createIndex("timestamp", "timestamp", { unique: false });
        auditStore.createIndex("action", "action", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
  skills: string[];
  experience: string;
  resumeText: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id?: number;
  timestamp: string;
  action: "send" | "draft" | "delete" | "setting_change" | "ai_generate" | "template_create" | "template_delete";
  details: string;
}

// Template CRUD
export async function getAllTemplates(): Promise<EmailTemplate[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("templates", "readonly");
    const store = tx.objectStore("templates");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as EmailTemplate[]);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTemplate(template: EmailTemplate): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("templates", "readwrite");
    const store = tx.objectStore("templates");
    const request = store.put(template);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("templates", "readwrite");
    const store = tx.objectStore("templates");
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// User Profile CRUD
export async function getUserProfile(id: string = "default"): Promise<UserProfile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("userProfiles", "readonly");
    const store = tx.objectStore("userProfiles");
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as UserProfile) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("userProfiles", "readwrite");
    const store = tx.objectStore("userProfiles");
    const request = store.put(profile);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Audit Log
export async function addAuditEntry(entry: Omit<AuditEntry, "id">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("auditLog", "readwrite");
    const store = tx.objectStore("auditLog");
    const request = store.add(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAuditEntries(limit: number = 100): Promise<AuditEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("auditLog", "readonly");
    const store = tx.objectStore("auditLog");
    const index = store.index("timestamp");
    const request = index.openCursor(null, "prev");
    const results: AuditEntry[] = [];
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
