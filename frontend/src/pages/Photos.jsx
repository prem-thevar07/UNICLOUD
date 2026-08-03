import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import API from "../config/api";
import MainLayout from "../layouts/MainLayout";
import FilePreviewModal from "../components/FilePreviewModal";
import "../styles/photos.css";

/* ==========================================================================
   VECTOR SVG ICON COMPONENTS (NO EMOJIS)
   ========================================================================== */
const IconPhotosApp = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IconGoogleDrive = () => (
  <svg width="18" height="18" viewBox="0 0 87.3 78" fill="currentColor">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA" />
    <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00AC47" />
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l5.4-9.35c.8-1.4 1.2-2.95 1.2-4.5H55.95l6.5 11.25 11.1 5.9z" fill="#EA4335" />
    <path d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.45-1.2H34.4c-1.55 0-3.1.4-4.5 1.2L43.65 25z" fill="#00832D" />
    <path d="M55.95 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.5-1.2L55.95 53z" fill="#2684FC" />
    <path d="M73.55 28.3L48.15 4.35C46.8 3.55 45.25 3.15 43.7 3.15h.05L57.4 26.9l16.15 26.1h.05c1.55 0 3.1-.4 4.45-1.2l5.4-9.35c.8-1.4 1.2-2.95 1.2-4.5 0-1.6-.4-3.1-1.15-4.55l-9.95-14.6z" fill="#FFBA00" />
  </svg>
);

const IconGooglePhotos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 12V3a4.5 4.5 0 0 1 4.5 4.5A4.5 4.5 0 0 1 12 12z" fill="#EA4335" />
    <path d="M12 12h9a4.5 4.5 0 0 1-4.5 4.5A4.5 4.5 0 0 1 12 12z" fill="#4285F4" />
    <path d="M12 12v9a4.5 4.5 0 0 1-4.5-4.5A4.5 4.5 0 0 1 12 12z" fill="#34A853" />
    <path d="M12 12H3a4.5 4.5 0 0 1 4.5-4.5A4.5 4.5 0 0 1 12 12z" fill="#FBBC05" />
  </svg>
);

const IconOneDrive = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0078D4">
    <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
  </svg>
);

const IconDropbox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0061FF">
    <path d="M6 2l6 3.75L6 9.5 0 5.75 6 2zm12 0l6 3.75-6 3.75-6-3.75L18 2zM0 13.25L6 9.5l6 3.75-6 3.75-6-3.75zm24 0l-6-3.75-6 3.75 6 3.75 6-3.75zM6 18.25l6-3.75 6 3.75-6 3.75-6-3.75z" />
  </svg>
);

const IconS3 = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#E53935">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IconHeart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const IconVideo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const IconCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const IconFolder = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconFilter = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IconCalendar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconSparkles = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

const IconDuplicate = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconCloud = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const IconLayers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const IconDatabase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

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
  const [selectedSourceKeys, setSelectedSourceKeys] = useState([]);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [quickPill, setQuickPill] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [isViewFromOpen, setIsViewFromOpen] = useState(false);

  // Selection & Modal States
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [previewModalFile, setPreviewModalFile] = useState(null);

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
  const loadingMoreRef = useRef(false);
  const dropdownRef = useRef(null);

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("unicloud_photo_favorites", JSON.stringify(favorites));
    } catch (e) {
      console.warn("Failed to persist favorites:", e);
    }
  }, [favorites]);

  // Close custom dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsViewFromOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ==========================================================================
     FETCH USER CLOUD ACCOUNTS (RUNS ONCE ON MOUNT)
     ========================================================================== */
  useEffect(() => {
    let isMounted = true;
    const loadAccounts = async () => {
      try {
        const res = await API.get("/accounts");
        const list = res.data.accounts || res.data || [];
        if (isMounted) setAccounts(list);
      } catch (err) {
        console.error("Failed to fetch cloud accounts:", err);
      }
    };
    loadAccounts();
    return () => { isMounted = false; };
  }, []);

  /* ==========================================================================
     SYNTHESIZE DISTINCT SOURCE CARDS (DRIVE VS GOOGLE PHOTOS VS OTHERS)
     ========================================================================== */
  const sourceCards = useMemo(() => {
    const list = [];
    accounts.forEach((acc) => {
      const email = acc.accountEmail || acc.email || "connected";
      if (acc.provider === "google") {
        // 1. Google Drive Card
        const driveCount = photos.filter((p) => p.accountId === acc._id && p.provider === "google").length;
        list.push({
          id: acc._id,
          key: `${acc._id}_google`,
          provider: "google",
          name: "Google Drive",
          email,
          count: driveCount,
        });

        // 2. Google Photos Card (Distinct Card as requested by user)
        const photosCount = photos.filter((p) => p.accountId === acc._id && p.provider === "google-photos").length;
        list.push({
          id: acc._id,
          key: `${acc._id}_google-photos`,
          provider: "google-photos",
          name: "Google Photos",
          email,
          count: photosCount,
        });
      } else {
        const count = photos.filter((p) => p.accountId === acc._id).length;
        list.push({
          id: acc._id,
          key: acc._id,
          provider: acc.provider,
          name: getProviderName(acc.provider),
          email,
          count,
        });
      }
    });
    return list;
  }, [accounts, photos]);

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
        setNextCursor(null);
        setHasMore(true);
      }

      try {
        const params = { limit: 60 };
        if (isLoadMore && nextCursor) {
          params.cursor = nextCursor;
        }

        if (selectedFolderFilter !== "all") {
          params.folder = selectedFolderFilter;
        }

        if (selectedTypeFilter !== "all") {
          params.type = selectedTypeFilter;
        } else if (activeCategory === "videos") {
          params.type = "video";
        }

        const res = await API.get("/photos", { params });

        const newItems = res.data.files || res.data.photos || res.data.items || [];
        const nextCurs = res.data.nextCursor || res.data.pagination?.nextCursor || null;
        const more = res.data.hasMore ?? res.data.pagination?.hasMore ?? Boolean(nextCurs);

        if (isLoadMore) {
          setPhotos((prev) => deduplicatePhotos([...prev, ...newItems]));
        } else {
          setPhotos(newItems);
        }

        setNextCursor(nextCurs);
        setHasMore(more);
      } catch (err) {
        console.error("❌ Failed to fetch photos timeline:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [nextCursor, hasMore, selectedFolderFilter, selectedTypeFilter, activeCategory]
  );

  useEffect(() => {
    fetchTimeline(false);
  }, [selectedFolderFilter, selectedTypeFilter, activeCategory]);

  /* ==========================================================================
     BACKGROUND PRE-FETCH SENTINEL OBSERVER (70% VIEWPORT THRESHOLD)
     ========================================================================== */
  const sentinelRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && nextCursor) {
            fetchTimeline(true);
          }
        },
        { rootMargin: "600px", threshold: 0.7 }
      );

      if (node) observerRef.current.observe(node);
    },
    [loading, loadingMore, hasMore, nextCursor, fetchTimeline]
  );

  /* ==========================================================================
     FILTERED PHOTOS & REAL DYNAMIC METRICS
     ========================================================================== */
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      // 1. Source Card Filter (Google Drive vs Google Photos vs OneDrive vs Dropbox)
      if (selectedSourceKeys.length > 0) {
        const pSourceKey = p.provider === "google-photos" ? `${p.accountId}_google-photos` : p.provider === "google" ? `${p.accountId}_google` : p.accountId;
        if (!selectedSourceKeys.includes(pSourceKey)) {
          return false;
        }
      }

      // 2. Active Category Filter
      if (activeCategory === "favorites" && !favorites.includes(p.id)) return false;
      if (activeCategory === "videos" && !p.mimeType?.startsWith("video/") && !p.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i)) return false;
      if (activeCategory === "screenshots" && !p.name?.toLowerCase().includes("screen")) return false;
      if (activeCategory === "raw" && !["cr2", "nef", "arw", "dng", "raw"].includes((p.name || "").split(".").pop()?.toLowerCase())) return false;
      if (activeCategory === "duplicates") {
        const isDup = photos.filter((x) => x.size === p.size && x.name === p.name).length > 1;
        if (!isDup) return false;
      }

      // 3. Quick Presets
      if (quickPill === "today") {
        const todayStr = new Date().toDateString();
        const pDate = new Date(p.photoTakenDate || p.createdDate || p.createdTime || 0).toDateString();
        if (todayStr !== pDate) return false;
      } else if (quickPill === "yesterday") {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = yest.toDateString();
        const pDate = new Date(p.photoTakenDate || p.createdDate || p.createdTime || 0).toDateString();
        if (yestStr !== pDate) return false;
      } else if (quickPill === "this_week") {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const pDate = new Date(p.photoTakenDate || p.createdDate || p.createdTime || 0);
        if (pDate < weekAgo) return false;
      } else if (quickPill === "this_month") {
        const now = new Date();
        const pDate = new Date(p.photoTakenDate || p.createdDate || p.createdTime || 0);
        if (pDate.getMonth() !== now.getMonth() || pDate.getFullYear() !== now.getFullYear()) return false;
      } else if (quickPill === "favorites" && !favorites.includes(p.id)) {
        return false;
      } else if (quickPill === "videos" && !p.mimeType?.startsWith("video/") && !p.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
        return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = p.name?.toLowerCase().includes(q);
        const folderMatch = p.folderPath?.toLowerCase().includes(q);
        const providerMatch = p.provider?.toLowerCase().includes(q);
        if (!nameMatch && !folderMatch && !providerMatch) return false;
      }

      return true;
    });
  }, [photos, selectedSourceKeys, activeCategory, favorites, quickPill, searchQuery]);

  // Derived Dynamic Folder Tree from Real Photos
  const folderTree = useMemo(() => {
    const tree = {};
    photos.forEach((p) => {
      const folderName = p.folderPath?.split("/").filter(Boolean).pop() || "Root";
      const key = p.provider || "google";
      if (!tree[key]) tree[key] = {};
      tree[key][folderName] = (tree[key][folderName] || 0) + 1;
    });
    return tree;
  }, [photos]);

  // Grouped Photo Sections by Timeline Date
  const groupedPhotoSections = useMemo(() => {
    const groups = {};
    filteredPhotos.forEach((p) => {
      const d = new Date(p.photoTakenDate || p.createdDate || p.createdTime || Date.now());
      const label = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      if (!groups[label]) groups[label] = { label, date: d, items: [] };
      groups[label].items.push(p);
    });

    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredPhotos]);

  // Memories Carousel Derived 100% Dynamically from Real MongoDB Photos
  const memoryHighlights = useMemo(() => {
    if (!photos || photos.length === 0) return [];
    const titles = ["One year ago", "Recent Highlight", "Cloud Memory", "Saved Moment"];
    return photos.slice(0, 4).map((p, idx) => {
      const d = new Date(p.photoTakenDate || p.createdDate || p.createdTime || Date.now());
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return {
        id: p.id || `mem-${idx}`,
        title: titles[idx % titles.length],
        date: dateStr,
        photo: p,
        cover: getPhotoThumbnail(p),
      };
    });
  }, [photos]);

  // Real Dynamic Metrics Bar & Storage Calculations
  const metrics = useMemo(() => {
    const photosCount = photos.filter((p) => !p.mimeType?.startsWith("video/")).length;
    const videosCount = photos.filter((p) => p.mimeType?.startsWith("video/")).length;
    const totalUsedBytes = photos.reduce((acc, p) => acc + (Number(p.size) || 0), 0);
    const totalQuotaBytes = accounts.reduce((acc, a) => acc + (Number(a.storage?.total) || 15 * 1024 * 1024 * 1024), 0) || (15 * 1024 * 1024 * 1024);
    const duplicatesCount = photos.filter((p, i, self) => self.findIndex((x) => x.size === p.size && x.name === p.name) !== i).length;
    const usedPercent = Math.min(Math.round((totalUsedBytes / (totalQuotaBytes || 1)) * 100), 100);

    return {
      photosCount: photosCount.toLocaleString(),
      videosCount: videosCount.toLocaleString(),
      accountsCount: accounts.length,
      totalUsedBytes,
      totalQuotaBytes,
      usedPercent: isNaN(usedPercent) ? 0 : usedPercent,
      duplicatesCount: duplicatesCount.toLocaleString(),
      screenshotsCount: photos.filter((p) => p.name?.toLowerCase().includes("screen")).length.toLocaleString(),
      rawCount: photos.filter((p) => ["cr2", "nef", "arw", "dng", "raw"].includes((p.name || "").split(".").pop()?.toLowerCase())).length.toLocaleString(),
    };
  }, [photos, accounts]);

  /* ==========================================================================
     HANDLERS & ACTIONS
     ========================================================================== */
  const handleToggleSelectAllSources = () => {
    if (selectedSourceKeys.length === sourceCards.length) {
      setSelectedSourceKeys([]);
    } else {
      setSelectedSourceKeys(sourceCards.map((s) => s.key));
    }
  };

  const handleToggleSourceSelect = (key) => {
    setSelectedSourceKeys((prev) => {
      if (prev.length === 0) {
        // If all were active, unchecking one leaves all others active
        return sourceCards.map((s) => s.key).filter((k) => k !== key);
      }
      return prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    });
  };

  const handleSelectViewFromSource = (key) => {
    if (key === "all") {
      setSelectedSourceKeys([]);
    } else {
      setSelectedSourceKeys([key]);
    }
    setIsViewFromOpen(false);
  };

  const handleToggleFavorite = (e, photoId) => {
    e.stopPropagation();
    setFavorites((prev) => (prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]));
  };

  const handleSelectGroup = (items) => {
    const groupIds = items.map((i) => i.id);
    const allSelected = groupIds.every((id) => selectedPhotoIds.includes(id));

    if (allSelected) {
      setSelectedPhotoIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setSelectedPhotoIds((prev) => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const handleBatchDownload = async () => {
    const selectedItems = photos.filter((p) => selectedPhotoIds.includes(p.id));
    for (const item of selectedItems) {
      const token = localStorage.getItem("token") || "";
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001/api";
      const cleanBase = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;
      const idKey = item.provider === "dropbox" ? "path" : "fileId";
      const downloadUrl = `${cleanBase}/api/${item.provider}/download/${item.accountId}?${idKey}=${encodeURIComponent(item.id)}&name=${encodeURIComponent(item.name || "file")}&token=${encodeURIComponent(token)}`;
      window.open(downloadUrl, "_blank");
    }
  };

  const resetAllFilters = () => {
    setActiveCategory("all_photos");
    setSelectedSourceKeys([]);
    setSelectedFolderFilter("all");
    setSelectedTypeFilter("all");
    setQuickPill("all");
    setSearchQuery("");
    setSelectedPhotoIds([]);
  };

  const [pickerLoading, setPickerLoading] = useState(false);

  const handleOpenGooglePhotosPicker = async () => {
    const googleAcc = accounts.find((a) => a.provider === "google");
    if (!googleAcc) {
      alert("Please connect a Google Account first to import photos from Google Photos.");
      return;
    }

    try {
      setPickerLoading(true);
      const res = await API.post(`/google/picker/session/${googleAcc._id}`);
      const { id: sessionId, pickerUri } = res.data;

      if (!pickerUri) {
        alert("Failed to get Google Photos Picker URI.");
        return;
      }

      const pickerWin = window.open(pickerUri, "GooglePhotosPicker", "width=600,height=700,top=100,left=300");

      let pollCount = 0;
      const maxPolls = 300; // 15 mins

      const checkTimer = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(checkTimer);
          setPickerLoading(false);
          return;
        }

        try {
          const statusRes = await API.get(`/google/picker/session/${googleAcc._id}/${sessionId}`);
          if (statusRes.data?.mediaItemsSet) {
            clearInterval(checkTimer);
            setPickerLoading(false);
            try {
              if (pickerWin && !pickerWin.closed) pickerWin.close();
            } catch (e) { }

            const importRes = await API.post(`/google/picker/import/${googleAcc._id}`, { sessionId });
            if (importRes.data?.importedCount > 0) {
              fetchTimeline(false);
            }
          }
        } catch (e) {
          console.error("Picker status check error:", e);
        }
      }, 3000);
    } catch (err) {
      console.error("❌ Failed to launch Google Photos Picker:", err);
      alert(err.response?.data?.message || err.message || "Google Photos Picker launch failed.");
      setPickerLoading(false);
    }
  };

  const getProviderSvg = (provider) => {
    switch (provider) {
      case "google": return <IconGoogleDrive />;
      case "google-photos": return <IconGooglePhotos />;
      case "onedrive": return <IconOneDrive />;
      case "dropbox": return <IconDropbox />;
      case "s3": return <IconS3 />;
      default: return <IconCloud />;
    }
  };

  const [purgingGooglePhotos, setPurgingGooglePhotos] = useState(false);

  const handlePurgeGooglePhotos = async () => {
    const confirmPurge = window.confirm(
      "Are you sure you want to delete all imported Google Photos items from your timeline database? This will remove all imported Google Photos media from your timeline."
    );
    if (!confirmPurge) return;

    try {
      setPurgingGooglePhotos(true);
      const res = await API.delete("/photos/google-photos");
      alert(res.data.message || "Imported Google Photos items purged successfully.");
      fetchTimeline(false);
    } catch (err) {
      console.error("❌ Failed to purge Google Photos:", err);
      alert(err.response?.data?.message || "Failed to purge Google Photos items.");
    } finally {
      setPurgingGooglePhotos(false);
    }
  };

  const getProviderName = (provider) => {
    switch (provider) {
      case "google": return "Google Drive";
      case "google-photos": return "Google Photos";
      case "onedrive": return "OneDrive";
      case "dropbox": return "Dropbox";
      case "s3": return "Amazon S3";
      default: return "Cloud Account";
    }
  };

  // Label text for custom View From trigger
  const selectedViewFromText = useMemo(() => {
    if (selectedSourceKeys.length === 0 || selectedSourceKeys.length === sourceCards.length) {
      return `Multiple Accounts (${sourceCards.length})`;
    }
    if (selectedSourceKeys.length === 1) {
      const match = sourceCards.find((s) => s.key === selectedSourceKeys[0]);
      return match ? `${match.name} (${match.email})` : "Custom Selection";
    }
    return `${selectedSourceKeys.length} Sources Selected`;
  }, [selectedSourceKeys, sourceCards]);

  return (
    <MainLayout>
      <div className="photos-app-wrapper">
        <div className="photos-layout-grid">

          {/* ==========================================================================
             LEFT SIDEBAR (SPLIT INTO 2 EQUAL VISIBLE PANELS)
             ========================================================================== */}
          <aside className="photos-sidebar-container">

            {/* UPPER PANEL: SOURCES & CLOUD ACCOUNTS (WITH DISTINCT GOOGLE PHOTOS CARD) */}
            <div className="photos-sidebar-panel sidebar-sources-panel">
              <div className="sidebar-section-header">
                <span className="sidebar-title">SOURCES <span className="info-tooltip"></span></span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button className="add-account-btn" onClick={() => window.location.href = "/manage-accounts"}>
                    <IconPlus /> Add Account
                  </button>
                  <button className="import-google-photos-top-btn" onClick={handleOpenGooglePhotosPicker} disabled={pickerLoading} title="Import photos directly from Google Photos">
                    <IconGooglePhotos /> <span>{pickerLoading ? "Importing..." : "Import Photos"}</span>
                  </button>
                </div>
              </div>

              {/* CUSTOM VIEW FROM DROPDOWN MENU */}
              <div className="view-from-wrapper" ref={dropdownRef}>
                <label className="sidebar-field-label">View From</label>
                <div className="custom-view-from-container">
                  <div
                    className="custom-view-from-trigger"
                    onClick={() => setIsViewFromOpen((prev) => !prev)}
                  >
                    <span>{selectedViewFromText}</span>
                    <span style={{ fontSize: "10px", color: "#818cf8" }}>{isViewFromOpen ? "▲" : "▼"}</span>
                  </div>

                  {isViewFromOpen && (
                    <div className="custom-view-from-menu">
                      <div
                        className={`custom-view-from-option ${selectedSourceKeys.length === 0 ? "selected" : ""}`}
                        onClick={() => handleSelectViewFromSource("all")}
                      >
                        <span>Multiple Accounts ({sourceCards.length})</span>
                        {selectedSourceKeys.length === 0 && <span style={{ color: "#818cf8" }}>✓</span>}
                      </div>
                      {sourceCards.map((sc) => {
                        const isSel = selectedSourceKeys.length === 1 && selectedSourceKeys[0] === sc.key;
                        return (
                          <div
                            key={sc.key}
                            className={`custom-view-from-option ${isSel ? "selected" : ""}`}
                            onClick={() => handleSelectViewFromSource(sc.key)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {getProviderSvg(sc.provider)}
                              <span>{sc.name} ({sc.email})</span>
                            </div>
                            {isSel && <span style={{ color: "#818cf8" }}>✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* SELECT ALL ROW */}
              <div className="sidebar-select-all-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={sourceCards.length > 0 && (selectedSourceKeys.length === 0 || selectedSourceKeys.length === sourceCards.length)}
                    onChange={handleToggleSelectAllSources}
                  />
                  <span className="checkbox-text">SELECT ALL</span>
                </label>
                <span className="count-pill">
                  {selectedSourceKeys.length === 0 ? sourceCards.length : selectedSourceKeys.length} / {sourceCards.length}
                </span>
              </div>

              {/* DISTINCT SOURCE CARDS LIST (GOOGLE DRIVE & GOOGLE PHOTOS CARDS INDIVIDUALLY) */}
              <div className="sidebar-accounts-scroll-list">
                {sourceCards.length === 0 ? (
                  <div style={{ fontSize: "11px", color: "#64748b", padding: "8px" }}>No connected cloud sources</div>
                ) : (
                  sourceCards.map((sc) => {
                    const isChecked = selectedSourceKeys.length === 0 || selectedSourceKeys.includes(sc.key);

                    return (
                      <div
                        key={sc.key}
                        className={`sidebar-account-card ${isChecked ? "selected" : ""}`}
                        onClick={() => handleToggleSourceSelect(sc.key)}
                      >
                        <label className="checkbox-label" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSourceSelect(sc.key)}
                          />
                          <div className="account-icon-and-meta">
                            <span className="provider-icon-badge">
                              {getProviderSvg(sc.provider)}
                            </span>
                            <div className="account-text-info">
                              <span className="account-provider-name">{sc.name}</span>
                              <span className="account-email-handle">{sc.email}</span>
                            </div>
                          </div>
                        </label>
                        <div className="account-card-right">
                          <span className="account-item-count">{sc.count}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* LOWER PANEL: BROWSE, FOLDERS, TIMELINE, STORAGE */}
            <div className="photos-sidebar-panel sidebar-browse-panel">
              <div className="sidebar-group">
                <div className="sidebar-group-title">BROWSE</div>
                <nav className="sidebar-nav-list">
                  <button className={`nav-item ${activeCategory === "all_photos" ? "active" : ""}`} onClick={() => setActiveCategory("all_photos")}>
                    <IconGrid /> <span>All Photos</span> <span className="nav-badge">{photos.length}</span>
                  </button>
                  <button className={`nav-item ${activeCategory === "favorites" ? "active" : ""}`} onClick={() => setActiveCategory("favorites")}>
                    <IconHeart /> <span>Favorites</span> <span className="nav-badge">{favorites.length}</span>
                  </button>
                  <button className={`nav-item ${activeCategory === "videos" ? "active" : ""}`} onClick={() => setActiveCategory("videos")}>
                    <IconVideo /> <span>Videos</span> <span className="nav-badge">{metrics.videosCount}</span>
                  </button>
                  <button className={`nav-item ${activeCategory === "screenshots" ? "active" : ""}`} onClick={() => setActiveCategory("screenshots")}>
                    <IconCamera /> <span>Screenshots</span> <span className="nav-badge">{metrics.screenshotsCount}</span>
                  </button>
                  <button className={`nav-item ${activeCategory === "raw" ? "active" : ""}`} onClick={() => setActiveCategory("raw")}>
                    <IconLayers /> <span>RAW Photos</span> <span className="nav-badge">{metrics.rawCount}</span>
                  </button>
                  <button className={`nav-item ${activeCategory === "duplicates" ? "active" : ""}`} onClick={() => setActiveCategory("duplicates")}>
                    <IconDuplicate /> <span>Duplicates</span> <span className="nav-badge">{metrics.duplicatesCount}</span>
                  </button>
                </nav>
              </div>

              {/* DYNAMIC FOLDERS TREE */}
              {Object.keys(folderTree).length > 0 && (
                <div className="sidebar-group">
                  <div className="sidebar-group-title">
                    <span>FOLDERS</span>
                    {selectedFolderFilter !== "all" && (
                      <span
                        style={{ fontSize: "10px", color: "#818cf8", cursor: "pointer", marginLeft: "auto" }}
                        onClick={() => setSelectedFolderFilter("all")}
                      >
                        Clear
                      </span>
                    )}
                  </div>
                  <div className="sidebar-folder-list">
                    {Object.entries(folderTree).flatMap(([provKey, foldersMap]) =>
                      Object.entries(foldersMap).map(([folderName, count]) => (
                        <div
                          key={`${provKey}-${folderName}`}
                          className={`folder-item ${selectedFolderFilter === folderName ? "active" : ""}`}
                          onClick={() => setSelectedFolderFilter(selectedFolderFilter === folderName ? "all" : folderName)}
                          style={{ cursor: "pointer" }}
                        >
                          <IconFolder /> <span>{folderName}</span> <span className="nav-badge">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* DYNAMIC REAL STORAGE GAUGE */}
              <div className="sidebar-group storage-gauge-group">
                <div className="sidebar-group-title">STORAGE</div>
                <div className="storage-card">
                  <div className="radial-progress-box">
                    <svg className="radial-progress-svg" viewBox="0 0 36 36">
                      <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path
                        className="circle-val"
                        strokeDasharray={`${metrics.usedPercent}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="radial-percent-text">{metrics.usedPercent}%</span>
                  </div>
                  <div className="storage-text-meta">
                    <div className="storage-used-label">Used <strong>{formatSize(metrics.totalUsedBytes)}</strong></div>
                    <div className="storage-total-label">Total <strong>{formatSize(metrics.totalQuotaBytes)}</strong></div>
                  </div>
                </div>
                <button className="manage-storage-btn" onClick={() => window.location.href = "/optimize"}>Manage Storage</button>
                <button
                  className="purge-google-photos-btn"
                  onClick={handlePurgeGooglePhotos}
                  disabled={purgingGooglePhotos}
                  title="Remove all imported Google Photos items completely from your timeline database"
                >
                  <IconTrash />
                  <span>{purgingGooglePhotos ? "Purging..." : "Clear Google Photos Library"}</span>
                </button>
              </div>
            </div>

          </aside>

          {/* ==========================================================================
             RIGHT MAIN VIEWPORT (HEADER, METRICS, MEMORIES, GALLERY)
             ========================================================================== */}
          <main className="photos-main-content">

            {/* TOP HEADER */}
            <div className="photos-top-header">
              <div className="photos-title-box">
                <div className="title-row">
                  <div className="title-icon-badge"><IconPhotosApp /></div>
                  <h1>Photos</h1>
                </div>
                <p>Browse, search and manage your memories across all your cloud accounts.</p>
              </div>

              <div className="photos-header-actions">
                <div className="photos-search-box" style={{ width: "260px", position: "relative" }}>
                  <IconSearch />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="photos-search-input"
                    placeholder="Search photos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="photos-view-mode-group">
                  <button className={`photos-view-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>
                    <IconGrid />
                  </button>
                  <button className={`photos-view-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
                    <IconList />
                  </button>
                </div>
              </div>
            </div>

            {/* FILTER CONTROLS BAR */}
            <div className="photos-filter-section">
              <div className="photos-dropdown-filters">
                <select
                  className="photos-select-pill"
                  value={selectedSourceKeys.length === 1 ? selectedSourceKeys[0] : "all"}
                  onChange={(e) => handleSelectViewFromSource(e.target.value)}
                >
                  <option value="all">☁️ All Accounts ({sourceCards.length})</option>
                  {sourceCards.map((sc) => (
                    <option key={sc.key} value={sc.key}>
                      {sc.name} ({sc.email})
                    </option>
                  ))}
                </select>

                <select
                  className="photos-select-pill"
                  value={selectedFolderFilter}
                  onChange={(e) => setSelectedFolderFilter(e.target.value)}
                >
                  <option value="all">📁 All Folders</option>
                  {Array.from(new Set(Object.values(folderTree).flatMap((obj) => Object.keys(obj)))).map((fn) => (
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

                {(selectedSourceKeys.length > 0 || selectedFolderFilter !== "all" || selectedTypeFilter !== "all" || searchQuery || quickPill !== "all") && (
                  <button className="photos-select-pill" onClick={resetAllFilters} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="photos-quick-pills-row">
                {["all", "today", "yesterday", "this_week", "this_month", "favorites", "videos"].map((pillKey) => {
                  const labelMap = {
                    all: "All Media",
                    today: "Today",
                    yesterday: "Yesterday",
                    this_week: "This Week",
                    this_month: "This Month",
                    favorites: "Favorites",
                    videos: "Videos",
                  };
                  return (
                    <button
                      key={pillKey}
                      className={`quick-pill-btn ${quickPill === pillKey ? "active" : ""}`}
                      onClick={() => setQuickPill(pillKey)}
                    >
                      {pillKey === "favorites" && <IconHeart />}
                      {pillKey === "videos" && <IconVideo />}
                      {labelMap[pillKey]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* REAL DYNAMIC METRICS STATS BAR */}
            <div className="photos-metrics-grid">
              <div className="photos-metric-card">
                <div className="metric-icon-box blue"><IconPhotosApp /></div>
                <div className="metric-text-box">
                  <span className="metric-label">Photos</span>
                  <span className="metric-value">{metrics.photosCount}</span>
                  <span className="metric-subtext">items</span>
                </div>
              </div>

              <div className="photos-metric-card">
                <div className="metric-icon-box pink"><IconVideo /></div>
                <div className="metric-text-box">
                  <span className="metric-label">Videos</span>
                  <span className="metric-value">{metrics.videosCount}</span>
                  <span className="metric-subtext">items</span>
                </div>
              </div>

              <div className="photos-metric-card">
                <div className="metric-icon-box purple"><IconCloud /></div>
                <div className="metric-text-box">
                  <span className="metric-label">Accounts</span>
                  <span className="metric-value">{metrics.accountsCount}</span>
                  <span className="metric-subtext">connected</span>
                </div>
              </div>

              <div className="photos-metric-card">
                <div className="metric-icon-box green"><IconDatabase /></div>
                <div className="metric-text-box">
                  <span className="metric-label">Storage Used</span>
                  <span className="metric-value">{formatSize(metrics.totalUsedBytes)}</span>
                  <span className="metric-subtext">of {formatSize(metrics.totalQuotaBytes)}</span>
                </div>
              </div>

              <div className="photos-metric-card">
                <div className="metric-icon-box orange"><IconDuplicate /></div>
                <div className="metric-text-box">
                  <span className="metric-label">Duplicates</span>
                  <span className="metric-value">{metrics.duplicatesCount}</span>
                  <span className="metric-subtext">items</span>
                </div>
              </div>
            </div>

            {/* MEMORIES SECTION (DERIVED 100% FROM REAL MONGODB PHOTOS) */}
            {memoryHighlights.length > 0 && (
              <div className="photos-memories-section">
                <div className="photos-section-header">
                  <div className="memories-header-title">
                    <span>Memories</span>
                    <IconSparkles />
                    <span className="memories-subtitle">Rediscover your best moments</span>
                  </div>
                </div>

                <div className="photos-memories-grid">
                  {memoryHighlights.map((mem) => (
                    <div key={mem.id} className="memory-card" onClick={() => setPreviewModalFile(mem.photo)}>
                      <img src={mem.cover} alt={mem.title} className="memory-card-img" referrerPolicy="no-referrer" />
                      <div className="memory-card-overlay">
                        <h4 className="memory-title">{mem.title}</h4>
                        <p className="memory-date">{mem.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GALLERY TIMELINE GRID */}
            <div className="photos-gallery-wrapper">
              <div className="timeline-group-header">
                <h3>
                  {groupedPhotoSections[0]?.label || "Media Timeline"}
                  <span className="group-count"> ({filteredPhotos.length} items)</span>
                </h3>
              </div>

              {loading ? (
                <div className="gallery-cards-grid">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="skeleton-card" />
                  ))}
                </div>
              ) : filteredPhotos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#94a3b8" }}>
                  <IconPhotosApp />
                  <h3 style={{ margin: "12px 0 6px 0", color: "#f8fafc" }}>No media items found</h3>
                  <p style={{ margin: 0, fontSize: "0.88rem" }}>Try adjusting your account selection or search filters.</p>
                </div>
              ) : (
                groupedPhotoSections.map((sec) => (
                  <div key={sec.label} className="timeline-date-section">
                    <div className="gallery-date-subheader" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>{sec.label} ({sec.items.length})</span>
                      <button
                        style={{ background: "transparent", border: "none", color: "#818cf8", fontSize: "11px", cursor: "pointer" }}
                        onClick={() => handleSelectGroup(sec.items)}
                      >
                        Select Group
                      </button>
                    </div>

                    <div className="gallery-cards-grid">
                      {sec.items.map((p) => {
                        const isSelected = selectedPhotoIds.includes(p.id);
                        const isFav = favorites.includes(p.id);

                        return (
                          <div
                            key={p.id}
                            id={`photo-card-${p.id}`}
                            className={`photo-card-item ${isSelected ? "selected" : ""}`}
                            onClick={() => setPreviewModalFile(p)}
                          >
                            <div className="photo-card-media-wrapper">
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

                              <button
                                className={`photo-favorite-btn ${isFav ? "active" : ""}`}
                                onClick={(e) => handleToggleFavorite(e, p.id)}
                              >
                                <IconHeart />
                              </button>
                            </div>

                            <div className="photo-card-minimal-overlay">
                              <div className="photo-card-filename" title={p.name}>{p.name}</div>
                              <div className="photo-card-meta-row">
                                <span className="photo-provider-badge">{p.provider}</span>
                                <span className="photo-size-badge">{formatSize(p.size, p)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              <div ref={sentinelRef} style={{ height: "40px", margin: "20px 0" }} />
            </div>

          </main>
        </div>

        {/* FLOATING BATCH ACTION TOOLBAR */}
        {selectedPhotoIds.length > 0 && (
          <div style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            borderRadius: "16px",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            zIndex: 100,
            color: "#ffffff"
          }}>
            <span style={{ fontSize: "13px", fontWeight: "600" }}>{selectedPhotoIds.length} items selected</span>
            <button
              onClick={handleBatchDownload}
              style={{ background: "#6366f1", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
            >
              Download
            </button>
            <button
              onClick={() => setSelectedPhotoIds([])}
              style={{ background: "rgba(255,255,255,0.1)", color: "#cbd5e1", border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* FILE PREVIEW MODAL */}
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

function deduplicatePhotos(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || !item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getPhotoThumbnail(photo) {
  if (!photo) return "/assets/logo.png";
  const token = localStorage.getItem("token") || "";
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const cleanBase = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;

  if (photo.provider === "google-photos") {
    let cleanTarget = photo.thumbnailUrl || photo.previewUrl || (photo.baseUrl ? `${photo.baseUrl}=w400` : null);
    if (cleanTarget) {
      if (cleanTarget.includes("url=")) {
        try {
          const queryStr = cleanTarget.includes("?") ? cleanTarget.split("?")[1] : "";
          const qUrl = new URLSearchParams(queryStr).get("url");
          if (qUrl) cleanTarget = qUrl;
        } catch (e) { }
      }
      if (cleanTarget.startsWith("http")) {
        const baseWithoutParams = cleanTarget.split("=")[0];
        cleanTarget = `${baseWithoutParams}=w400`;
        return `${cleanBase}/api/google/photos/proxy/${photo.accountId}?url=${encodeURIComponent(cleanTarget)}&token=${encodeURIComponent(token)}`;
      }
    }
  }

  if (photo.provider === "google") {
    if (photo.thumbnailUrl && photo.thumbnailUrl.startsWith("http")) return photo.thumbnailUrl;
    if (photo.thumbnailLink && photo.thumbnailLink.startsWith("http")) return photo.thumbnailLink;
    const fileId = photo.providerFileId || photo.id;
    if (fileId) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400`;
  }

  const rawThumb = photo.thumbnailUrl || photo.thumbnailLink || photo.thumbnail;
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
  if (!photo) return "/assets/logo.png";
  const token = localStorage.getItem("token") || "";
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const cleanBase = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;

  if (photo.provider === "google-photos") {
    let target = photo.thumbnailUrl || photo.previewUrl || (photo.baseUrl ? `${photo.baseUrl}=w400` : null);
    if (target) {
      if (target.includes("url=")) {
        try {
          const queryStr = target.includes("?") ? target.split("?")[1] : "";
          const qUrl = new URLSearchParams(queryStr).get("url");
          if (qUrl) target = qUrl;
        } catch (e) { }
      }
      if (target.startsWith("http")) {
        const clean = target.split("=")[0];
        return `${clean}=w400`;
      }
    }
    return "/assets/logo.png";
  }

  if (!photo.provider || !photo.accountId || !photo.id) return "/assets/logo.png";
  const idKey = photo.provider === "dropbox" ? "path" : "fileId";
  return `${cleanBase}/api/${photo.provider}/open/${photo.accountId}?${idKey}=${encodeURIComponent(photo.id)}&name=${encodeURIComponent(photo.name || "image")}&token=${encodeURIComponent(token)}`;
}

function formatSize(bytes, photo = null) {
  if (bytes && !isNaN(bytes) && Number(bytes) > 0) {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
  }
  if (photo && photo.width && photo.height) {
    return `${photo.width} × ${photo.height}`;
  }
  return "Photo";
}
