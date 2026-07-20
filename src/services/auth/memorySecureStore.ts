/**
 * Better Auth / app storage that works without native SecureStore.
 * Implements both sync and async APIs used by @better-auth/expo.
 */
const memory = new Map();

export const memorySecureStore = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },

  async setItem(key, value) {
    memory.set(key, String(value));
  },

  async getItemAsync(key) {
    return memorySecureStore.getItem(key);
  },

  async setItemAsync(key, value) {
    await memorySecureStore.setItem(key, value);
  },

  async deleteItemAsync(key) {
    memory.delete(key);
  },

  deleteItem(key) {
    memory.delete(key);
  },
};
