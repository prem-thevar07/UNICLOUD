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
  <img src="/assets/drive.png" alt="Google Drive" style={{ width: "18px", height: "18px", objectFit: "contain", flexShrink: 0 }} />
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
  <img
    src="/assets/s3.svg"
    alt="Amazon S3"
    style={{
      width: "22px",
      height: "22px",
      objectFit: "contain",
      borderRadius: "4px",
      flexShrink: 0
    }}
  />
);

const IconBox = () => (
  <svg width="28" height="15" viewBox="0 0 444.893 245.414" fill="none">
    <g fill="#0075C9">
      <path d="M239.038 72.43c-33.081 0-61.806 18.6-76.322 45.904-14.516-27.305-43.24-45.902-76.32-45.902-19.443 0-37.385 6.424-51.821 17.266V16.925h-.008C34.365 7.547 26.713 0 17.286 0 7.858 0 .208 7.547.008 16.925H0v143.333h.036c.768 47.051 39.125 84.967 86.359 84.967 33.08 0 61.805-18.603 76.32-45.908 14.517 27.307 43.241 45.906 76.321 45.906 47.715 0 86.396-38.684 86.396-86.396.001-47.718-38.682-86.397-86.394-86.397zM86.395 210.648c-28.621 0-51.821-23.201-51.821-51.82 0-28.623 23.201-51.823 51.821-51.823 28.621 0 51.822 23.2 51.822 51.823 0 28.619-23.201 51.82-51.822 51.82zm152.643 0c-28.622 0-51.821-23.201-51.821-51.822 0-28.623 23.2-51.821 51.821-51.821 28.619 0 51.822 23.198 51.822 51.821-.001 28.621-23.203 51.822-51.822 51.822z"/>
      <path d="M441.651 218.033l-44.246-59.143 44.246-59.144-.008-.007c5.473-7.62 3.887-18.249-3.652-23.913-7.537-5.658-18.187-4.221-23.98 3.157l-.004-.002-38.188 51.047-38.188-51.047-.006.009c-5.793-7.385-16.441-8.822-23.981-3.16-7.539 5.664-9.125 16.293-3.649 23.911l-.008.005 44.245 59.144-44.245 59.143.008.005c-5.477 7.62-3.89 18.247 3.649 23.909 7.54 5.664 18.188 4.225 23.981-3.155l.006.007 38.188-51.049 38.188 51.049.004-.002c5.794 7.377 16.443 8.814 23.98 3.154 7.539-5.662 9.125-16.291 3.652-23.91l.008-.008z"/>
    </g>
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

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheckTick = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CheckIndicator = ({ checked }) => (
  <span style={{ width: "16px", height: "16px", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {checked ? <IconCheckTick /> : null}
  </span>
);

const IconDatabase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const getProviderName = (provider) => {
  switch (provider) {
    case "google": return "Google Drive";
    case "google-photos": return "Google Photos";
    case "onedrive": return "OneDrive";
    case "dropbox": return "Dropbox";
    case "box": return "Box";
    case "s3": return "Amazon S3";
    default: return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Cloud Account";
  }
};

const getProviderSvg = (provider) => {
  switch (provider) {
    case "google": return <IconGoogleDrive />;
    case "google-photos": return <IconGooglePhotos />;
    case "onedrive": return <IconOneDrive />;
    case "dropbox": return <IconDropbox />;
    case "s3": return <IconS3 />;
    case "box": return <IconBox />;
    default: return <IconCloud />;
  }
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
  const [selectedSourceKeys, setSelectedSourceKeys] = useState(null);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [quickPill, setQuickPill] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [isViewFromOpen, setIsViewFromOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [expandedAccountKeys, setExpandedAccountKeys] = useState([]);
  const [selectAccountModalOpen, setSelectAccountModalOpen] = useState(false);

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

  const accountFilterRef = useRef(null);
  const folderFilterRef = useRef(null);
  const typeFilterRef = useRef(null);

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("unicloud_photo_favorites", JSON.stringify(favorites));
    } catch (e) {
      console.warn("Failed to persist favorites:", e);
    }
  }, [favorites]);

  // Close custom dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsViewFromOpen(false);
      }
      if (
        accountFilterRef.current && !accountFilterRef.current.contains(e.target) &&
        folderFilterRef.current && !folderFilterRef.current.contains(e.target) &&
        typeFilterRef.current && !typeFilterRef.current.contains(e.target)
      ) {
        setOpenDropdown(null);
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
      const email = acc.accountEmail || acc.email || acc.username || "Google Account";
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
          status: acc.status,
        });

        // 2. Google Photos Card (Distinct Card)
        const photosCount = photos.filter((p) => p.accountId === acc._id && p.provider === "google-photos").length;
        list.push({
          id: acc._id,
          key: `${acc._id}_google-photos`,
          provider: "google-photos",
          name: "Google Photos",
          email,
          count: photosCount,
          status: acc.status,
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
          status: acc.status,
        });
      }
    });
    return list;
  }, [accounts, photos]);

  const handleSelectPreviewFile = useCallback((targetFile) => {
    if (!targetFile) {
      setPreviewModalFile(null);
      return;
    }

    const pSourceKey = targetFile.provider === "google-photos"
      ? `${targetFile.accountId}_google-photos`
      : targetFile.provider === "google"
        ? `${targetFile.accountId}_google`
        : targetFile.accountId;

    const sourceCard = sourceCards.find((s) => s.key === pSourceKey || s.id === targetFile.accountId || s.key === targetFile.accountId);
    const email = targetFile.accountEmail || sourceCard?.email || targetFile.email || "";

    setPreviewModalFile({
      ...targetFile,
      accountEmail: email
    });
  }, [sourceCards]);

  const activeSourceKeys = useMemo(() => {
    return selectedSourceKeys ?? sourceCards.map((s) => s.key);
  }, [selectedSourceKeys, sourceCards]);

  const nextCursorRef = useRef(null);
  const hasMoreRef = useRef(true);

  /* ==========================================================================
     FETCH TIMELINE BATCH FROM TIMELINE ENGINE SERVICE
     ========================================================================== */
  const fetchTimeline = useCallback(
    async (isLoadMore = false) => {
      const currentCursor = nextCursorRef.current;
      if (isLoadMore) {
        if (loadingMoreRef.current || !hasMoreRef.current || !currentCursor) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
        setNextCursor(null);
        nextCursorRef.current = null;
        setHasMore(true);
        hasMoreRef.current = true;
      }

      try {
        const params = { limit: 60 };
        if (isLoadMore && currentCursor) {
          params.cursor = currentCursor;
        }

        if (selectedSourceKeys && selectedSourceKeys.length > 0) {
          params.accountIds = selectedSourceKeys.join(",");
        }

        if (selectedFolderFilter && selectedFolderFilter !== "all") {
          params.folder = selectedFolderFilter;
        }

        if (selectedTypeFilter !== "all") {
          params.type = selectedTypeFilter;
        } else if (activeCategory === "videos" || quickPill === "videos") {
          params.type = "video";
        }

        if (["today", "yesterday", "this_week", "this_month"].includes(quickPill)) {
          params.preset = quickPill;
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
        nextCursorRef.current = nextCurs;

        setHasMore(more);
        hasMoreRef.current = more;
      } catch (err) {
        console.error("❌ Failed to fetch photos timeline:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [selectedSourceKeys, selectedFolderFilter, selectedTypeFilter, activeCategory, quickPill]
  );

  useEffect(() => {
    fetchTimeline(false);
  }, [selectedSourceKeys, selectedFolderFilter, selectedTypeFilter, activeCategory, quickPill]);

  /* ==========================================================================
     BACKGROUND PRE-FETCH SENTINEL OBSERVER (600PX VIEWPORT THRESHOLD)
     ========================================================================== */
  const sentinelRef = useCallback(
    (node) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreRef.current && nextCursorRef.current && !loadingMoreRef.current) {
            fetchTimeline(true);
          }
        },
        { rootMargin: "600px", threshold: 0 }
      );

      observerRef.current.observe(node);
    },
    [fetchTimeline]
  );

  /* ==========================================================================
     FILTERED PHOTOS & REAL DYNAMIC METRICS
     ========================================================================== */
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      // 1. Source Card Filter (Google Drive vs Google Photos vs OneDrive vs Dropbox)
      const pSourceKey = p.provider === "google-photos" ? `${p.accountId}_google-photos` : p.provider === "google" ? `${p.accountId}_google` : p.accountId;
      if (!activeSourceKeys.includes(pSourceKey)) {
        return false;
      }

      // 1.5 Folder Filter
      if (selectedFolderFilter !== "all") {
        const itemFolder = p.parentFolder || p.album || p.folderPath?.split("/").filter(Boolean).pop() || "Root";
        const targetFolder = selectedFolderFilter.toLowerCase();
        const matchesFolder = itemFolder.toLowerCase() === targetFolder ||
                              p.parentFolder?.toLowerCase() === targetFolder ||
                              p.album?.toLowerCase() === targetFolder ||
                              (p.folderPath && p.folderPath.toLowerCase().includes(targetFolder));
        if (!matchesFolder) return false;
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
      } else if (quickPill === "google_photos" && p.provider !== "google-photos") {
        return false;
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
  }, [photos, activeSourceKeys, selectedFolderFilter, activeCategory, favorites, quickPill, searchQuery]);

  // Derived Dynamic Folder Tree from Real Photos (Mapped by Account Source Key)
  const folderTree = useMemo(() => {
    const tree = {};
    photos.forEach((p) => {
      const folderName = p.parentFolder || p.album || p.folderPath?.split("/").filter(Boolean).pop() || "Root";
      const sourceKey = p.provider === "google-photos" ? `${p.accountId}_google-photos` : p.provider === "google" ? `${p.accountId}_google` : p.accountId;
      if (!tree[sourceKey]) tree[sourceKey] = {};
      tree[sourceKey][folderName] = (tree[sourceKey][folderName] || 0) + 1;
    });
    return tree;
  }, [photos]);



  const toggleAccountExpand = (key) => {
    setExpandedAccountKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

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
    if (activeSourceKeys.length === sourceCards.length) {
      setSelectedSourceKeys([]);
    } else {
      setSelectedSourceKeys(null);
    }
  };

  const handleToggleSourceSelect = (key) => {
    setSelectedSourceKeys((prev) => {
      const current = prev ?? sourceCards.map((s) => s.key);
      if (current.includes(key)) {
        const next = current.filter((k) => k !== key);
        return next.length === sourceCards.length ? null : next;
      } else {
        const next = [...current, key];
        return next.length === sourceCards.length ? null : next;
      }
    });
  };

  const handleSelectViewFromSource = (key) => {
    if (key === "all") {
      setSelectedSourceKeys(null);
    } else {
      setSelectedSourceKeys([key]);
    }
    setIsViewFromOpen(false);
  };

  const handleAccountHeaderClick = (scKey, e) => {
    e.stopPropagation();
    toggleAccountExpand(scKey);
    if (activeSourceKeys.length === 1 && activeSourceKeys[0] === scKey) {
      setSelectedSourceKeys(null);
      setSelectedFolderFilter("all");
    } else {
      setSelectedSourceKeys([scKey]);
      setSelectedFolderFilter("all");
    }
  };

  const handleFolderClick = (scKey, folderName, e) => {
    e.stopPropagation();
    setSelectedSourceKeys([scKey]);
    if (selectedFolderFilter === folderName) {
      setSelectedFolderFilter("all");
    } else {
      setSelectedFolderFilter(folderName);
    }
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
    setSelectedSourceKeys(null);
    setSelectedFolderFilter("all");
    setSelectedTypeFilter("all");
    setQuickPill("all");
    setSearchQuery("");
    setSelectedPhotoIds([]);
  };

  const handleQuickPillClick = (key) => {
    setQuickPill(key);
    if (key === "google_photos") {
      const allGPhotosKeys = sourceCards.filter((s) => s.provider === "google-photos").map((s) => s.key);
      if (allGPhotosKeys.length > 0) {
        setSelectedSourceKeys(allGPhotosKeys);
      }
    } else if (key === "all") {
      setSelectedSourceKeys(null);
      setSelectedFolderFilter("all");
    }
  };

  const [pickerLoading, setPickerLoading] = useState(false);

  const handleOpenGooglePhotosPicker = () => {
    const googleAccounts = accounts.filter((a) => a.provider === "google");
    if (googleAccounts.length === 0) {
      alert("Please connect a Google Account first to import photos from Google Photos.");
      return;
    }

    if (googleAccounts.length === 1) {
      triggerPickerForAccount(googleAccounts[0]);
    } else {
      setSelectAccountModalOpen(true);
    }
  };

  const triggerPickerForAccount = async (account) => {
    setSelectAccountModalOpen(false);
    try {
      setPickerLoading(true);
      const res = await API.post(`/google/picker/session/${account._id}`);
      const { id: sessionId, pickerUri } = res.data;

      if (!pickerUri) {
        alert("Failed to get Google Photos Picker URI.");
        setPickerLoading(false);
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
          const statusRes = await API.get(`/google/picker/session/${account._id}/${sessionId}`);
          if (statusRes.data?.mediaItemsSet) {
            clearInterval(checkTimer);
            setPickerLoading(false);
            try {
              if (pickerWin && !pickerWin.closed) pickerWin.close();
            } catch (e) { }

            const importRes = await API.post(`/google/picker/import/${account._id}`, { sessionId });
            if (importRes.data?.importedCount > 0) {
              const googlePhotosKey = `${account._id}_google-photos`;
              setSelectedSourceKeys([googlePhotosKey]);
              setSelectedFolderFilter("all");
              setSelectedTypeFilter("all");
              setQuickPill("all");
              setSearchQuery("");
              await fetchTimeline(false);
            }
          }
        } catch (e) {
          console.error("Picker status check error:", e);
        }
      }, 3000);
    } catch (err) {
      console.error("❌ Failed to launch Google Photos Picker:", err);
      const msg = err.response?.data?.message || err.message || "Google Photos Picker launch failed.";
      const isScopeError = err.response?.data?.requiresReconnect || msg.toLowerCase().includes("permission missing") || msg.toLowerCase().includes("insufficient authentication scopes") || msg.toLowerCase().includes("permission_denied");

      if (isScopeError) {
        const goReconnect = window.confirm(
          `Google Photos permission is missing for account (${account.accountEmail || account.email || "Google Account"}).\n\nWould you like to go to Manage Accounts to reconnect this Google Account and grant Google Photos access?`
        );
        if (goReconnect) {
          window.location.href = "/manage-accounts";
        }
      } else {
        alert(msg);
      }
      setPickerLoading(false);
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



  // Label text for custom View From trigger
  const selectedViewFromText = useMemo(() => {
    if (activeSourceKeys.length === sourceCards.length) {
      return `Multiple Accounts (${sourceCards.length})`;
    }
    if (activeSourceKeys.length === 1) {
      const match = sourceCards.find((s) => s.key === activeSourceKeys[0]);
      return match ? `${match.name} (${match.email})` : "Custom Selection";
    }
    return `${activeSourceKeys.length} Sources Selected`;
  }, [activeSourceKeys, sourceCards]);

  return (
    <MainLayout>
      <div className="photos-app-wrapper">
        <div className="photos-layout-grid">

          {/* ==========================================================================
             LEFT SIDEBAR (SPLIT INTO 2 EQUAL VISIBLE PANELS)
             ========================================================================== */}
          <aside className="photos-sidebar-container">

            {/* UPPER PANEL: MEDIA FOLDERS ACCORDION TREE BY CLOUD ACCOUNT */}
            <div className="photos-sidebar-panel sidebar-sources-panel">
              <div className="sidebar-section-header-col">
                <span className="sidebar-title">Accounts</span>
                <div className="sidebar-action-buttons-row">
                  <button className="add-account-btn" onClick={() => window.location.href = "/manage-accounts"}>
                    <IconPlus /> <span>Add Account</span>
                  </button>
                  <button className="import-google-photos-top-btn" onClick={handleOpenGooglePhotosPicker} disabled={pickerLoading} title="Import photos directly from Google Photos">
                    <IconGooglePhotos /> <span>{pickerLoading ? "Importing..." : "Add from Photos"}</span>
                  </button>
                </div>
              </div>

              {selectedFolderFilter !== "all" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "rgba(99, 102, 241, 0.15)", borderRadius: "8px", margin: "6px 0", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                  <span style={{ fontSize: "11px", color: "#a5b4fc" }}>Active Folder: <strong>{selectedFolderFilter}</strong></span>
                  <span
                    style={{ fontSize: "10px", color: "#818cf8", cursor: "pointer", fontWeight: 700 }}
                    onClick={() => setSelectedFolderFilter("all")}
                  >
                    Clear
                  </span>
                </div>
              )}

              {/* ACCORDION MEDIA FOLDERS TREE BY CLOUD ACCOUNT */}
              <div className="sidebar-accounts-tree-list">
                {sourceCards.length === 0 ? (
                  <div style={{ fontSize: "11px", color: "#64748b", padding: "8px" }}>No connected cloud sources</div>
                ) : (
                  sourceCards.map((sc) => {
                    const isExpanded = expandedAccountKeys.includes(sc.key);
                    const isAccountActive = activeSourceKeys.length === 1 && activeSourceKeys[0] === sc.key;
                    const sourceFolders = folderTree[sc.key] || {};
                    const folderEntries = Object.entries(sourceFolders);

                    return (
                      <div key={sc.key} className={`account-tree-node ${isAccountActive ? "selected-account" : ""}`}>
                        {/* ACCOUNT HEADER CARD */}
                        <div
                          className={`account-tree-header ${isExpanded ? "expanded" : ""} ${isAccountActive ? "selected-account" : ""}`}
                          onClick={(e) => handleAccountHeaderClick(sc.key, e)}
                        >
                          <div className="account-header-left">
                            <span className="expand-arrow">{isExpanded ? "▼" : "▶"}</span>
                            <span className="provider-icon-badge">{getProviderSvg(sc.provider)}</span>
                            <div className="account-text-info">
                              <span className="account-provider-name">{sc.name}</span>
                              <span className="account-email-handle">
                                {sc.email}
                                {sc.status === "expired" && (
                                  <span
                                    style={{ marginLeft: "6px", fontSize: "10px", color: "#f87171", fontWeight: 700 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = "/manage-accounts";
                                    }}
                                    title="Token expired. Click to reconnect account."
                                  >
                                    ⚠️ Reconnect
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="account-item-count">{sc.count}</span>
                        </div>

                        {/* EXPANDABLE MEDIA FOLDERS SUBLIST (ONLY SHOWS FOLDERS CONTAINING IMAGES/VIDEOS) */}
                        {isExpanded && (
                          <div className="account-tree-folders">
                            {folderEntries.length === 0 ? (
                              <div className="empty-folders-note">No photo folders found</div>
                            ) : (
                              folderEntries.map(([folderName, count]) => {
                                const isSelected = isAccountActive && selectedFolderFilter === folderName;
                                return (
                                  <div
                                    key={folderName}
                                    className={`tree-folder-item ${isSelected ? "selected" : ""}`}
                                    onClick={(e) => handleFolderClick(sc.key, folderName, e)}
                                  >
                                    <IconFolder />
                                    <span className="folder-name-text">{folderName}</span>
                                    <span className="folder-count-badge">{count}</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
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

            {/* TOP HEADER WITH INTEGRATED GLASS SEARCH BAR */}
            <div className="photos-top-header">
              <div className="photos-title-box">
                <div className="title-row">
                  <div className="title-icon-badge"><IconPhotosApp /></div>
                  <h1>Photos</h1>
                </div>
                <p>Browse, search and manage your memories across all your cloud accounts.</p>
              </div>

              <div className="photos-header-actions">
                <div className="photos-search-box-redesigned">
                  <span className="search-icon-wrapper"><IconSearch /></span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="photos-search-input-redesigned"
                    placeholder="Search photos, folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery ? (
                    <button className="search-clear-btn" onClick={() => setSearchQuery("")}>
                      <IconClose />
                    </button>
                  ) : (
                    <span className="search-kbd-badge">Ctrl K</span>
                  )}
                </div>



              </div>
            </div>

            {/* FILTER CONTROLS BAR (100% CUSTOM EMOJI-FREE DROPDOWNS & SVG PRESETS) */}
            <div className="photos-filter-section">
              <div className="photos-dropdown-filters">

                {/* ACCOUNT CUSTOM MULTI-SELECT DROPDOWN */}
                <div className="custom-dropdown-container" ref={accountFilterRef}>
                  <button
                    type="button"
                    className={`custom-dropdown-trigger ${openDropdown === "account" ? "open" : ""}`}
                    onClick={() => setOpenDropdown((prev) => (prev === "account" ? null : "account"))}
                  >
                    <IconCloud />
                    <span>
                      {activeSourceKeys.length === sourceCards.length
                        ? `All Accounts (${sourceCards.length})`
                        : activeSourceKeys.length === 1
                          ? sourceCards.find((s) => s.key === activeSourceKeys[0])?.name || "1 Account Selected"
                          : `${activeSourceKeys.length} Accounts Selected`}
                    </span>
                    <span className="dropdown-chevron">{openDropdown === "account" ? "▲" : "▼"}</span>
                  </button>

                  {openDropdown === "account" && (
                    <div className="custom-dropdown-menu" style={{ minWidth: "240px" }}>
                      <div
                        className={`custom-dropdown-item ${activeSourceKeys.length === sourceCards.length ? "active" : ""}`}
                        onClick={handleToggleSelectAllSources}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <CheckIndicator checked={sourceCards.length > 0 && activeSourceKeys.length === sourceCards.length} />
                          <span style={{ fontWeight: 600 }}>Select All ({sourceCards.length})</span>
                        </div>
                      </div>
                      {sourceCards.map((sc) => {
                        const isChecked = activeSourceKeys.includes(sc.key);
                        return (
                          <div
                            key={sc.key}
                            className={`custom-dropdown-item ${isChecked ? "active" : ""}`}
                            onClick={() => handleToggleSourceSelect(sc.key)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <CheckIndicator checked={isChecked} />
                              {getProviderSvg(sc.provider)}
                              <span>{sc.name} ({sc.email})</span>
                            </div>
                            <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "auto" }}>{sc.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* FOLDER CUSTOM DROPDOWN */}
                <div className="custom-dropdown-container" ref={folderFilterRef}>
                  <button
                    type="button"
                    className={`custom-dropdown-trigger ${openDropdown === "folder" ? "open" : ""}`}
                    onClick={() => setOpenDropdown((prev) => (prev === "folder" ? null : "folder"))}
                  >
                    <IconFolder />
                    <span>{selectedFolderFilter === "all" ? "All Folders" : selectedFolderFilter}</span>
                    <span className="dropdown-chevron">{openDropdown === "folder" ? "▲" : "▼"}</span>
                  </button>

                  {openDropdown === "folder" && (
                    <div className="custom-dropdown-menu">
                      <div
                        className={`custom-dropdown-item ${selectedFolderFilter === "all" ? "active" : ""}`}
                        onClick={() => { setSelectedFolderFilter("all"); setOpenDropdown(null); }}
                      >
                        <IconFolder />
                        <span>All Folders</span>
                        {selectedFolderFilter === "all" && <span className="item-check">✓</span>}
                      </div>
                      {Array.from(new Set(Object.values(folderTree).flatMap((obj) => Object.keys(obj)))).map((fn) => (
                        <div
                          key={fn}
                          className={`custom-dropdown-item ${selectedFolderFilter === fn ? "active" : ""}`}
                          onClick={() => { setSelectedFolderFilter(fn); setOpenDropdown(null); }}
                        >
                          <IconFolder />
                          <span>{fn}</span>
                          {selectedFolderFilter === fn && <span className="item-check">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TYPE CUSTOM DROPDOWN */}
                <div className="custom-dropdown-container" ref={typeFilterRef}>
                  <button
                    type="button"
                    className={`custom-dropdown-trigger ${openDropdown === "type" ? "open" : ""}`}
                    onClick={() => setOpenDropdown((prev) => (prev === "type" ? null : "type"))}
                  >
                    <IconLayers />
                    <span>
                      {selectedTypeFilter === "all"
                        ? "All Types"
                        : selectedTypeFilter === "image"
                          ? "Photos Only"
                          : "Videos Only"}
                    </span>
                    <span className="dropdown-chevron">{openDropdown === "type" ? "▲" : "▼"}</span>
                  </button>

                  {openDropdown === "type" && (
                    <div className="custom-dropdown-menu">
                      <div
                        className={`custom-dropdown-item ${selectedTypeFilter === "all" ? "active" : ""}`}
                        onClick={() => { setSelectedTypeFilter("all"); setOpenDropdown(null); }}
                      >
                        <IconLayers />
                        <span>All Types</span>
                        {selectedTypeFilter === "all" && <span className="item-check">✓</span>}
                      </div>
                      <div
                        className={`custom-dropdown-item ${selectedTypeFilter === "image" ? "active" : ""}`}
                        onClick={() => { setSelectedTypeFilter("image"); setOpenDropdown(null); }}
                      >
                        <IconPhotosApp />
                        <span>Photos Only</span>
                        {selectedTypeFilter === "image" && <span className="item-check">✓</span>}
                      </div>
                      <div
                        className={`custom-dropdown-item ${selectedTypeFilter === "video" ? "active" : ""}`}
                        onClick={() => { setSelectedTypeFilter("video"); setOpenDropdown(null); }}
                      >
                        <IconVideo />
                        <span>Videos Only</span>
                        {selectedTypeFilter === "video" && <span className="item-check">✓</span>}
                      </div>
                    </div>
                  )}
                </div>

                {(activeSourceKeys.length < sourceCards.length || selectedFolderFilter !== "all" || selectedTypeFilter !== "all" || searchQuery || quickPill !== "all") && (
                  <button className="reset-filters-btn" onClick={resetAllFilters}>
                    <IconClose />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              {/* QUICK PRESET PILLS (100% SVG VECTOR ICONS) */}
              <div className="photos-quick-pills-row">
                {[
                  { key: "all", label: "All Media", icon: <IconGrid /> },
                  { key: "google_photos", label: "Google Photos", icon: <IconGooglePhotos /> },
                  { key: "favorites", label: "Favorites", icon: <IconHeart /> },
                  { key: "videos", label: "Videos", icon: <IconVideo /> },
                  { key: "today", label: "Today", icon: <IconCalendar /> },
                  { key: "yesterday", label: "Yesterday", icon: <IconCalendar /> },
                  { key: "this_week", label: "This Week", icon: <IconCalendar /> },
                  { key: "this_month", label: "This Month", icon: <IconCalendar /> }
                ].map((pill) => (
                  <button
                    key={pill.key}
                    className={`quick-pill-btn ${quickPill === pill.key ? "active" : ""}`}
                    onClick={() => handleQuickPillClick(pill.key)}
                  >
                    {pill.icon}
                    <span>{pill.label}</span>
                  </button>
                ))}
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
                        const pSourceKey = p.provider === "google-photos" ? `${p.accountId}_google-photos` : p.provider === "google" ? `${p.accountId}_google` : p.accountId;
                        const sourceCard = sourceCards.find((s) => s.key === pSourceKey);
                        const accountHandle = sourceCard?.name || getProviderName(p.provider);

                        return (
                          <div
                            key={p.id}
                            id={`photo-card-${p.id}`}
                            className={`photo-card-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectPreviewFile(p)}
                          >
                            <div className="photo-card-media-wrapper">
                              {isVideoFile(p) ? (
                                <div className="photo-card-video-wrapper">
                                  {p.provider === "s3" || p.provider === "box" ? (
                                    <video
                                      src={getVideoStreamUrl(p)}
                                      className="photo-card-img photo-card-video"
                                      preload="metadata"
                                      muted
                                      playsInline
                                      onLoadedData={(e) => {
                                        try { e.currentTarget.currentTime = 1; } catch (err) {}
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={getPhotoThumbnail(p)}
                                      alt={p.name}
                                      className="photo-card-img"
                                      loading="lazy"
                                      decoding="async"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        const videoEl = document.createElement("video");
                                        videoEl.src = getVideoStreamUrl(p);
                                        videoEl.className = "photo-card-img photo-card-video";
                                        videoEl.preload = "metadata";
                                        videoEl.muted = true;
                                        videoEl.playsInline = true;
                                        videoEl.onloadeddata = () => { try { videoEl.currentTime = 1; } catch (err) {} };
                                        if (e.currentTarget.parentNode) {
                                          e.currentTarget.parentNode.replaceChild(videoEl, e.currentTarget);
                                        }
                                      }}
                                    />
                                  )}
                                  <div className="photo-card-video-play-icon">
                                    <IconVideo />
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={getPhotoThumbnail(p)}
                                  alt={p.name}
                                  className="photo-card-img"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/assets/logo.png";
                                  }}
                                />
                              )}

                              {/* SERVICE LOGO ON TOP LEFT */}
                              <div className="photo-card-top-logo">
                                {getProviderSvg(p.provider)}
                              </div>

                              {/* FAVORITE BUTTON ON TOP RIGHT */}
                              <button
                                className={`photo-favorite-btn ${isFav ? "active" : ""}`}
                                onClick={(e) => handleToggleFavorite(e, p.id)}
                              >
                                <IconHeart />
                              </button>
                            </div>

                            {/* BOTTOM OVERLAY: NAME, DATE, SIZE ALL ALIGNED IN 1 LINE */}
                            <div className="photo-card-minimal-overlay">
                              <div className="photo-card-single-line-info">
                                <span className="photo-card-filename" title={p.name}>{p.name}</span>
                                <span className="photo-card-dot">•</span>
                                <span className="photo-card-date">
                                  {new Date(p.photoTakenDate || p.createdDate || p.createdTime || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                                <span className="photo-card-dot">•</span>
                                <span className="photo-card-size">{formatSize(p.size, p)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {/* SENTINEL ELEMENT FOR INFINITE SCROLL PRE-FETCH */}
              <div ref={sentinelRef} style={{ height: "40px", margin: "20px 0" }}>
                {loadingMore && (
                  <div style={{ textAlign: "center", color: "#818cf8", fontSize: "12px" }}>
                    Loading more memories...
                  </div>
                )}
              </div>
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
            onSelectFile={handleSelectPreviewFile}
          />
        )}

        {/* GOOGLE ACCOUNT SELECTION MODAL (MULTI-ACCOUNT SAFE) */}
        {selectAccountModalOpen && (
          <div className="account-picker-modal-overlay" onClick={() => setSelectAccountModalOpen(false)}>
            <div className="account-picker-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="account-picker-modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#f8fafc", fontWeight: 700 }}>Select Google Account</h3>
                <button
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px" }}
                  onClick={() => setSelectAccountModalOpen(false)}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
                Select which connected Google Account you want to import Google Photos from:
              </p>
              <div className="account-picker-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {accounts.filter((a) => a.provider === "google").map((acc) => {
                  const email = acc.accountEmail || acc.email || "Google Account";
                  return (
                    <div
                      key={acc._id}
                      className="account-picker-option-item"
                      onClick={() => triggerPickerForAccount(acc)}
                    >
                      <span className="provider-icon-badge">{getProviderSvg("google")}</span>
                      <div className="account-picker-meta" style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                        <span className="picker-acc-name" style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>Google Account</span>
                        <span className="picker-acc-email" style={{ fontSize: "11px", color: "#818cf8" }}>{email}</span>
                      </div>
                      <span className="picker-select-arrow" style={{ fontSize: "14px", color: "#818cf8", fontWeight: 700 }}>→</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
  const accId = photo.accountId || (typeof photo.account === "object" ? photo.account?._id : photo.account) || "default";

  // 1. Google Photos: Fast =w400 thumbnail from Google CDN proxy
  if (photo.provider === "google-photos") {
    let cleanTarget = photo.thumbnailUrl || photo.previewUrl || photo.baseUrl || "";
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
        return `${cleanBase}/api/google/photos/proxy/${accId}?url=${encodeURIComponent(cleanTarget)}&token=${encodeURIComponent(token)}`;
      }
    }
  }

  // 2. Google Drive: Fast thumbnail endpoint
  if (photo.provider === "google") {
    const fileId = photo.providerFileId || photo.id;
    if (fileId && accId) {
      return `${cleanBase}/api/google/thumbnail/${accId}?fileId=${encodeURIComponent(fileId)}&token=${encodeURIComponent(token)}`;
    }
  }

  // 3. Box: Resilient open route stream with name parameter
  if (photo.provider === "box") {
    const fileId = photo.providerFileId || photo.id;
    if (fileId && accId) {
      return `${cleanBase}/api/box/open/${accId}?fileId=${encodeURIComponent(fileId)}&name=${encodeURIComponent(photo.name || "image.png")}&token=${encodeURIComponent(token)}`;
    }
  }

  // 4. Dropbox: Fast thumbnail endpoint
  if (photo.provider === "dropbox") {
    const pathOrId = photo.providerFileId || photo.id;
    if (pathOrId && accId) {
      return `${cleanBase}/api/dropbox/thumbnail/${accId}?path=${encodeURIComponent(pathOrId)}&token=${encodeURIComponent(token)}`;
    }
  }

  // 5. OneDrive & S3 direct CDN pre-rendered thumbnails
  const rawThumb = photo.thumbnailUrl || photo.thumbnailLink || photo.thumbnail;
  if (rawThumb && rawThumb.startsWith("http") && !rawThumb.includes("googleusercontent.com")) {
    return rawThumb;
  }

  // Fallback to open route
  const fileId = photo.providerFileId || photo.id;
  if (photo.provider && accId && fileId) {
    const idKey = photo.provider === "dropbox" ? "path" : "fileId";
    return `${cleanBase}/api/${photo.provider}/open/${accId}?${idKey}=${encodeURIComponent(fileId)}&name=${encodeURIComponent(photo.name || "image")}&token=${encodeURIComponent(token)}`;
  }

  if (photo.baseUrl) return `${photo.baseUrl}=w400`;
  return "/assets/logo.png";
}

function isVideoFile(photo) {
  if (!photo) return false;
  if (photo.isVideo) return true;
  const mime = (photo.mimeType || photo.type || "").toLowerCase();
  if (mime.startsWith("video/")) return true;
  const name = (photo.name || "").toLowerCase();
  return /\.(mp4|webm|mov|mkv|avi|m4v|flv|wmv|3gp)$/i.test(name);
}

function getVideoStreamUrl(photo) {
  if (!photo) return "";
  const token = localStorage.getItem("token") || "";
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const cleanBase = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;

  if (photo.provider === "google-photos") {
    let cleanTarget = photo.baseUrl || photo.previewUrl || photo.thumbnailUrl || "";
    if (cleanTarget.includes("url=")) {
      try {
        const queryStr = cleanTarget.includes("?") ? cleanTarget.split("?")[1] : "";
        const qUrl = new URLSearchParams(queryStr).get("url");
        if (qUrl) cleanTarget = qUrl;
      } catch (e) {}
    }
    if (cleanTarget.startsWith("http")) {
      const baseWithoutParams = cleanTarget.split("=")[0];
      cleanTarget = `${baseWithoutParams}=dv`;
      return `${cleanBase}/api/google/photos/proxy/${photo.accountId}?url=${encodeURIComponent(cleanTarget)}&token=${encodeURIComponent(token)}`;
    }
  }

  const fileId = photo.providerFileId || photo.id;
  if (photo.provider && photo.accountId && fileId) {
    return `${cleanBase}/api/${photo.provider}/open/${photo.accountId}?fileId=${encodeURIComponent(fileId)}&name=${encodeURIComponent(photo.name || "video")}&token=${encodeURIComponent(token)}`;
  }

  const raw = photo.url || photo.webContentLink || photo.downloadUrl;
  if (raw && raw.startsWith("/api/")) {
    const sep = raw.includes("?") ? "&" : "?";
    return `${cleanBase}${raw}${sep}token=${encodeURIComponent(token)}`;
  }
  return raw || "";
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
