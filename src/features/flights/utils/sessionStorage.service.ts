class SessionStorageService {
  /**
   * Set data in sessionStorage (replaces existing value if key already exists)
   * @param key string
   * @param value any (will be stringified)
   */
  static set<T>(key: string, value: T): void {
    try {
      // Remove existing key if present (optional but explicit)
      if (sessionStorage.getItem(key) !== null) {
        sessionStorage.removeItem(key);
        console.log(`Removed existing key: ${key}`);
      }

      const serializedValue = JSON.stringify(value);
      sessionStorage.setItem(key, serializedValue);

      console.log(`Stored key: ${key}`);
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  }

  /**
   * Get data from sessionStorage
   * @param key string
   * @returns parsed value or null
   */
  static get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error getting sessionStorage key "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove a specific key from sessionStorage
   * @param key string
   */
  static remove(key: string): void {
    try {
      if (sessionStorage.getItem(key) !== null) {
        sessionStorage.removeItem(key);
        console.log(`Removed key: ${key}`);
      }
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error);
    }
  }

  /**
   * Clear entire sessionStorage
   */
  static clear(): void {
    try {
      sessionStorage.clear();
      console.log('Cleared entire sessionStorage');
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
    }
  }

  /**
   * Check if key exists
   * @param key string
   * @returns boolean
   */
  static has(key: string): boolean {
    return sessionStorage.getItem(key) !== null;
  }
}

export default SessionStorageService;
