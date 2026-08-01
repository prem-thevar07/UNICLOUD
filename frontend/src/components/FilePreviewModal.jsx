import React, { useState, useEffect } from "react";
import "./FilePreviewModal.css";

const providerIcons = {
  google: "https://cdn.svgporn.com/logos/google-drive.svg",
  dropbox: "https://cdn.svgporn.com/logos/dropbox.svg",
  onedrive: "https://cdn.svgporn.com/logos/microsoft-onedrive.svg",
  box: "https://cdn.svgporn.com/logos/box.svg",
  s3: "https://cdn.svgporn.com/logos/aws-s3.svg",
};

const formatSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return "-";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const FilePreviewModal = ({ file, isOpen, onClose, onDownload }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Reset state on file change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setLinkCopied(false);
    setCodeCopied(false);
  }, [file]);

  const token = localStorage.getItem("token") || "";
  const getCleanApiUrl = (endpoint) => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
    return `${baseUrl}${endpoint}`;
  };

  const fileName = (file?.name || "").toLowerCase();
  const ext = fileName.split(".").pop();

  const isExcel = ["xlsx", "xls", "csv"].includes(ext);
  const isWord = ["docx", "doc"].includes(ext);
  const isPowerPoint = ["pptx", "ppt"].includes(ext);
  const isDocx = isWord || isExcel || isPowerPoint;
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext);
  const isPdf = ext === "pdf";
  const isVideo = ["mp4", "webm", "ogv", "mov"].includes(ext);
  const isAudio = ["mp3", "wav", "ogg", "m4a"].includes(ext);
  const isText = ["txt", "json", "js", "css", "html", "xml", "csv", "py", "md", "log", "env"].includes(ext);

  const idParamKey = file?.provider === "dropbox" ? "path" : "fileId";
  const accId = file?.accountId || (typeof file?.account === "object" ? file?.account?._id : file?.account) || "default";
  const rawPath = file ? `/api/${file.provider}/open/${accId}?${idParamKey}=${encodeURIComponent(file.id)}&name=${encodeURIComponent(file.name || "file")}` : "";
  const openUrl = file ? `${getCleanApiUrl(rawPath)}&token=${encodeURIComponent(token)}` : "";
  const iframeUrl = file ? `${openUrl}&embed=true` : "";

  // Early return after ALL hooks are declared!
  if (!isOpen || !file) return null;

  const handleCopyLink = () => {
    const publicLink = file.url || file.webContentLink || file.webViewLink || file.sharedLink || file.link || file.previewLink;

    let shareableUrl = publicLink;

    if (!shareableUrl) {
      const origin = window.location.origin;
      shareableUrl = `${origin}/files?openFile=${encodeURIComponent(file.id)}&provider=${encodeURIComponent(file.provider)}`;
    }

    navigator.clipboard.writeText(shareableUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCopyText = async () => {
    try {
      const downloadPath = `/api/${file.provider}/download/${accId}?${idParamKey}=${encodeURIComponent(file.id)}&name=${encodeURIComponent(file.name || "file")}`;
      const downloadUrl = `${getCleanApiUrl(downloadPath)}&token=${encodeURIComponent(token)}`;

      const res = await fetch(downloadUrl);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.error("Copy code error:", err);
      navigator.clipboard.writeText(openUrl);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* TOP BAR TOOLBAR */}
        <header className="preview-modal-header">
          <div className="preview-header-left">
            <img
              src={providerIcons[file.provider] || providerIcons.google}
              alt={file.provider}
              className="preview-provider-icon"
            />
            <div className="preview-file-info">
              <h3 className="preview-file-name" title={file.name}>
                {file.name}
              </h3>
              <div className="preview-file-meta">
                <span className="preview-badge provider-badge">{file.provider?.toUpperCase()}</span>
                {file.size && <span className="preview-badge size-badge">{formatSize(file.size)}</span>}
                {file.accountEmail && <span className="preview-badge email-badge">{file.accountEmail}</span>}
              </div>
            </div>
          </div>

          <div className="preview-header-actions">
            {isExcel && (
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="preview-action-btn secondary"
                title="Open in Microsoft Excel Web Viewer"
              >
                📊 Open in Excel
              </a>
            )}

            {isWord && (
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="preview-action-btn secondary"
                title="Open in Microsoft Word Web Viewer"
              >
                📝 Open in Word
              </a>
            )}

            {isPowerPoint && (
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="preview-action-btn secondary"
                title="Open in Microsoft PowerPoint Web Viewer"
              >
                📂 Open in PowerPoint
              </a>
            )}

            {isImage && (
              <div className="preview-zoom-controls">
                <button className="preview-tool-btn" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} title="Zoom Out">
                  🔍-
                </button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button className="preview-tool-btn" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} title="Zoom In">
                  🔍+
                </button>
                <button className="preview-tool-btn" onClick={() => setRotation((r) => (r + 90) % 360)} title="Rotate">
                  🔄
                </button>
              </div>
            )}

            {isText && (
              <button className="preview-action-btn secondary" onClick={handleCopyText}>
                {codeCopied ? "✅ Copied Code" : "📋 Copy Code"}
              </button>
            )}

            <button className="preview-action-btn secondary" onClick={handleCopyLink}>
              {linkCopied ? "✅ Link Copied" : "🔗 Copy Link"}
            </button>

            <button className="preview-action-btn primary" onClick={() => onDownload && onDownload(file)}>
              📥 Download
            </button>

            <button className="preview-close-btn" onClick={onClose} title="Close Preview">
              ✕
            </button>
          </div>
        </header>

        {/* MAIN VIEWER CANVAS */}
        <main className="preview-modal-body">
          {isImage && (
            <div className="preview-image-wrapper">
              <img
                src={iframeUrl}
                alt={file.name}
                className="preview-image-element"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-in-out",
                }}
              />
            </div>
          )}

          {isPdf && (
            <iframe src={iframeUrl} title={file.name} className="preview-iframe-element" />
          )}

          {isVideo && (
            <div className="preview-media-wrapper">
              {file.provider === "google" ? (
                <iframe src={iframeUrl} title={file.name} className="preview-iframe-element" allow="autoplay" />
              ) : (
                <video src={openUrl} controls autoPlay className="preview-video-element">
                  <source src={openUrl} />
                  Your browser does not support playing this video inline.
                </video>
              )}
            </div>
          )}

          {isAudio && (
            <div className="preview-audio-wrapper">
              {file.provider === "google" ? (
                <iframe src={iframeUrl} title={file.name} className="preview-iframe-element" />
              ) : (
                <div className="preview-audio-card">
                  <div className="audio-wave-icon">🎵</div>
                  <h4 className="audio-title">{file.name}</h4>
                  <audio src={openUrl} controls autoPlay className="preview-audio-element">
                    <source src={openUrl} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
          )}

          {isText && (
            <iframe src={iframeUrl} title={file.name} className="preview-iframe-element" />
          )}

          {isDocx && (
            <iframe src={iframeUrl} title={file.name} className="preview-iframe-element" />
          )}

          {!isImage && !isPdf && !isVideo && !isAudio && !isText && !isDocx && (
            <iframe src={iframeUrl} title={file.name} className="preview-iframe-element" />
          )}
        </main>
      </div>
    </div>
  );
};

export default FilePreviewModal;
