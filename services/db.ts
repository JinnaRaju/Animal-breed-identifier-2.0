
import { User, BreedResult, UserRole } from '../types';

const DB_NAME = 'AnimalBreedFinderDB';
const DB_VERSION = 2;

export class AnimalDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      console.log(`Opening IndexedDB: ${DB_NAME} v${DB_VERSION}`);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB open error:", request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn("IndexedDB upgrade blocked. Please close other tabs of this app.");
        alert("Database upgrade blocked. Please close other tabs of this app and refresh.");
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("IndexedDB initialized successfully");
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log(`Upgrading IndexedDB to version ${DB_VERSION}...`);
        
        if (!db.objectStoreNames.contains('users')) {
          console.log("Creating 'users' store");
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        if (!db.objectStoreNames.contains('scans')) {
          console.log("Creating 'scans' store");
          const scanStore = db.createObjectStore('scans', { keyPath: 'id' });
          scanStore.createIndex('userId', 'userId', { unique: false });
          scanStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('reminders')) {
          console.log("Creating 'reminders' store");
          const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' });
          reminderStore.createIndex('userId', 'userId', { unique: false });
        }

        if (!db.objectStoreNames.contains('community')) {
          console.log("Creating 'community' store");
          const communityStore = db.createObjectStore('community', { keyPath: 'id' });
          communityStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        console.log("Database upgrade complete");
      };
    });
  }

  // --- User Operations ---

  async saveUser(user: User): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(user);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUser(id: string): Promise<User | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('email');
      const request = index.get(email);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllUsers(): Promise<User[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Scan Operations ---

  async saveScan(scan: BreedResult): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scans'], 'readwrite');
      const store = transaction.objectStore('scans');
      const request = store.put(scan);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserScans(userId: string): Promise<BreedResult[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scans'], 'readonly');
      const store = transaction.objectStore('scans');
      const index = store.index('userId');
      const request = index.getAll(userId);
      request.onsuccess = () => {
        // Sort by timestamp descending
        const scans = request.result as BreedResult[];
        resolve(scans.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllScans(): Promise<BreedResult[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scans'], 'readonly');
      const store = transaction.objectStore('scans');
      const request = store.getAll();
      request.onsuccess = () => {
        const scans = request.result as BreedResult[];
        resolve(scans.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteScan(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['scans'], 'readwrite');
      const store = transaction.objectStore('scans');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Reminder Operations ---
  async saveReminder(reminder: any): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      const request = store.put(reminder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserReminders(userId: string): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      console.log(`Fetching reminders for user: ${userId}`);
      const transaction = db.transaction(['reminders'], 'readonly');
      const store = transaction.objectStore('reminders');
      const index = store.index('userId');
      const request = index.getAll(userId);
      request.onsuccess = () => {
        console.log(`Found ${request.result.length} reminders`);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error("Failed to fetch reminders", request.error);
        reject(request.error);
      };
    });
  }

  async deleteReminder(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Community Operations ---
  async savePost(post: any): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['community'], 'readwrite');
      const store = transaction.objectStore('community');
      const request = store.put(post);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPosts(): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['community'], 'readonly');
      const store = transaction.objectStore('community');
      const request = store.getAll();
      request.onsuccess = () => {
        const posts = request.result as any[];
        resolve(posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async likePost(postId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['community'], 'readwrite');
      const store = transaction.objectStore('community');
      const getRequest = store.get(postId);
      
      getRequest.onsuccess = () => {
        const post = getRequest.result;
        if (post) {
          post.likes = (post.likes || 0) + 1;
          const putRequest = store.put(post);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // --- Seeding ---
  async seedAdmin(): Promise<void> {
    const adminEmail = 'admin@breedfinder.com';
    const existing = await this.getUserByEmail(adminEmail);
    if (!existing) {
      await this.saveUser({
        id: 'admin-1',
        name: 'System Administrator',
        email: adminEmail,
        role: UserRole.ADMIN,
        createdAt: new Date().toISOString()
      });
    }
  }
}

export const db = new AnimalDB();
