/**
 * 🔒 SERVER-SIDE TRANSFER LOCK & TRANSACTION MANAGER
 * Prevents concurrent/duplicate transfers of the same file between cloud providers.
 */

const activeLocks = new Set();
const completedTransactions = new Map();

const getLockKey = (userId, sourceFileId, targetAccountId, targetFolderId = "root") => {
  return `${String(userId)}_${String(sourceFileId)}_${String(targetAccountId)}_${String(targetFolderId)}`;
};

export const acquireTransferLock = (userId, sourceFileId, targetAccountId, targetFolderId = "root") => {
  const key = getLockKey(userId, sourceFileId, targetAccountId, targetFolderId);

  // Block duplicate concurrent execution
  if (activeLocks.has(key)) {
    console.warn(`🔒 Transfer lock DENIED for key: ${key} (Already transferring)`);
    return false;
  }

  // Deduplicate if completed within the last 15 seconds
  const lastCompleted = completedTransactions.get(key);
  if (lastCompleted && Date.now() - lastCompleted < 15000) {
    console.warn(`🔒 Transfer transaction DEDUPLICATED for key: ${key} (Recently completed)`);
    return false;
  }

  activeLocks.add(key);
  console.log(`🔒 Acquired transfer lock for key: ${key}`);
  return true;
};

export const releaseTransferLock = (userId, sourceFileId, targetAccountId, targetFolderId = "root") => {
  const key = getLockKey(userId, sourceFileId, targetAccountId, targetFolderId);
  activeLocks.delete(key);
  completedTransactions.set(key, Date.now());
  console.log(`🔓 Released transfer lock for key: ${key}`);

  setTimeout(() => {
    completedTransactions.delete(key);
  }, 60000);
};

export const isTransferLocked = (userId, sourceFileId, targetAccountId, targetFolderId = "root") => {
  const key = getLockKey(userId, sourceFileId, targetAccountId, targetFolderId);
  return activeLocks.has(key);
};
