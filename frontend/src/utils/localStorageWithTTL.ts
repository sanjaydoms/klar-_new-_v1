/**
 * Wrapper around localStorage to add TTL (Time-To-Live) support for security.
 */

export const setItemWithTTL = (key: string, value: any, ttlMs: number) => {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + ttlMs,
  };
  localStorage.setItem(key, JSON.stringify(item));
};

export const getItemWithTTL = (key: string) => {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    const now = new Date();

    // If the item doesn't have an expiry, just return the value (or null if you want strictly TTL items)
    if (!item.expiry) return item;

    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch (e) {
    // Fallback if parsing fails or if it's not a TTL-wrapped item
    return itemStr;
  }
};

export const removeItem = (key: string) => {
  localStorage.removeItem(key);
};
