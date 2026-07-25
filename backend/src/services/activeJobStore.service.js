/**
 * 🛰️ SERVER-SIDE ACTIVE TRANSFER JOB STORE
 * Single Source of Truth for active cross-cloud file transfers per user.
 */

const userActiveJobs = new Map();

export const setServerActiveJob = (userId, jobData) => {
  const existing = userActiveJobs.get(String(userId)) || {};
  userActiveJobs.set(String(userId), {
    ...existing,
    ...jobData,
    updatedAt: Date.now(),
  });
};

export const getServerActiveJob = (userId) => {
  return userActiveJobs.get(String(userId)) || null;
};

export const clearServerActiveJob = (userId) => {
  userActiveJobs.delete(String(userId));
};
