import React, { useEffect, useState, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { getAccounts, getExplorerContents, createFolder } from "../services/fileService";
import { useTransfer } from "../context/TransferContext";
import "../styles/transfer.css";

const providerNames = {
  google: "Google Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
  s3: "Amazon S3",
  box: "Box",
};

const providerIcons = {
  google: "https://cdn-icons-png.flaticon.com/512/2965/2965306.png",
  dropbox: "https://cdn-icons-png.flaticon.com/512/174/174845.png",
  onedrive: "https://cdn-icons-png.flaticon.com/512/732/732224.png",
  s3: "https://cdn-icons-png.flaticon.com/512/888/888837.png",
  box: "https://cdn-icons-png.flaticon.com/512/5968/5968853.png",
};

const getFileIcon = (fileName, isFolder) => {
  if (isFolder) return "📁";
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (["fig", "figma"].includes(ext)) return "🎨";
  if (["svg", "png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼️";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "🎬";
  if (["pdf", "doc", "docx"].includes(ext)) return "📄";
  if (["zip", "tar", "gz", "7z"].includes(ext)) return "📦";
  return "📄";
};

const getRootLabel = (provider) => {
  switch (provider) {
    case "box": return "Box Root";
    case "dropbox": return "Dropbox Root";
    case "s3": return "Bucket Root";
    case "onedrive": return "OneDrive Root";
    default: return "My Drive";
  }
};

const Transfer = () => {
  const {
    isTransferring,
    isPaused,
    activeJob,
    transferHistory,
    startTransferJob,
    pauseTransfer,
    cancelTransfer,
    clearActiveJob,
    formatBytes,
  } = useTransfer();

  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Source Pane State
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [sourceBreadcrumbs, setSourceBreadcrumbs] = useState([{ id: "root", name: "My Drive", path: "/" }]);
  const [sourceSubfolders, setSourceSubfolders] = useState([]);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Target Pane State
  const [targetAccountId, setTargetAccountId] = useState("");
  const [targetBreadcrumbs, setTargetBreadcrumbs] = useState([{ id: "root", name: "My Drive", path: "/" }]);
  const [targetSubfolders, setTargetSubfolders] = useState([]);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [targetSearch, setTargetSearch] = useState("");

  // Transfer Settings
  const [ifExistsRule, setIfExistsRule] = useState("rename"); // "rename" | "overwrite" | "skip"
  const [transferMode, setTransferMode] = useState("copy"); // "copy" | "move"
  const [preserveHierarchy, setPreserveHierarchy] = useState(true);
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(true);

  // Modals
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showTransferGuide, setShowTransferGuide] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Mobile View Tab State ("source" | "destination" | "progress")
  const [mobileTab, setMobileTab] = useState("source");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Mount Effect
  useEffect(() => {
    const fetchAccountsData = async () => {
      try {
        setLoadingAccounts(true);
        const data = await getAccounts();
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data);
          const firstId = String(data[0]._id);
          setSourceAccountId(firstId);
          const srcLabel = getRootLabel(data[0].provider);
          setSourceBreadcrumbs([{ id: "root", name: srcLabel, path: "/" }]);

          const tgtAcc = data.length > 1 ? data[1] : data[0];
          const tgtId = String(tgtAcc._id);
          setTargetAccountId(tgtId);
          const tgtLabel = getRootLabel(tgtAcc.provider);
          setTargetBreadcrumbs([{ id: "root", name: tgtLabel, path: "/" }]);

          // 🔥 Immediately trigger initial explorer load with resolved IDs!
          loadSourceExplorer(firstId, "root", "/");
          loadTargetExplorer(tgtId, "root", "/");
        }
      } catch (err) {
        console.error("Failed to load accounts:", err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccountsData();
  }, []);

  // Current accounts
  const sourceAccount = useMemo(() => accounts.find((a) => String(a._id) === String(sourceAccountId)), [accounts, sourceAccountId]);
  const targetAccount = useMemo(() => accounts.find((a) => String(a._id) === String(targetAccountId)), [accounts, targetAccountId]);

  // Current paths
  const currentSourceFolderPath = useMemo(() => {
    if (sourceBreadcrumbs.length <= 1) return "/";
    return "/" + sourceBreadcrumbs.slice(1).map((b) => b.name).join("/");
  }, [sourceBreadcrumbs]);

  const currentTargetFolderPath = useMemo(() => {
    if (targetBreadcrumbs.length <= 1) return "/";
    return "/" + targetBreadcrumbs.slice(1).map((b) => b.name).join("/");
  }, [targetBreadcrumbs]);

  // Load Source Explorer
  const loadSourceExplorer = async (accId, folderId = "root", pathStr = "/") => {
    if (!accId || accId === "undefined" || accId === "null" || accId === "") return;
    try {
      setLoadingSource(true);
      const res = await getExplorerContents({ accountId: accId, folderId, folderPath: pathStr });
      setSourceSubfolders(res?.subfolders || []);
      setSourceFiles(res?.files || []);
    } catch (err) {
      console.error("Failed to load source explorer:", err);
      showToast("Failed to load source files.");
    } finally {
      setLoadingSource(false);
    }
  };

  // Load Target Explorer
  const loadTargetExplorer = async (accId, folderId = "root", pathStr = "/") => {
    if (!accId || accId === "undefined" || accId === "null" || accId === "") return;
    try {
      setLoadingTarget(true);
      const res = await getExplorerContents({ accountId: accId, folderId, folderPath: pathStr });
      setTargetSubfolders(res?.subfolders || []);
    } catch (err) {
      console.error("Failed to load target explorer:", err);
    } finally {
      setLoadingTarget(false);
    }
  };

  useEffect(() => {
    if (sourceAccountId && sourceAccountId !== "undefined" && sourceAccountId !== "null") {
      const currentFolder = sourceBreadcrumbs[sourceBreadcrumbs.length - 1];
      loadSourceExplorer(sourceAccountId, currentFolder.id, currentSourceFolderPath);
    }
  }, [sourceAccountId, sourceBreadcrumbs]);

  useEffect(() => {
    if (targetAccountId && targetAccountId !== "undefined" && targetAccountId !== "null") {
      const currentFolder = targetBreadcrumbs[targetBreadcrumbs.length - 1];
      loadTargetExplorer(targetAccountId, currentFolder.id, currentTargetFolderPath);
    }
  }, [targetAccountId, targetBreadcrumbs]);

  // Source Account Change
  const handleSourceAccountChange = (accId) => {
    setSourceAccountId(accId);
    setSelectedFileIds([]);
    const acc = accounts.find((a) => String(a._id) === String(accId));
    const label = acc ? getRootLabel(acc.provider) : "My Drive";
    setSourceBreadcrumbs([{ id: "root", name: label, path: "/" }]);
    loadSourceExplorer(accId, "root", "/");
  };

  // Target Account Change
  const handleTargetAccountChange = (accId) => {
    setTargetAccountId(accId);
    const acc = accounts.find((a) => String(a._id) === String(accId));
    const label = acc ? getRootLabel(acc.provider) : "My Drive";
    setTargetBreadcrumbs([{ id: "root", name: label, path: "/" }]);
    loadTargetExplorer(accId, "root", "/");
  };

  // Filtered lists
  const filteredSourceSubfolders = useMemo(() => {
    if (!sourceSearch.trim()) return sourceSubfolders;
    return sourceSubfolders.filter((f) => f.name.toLowerCase().includes(sourceSearch.toLowerCase()));
  }, [sourceSubfolders, sourceSearch]);

  const filteredSourceFiles = useMemo(() => {
    if (!sourceSearch.trim()) return sourceFiles;
    return sourceFiles.filter((f) => f.name.toLowerCase().includes(sourceSearch.toLowerCase()));
  }, [sourceFiles, sourceSearch]);

  const filteredTargetSubfolders = useMemo(() => {
    if (!targetSearch.trim()) return targetSubfolders;
    return targetSubfolders.filter((f) => f.name.toLowerCase().includes(targetSearch.toLowerCase()));
  }, [targetSubfolders, targetSearch]);

  // Selection calculations
  const selectedFiles = useMemo(() => {
    return sourceFiles.filter((f) => selectedFileIds.includes(f.id));
  }, [sourceFiles, selectedFileIds]);

  const selectedTotalBytes = useMemo(() => {
    return selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [selectedFiles]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFileIds(filteredSourceFiles.map((f) => f.id));
    } else {
      setSelectedFileIds([]);
    }
  };

  const handleToggleFile = (fileId) => {
    setSelectedFileIds((prev) => (prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]));
  };

  // Breadcrumbs navigation
  const handleOpenSourceSubfolder = (folder) => {
    setSourceBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name, path: folder.path || `/${folder.name}` }]);
  };

  const handleSourceBreadcrumbClick = (index) => {
    setSourceBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleOpenTargetSubfolder = (folder) => {
    setTargetBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name, path: folder.path || `/${folder.name}` }]);
  };

  const handleTargetBreadcrumbClick = (index) => {
    setTargetBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  // Create Folder Handler
  const handleCreateTargetFolder = async (e) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim() || !targetAccountId) return;

    setIsCreatingFolder(true);
    const currentTargetFolder = targetBreadcrumbs[targetBreadcrumbs.length - 1];
    const parentFolderId = currentTargetFolder ? currentTargetFolder.id : "root";

    try {
      const res = await createFolder({
        accountId: targetAccountId,
        folderName: newFolderName.trim(),
        parentFolderId,
        parentFolderPath: currentTargetFolderPath,
      });

      const fName = newFolderName.trim();
      showToast(`Created folder "${fName}" in ${targetAccount?.provider || "target drive"}!`);
      setNewFolderName("");
      setShowNewFolderModal(false);

      const created = res.folder;
      if (created) {
        handleOpenTargetSubfolder({
          id: created.id,
          name: created.name,
          path: created.path || `/${created.name}`,
        });
      } else {
        loadTargetExplorer(targetAccountId, parentFolderId, currentTargetFolderPath);
      }
    } catch (err) {
      console.error("Create folder error:", err);
      showToast(err.response?.data?.error || err.message || "Failed to create folder.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Start Transfer Handler
  const handleStartTransfer = () => {
    if (selectedFileIds.length === 0 || !sourceAccount || !targetAccount) return;

    const currentTargetFolder = targetBreadcrumbs[targetBreadcrumbs.length - 1];
    const targetFolderId = currentTargetFolder ? currentTargetFolder.id : "root";

    startTransferJob({
      sourceAccount,
      targetAccount,
      fileIds: selectedFileIds,
      files: selectedFiles,
      targetFolderId,
      targetFolderPath: currentTargetFolderPath,
      transferMode,
      ifExistsRule,
      preserveHierarchy,
      notifyOnCompletion,
    });

    setMobileTab("progress");
    showToast(`Started background ${transferMode.toUpperCase()} transfer of ${selectedFileIds.length} item(s)!`);
  };

  return (
    <MainLayout>
      <div className="transfer-page-container">
        {/* TOAST ALERTS */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              top: "80px",
              right: "24px",
              zIndex: 99999,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: "12px",
              fontWeight: "600",
              boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)",
              fontSize: "0.9rem",
            }}
          >
            🔔 {toastMessage}
          </div>
        )}

        {/* TOP HEADER ROW */}
        <div className="transfer-header-row">
          <div className="transfer-header-title-box">
            <div className="transfer-header-icon-badge">🚚</div>
            <div>
              <h1>Transfer Files</h1>
              <p>Move your files seamlessly between cloud storage accounts</p>
            </div>
          </div>

          <div className="transfer-header-actions">
            <button className="btn-header-action" onClick={() => setShowHowItWorks(true)}>
              <span>❓</span> How it works
            </button>
            <button className="btn-header-action" onClick={() => setShowTransferGuide(true)}>
              <span>📖</span> Transfer Guide
            </button>
          </div>
        </div>

        {/* MOBILE SEGMENTED TAB SWITCHER (< 768px Only) */}
        <div className="mobile-transfer-tab-bar">
          <button
            className={`mobile-tab-btn ${mobileTab === "source" ? "active" : ""}`}
            onClick={() => setMobileTab("source")}
          >
            <span>📦 1. Source</span>
            {selectedFileIds.length > 0 && <span className="mobile-tab-count-badge">{selectedFileIds.length}</span>}
          </button>
          <button
            className={`mobile-tab-btn ${mobileTab === "destination" ? "active" : ""}`}
            onClick={() => setMobileTab("destination")}
          >
            <span>🎯 2. Target</span>
          </button>
          <button
            className={`mobile-tab-btn ${mobileTab === "progress" ? "active" : ""}`}
            onClick={() => setMobileTab("progress")}
          >
            <span>📊 3. Activity</span>
            {isTransferring && <span className="mobile-tab-dot-badge" />}
          </button>
        </div>

        {/* MAIN SPLIT EXPLORER PANES ROW */}
        <div className={`transfer-explorers-grid mobile-active-tab-${mobileTab}`}>
          {/* SOURCE EXPLORER PANE */}
          <div className="explorer-pane-card">
            <div className="pane-top-bar">
              <div>
                <div className="pane-badge-title">SOURCE</div>
                <div className="pane-subtext">Select files and folder to transfer</div>
              </div>

              {/* Source Account Pill Dropdown */}
              <select
                className="account-selector-pill"
                value={sourceAccountId}
                onChange={(e) => handleSourceAccountChange(e.target.value)}
                disabled={isTransferring}
              >
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {providerNames[acc.provider] || acc.provider} — {acc.email || "Connected"}
                  </option>
                ))}
              </select>
            </div>

            {/* Breadcrumb Trail */}
            <div className="explorer-breadcrumbs-track">
              {sourceBreadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id + idx}>
                  <span
                    className={`breadcrumb-crumb-item ${idx === sourceBreadcrumbs.length - 1 ? "active" : ""}`}
                    onClick={() => handleSourceBreadcrumbClick(idx)}
                  >
                    {crumb.name}
                  </span>
                  {idx < sourceBreadcrumbs.length - 1 && <span className="breadcrumb-arrow">❯</span>}
                </React.Fragment>
              ))}
            </div>

            {/* Toolbar */}
            <div className="explorer-toolbar-row">
              <div className="selection-pill-badge">
                Selected: {selectedFileIds.length} items ({formatBytes(selectedTotalBytes)})
              </div>

              <div className="explorer-toolbar-actions">
                <button
                  className="btn-icon-square"
                  onClick={() => {
                    const folder = sourceBreadcrumbs[sourceBreadcrumbs.length - 1];
                    loadSourceExplorer(sourceAccountId, folder.id, currentSourceFolderPath);
                  }}
                  title="Refresh Source"
                >
                  🔄
                </button>
                <input
                  type="text"
                  className="explorer-search-input"
                  placeholder="Search files..."
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table List */}
            <div className="explorer-table-container">
              {loadingSource ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                  <div className="skeleton-spinner" style={{ margin: "0 auto 0.8rem auto" }} />
                  Loading source contents...
                </div>
              ) : (
                <table className="explorer-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: "36px" }}>
                        <input
                          type="checkbox"
                          checked={filteredSourceFiles.length > 0 && selectedFileIds.length === filteredSourceFiles.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Name</th>
                      <th style={{ width: "90px" }}>Size</th>
                      <th style={{ width: "100px" }}>Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Subfolders */}
                    {filteredSourceSubfolders.map((folder) => (
                      <tr
                        key={folder.id}
                        className="item-row"
                        onClick={() => handleOpenSourceSubfolder(folder)}
                        title={`Open folder ${folder.name}`}
                      >
                        <td style={{ textAlign: "center" }}>📁</td>
                        <td>
                          <div className="item-name-cell">
                            <span className="item-type-icon">📁</span>
                            <span style={{ color: "#a5b4fc", fontWeight: "600" }}>{folder.name}</span>
                          </div>
                        </td>
                        <td style={{ color: "#64748b" }}>—</td>
                        <td style={{ color: "#94a3b8" }}>Folder</td>
                      </tr>
                    ))}

                    {/* Files */}
                    {filteredSourceFiles.map((file) => {
                      const isSelected = selectedFileIds.includes(file.id);
                      return (
                        <tr
                          key={file.id}
                          className={`item-row ${isSelected ? "selected" : ""}`}
                          onClick={() => handleToggleFile(file.id)}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                            />
                          </td>
                          <td>
                            <div className="item-name-cell">
                              <span className="item-type-icon">{getFileIcon(file.name, false)}</span>
                              <span>{file.name}</span>
                            </div>
                          </td>
                          <td style={{ color: "#a5b4fc" }}>{formatBytes(file.size)}</td>
                          <td style={{ color: "#94a3b8" }}>
                            {file.createdAt ? new Date(file.createdAt).toLocaleDateString("en-GB") : "Unknown"}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredSourceSubfolders.length === 0 && filteredSourceFiles.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                          No files or subfolders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* CENTER CONNECTIVE ARROW */}
          <div className="center-arrow-container">
            <div className="center-arrow-btn" title="Transfer Direction: Source to Destination">
              ➔
            </div>
          </div>

          {/* DESTINATION EXPLORER PANE */}
          <div className="explorer-pane-card">
            <div className="pane-top-bar">
              <div>
                <div className="pane-badge-title dest">DESTINATION</div>
                <div className="pane-subtext">Select destination folder</div>
              </div>

              {/* Target Account Pill Dropdown */}
              <select
                className="account-selector-pill"
                value={targetAccountId}
                onChange={(e) => handleTargetAccountChange(e.target.value)}
                disabled={isTransferring}
              >
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {providerNames[acc.provider] || acc.provider} — {acc.email || "Connected"}
                  </option>
                ))}
              </select>
            </div>

            {/* Breadcrumb Trail */}
            <div className="explorer-breadcrumbs-track">
              {targetBreadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id + idx}>
                  <span
                    className={`breadcrumb-crumb-item ${idx === targetBreadcrumbs.length - 1 ? "active" : ""}`}
                    onClick={() => handleTargetBreadcrumbClick(idx)}
                  >
                    {crumb.name}
                  </span>
                  {idx < targetBreadcrumbs.length - 1 && <span className="breadcrumb-arrow">❯</span>}
                </React.Fragment>
              ))}
            </div>

            {/* Toolbar */}
            <div className="explorer-toolbar-row">
              <button
                className="btn-header-action"
                style={{ padding: "5px 12px", fontSize: "0.8rem", background: "rgba(168, 85, 247, 0.2)", borderColor: "rgba(168, 85, 247, 0.4)", color: "#e9d5ff" }}
                onClick={() => setShowNewFolderModal(true)}
              >
                📁 + New Folder
              </button>

              <div className="explorer-toolbar-actions">
                <button
                  className="btn-icon-square"
                  onClick={() => {
                    const folder = targetBreadcrumbs[targetBreadcrumbs.length - 1];
                    loadTargetExplorer(targetAccountId, folder.id, currentTargetFolderPath);
                  }}
                  title="Refresh Target"
                >
                  🔄
                </button>
                <input
                  type="text"
                  className="explorer-search-input"
                  placeholder="Search in this folder..."
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Subfolder Grid Table */}
            <div className="explorer-table-container">
              {loadingTarget ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                  <div className="skeleton-spinner" style={{ margin: "0 auto 0.8rem auto" }} />
                  Loading destination subfolders...
                </div>
              ) : (
                <table className="explorer-items-table">
                  <thead>
                    <tr>
                      <th>Folder Name</th>
                      <th style={{ width: "90px" }}>Size</th>
                      <th style={{ width: "100px" }}>Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTargetSubfolders.map((folder) => (
                      <tr
                        key={folder.id}
                        className="item-row"
                        onClick={() => handleOpenTargetSubfolder(folder)}
                      >
                        <td>
                          <div className="item-name-cell">
                            <span className="item-type-icon">📁</span>
                            <span>{folder.name}</span>
                          </div>
                        </td>
                        <td style={{ color: "#64748b" }}>—</td>
                        <td style={{ color: "#94a3b8" }}>Folder</td>
                      </tr>
                    ))}

                    {filteredTargetSubfolders.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#94a3b8" }}>
                          ✓ Files will be saved into <strong style={{ color: "#c084fc" }}>"{currentTargetFolderPath}"</strong>.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* TRANSFER SETTINGS PANEL */}
        <div className="transfer-settings-card">
          <div className="settings-left-group">
            <div className="settings-section-title">
              ⚙️ Transfer Settings
            </div>

            <div className="settings-options-row">
              <div className="setting-field-group">
                <span>If file exists:</span>
                <select
                  className="setting-select-dropdown"
                  value={ifExistsRule}
                  onChange={(e) => setIfExistsRule(e.target.value)}
                >
                  <option value="rename">Rename (Keep Both)</option>
                  <option value="overwrite">Overwrite Target</option>
                  <option value="skip">Skip Existing</option>
                </select>
              </div>

              <div className="setting-field-group">
                <span>Transfer Mode:</span>
                <select
                  className="setting-select-dropdown"
                  value={transferMode}
                  onChange={(e) => setTransferMode(e.target.value)}
                >
                  <option value="copy">Copy Files</option>
                  <option value="move">Move Files (Delete Source)</option>
                </select>
              </div>

              <label className="setting-checkbox-label">
                <input
                  type="checkbox"
                  checked={preserveHierarchy}
                  onChange={(e) => setPreserveHierarchy(e.target.checked)}
                />
                <span>Preserve hierarchy</span>
              </label>

              <label className="setting-checkbox-label">
                <input
                  type="checkbox"
                  checked={notifyOnCompletion}
                  onChange={(e) => setNotifyOnCompletion(e.target.checked)}
                />
                <span>Notify on completion</span>
              </label>
            </div>
          </div>

          <div className="settings-action-right">
            <div className="ready-status-text">
              Ready to Transfer
              <strong>{selectedFileIds.length} items ({formatBytes(selectedTotalBytes)})</strong>
            </div>

            <button
              className="btn-start-transfer-big"
              onClick={handleStartTransfer}
              disabled={isTransferring || selectedFileIds.length === 0 || !sourceAccountId || !targetAccountId}
            >
              {isTransferring ? "Transferring..." : "Start Transfer ➔"}
            </button>
          </div>
        </div>

        {/* BOTTOM ROW: PROGRESS & ACTIVITY */}
        <div className={`transfer-bottom-grid mobile-active-tab-${mobileTab}`}>
          {/* TRANSFER PROGRESS CARD (LEFT) */}
          <div className="transfer-progress-card">
            <div className="progress-header-title">
              📊 Live Transfer Progress
            </div>

            {activeJob ? (
              <>
                <div className="progress-active-file-row">
                  <div className="active-file-info">
                    <div className="active-file-icon">
                      {getFileIcon(activeJob.currentFile?.name, false)}
                    </div>
                    <div className="active-file-meta">
                      <h4>{activeJob.currentFile?.name || "Processing File..."}</h4>
                      <p>{formatBytes(activeJob.currentFileSize)}</p>

                      <div className="active-file-paths">
                        <div>From: {activeJob.sourceAccount?.provider} ({currentSourceFolderPath})</div>
                        <div>To: {activeJob.targetAccount?.provider} ({currentTargetFolderPath})</div>
                        <div style={{ marginTop: "6px", color: activeJob.status === "completed" ? "#10b981" : "#60a5fa", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                          <span>{activeJob.status === "completed" ? "✅" : "⚙️"}</span>
                          <span>{activeJob.statusStage || (activeJob.status === "completed" ? "Verified & Uploaded to target cloud" : "Streaming file chunks across clouds...")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="progress-big-percentage">
                    <div className="big-percentage-num">{activeJob.percentage}%</div>
                    <div className="progress-speed-text">{activeJob.speedMBps} MB/s</div>
                  </div>
                </div>

                <div className="progress-bar-track-big">
                  <div className="progress-bar-fill-big" style={{ width: `${activeJob.percentage}%` }} />
                </div>

                <div className="progress-bottom-meta-row">
                  <div className="progress-metrics-text">
                    Transferred: {formatBytes(activeJob.transferredBytesCount)} / {formatBytes(activeJob.totalBytesCount)}
                    <span>Time remaining: {Math.floor(activeJob.timeRemainingSec / 60).toString().padStart(2, '0')}:{(activeJob.timeRemainingSec % 60).toString().padStart(2, '0')}</span>
                  </div>

                  <div className="progress-control-btns">
                    {activeJob.percentage >= 100 || activeJob.status === "completed" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            background: "rgba(34, 197, 94, 0.15)",
                            color: "#4ade80",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          ✓ Completed!
                        </span>
                        <button className="btn-ctrl-action" onClick={clearActiveJob}>
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <>
                        <button className="btn-ctrl-action" onClick={pauseTransfer}>
                          {isPaused ? "▶ Resume" : "⏸ Pause"}
                        </button>
                        <button className="btn-ctrl-action" style={{ color: "#fca5a5", borderColor: "rgba(239, 68, 68, 0.3)" }} onClick={cancelTransfer}>
                          ✖ Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📦</div>
                No active transfer. Select files from the left pane and click <strong style={{ color: "#a5b4fc" }}>"Start Transfer"</strong> to begin.
              </div>
            )}
          </div>

          {/* TRANSFER ACTIVITY CARD (RIGHT) */}
          <div className="transfer-activity-card">
            <div className="activity-header-row">
              <h3>📋 Transfer Activity</h3>
              <button
                className="btn-header-action"
                style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                onClick={() => setShowTransferGuide(true)}
              >
                View All
              </button>
            </div>

            <div className="activity-list-container">
              {transferHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                  No recent transfer logs yet.
                </div>
              ) : (
                transferHistory.slice(0, 5).map((item, idx) => (
                  <div key={item._id || idx} className="activity-item-row">
                    <div className="activity-item-left">
                      <span className="activity-check-icon" style={item.status === "failed" ? { color: "#ef4444" } : {}}>
                        {item.status === "failed" ? "❌" : "✓"}
                      </span>
                      <div>
                        <div className="activity-file-name">{item.fileName}</div>
                        <div className="activity-file-route">
                          {item.sourceProvider || "Cloud"} ➔ {item.targetProvider || "Cloud"}
                          {item.errorReason && <span style={{ color: "#ef4444", marginLeft: "6px" }}>({item.errorReason})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="activity-item-right">
                      <span style={{ color: "#a5b4fc" }}>{formatBytes(item.fileSize)}</span>
                      <span
                        className="status-badge-completed"
                        style={item.status === "failed" ? { background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" } : {}}
                      >
                        {item.status === "failed" ? "Failed" : "Completed"}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* FOOTER TIP */}
        <div className="transfer-footer-tip">
          💡 Tip: You can close or navigate away from this page, we'll process the transfer in the background and notify you when complete.
        </div>

        {/* MOBILE STICKY FLOATING ACTION BAR (< 768px Only) */}
        <div className="mobile-sticky-action-bar">
          <div className="mobile-action-summary">
            <div className="mobile-summary-title">
              {selectedFileIds.length > 0 ? `${selectedFileIds.length} items selected` : "No items selected"}
            </div>
            <div className="mobile-summary-sub">
              {selectedFileIds.length > 0 ? formatBytes(selectedTotalBytes) : "Select files from Source"}
            </div>
          </div>

          {isTransferring ? (
            <button
              className="mobile-btn-primary"
              onClick={() => setMobileTab("progress")}
              style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
            >
              📊 View Progress ({activeJob?.percentage || 0}%)
            </button>
          ) : (
            <button
              className="mobile-btn-primary"
              onClick={handleStartTransfer}
              disabled={selectedFileIds.length === 0 || !sourceAccountId || !targetAccountId}
            >
              🚀 Start Transfer ➔
            </button>
          )}
        </div>

        {/* MODAL 1: HOW IT WORKS */}
        {showHowItWorks && (
          <div className="modal-overlay-backdrop" onClick={() => setShowHowItWorks(false)}>
            <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem", color: "#f8fafc" }}>❓ How Cross-Cloud Migration Works</h3>
              <p style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                1. <strong>Select Source:</strong> Pick your source cloud account and choose files or subfolders to transfer.<br />
                2. <strong>Select Destination:</strong> Pick target cloud account and navigate into the target folder (or click "+ New Folder").<br />
                3. <strong>Configure Settings:</strong> Choose file collision rules (Rename/Overwrite/Skip) and mode (Copy/Move).<br />
                4. <strong>Start Transfer:</strong> Click "Start Transfer". UniCloud streams binary files directly between cloud providers with automatic 401 OAuth token refresh and non-corrupt verification.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button className="btn-start-transfer-big" style={{ padding: "8px 20px", fontSize: "0.85rem" }} onClick={() => setShowHowItWorks(false)}>
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: TRANSFER GUIDE */}
        {showTransferGuide && (
          <div className="modal-overlay-backdrop" onClick={() => setShowTransferGuide(false)}>
            <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem", color: "#f8fafc" }}>📖 Transfer Guide & Best Practices</h3>
              <p style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                • <strong>Background Transfers:</strong> You can safely leave the Transfer page while a job is running. Progress will stay active in the background.<br />
                • <strong>Large Files:</strong> Files up to several gigabytes are transferred using memory-safe stream buffers.<br />
                • <strong>Move Mode:</strong> In Move mode, files are safely uploaded to the destination first before source deletion.<br />
                • <strong>Quota Management:</strong> Ensure destination drive has sufficient free space before migrating batch files.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button className="btn-start-transfer-big" style={{ padding: "8px 20px", fontSize: "0.85rem" }} onClick={() => setShowTransferGuide(false)}>
                  Close Guide
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: NEW FOLDER MODAL */}
        {showNewFolderModal && (
          <div className="modal-overlay-backdrop">
            <div className="modal-content-card">
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem", color: "#f8fafc" }}>
                📁 Create New Folder in {targetAccount ? (providerNames[targetAccount.provider] || targetAccount.provider) : "Target Drive"}
              </h3>
              <p style={{ margin: "0 0 1.2rem 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                New folder will be created inside <strong style={{ color: "#a5b4fc" }}>{currentTargetFolderPath}</strong>
              </p>

              <form onSubmit={handleCreateTargetFolder}>
                <input
                  type="text"
                  className="account-selector-pill"
                  placeholder="Folder name (e.g. Migration 2026)"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                  style={{ marginBottom: "1.2rem", width: "100%", boxSizing: "border-box" }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewFolderModal(false);
                      setNewFolderName("");
                    }}
                    disabled={isCreatingFolder}
                    className="btn-header-action"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingFolder || !newFolderName.trim()}
                    className="btn-start-transfer-big"
                    style={{ padding: "8px 20px", fontSize: "0.85rem" }}
                  >
                    {isCreatingFolder ? "Creating..." : "Create Folder"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Transfer;
