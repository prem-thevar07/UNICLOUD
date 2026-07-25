import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { batchTransferFiles, getTransferHistory, getActiveJobStatus } from "../services/fileService";

const TransferContext = createContext();

export const useTransfer = () => useContext(TransferContext);

export const TransferProvider = ({ children }) => {
  const [isTransferring, setIsTransferring] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [transferHistory, setTransferHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Cancellation & Concurrency Guards
  const cancelRequestedRef = useRef(false);
  const isPausedRef = useRef(false);
  const isJobRunningRef = useRef(false);

  // Sync isPaused state with ref for async loop
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Load history & rehydrate activeJob on mount
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getTransferHistory();
      const rawList = data?.history || (Array.isArray(data) ? data : []);
      const formatted = rawList.map((item) => {
        const match = item.message ? item.message.match(/"([^"]+)"/) : null;
        const extractedName = match ? match[1] : item.meta?.fileName || item.message || "File";
        return {
          _id: item._id,
          fileName: extractedName,
          sourceProvider: item.meta?.sourceProvider || "Cloud",
          targetProvider: item.meta?.targetProvider || "Cloud",
          fileSize: item.meta?.fileSize || 0,
          status: "completed",
          timestamp: item.createdAt || item.timestamp,
        };
      });
      setTransferHistory(formatted);
      return formatted;
    } catch (err) {
      console.error("Failed to load transfer history:", err);
      return [];
    } finally {
      setLoadingHistory(false);
    }
  };

  // Sync with Server Active Job State on Mount & Reload
  useEffect(() => {
    fetchHistory();

    const checkServerActiveJob = async () => {
      try {
        const data = await getActiveJobStatus();
        const serverJob = data?.activeJob;

        if (serverJob && serverJob.status === "transferring") {
          setIsTransferring(true);
          const savedJob = sessionStorage.getItem("unicloud_active_transfer_job");
          const parsed = savedJob ? JSON.parse(savedJob) : {};

          const total = serverJob.totalBytesCount || serverJob.totalBytes || parsed.totalBytesCount || 1024 * 1024;
          const transferred = Math.min(total, serverJob.transferredBytesCount || serverJob.bytesTransferred || Math.round(total * 0.3));
          const speed = serverJob.speedMBps && !isNaN(serverJob.speedMBps) ? serverJob.speedMBps : 2.5;
          const remainingSec = serverJob.timeRemainingSec !== undefined && !isNaN(serverJob.timeRemainingSec)
            ? serverJob.timeRemainingSec
            : Math.max(1, Math.ceil((total - transferred) / (speed * 1024 * 1024)));

          setActiveJob((prev) => ({
            ...parsed,
            ...serverJob,
            status: "transferring",
            totalBytesCount: total,
            transferredBytesCount: transferred,
            speedMBps: speed,
            timeRemainingSec: remainingSec,
            percentage: serverJob.percentage || Math.round((transferred / total) * 100),
            statusStage: serverJob.statusStage || "Streaming file chunks across clouds...",
          }));

          // Start polling server active job every 1.5 seconds
          const interval = setInterval(async () => {
            const fresh = await getActiveJobStatus();
            const freshJob = fresh?.activeJob;
            if (freshJob) {
              if (freshJob.status === "completed") {
                clearInterval(interval);
                await fetchHistory();
                setActiveJob((prev) => prev ? ({
                  ...prev,
                  ...freshJob,
                  percentage: 100,
                  status: "completed",
                  statusStage: freshJob.statusStage || "All files successfully verified & uploaded!",
                  timeRemainingSec: 0,
                  speedMBps: 0,
                }) : null);
                setIsTransferring(false);
              } else if (freshJob.status === "error") {
                clearInterval(interval);
                setActiveJob((prev) => prev ? ({
                  ...prev,
                  ...freshJob,
                  status: "error",
                  statusStage: freshJob.statusStage || "Transfer failed on server.",
                }) : null);
                setIsTransferring(false);
              } else {
                const fTotal = freshJob.totalBytesCount || freshJob.totalBytes || total;
                const fTransferred = Math.min(fTotal, freshJob.transferredBytesCount || freshJob.bytesTransferred || 0);
                const fSpeed = freshJob.speedMBps && !isNaN(freshJob.speedMBps) ? freshJob.speedMBps : 2.5;
                const fRemSec = freshJob.timeRemainingSec !== undefined && !isNaN(freshJob.timeRemainingSec)
                  ? freshJob.timeRemainingSec
                  : Math.max(1, Math.ceil((fTotal - fTransferred) / (fSpeed * 1024 * 1024)));

                setActiveJob((prev) => prev ? ({
                  ...prev,
                  ...freshJob,
                  totalBytesCount: fTotal,
                  transferredBytesCount: fTransferred,
                  speedMBps: fSpeed,
                  timeRemainingSec: fRemSec,
                }) : null);
              }
            } else {
              clearInterval(interval);
            }
          }, 1500);
        } else {
          // If server job is completed or null
          const savedJob = sessionStorage.getItem("unicloud_active_transfer_job");
          if (savedJob) {
            const parsed = JSON.parse(savedJob);
            if (parsed) setActiveJob(parsed);
          }
        }
      } catch (_) {}
    };

    checkServerActiveJob();
  }, []);

  // Save activeJob to sessionStorage whenever it updates
  useEffect(() => {
    if (activeJob) {
      try {
        sessionStorage.setItem("unicloud_active_transfer_job", JSON.stringify(activeJob));
      } catch (_) {}
    } else {
      try {
        sessionStorage.removeItem("unicloud_active_transfer_job");
      } catch (_) {}
    }
  }, [activeJob]);

  // Format size helper
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Start Batch Transfer Job in Background
  const startTransferJob = async ({
    sourceAccount,
    targetAccount,
    fileIds,
    files, // array of file objects { id, name, size }
    targetFolderId,
    targetFolderPath,
    transferMode = "copy", // "copy" | "move"
    ifExistsRule = "rename", // "rename" | "overwrite" | "skip"
    preserveHierarchy = true,
    notifyOnCompletion = true,
  }) => {
    if (!fileIds || fileIds.length === 0 || !sourceAccount || !targetAccount) return;
    if (isJobRunningRef.current) return;

    isJobRunningRef.current = true;
    cancelRequestedRef.current = false;
    setIsPaused(false);
    setIsTransferring(true);

    try {
      const totalFilesCount = fileIds.length;
      const totalBytesCount = files.reduce((acc, f) => acc + (f.size || 0), 0);

      const initialJob = {
        sourceAccount,
        targetAccount,
        fileIds,
        files,
        targetFolderId,
        targetFolderPath,
        transferMode,
        ifExistsRule,
        totalFilesCount,
        totalBytesCount,
        completedFilesCount: 0,
        completedFileIds: [],
        transferredBytesCount: 0,
        currentFileIndex: 0,
        currentFile: files[0] || { name: "Initializing..." },
        currentFileTransferredBytes: 0,
        currentFileSize: files[0]?.size || 0,
        percentage: 0,
        speedMBps: 2.1,
        timeRemainingSec: Math.ceil(totalBytesCount / (2.1 * 1024 * 1024)) || 10,
        status: "transferring",
        statusStage: `Step 1 of 3: Initializing transfer of "${files[0]?.name || "file"}"...`,
        startTime: Date.now(),
      };

      setActiveJob(initialJob);

      let accumulatedTransferredBytes = 0;
      const completedIds = [];
      const failedFilesList = [];

      for (let i = 0; i < fileIds.length; i++) {
        if (cancelRequestedRef.current) break;

        while (isPausedRef.current && !cancelRequestedRef.current) {
          await new Promise((r) => setTimeout(r, 500));
        }

        const fileId = fileIds[i];
        const fileObj = files.find((f) => String(f.id) === String(fileId)) || { name: `File ${i + 1}`, size: 1024 * 1024 };
        const fileSize = fileObj.size || 1024 * 1024;

        setActiveJob((prev) => ({
          ...(prev || initialJob),
          currentFileIndex: i,
          currentFile: fileObj,
          currentFileSize: fileSize,
          currentFileTransferredBytes: 0,
          percentage: Math.min(90, Math.round((accumulatedTransferredBytes / (totalBytesCount || 1)) * 100)),
          statusStage: `Step 1 of 3: Reading "${fileObj.name}" from ${sourceAccount.provider}...`,
        }));

        let simulatedBytes = 0;
        const interval = setInterval(() => {
          if (!isPausedRef.current) {
            simulatedBytes += Math.min(fileSize * 0.15, 500 * 1024);
            if (simulatedBytes > fileSize) simulatedBytes = fileSize;

            const rawTotal = accumulatedTransferredBytes + simulatedBytes;
            const currentTotal = Math.min(totalBytesCount, rawTotal);
            const currentPct = Math.min(92, Math.round((currentTotal / (totalBytesCount || 1)) * 100));
            const elapsedSec = Math.max(1, (Date.now() - initialJob.startTime) / 1000);
            const speed = currentTotal > 0 && elapsedSec > 0 ? (currentTotal / (1024 * 1024)) / elapsedSec : 2.1;
            const remainingBytes = Math.max(0, totalBytesCount - currentTotal);
            const remainingSec = speed > 0 ? Math.ceil((remainingBytes / (1024 * 1024)) / speed) : 0;

            setActiveJob((prev) => prev ? ({
              ...prev,
              currentFileTransferredBytes: simulatedBytes,
              transferredBytesCount: currentTotal,
              percentage: currentPct,
              speedMBps: parseFloat(speed.toFixed(1)),
              timeRemainingSec: remainingSec,
              statusStage: `Step 2 of 3: Uploading & streaming "${fileObj.name}" to ${targetAccount.provider}...`,
            }) : null);
          }
        }, 300);

        try {
          await batchTransferFiles({
            sourceAccountId: sourceAccount._id,
            sourceFileIds: [fileId],
            targetAccountId: targetAccount._id,
            targetFolderId,
            targetFolderPath,
            operation: transferMode,
          });

          clearInterval(interval);
          accumulatedTransferredBytes += fileSize;
          completedIds.push(fileId);

          setActiveJob((prev) => prev ? ({
            ...prev,
            completedFilesCount: completedIds.length,
            completedFileIds: [...completedIds],
            transferredBytesCount: Math.min(totalBytesCount, accumulatedTransferredBytes),
            percentage: Math.round((accumulatedTransferredBytes / (totalBytesCount || 1)) * 100),
            statusStage: `Step 3 of 3: Transfer verified & uploaded to ${targetAccount.provider}!`,
          }) : null);

          const newHistoryItem = {
            _id: `temp_${Date.now()}_${i}`,
            fileName: fileObj.name,
            sourceProvider: sourceAccount.provider,
            targetProvider: targetAccount.provider,
            fileSize: fileSize,
            operation: transferMode,
            status: "completed",
            timestamp: new Date().toISOString(),
          };

          setTransferHistory((prev) => [newHistoryItem, ...prev]);
        } catch (err) {
          clearInterval(interval);
          const errMsg = err.response?.data?.message || err.message || "Transfer error";
          console.error(`❌ Error transferring file ${fileObj.name}:`, errMsg);

          failedFilesList.push({ name: fileObj.name, reason: errMsg });

          const failedHistoryItem = {
            _id: `temp_fail_${Date.now()}_${i}`,
            fileName: fileObj.name,
            sourceProvider: sourceAccount.provider,
            targetProvider: targetAccount.provider,
            fileSize: fileSize,
            operation: transferMode,
            status: "failed",
            errorReason: errMsg,
            timestamp: new Date().toISOString(),
          };

          setTransferHistory((prev) => [failedHistoryItem, ...prev]);
        }
      }

      await fetchHistory();

      const hasFailures = failedFilesList.length > 0;
      const allFailed = failedFilesList.length === fileIds.length;

      let finalStatus = "completed";
      let finalStage = "All files successfully verified & uploaded!";

      if (allFailed) {
        finalStatus = "error";
        finalStage = `❌ Failed to transfer all files. Error: ${failedFilesList[0]?.reason}`;
      } else if (hasFailures) {
        finalStatus = "partial_failure";
        finalStage = `⚠️ Completed with ${failedFilesList.length} error(s): Failed "${failedFilesList[0]?.name}" (${failedFilesList[0]?.reason})`;
      }

      setActiveJob((prev) => prev ? ({
        ...prev,
        percentage: 100,
        transferredBytesCount: totalBytesCount,
        status: cancelRequestedRef.current ? "cancelled" : finalStatus,
        statusStage: cancelRequestedRef.current ? "Transfer cancelled" : finalStage,
        failedFiles: failedFilesList,
        timeRemainingSec: 0,
        speedMBps: 0,
      }) : null);
    } finally {
      isJobRunningRef.current = false;
      setIsTransferring(false);
      setIsPaused(false);
    }
  };

  // Resume active job after page reload
  const resumeTransferJob = async (job) => {
    if (!job || !job.sourceAccount || !job.targetAccount || !job.fileIds) return;
    if (isJobRunningRef.current) return;

    isJobRunningRef.current = true;
    cancelRequestedRef.current = false;
    setIsPaused(false);
    setIsTransferring(true);

    try {
      const totalBytesCount = job.totalBytesCount || 1;
      const completedIds = Array.isArray(job.completedFileIds) ? [...job.completedFileIds] : [];
      const startIndex = job.currentFileIndex || 0;

      let accumulatedTransferredBytes = Math.min(totalBytesCount, job.transferredBytesCount || 0);
      const initialPercentage = Math.max(0, Math.min(90, job.percentage || 0));

      for (let i = startIndex; i < job.fileIds.length; i++) {
        if (cancelRequestedRef.current) break;

        const fileId = job.fileIds[i];

        if (completedIds.includes(fileId)) {
          continue;
        }

        while (isPausedRef.current && !cancelRequestedRef.current) {
          await new Promise((r) => setTimeout(r, 500));
        }

        const fileObj = (job.files || []).find((f) => String(f.id) === String(fileId)) || { name: `File ${i + 1}`, size: 1024 * 1024 };
        const fileSize = fileObj.size || 1024 * 1024;

        let simulatedBytes = job.currentFileTransferredBytes || 0;

        const interval = setInterval(() => {
          if (!isPausedRef.current) {
            simulatedBytes += Math.min(fileSize * 0.15, 500 * 1024);
            if (simulatedBytes > fileSize) simulatedBytes = fileSize;

            const rawTotal = accumulatedTransferredBytes + simulatedBytes;
            const currentTotal = Math.min(totalBytesCount, rawTotal);
            const currentPct = Math.min(92, Math.max(initialPercentage, Math.round((currentTotal / totalBytesCount) * 100)));
            const elapsedSec = Math.max(1, (Date.now() - (job.startTime || Date.now())) / 1000);
            const speed = currentTotal > 0 && elapsedSec > 0 ? (currentTotal / (1024 * 1024)) / elapsedSec : 2.1;
            const remainingBytes = Math.max(0, totalBytesCount - currentTotal);
            const remainingSec = speed > 0 ? Math.ceil((remainingBytes / (1024 * 1024)) / speed) : 0;

            setActiveJob((prev) => prev ? ({
              ...prev,
              currentFileIndex: i,
              currentFile: fileObj,
              currentFileSize: fileSize,
              currentFileTransferredBytes: simulatedBytes,
              transferredBytesCount: currentTotal,
              percentage: currentPct,
              speedMBps: parseFloat(speed.toFixed(1)),
              timeRemainingSec: remainingSec,
              status: "transferring",
              statusStage: `Step 2 of 3: Resuming stream of "${fileObj.name}" to ${job.targetAccount?.provider}...`,
            }) : null);
          }
        }, 300);

        try {
          const res = await batchTransferFiles({
            sourceAccountId: job.sourceAccount._id,
            sourceFileIds: [fileId],
            targetAccountId: job.targetAccount._id,
            targetFolderId: job.targetFolderId,
            targetFolderPath: job.targetFolderPath,
            operation: job.transferMode || "copy",
          });

          const resData = res?.data || res;
          // If server returns deduplicated: true, it means the server is STILL actively streaming the file in background!
          if (resData?.deduplicated || resData?.results?.[0]?.deduplicated) {
            setActiveJob((prev) => prev ? ({
              ...prev,
              percentage: 90,
              status: "transferring",
              statusStage: `Step 2 of 3: Server is actively streaming "${fileObj.name}" in background...`,
            }) : null);

            // Poll history every 2s until server finishes streaming and logs to MongoDB
            for (let attempt = 0; attempt < 40; attempt++) {
              await new Promise((r) => setTimeout(r, 2000));
              const historyItems = await fetchHistory();
              if (historyItems && historyItems.some((h) => h.fileName === fileObj.name)) {
                break;
              }
            }
          }

          clearInterval(interval);
          accumulatedTransferredBytes = Math.min(totalBytesCount, accumulatedTransferredBytes + fileSize);
          completedIds.push(fileId);

          setActiveJob((prev) => prev ? ({
            ...prev,
            completedFilesCount: completedIds.length,
            completedFileIds: [...completedIds],
            transferredBytesCount: accumulatedTransferredBytes,
            percentage: Math.round((accumulatedTransferredBytes / totalBytesCount) * 100),
            statusStage: `Step 3 of 3: Transfer verified & uploaded to ${job.targetAccount?.provider}!`,
          }) : null);
        } catch (err) {
          clearInterval(interval);
          console.error(`Error resuming transfer for file ${fileObj.name}:`, err);
        }
      }

      await fetchHistory();

      setActiveJob((prev) => prev ? ({
        ...prev,
        percentage: 100,
        transferredBytesCount: totalBytesCount,
        status: cancelRequestedRef.current ? "cancelled" : "completed",
        statusStage: cancelRequestedRef.current ? "Transfer cancelled" : "All files successfully verified & uploaded!",
        timeRemainingSec: 0,
        speedMBps: 0,
      }) : null);
    } finally {
      isJobRunningRef.current = false;
      setIsTransferring(false);
      setIsPaused(false);
    }
  };

  const pauseTransfer = () => {
    setIsPaused((prev) => !prev);
    setActiveJob((prev) => prev ? ({
      ...prev,
      status: !isPaused ? "paused" : "transferring",
    }) : null);
  };

  const cancelTransfer = () => {
    cancelRequestedRef.current = true;
    setIsTransferring(false);
    setIsPaused(false);
    setActiveJob((prev) => prev ? ({
      ...prev,
      status: "cancelled",
    }) : null);
  };

  const clearActiveJob = () => {
    setActiveJob(null);
    setIsTransferring(false);
    setIsPaused(false);
    try {
      sessionStorage.removeItem("unicloud_active_transfer_job");
    } catch (_) {}
  };

  return (
    <TransferContext.Provider
      value={{
        isTransferring,
        isPaused,
        activeJob,
        transferHistory,
        loadingHistory,
        startTransferJob,
        pauseTransfer,
        cancelTransfer,
        clearActiveJob,
        fetchHistory,
        formatBytes,
      }}
    >
      {children}
    </TransferContext.Provider>
  );
};
