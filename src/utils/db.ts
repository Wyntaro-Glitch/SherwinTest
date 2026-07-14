"use client";

import { Email } from "@/types";

const DB_NAME = "SherwinMail";
const DB_VERSION = 2;

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
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
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
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("emails")) {
          const emailStore = db.createObjectStore("emails", { keyPath: "id" });
          emailStore.createIndex("status", "status", { unique: false });
          emailStore.createIndex("date", "date", { unique: false });
          emailStore.createIndex("from", "from", { unique: false });
          emailStore.createIndex("to", "to", { unique: false });
          emailStore.createIndex("subject", "subject", { unique: false });
          emailStore.createIndex("threadId", "threadId", { unique: false });
        }

        if (!db.objectStoreNames.contains("labels")) {
          db.createObjectStore("labels", { keyPath: "id" });
        }
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

// Email CRUD

export async function getAllEmails(): Promise<Email[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("emails", "readonly");
    const store = tx.objectStore("emails");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Email[]);
    request.onerror = () => reject(request.error);
  });
}

export async function saveEmail(email: Email): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("emails", "readwrite");
    const store = tx.objectStore("emails");
    const request = store.put(email);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveAllEmails(emails: Email[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("emails", "readwrite");
    const store = tx.objectStore("emails");
    store.clear();
    for (const email of emails) {
      store.put(email);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteEmailFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("emails", "readwrite");
    const store = tx.objectStore("emails");
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getEmailsByStatus(status: Email["status"]): Promise<Email[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("emails", "readonly");
    const store = tx.objectStore("emails");
    const index = store.index("status");
    const request = index.getAll(status);
    request.onsuccess = () => resolve(request.result as Email[]);
    request.onerror = () => reject(request.error);
  });
}

export async function searchEmails(query: string): Promise<Email[]> {
  const emails = await getAllEmails();
  const lower = query.toLowerCase();
  return emails.filter(
    (e) =>
      e.subject.toLowerCase().includes(lower) ||
      e.body.toLowerCase().includes(lower) ||
      e.from.toLowerCase().includes(lower) ||
      e.to.toLowerCase().includes(lower)
  );
}

// Labels CRUD

export interface Label {
  id: string;
  name: string;
  color: string;
}

export async function getAllLabels(): Promise<Label[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("labels", "readonly");
    const store = tx.objectStore("labels");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Label[]);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAllLabels(labels: Label[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("labels", "readwrite");
    const store = tx.objectStore("labels");
    store.clear();
    for (const label of labels) {
      store.put(label);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function migrateEmailsFromLocalStorage(): Promise<Email[]> {
  try {
    const raw = localStorage.getItem("sherwin_emails");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const emails: Email[] = parsed?.state?.emails || parsed?.emails || [];
    if (emails.length > 0) {
      await saveAllEmails(emails);
      localStorage.removeItem("sherwin_emails");
    }
    return emails;
  } catch {
    return [];
  }
}
