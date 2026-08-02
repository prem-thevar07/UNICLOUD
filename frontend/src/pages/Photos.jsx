import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import API from "../config/api";
import MainLayout from "../layouts/MainLayout";
import FilePreviewModal from "../components/FilePreviewModal";
import "../styles/photos.css";

const providerIcons = {
  google: "/assets/drive.png",
  "google-photos": "/assets/drive.png",
  dropbox: "/assets/dropbox.png",
  onedrive: "/assets/onedrive.png",
  s3: "/assets/s3.png",
  box: "/assets/box.png",
};

const Photos = () => {
  // Real Data & Timeline Engine States
  const [photos, setPhotos] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Category & Filter States
  const [activeCategory, setActiveCategory] = useState("all_photos");
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [quickPill, setQuickPill] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  // Selection & Modal States
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const [activeScrubberMonth, setActiveScrubberMonth] = useState("");

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("unicloud_photo_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef(null);
  const observerRef = useRef(null);

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("unicloud_photo_favorites", JSON.stringify(favorites));
    } catch (e) {
      console.warn("Failed to persist favorites:", e);
    }
  }, [favorites]);

  // Global Keyboard Shortcut (Ctrl+K or Cmd+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadingMoreRef = useRef(false);

  /* ==========================================================================
     FETCH TIMELINE BATCH FROM TIMELINE ENGINE SERVICE
     ========================================================================== */
  const fetchTimeline = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        if (loadingMoreRef.current || !hasMore || !nextCursor) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const payload = {
          cursor: isLoadMore ? nextCursor : undefined,
          limit: 60,
          accountIds: selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
          folder: selectedFolderFilter !== "all" ? selectedFolderFilter : undefined,
          type: selectedTypeFilter !== "all" ? selectedTypeFilter : undefined,
        };

        const res = await API.post("/photos", payload);
        const newFiles = res.data.files || [];
        const returnedCursor = res.data.nextCursor || null;
        const returnedHasMore = Boolean(res.data.hasMore) && Boolean(returnedCursor);

        if (isLoadMore) {
          setPhotos((prev) => deduplicatePhotos([...prev, ...newFiles]));
        } else {
          setPhotos(deduplicatePhotos(newFiles));
        }

        setNextCursor(returnedCursor);
        setHasMore(returnedHasMore && newFiles.length > 0);
      } catch (err) {
        console.error("❌ Timeline Engine Fetch Error:", err);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [nextCursor, hasMore, selectedAccountIds, selectedFolderFilter, selectedTypeFilter]
  );

  // Load initial accounts & sync trigger on mount
  useEffect(() => {
    const initEngine = async () => {
      setLoading(true);
      try {
        const accRes = await API.get("/accounts");
        const accs = Array.isArray(accRes.data) ? accRes.data : [];
        setAccounts(accs);

        // Fetch initial timeline batch from Timeline Engine
        const res = await API.post("/photos", { limit: 60 });
        const newFiles = res.data.files || [];

        setPhotos(deduplicatePhotos(newFiles));
        setNextCursor(res.data.nextCursor || null);
        setHasMore(Boolean(res.data.hasMore) && Boolean(res.data.nextCursor));

        // Trigger asynchronous background metadata index sync and re-fetch once completed
        API.post("/photos/sync")
          .then(() => {
            fetchTimeline(false);
          })
          .catch(() => {});
      } catch (err) {
        console.error("❌ Initial Timeline Engine load error:", err);
      } finally {
        setLoading(false);
      }
    };

    initEngine();
  }, []);

  // When filters or accounts change, reset cursor and fetch from scratch
  useEffect(() => {
    if (accounts.length > 0) {
      setNextCursor(null);
      setHasMore(true);
      fetchTimeline(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountIds, selectedFolderFilter, selectedTypeFilter]);

  /* ==========================================================================
     BACKGROUND PRE-FETCHING OBSERVER (70% THRESHOLD / 800px ROOT MARGIN)
     ========================================================================== */
  const sentinelRef = useCallback(
    (node) => {
      if (loading || !hasMore || !nextCursor) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !loadingMoreRef.current && hasMore && nextCursor) {
            fetchTimeline(true);
          }
        },
        { rootMargin: "600px" }
      );

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, nextCursor, fetchTimeline]
  );

  /* ==========================================================================
     SINGLE & MULTI ACCOUNT TOGGLE LOGIC
     ========================================================================== */
  const toggleAccountSelection = (accId) => {
    if (accId === "all") {
      setSelectedAccountIds([]);
      setSelectedFolderFilter("all");
      return;
    }

    setSelectedAccountIds((prev) => {
      if (prev.includes(accId)) {
        return prev.filter((id) => id !== accId);
      } else {
        return [...prev, accId];
      }
    });
    setSelectedFolderFilter("all");
  };

  /* ==========================================================================
     COMPUTED METRICS FROM INDEXED TIMELINE
     ========================================================================== */
  const metrics = useMemo(() => {
    const isVid = (p) => p.mimeType?.startsWith("video/") || p.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);
    const videosList = photos.filter(isVid);
    const photosList = photos.filter((p) => !isVid(p));
    const totalBytes = photos.reduce((sum, p) => sum + (p.size || 0), 0);

    const sigMap = {};
    let dupCount = 0;
    photos.forEach((p) => {
      if (p.size && p.name) {
        const sig = `${p.name.toLowerCase()}:${p.size}`;
        if (!sigMap[sig]) sigMap[sig] = [];
        sigMap[sig].push(p);
      }
    });
    Object.values(sigMap).forEach((group) => {
      if (group.length > 1) dupCount += group.length - 1;
    });

    let latestSyncDate = null;
    accounts.forEach((acc) => {
      if (acc.lastSyncedAt) {
        const d = new Date(acc.lastSyncedAt);
        if (!latestSyncDate || d > latestSyncDate) latestSyncDate = d;
      }
    });

    const getRelativeSyncTime = (d) => {
      if (!d) return "Just now";
      const diffMins = Math.floor((new Date() - d) / (1000 * 60));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hours ago`;
      return `${Math.floor(diffHours / 24)} days ago`;
    };

    return {
      photosCount: photosList.length,
      videosCount: videosList.length,
      accountsCount: accounts.length,
      totalBytes,
      duplicatesCount: dupCount,
      lastSyncText: getRelativeSyncTime(latestSyncDate),
    };
  }, [photos, accounts]);

  /* ==========================================================================
     ACCOUNT LOOKUP MAP (ID TO EMAIL / NAME)
     ========================================================================== */
  const accountMap = useMemo(() => {
    const map = {};
    accounts.forEach((acc) => {
      map[acc._id] = acc.email || acc.name || acc.accountName || acc.provider;
    });
    return map;
  }, [accounts]);

  /* ==========================================================================
     MEMORIES & HIGHLIGHTS CAROUSEL
     ========================================================================== */
  const memoryHighlights = useMemo(() => {
    if (photos.length === 0) return [];
    
    const highlights = [];
    const now = new Date();

    const oneYearAgoPhoto = photos.find((p) => {
      const pDate = new Date(p.createdTime || p.createdAt || now);
      return pDate.getFullYear() === now.getFullYear() - 1;
    });
    if (oneYearAgoPhoto) {
      highlights.push({
        id: "mem_1yr",
        title: "One year ago",
        date: new Date(oneYearAgoPhoto.createdTime || oneYearAgoPhoto.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        cover: getPhotoThumbnail(oneYearAgoPhoto),
        photo: oneYearAgoPhoto,
      });
    }

    const folderPhoto = photos.find((p) => p.parentFolder && p.parentFolder !== "Root");
    if (folderPhoto) {
      highlights.push({
        id: "mem_folder",
        title: folderPhoto.parentFolder,
        date: new Date(folderPhoto.createdTime || folderPhoto.createdAt || now).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        cover: getPhotoThumbnail(folderPhoto),
        photo: folderPhoto,
      });
    }

    const recentVideos = photos.filter((p) => p.mimeType?.startsWith("video/"));
    if (recentVideos.length > 0) {
      const vid = recentVideos[0];
      highlights.push({
        id: "mem_event",
        title: "Recent Video Memories",
        date: new Date(vid.createdTime || vid.createdAt || now).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        cover: getPhotoThumbnail(vid),
        photo: vid,
      });
    }

    return highlights;
  }, [photos]);

  /* ==========================================================================
     DYNAMIC FOLDERS TREE FOR SIDEBAR
     ========================================================================== */
  const folderTree = useMemo(() => {
    const tree = {};
    const relevantPhotos = selectedAccountIds.length > 0
      ? photos.filter((p) => selectedAccountIds.includes(p.accountId))
      : photos;

    relevantPhotos.forEach((p) => {
      const providerKey = p.provider === "google-photos" ? "google" : p.provider || "other";
      if (!tree[providerKey]) tree[providerKey] = {};

      let folderName = p.parentFolder;
      if (!folderName || folderName === "Root" || folderName === "/") {
        folderName = "Root";
      }

      if (!tree[providerKey][folderName]) tree[providerKey][folderName] = 0;
      tree[providerKey][folderName]++;
    });
    return tree;
  }, [photos, selectedAccountIds]);

  /* ==========================================================================
     TIMELINE YEARS & MONTHS SCRUBBER (STRICT REVERSE CHRONOLOGICAL)
     ========================================================================== */
  const timelineYears = useMemo(() => {
    const yearMap = {};
    photos.forEach((p) => {
      const d = new Date(p.createdTime || Date.now());
      const yr = d.getFullYear();
      const moName = d.toLocaleString([], { month: "long" });
      const moNum = d.getMonth();

      if (!yearMap[yr]) yearMap[yr] = {};
      if (!yearMap[yr][moName]) yearMap[yr][moName] = moNum;
    });

    return Object.keys(yearMap)
      .sort((a, b) => b - a)
      .map((yr) => {
        const monthsSorted = Object.entries(yearMap[yr])
          .sort((a, b) => b[1] - a[1])
          .map(([moName]) => moName);

        return {
          year: yr,
          months: monthsSorted,
        };
      });
  }, [photos]);

  /* ==========================================================================
     DYNAMIC FILTERING & SEARCH LOGIC
     ========================================================================== */
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      const pDate = new Date(p.createdTime || Date.now());
      const isVid = p.mimeType?.startsWith("video/") || p.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);
      const ext = (p.name || "").split(".").pop()?.toLowerCase();

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchFolder = (p.parentFolder || "").toLowerCase().includes(q);
        if (!matchName && !matchFolder) return false;
      }

      if (activeCategory === "favorites" && !favorites.includes(p.id)) return false;
      if (activeCategory === "videos" && !isVid) return false;
      if (activeCategory === "screenshots" && !p.name?.toLowerCase().includes("screen")) return false;
      if (activeCategory === "raw" && !["cr2", "nef", "arw", "dng", "raw"].includes(ext)) return false;

      if (quickPill === "today") {
        if (pDate.toDateString() !== new Date().toDateString()) return false;
      } else if (quickPill === "favorites" && !favorites.includes(p.id)) {
        return false;
      } else if (quickPill === "videos" && !isVid) {
        return false;
      }

      return true;
    });
  }, [photos, activeCategory, searchQuery, favorites, quickPill]);

  /* ==========================================================================
     GROUPED TIMELINE SECTIONS (NEWEST TO OLDEST)
     ========================================================================== */
  const groupedPhotoSections = useMemo(() => {
    const sorted = [...filteredPhotos].sort((a, b) => {
      const da = new Date(a.createdTime || 0).getTime();
      const db = new Date(b.createdTime || 0).getTime();
      return db - da;
    });

    const groupsMap = new Map();
    const todayStr = new Date().toDateString();

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toDateString();

    sorted.forEach((p) => {
      const d = new Date(p.createdTime || Date.now());
      const dateStr = d.toDateString();
      
      let label = d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
      if (dateStr === todayStr) {
        label = `Today — ${d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}`;
      } else if (dateStr === yestStr) {
        label = `Yesterday — ${d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}`;
      }

      if (!groupsMap.has(label)) {
        groupsMap.set(label, {
          label,
          timestamp: d.getTime(),
          items: [],
        });
      }
      groupsMap.get(label).items.push(p);
    });

    return Array.from(groupsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredPhotos]);

  /* ==========================================================================
     HANDLERS & ACTIONS
     ========================================================================== */
  const togglePhotoSelection = (id) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleFavorite = (id, e) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllGroup = (items) => {
    const itemIds = items.map((i) => i.id);
    const allSelected = itemIds.every((id) => selectedPhotoIds.includes(id));
    if (allSelected) {
      setSelectedPhotoIds((prev) => prev.filter((id) => !itemIds.includes(id)));
    } else {
      setSelectedPhotoIds((prev) => [...new Set([...prev, ...itemIds])]);
    }
  };

  const handleBatchDownload = () => {
    const selectedItems = photos.filter((p) => selectedPhotoIds.includes(p.id));
    selectedItems.forEach((item) => {
      if (item.webContentLink || item.url) {
        window.open(item.webContentLink || item.url, "_blank");
      }
    });
  };

  const handleScrubberClick = (monthName, yearStr) => {
    setActiveScrubberMonth(`${monthName}-${yearStr}`);
    const headers = document.querySelectorAll(".gallery-date-group-header");
    for (const h of headers) {
      if (h.textContent.toLowerCase().includes(monthName.toLowerCase())) {
        h.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
  };

  const resetAllFilters = () => {
    setActiveCategory("all_photos");
    setSelectedAccountIds([]);
    setSelectedFolderFilter("all");
    setSelectedTypeFilter("all");
    setQuickPill("all");
    setSearchQuery("");
    setSelectedPhotoIds([]);
  };

  return (
    <MainLayout>
      <div className="photos-app-wrapper">
        <div className="photos-layout-grid">
          
          {/* ==========================================================================
             LEFT SIDEBAR (ACCOUNTS, BROWSE, FOLDERS, TIMELINE, STORAGE)
             ========================================================================== */}
          <aside className="photos-sidebar">
            
            {/* CONNECTED ACCOUNTS SECTION */}
            <div>
              <div className="sidebar-section-title">
                <span>CONNECTED ACCOUNTS</span>
                <span style={{ fontSize: "11px", color: "#818cf8" }}>
                  {selectedAccountIds.length === 0 ? "All Selected" : `${selectedAccountIds.length} Selected`}
                </span>
              </div>
              <div className="sidebar-accounts-list">
                <div
                  className={`sidebar-account-item ${selectedAccountIds.length === 0 ? "active" : ""}`}
                  onClick={() => toggleAccountSelection("all")}
                >
                  <div className="sidebar-account-left">
                    <span style={{ fontSize: "14px" }}>☁️</span>
                    <div>
                      <div className="sidebar-account-name">All Cloud Accounts</div>
                      <div className="sidebar-account-subtext">{photos.length} media items</div>
                    </div>
                  </div>
                  <div className="sidebar-account-status">{selectedAccountIds.length === 0 ? "✓" : ""}</div>
                </div>

                {accounts.map((acc) => {
                  const isSel = selectedAccountIds.includes(acc._id);
                  const accMediaCount = photos.filter((p) => p.accountId === acc._id).length;
                  const providerName = acc.provider === "google" ? "Google Drive" : acc.provider === "dropbox" ? "Dropbox" : acc.provider === "onedrive" ? "OneDrive" : acc.provider === "s3" ? "Amazon S3" : "Box";
                  
                  return (
                    <div
                      key={acc._id}
                      className={`sidebar-account-item ${isSel ? "active" : ""}`}
                      onClick={() => toggleAccountSelection(acc._id)}
                    >
                      <div className="sidebar-account-left">
                        <img src={providerIcons[acc.provider]} alt={providerName} className="sidebar-account-logo" />
                        <div style={{ minWidth: 0 }}>
                          <div className="sidebar-account-name">{providerName}</div>
                          <div className="sidebar-account-subtext">{accMediaCount} items</div>
                        </div>
                      </div>
                      <div className="sidebar-account-status">{isSel ? "✓" : "+"}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BROWSE SECTION */}
            <div>
              <div className="sidebar-section-title">
                <span>BROWSE</span>
              </div>
              <div className="sidebar-menu-list">
                <div
                  className={`sidebar-menu-item ${activeCategory === "all_photos" ? "active" : ""}`}
                  onClick={() => setActiveCategory("all_photos")}
                >
                  <div className="sidebar-menu-item-left">
                    <span>🖼️</span>
                    <span>All Photos</span>
                  </div>
                  <span className="sidebar-badge-count">{photos.length}</span>
                </div>

                <div
                  className={`sidebar-menu-item ${activeCategory === "favorites" ? "active" : ""}`}
                  onClick={() => setActiveCategory("favorites")}
                >
                  <div className="sidebar-menu-item-left">
                    <span>⭐</span>
                    <span>Favorites</span>
                  </div>
                  <span className="sidebar-badge-count">{favorites.length}</span>
                </div>

                <div
                  className={`sidebar-menu-item ${activeCategory === "videos" ? "active" : ""}`}
                  onClick={() => setActiveCategory("videos")}
                >
                  <div className="sidebar-menu-item-left">
                    <span>🎬</span>
                    <span>Videos</span>
                  </div>
                  <span className="sidebar-badge-count">{metrics.videosCount}</span>
                </div>

                <div
                  className={`sidebar-menu-item ${activeCategory === "screenshots" ? "active" : ""}`}
                  onClick={() => setActiveCategory("screenshots")}
                >
                  <div className="sidebar-menu-item-left">
                    <span>📸</span>
                    <span>Screenshots</span>
                  </div>
                  <span className="sidebar-badge-count">
                    {photos.filter((p) => p.name?.toLowerCase().includes("screen")).length}
                  </span>
                </div>

                <div
                  className={`sidebar-menu-item ${activeCategory === "raw" ? "active" : ""}`}
                  onClick={() => setActiveCategory("raw")}
                >
                  <div className="sidebar-menu-item-left">
                    <span>🎞️</span>
                    <span>RAW Photos</span>
                  </div>
                  <span className="sidebar-badge-count">
                    {photos.filter((p) => ["cr2", "nef", "arw", "dng", "raw"].includes((p.name || "").split(".").pop()?.toLowerCase())).length}
                  </span>
                </div>
              </div>
            </div>

            {/* DYNAMIC FOLDERS TREE FOR SELECTED ACCOUNT(S) */}
            {Object.keys(folderTree).length > 0 && (
              <div>
                <div className="sidebar-section-title">
                  <span>FOLDERS</span>
                  {selectedFolderFilter !== "all" && (
                    <span
                      style={{ fontSize: "10px", color: "#818cf8", cursor: "pointer" }}
                      onClick={() => setSelectedFolderFilter("all")}
                    >
                      Clear Filter
                    </span>
                  )}
                </div>
                <div className="sidebar-tree-container">
                  {Object.entries(folderTree).map(([providerKey, foldersMap]) => (
                    <div key={providerKey} style={{ marginBottom: "6px" }}>
                      <div className="sidebar-tree-node" style={{ fontWeight: "700", color: "#a5b4fc" }}>
                        <span>📁 {providerKey.toUpperCase()}</span>
                      </div>
                      <div className="sidebar-tree-children">
                        {Object.entries(foldersMap).map(([folderName, count]) => (
                          <div
                            key={folderName}
                            className={`sidebar-tree-node ${selectedFolderFilter === folderName ? "active" : ""}`}
                            onClick={() => setSelectedFolderFilter(selectedFolderFilter === folderName ? "all" : folderName)}
                            style={selectedFolderFilter === folderName ? { background: "rgba(99, 102, 241, 0.2)", color: "#ffffff", fontWeight: "600" } : {}}
                          >
                            <span>📂 {folderName}</span>
                            <span className="sidebar-badge-count">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DYNAMIC SCALED TIMELINE TREE */}
            {timelineYears.length > 0 && (
              <div>
                <div className="sidebar-section-title">
                  <span>TIMELINE</span>
                </div>
                <div className="sidebar-tree-container">
                  {timelineYears.map((yrObj) => (
                    <div key={yrObj.year} style={{ marginBottom: "4px" }}>
                      <div className="sidebar-tree-node" style={{ fontWeight: "700" }}>
                        <span>📅 {yrObj.year}</span>
                      </div>
                      <div className="sidebar-tree-children">
                        {yrObj.months.map((mo) => (
                          <div
                            key={mo}
                            className="sidebar-tree-node"
                            onClick={() => handleScrubberClick(mo, yrObj.year)}
                          >
                            <span>{mo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SIDEBAR BOTTOM STORAGE WIDGET */}
            <div className="sidebar-storage-card">
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>Total Storage Used</div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", marginTop: "2px" }}>
                {formatSize(metrics.totalBytes)} / {formatSize(accounts.reduce((s, a) => s + (a.storage?.total || 0), 0) || 15 * 1024 * 1024 * 1024)}
              </div>
              <div className="sidebar-storage-bar-bg">
                <div
                  className="sidebar-storage-bar-fill"
                  style={{
                    width: `${Math.min((metrics.totalBytes / (accounts.reduce((s, a) => s + (a.storage?.total || 0), 0) || 15 * 1024 * 1024 * 1024)) * 100, 100).toFixed(1)}%`,
                  }}
                />
              </div>
            </div>

          </aside>

          {/* ==========================================================================
             RIGHT MAIN VIEWPORT (HEADER, METRICS, GALLERY, SCRUBBER)
             ========================================================================== */}
          <main className="photos-main-content">
            
            {/* TOP HEADER & GLOBAL SEARCH BAR */}
            <div className="photos-top-header">
              <div className="photos-title-box">
                <h1>Photos</h1>
                <p>Browse, search and manage your memories across all clouds</p>
              </div>

              <div className="photos-search-view-row">
                <div className="photos-search-box">
                  <span className="photos-search-icon">🔍</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="photos-search-input"
                    placeholder="Search photos, people, places..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className="photos-shortcut-badge">⌘ K</span>
                </div>

                <div className="photos-view-mode-group">
                  <button
                    className={`photos-view-btn ${viewMode === "grid" ? "active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    title="Grid View"
                  >
                    ⊞
                  </button>
                  <button
                    className={`photos-view-btn ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => setViewMode("list")}
                    title="List View"
                  >
                    ≡
                  </button>
                </div>
              </div>
            </div>

            {/* DROPDOWN FILTERS & QUICK PRESET PILLS */}
            <div className="photos-filter-section">
              <div className="photos-dropdown-filters">
                <div
                  className="photos-select-pill"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span>☁️</span>
                  <span>
                    {selectedAccountIds.length === 0
                      ? "All Accounts Selected"
                      : `${selectedAccountIds.length} Account(s) Selected`}
                  </span>
                </div>

                <select
                  className="photos-select-pill"
                  value={selectedFolderFilter}
                  onChange={(e) => setSelectedFolderFilter(e.target.value)}
                >
                  <option value="all">📁 All Folders</option>
                  {Object.values(folderTree)
                    .flatMap((obj) => Object.keys(obj))
                    .map((fn) => (
                      <option key={fn} value={fn}>
                        📂 {fn}
                      </option>
                    ))}
                </select>

                <select
                  className="photos-select-pill"
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                >
                  <option value="all">🎞️ All Types</option>
                  <option value="image">🖼️ Photos Only</option>
                  <option value="video">🎬 Videos Only</option>
                </select>

                <button className="photos-pill-btn" onClick={resetAllFilters}>
                  🔄 Reset
                </button>
              </div>

              <div className="photos-quick-pills-row">
                {["all", "today", "favorites", "videos", "screenshots", "raw"].map((pillKey) => {
                  const labelMap = {
                    all: "All Media",
                    today: "Today",
                    favorites: "⭐ Favorites",
                    videos: "🎬 Videos",
                    screenshots: "📸 Screenshots",
                    raw: "🎞️ RAW",
                  };
                  return (
                    <div
                      key={pillKey}
                      className={`quick-filter-chip ${quickPill === pillKey ? "active" : ""}`}
                      onClick={() => setQuickPill(pillKey)}
                    >
                      {labelMap[pillKey]}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TOP METRIC CARDS */}
            <div className="photos-metrics-grid">
              <div className="photos-metric-card">
                <div className="photos-metric-icon purple">🖼️</div>
                <div>
                  <div className="photos-metric-val">{metrics.photosCount}</div>
                  <div className="photos-metric-lbl">Photos items</div>
                </div>
              </div>

              <div className="photos-metric-card">
                <div className="photos-metric-icon pink">🎬</div>
                <div>
                  <div className="photos-metric-val">{metrics.videosCount}</div>
                  <div className="photos-metric-lbl">Videos items</div>
                </div>
              </div>

              <div className="photos-metric-card">
                <div className="photos-metric-icon blue">☁️</div>
                <div>
                  <div className="photos-metric-val">{metrics.accountsCount}</div>
                  <div className="photos-metric-lbl">Connected drives</div>
                </div>
              </div>

              <div className="photos-metric-card">
                <div className="photos-metric-icon green">📊</div>
                <div>
                  <div className="photos-metric-val">{formatSize(metrics.totalBytes)}</div>
                  <div className="photos-metric-lbl">Storage used</div>
                </div>
              </div>

              <div className="photos-metric-card">
                <div className="photos-metric-icon amber">👯</div>
                <div>
                  <div className="photos-metric-val">{metrics.duplicatesCount}</div>
                  <div className="photos-metric-lbl">Duplicates</div>
                </div>
              </div>

              <div className="photos-metric-card">
                <div className="photos-metric-icon cyan">🔄</div>
                <div>
                  <div className="photos-metric-val" style={{ fontSize: "0.95rem" }}>{metrics.lastSyncText}</div>
                  <div className="photos-metric-lbl">All accounts synced</div>
                </div>
              </div>
            </div>

            {/* MEMORIES & HIGHLIGHTS CAROUSEL */}
            {memoryHighlights.length > 0 && (
              <div className="photos-memories-section">
                <div className="photos-section-header">
                  <span>Memories & Highlights</span>
                </div>
                <div className="photos-memories-scroll-row">
                  {memoryHighlights.map((mem) => (
                    <div
                      key={mem.id}
                      className="memory-card"
                      onClick={() => setPreviewModalFile(mem.photo)}
                    >
                      <img
                        src={mem.cover}
                        alt={mem.title}
                        className="memory-card-img"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getFallbackPhotoSrc(mem.photo);
                        }}
                      />
                      <div className="memory-card-overlay">
                        <div className="memory-card-title">{mem.title}</div>
                        <div className="memory-card-date">{mem.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MEDIA GALLERY GRID & RIGHT TIMELINE SCRUBBER */}
            <div className="photos-gallery-wrapper">
              
              {/* GALLERY SCROLL AREA */}
              <div className="photos-gallery-scroll-area">
                {loading ? (
                  <div className="gallery-cards-grid">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="skeleton-card" />
                    ))}
                  </div>
                ) : filteredPhotos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#94a3b8" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🖼️</div>
                    <h3 style={{ margin: "0 0 6px 0", color: "#f8fafc" }}>No media items found</h3>
                    <p style={{ margin: 0, fontSize: "0.88rem" }}>Try adjusting your search query or reset active filters.</p>
                  </div>
                ) : (
                  groupedPhotoSections.map((sec) => (
                    <div key={sec.label}>
                      <div className="gallery-date-group-header">
                        <span>📅 {sec.label}</span>
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>({sec.items.length})</span>
                        <button
                          style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#818cf8", fontSize: "11px", cursor: "pointer" }}
                          onClick={() => handleSelectAllGroup(sec.items)}
                        >
                          Select Group
                        </button>
                      </div>

                      <div className="gallery-cards-grid">
                        {sec.items.map((p) => {
                          const isSelected = selectedPhotoIds.includes(p.id);
                          const isFav = favorites.includes(p.id);
                          const isVid = p.mimeType?.startsWith("video/") || p.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);

                          return (
                            <div
                              key={p.id}
                              className={`photo-card-item ${isSelected ? "selected" : ""}`}
                              onClick={() => setPreviewModalFile(p)}
                            >
                              <img
                                src={getPhotoThumbnail(p)}
                                alt={p.name}
                                className="photo-card-img"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = getFallbackPhotoSrc(p);
                                }}
                              />

                              {/* Selection Badge */}
                              <div
                                className="photo-card-select-badge"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePhotoSelection(p.id);
                                }}
                              >
                                {isSelected ? "✓" : ""}
                              </div>

                              {/* Favorite Star Badge */}
                              <div
                                className="photo-card-favorite-star"
                                onClick={(e) => toggleFavorite(p.id, e)}
                                title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                              >
                                {isFav ? "⭐" : ""}
                              </div>

                              {/* Video Indicator Overlay */}
                              {isVid && (
                                <div className="photo-card-video-overlay">
                                  <span>▶</span>
                                  <span>Video</span>
                                </div>
                              )}

                              {/* Ultra-Minimalist Bottom Metadata Overlay */}
                              <div className="photo-card-minimal-overlay">
                                <div className="photo-minimal-title" title={p.name}>
                                  {p.name}
                                </div>
                                <div className="photo-minimal-meta">
                                  <img
                                    src={providerIcons[p.provider] || "/assets/logo.png"}
                                    alt={p.provider}
                                    className="photo-minimal-logo"
                                    title={p.provider}
                                  />
                                  <span title={accountMap[p.accountId] || p.provider}>
                                    {accountMap[p.accountId] ? accountMap[p.accountId].split("@")[0] : p.provider}
                                  </span>
                                  <span className="photo-minimal-dot">•</span>
                                  <span>
                                    {new Date(p.createdTime || Date.now()).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                  <span className="photo-minimal-dot">•</span>
                                  <span>{formatSize(p.size)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                {/* SENTINEL ELEMENT FOR BACKGROUND PRE-FETCHING (70% THRESHOLD) */}
                <div ref={sentinelRef} style={{ height: "40px", margin: "20px 0", textAlign: "center" }}>
                  {loadingMore && (
                    <div style={{ color: "#a5b4fc", fontSize: "0.85rem", fontWeight: "600" }}>
                      ⚡ Pre-fetching next cursor batch from Timeline Engine...
                    </div>
                  )}
                </div>
              </div>

              {/* DYNAMICALLY SCALED RIGHT VERTICAL TIMELINE SCRUBBER */}
              {timelineYears.length > 0 && (
                <aside className="photos-timeline-scrubber">
                  {timelineYears.map((yObj) => (
                    <div key={yObj.year} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div className="scrubber-year">• {yObj.year}</div>
                      {yObj.months.map((m) => (
                        <button
                          key={m}
                          className={`scrubber-month-btn ${activeScrubberMonth === `${m}-${yObj.year}` ? "active" : ""}`}
                          onClick={() => handleScrubberClick(m, yObj.year)}
                        >
                          {m.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  ))}
                </aside>
              )}

            </div>

          </main>
        </div>

        {/* FLOATING MULTI-SELECT ACTION TOOLBAR */}
        {selectedPhotoIds.length > 0 && (
          <div className="photos-floating-toolbar">
            <div className="toolbar-selected-count">
              <span style={{ cursor: "pointer" }} onClick={() => setSelectedPhotoIds([])}>✕</span>
              <span>{selectedPhotoIds.length} items selected</span>
            </div>

            <button className="toolbar-btn" onClick={handleBatchDownload}>
              <span>📥</span> Download
            </button>

            <button className="toolbar-btn" onClick={() => setSelectedPhotoIds([])}>
              <span>⭐</span> Favorite
            </button>

            <button className="toolbar-btn danger" onClick={() => setSelectedPhotoIds([])}>
              <span>🗑️</span> Clear
            </button>
          </div>
        )}

        {/* IN-APP FILE PREVIEW MODAL */}
        {previewModalFile && (
          <FilePreviewModal
            file={previewModalFile}
            isOpen={true}
            onClose={() => setPreviewModalFile(null)}
            files={filteredPhotos}
            onSelectFile={setPreviewModalFile}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Photos;

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */
function deduplicatePhotos(items) {
  const seen = new Set();
  const unique = items.filter((item) => {
    if (!item || !item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return unique.sort((a, b) => {
    const da = new Date(a.createdTime || 0).getTime();
    const db = new Date(b.createdTime || 0).getTime();
    return db - da;
  });
}

function getPhotoThumbnail(photo) {
  if (!photo) return "/assets/logo.png";
  const token = localStorage.getItem("token") || "";
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const cleanBase = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;

  const rawThumb = photo.thumbnailLink || photo.thumbnail;
  if (rawThumb) {
    if (rawThumb.startsWith("/api/")) {
      const sep = rawThumb.includes("?") ? "&" : "?";
      return `${cleanBase}${rawThumb}${sep}token=${encodeURIComponent(token)}`;
    }
    return rawThumb;
  }

  if (photo.baseUrl) return `${photo.baseUrl}=s400`;

  return getFallbackPhotoSrc(photo);
}

function getFallbackPhotoSrc(photo) {
  if (!photo || !photo.provider || !photo.accountId || !photo.id) return "/assets/logo.png";
  const token = localStorage.getItem("token") || "";
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const cleanBase = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;
  const idKey = photo.provider === "dropbox" ? "path" : "fileId";
  const providerPath = photo.provider === "google-photos" ? "google" : photo.provider;
  return `${cleanBase}/api/${providerPath}/open/${photo.accountId}?${idKey}=${encodeURIComponent(photo.id)}&name=${encodeURIComponent(photo.name || "image")}&token=${encodeURIComponent(token)}`;
}

function formatSize(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}
