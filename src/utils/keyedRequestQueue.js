export const createKeyedRequestQueue = (saveRequest) => {
  const pendingSaves = new Map();

  return {
    save(key, ...args) {
      const previousSave = pendingSaves.get(key) || Promise.resolve();
      const request = previousSave.then(() => saveRequest(...args));
      let settledRequest;
      settledRequest = request
        .catch(() => {})
        .finally(() => {
          if (pendingSaves.get(key) === settledRequest) {
            pendingSaves.delete(key);
          }
        });
      pendingSaves.set(key, settledRequest);
      return request;
    },
    async flush() {
      while (pendingSaves.size > 0) {
        await Promise.all(pendingSaves.values());
      }
    },
  };
};
