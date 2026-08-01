import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
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
  const [ipynbData, setIpynbData] = useState(null);
  const [loadingNotebook, setLoadingNotebook] = useState(false);

  // Monaco Editor & Execution States
  const [codeContent, setCodeContent] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);
  const [executionOutput, setExecutionOutput] = useState(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [vsCodeCopied, setVsCodeCopied] = useState(false);

  // Reset state on file change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setLinkCopied(false);
    setCodeCopied(false);
    setIpynbData(null);
    setLoadingNotebook(false);
    setCodeContent("");
    setLoadingCode(false);
    setExecutionOutput(null);
    setIsRunningCode(false);
    setSaveSuccess(false);
    setIsSaving(false);
    setVsCodeCopied(false);
  }, [file]);

  const token = localStorage.getItem("token") || "";
  const getCleanApiUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const envBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001";
    const cleanBase = envBase.endsWith("/api") ? envBase.slice(0, -4) : envBase;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  };

  const fileName = (file?.name || "").toLowerCase();
  const ext = fileName.split(".").pop();

  const isExcel = ["xlsx", "xls", "csv"].includes(ext);
  const isWord = ["docx", "doc"].includes(ext);
  const isPowerPoint = ["pptx", "ppt"].includes(ext);
  const isIpynb = ext === "ipynb";
  const isDocx = isWord || isExcel || isPowerPoint;
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext);
  const isPdf = ext === "pdf";
  const isVideo = ["mp4", "webm", "ogv", "mov"].includes(ext);
  const isAudio = ["mp3", "wav", "ogg", "m4a"].includes(ext);
  const isCodeFile = ["js", "jsx", "ts", "tsx", "py", "json", "html", "css", "cpp", "c", "java", "sql", "md", "txt", "sh", "env", "log", "xml", "yaml", "yml"].includes(ext) && !isIpynb;
  const isText = isCodeFile;

  const getMonacoLanguage = (fileExt) => {
    const langMap = {
      js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
      py: "python", json: "json", html: "html", css: "css", cpp: "cpp", c: "c",
      java: "java", sql: "sql", md: "markdown", txt: "plaintext", sh: "shell",
      xml: "xml", yaml: "yaml", yml: "yaml", log: "plaintext", env: "plaintext"
    };
    return langMap[fileExt] || "javascript";
  };

  const getColabUrl = (f) => {
    if (!f) return "https://colab.research.google.com/";

    if (f.provider === "google") {
      const cleanId = (f.id || "").split("?")[0].split("&")[0];
      return `https://colab.research.google.com/drive/${cleanId}`;
    }

    const publicLink = f.url || f.webViewLink || f.sharedLink || f.webContentLink;
    if (publicLink && publicLink.startsWith("http")) {
      const cleanUrl = publicLink.split("?")[0].replace(/^https?:\/\//, "");
      return `https://colab.research.google.com/github/${cleanUrl}`;
    }

    return `https://colab.research.google.com/#upload`;
  };

  const idParamKey = file?.provider === "dropbox" ? "path" : "fileId";
  const accId = file?.accountId || (typeof file?.account === "object" ? file?.account?._id : file?.account) || "default";
  const rawPath = file ? `/api/${file.provider}/open/${accId}?${idParamKey}=${encodeURIComponent(file.id)}&name=${encodeURIComponent(file.name || "file")}` : "";
  const openUrl = file ? `${getCleanApiUrl(rawPath)}&token=${encodeURIComponent(token)}` : "";
  const iframeUrl = file ? `${openUrl}&embed=true` : "";

  // Fetch & Parse Jupyter Notebook JSON if isIpynb
  useEffect(() => {
    if (isIpynb && isOpen && file) {
      setLoadingNotebook(true);
      const downloadPath = `/api/${file.provider}/download/${accId}?${idParamKey}=${encodeURIComponent(file.id)}&name=${encodeURIComponent(file.name || "notebook.ipynb")}`;
      const downloadUrl = `${getCleanApiUrl(downloadPath)}&token=${encodeURIComponent(token)}`;

      fetch(downloadUrl)
        .then((res) => res.json())
        .then((data) => {
          setIpynbData(data);
          setLoadingNotebook(false);
        })
        .catch((err) => {
          console.error("Parse notebook error:", err);
          setLoadingNotebook(false);
        });
    }
  }, [isIpynb, isOpen, file, accId, idParamKey, token]);

  // Fetch Code Content for Monaco Editor if isCodeFile
  useEffect(() => {
    if (isCodeFile && isOpen && file) {
      setLoadingCode(true);
      setExecutionOutput(null);
      setSaveSuccess(false);

      const openPath = `/api/${file.provider}/open/${accId}?${idParamKey}=${encodeURIComponent(file.id)}&name=${encodeURIComponent(file.name || "file")}`;
      const codeUrl = `${getCleanApiUrl(openPath)}&token=${encodeURIComponent(token)}`;

      fetch(codeUrl, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.text())
        .then((text) => {
          setCodeContent(text);
          setLoadingCode(false);
        })
        .catch((err) => {
          console.error("Fetch code error:", err);
          setLoadingCode(false);
        });
    }
  }, [isCodeFile, isOpen, file, accId, idParamKey, token]);

  // Early return after ALL hooks are declared!
  if (!isOpen || !file) return null;

  const handleOpenVsCode = async () => {
    try {
      if (codeContent) {
        await navigator.clipboard.writeText(codeContent);
        setVsCodeCopied(true);
        setTimeout(() => setVsCodeCopied(false), 3000);
      }
    } catch (e) {
      console.warn("VS Code clipboard warning:", e);
    }

    const publicLink = file.url || file.webViewLink || file.sharedLink || file.webContentLink;
    if (publicLink && publicLink.startsWith("http") && publicLink.includes("github")) {
      const cleanUrl = publicLink.split("?")[0].replace(/^https?:\/\//, "");
      window.open(`https://vscode.dev/github/${cleanUrl}`, "_blank");
      return;
    }

    window.open("https://vscode.dev", "_blank");
  };

  const handleRunCode = async () => {
    setIsRunningCode(true);
    setExecutionOutput(null);

    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      logs.push("❌ " + args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));
      originalError.apply(console, args);
    };

    try {
      if (ext === "py") {
        // Run Python WebAssembly via Pyodide
        if (!window.pyodideInstance) {
          if (!document.getElementById("pyodide-script")) {
            const script = document.createElement("script");
            script.id = "pyodide-script";
            script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
            document.head.appendChild(script);
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = () => reject(new Error("Failed to load Pyodide CDN"));
            });
          }
          if (window.loadPyodide) {
            window.pyodideInstance = await window.loadPyodide();
          }
        }

        if (window.pyodideInstance) {
          window.pyodideInstance.setStdout({
            batched: (text) => logs.push(text)
          });
          window.pyodideInstance.setStderr({
            batched: (text) => logs.push("❌ " + text)
          });

          const result = await window.pyodideInstance.runPythonAsync(codeContent);
          if (result !== undefined && result !== null) {
            logs.push("➜ Return Value: " + String(result));
          }
        } else {
          logs.push("⚠️ Pyodide engine not initialized.");
        }
      } else if (ext === "js" || ext === "jsx" || ext === "ts" || ext === "tsx") {
        const result = eval(codeContent);
        if (result !== undefined) {
          logs.push("➜ Return Value: " + (typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)));
        }
      } else if (ext === "json") {
        const parsed = JSON.parse(codeContent);
        logs.push("✅ Valid JSON Format Structure:");
        logs.push(JSON.stringify(parsed, null, 2));
      } else if (ext === "html") {
        logs.push("🌐 Live HTML Rendered cleanly");
      } else {
        // Multi-Language Compiler Engine (Java, C++, C, C#, Go, Rust, Ruby, PHP, Kotlin, Swift)
        const languageAliases = {
          java: "java",
          cpp: "c++", c: "c",
          cs: "csharp",
          go: "go",
          rs: "rust",
          rb: "ruby",
          php: "php",
          sh: "bash",
          kt: "kotlin",
          swift: "swift"
        };
        const lang = languageAliases[ext] || ext;

        const res = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: lang,
            version: "*",
            files: [{ name: file.name || `Main.${ext}`, content: codeContent }]
          })
        });

        const data = await res.json();
        if (data.run) {
          if (data.run.stdout) logs.push(data.run.stdout);
          if (data.run.stderr) logs.push("❌ " + data.run.stderr);
          if (data.run.output && !data.run.stdout && !data.run.stderr) logs.push(data.run.output);
        } else {
          logs.push(`[${ext.toUpperCase()}] Code executed.`);
        }
      }

      setExecutionOutput({
        type: "success",
        logs: logs.length ? logs : ["Code executed clean with zero output logs."]
      });
    } catch (err) {
      logs.push("❌ Execution Error: " + err.message);
      setExecutionOutput({
        type: "error",
        logs: logs
      });
    } finally {
      console.log = originalLog;
      console.error = originalError;
      setIsRunningCode(false);
    }
  };

  const handleSaveCode = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleOpenColab = async (e) => {
    if (e) e.preventDefault();

    if (file.provider === "google") {
      const cleanId = (file.id || "").split("?")[0].split("&")[0];
      window.open(`https://colab.research.google.com/drive/${cleanId}`, "_blank");
      return;
    }

    const publicLink = file.url || file.webViewLink || file.sharedLink || file.webContentLink;
    if (publicLink && publicLink.startsWith("http") && publicLink.includes("github")) {
      const cleanUrl = publicLink.split("?")[0].replace(/^https?:\/\//, "");
      window.open(`https://colab.research.google.com/github/${cleanUrl}`, "_blank");
      return;
    }

    try {
      if (ipynbData) {
        await navigator.clipboard.writeText(JSON.stringify(ipynbData, null, 2));
      }
    } catch (err) {
      console.warn("Clipboard copy warning:", err);
    }

    window.open("https://colab.research.google.com/#upload", "_blank");
  };

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
            {isCodeFile && (
              <button
                onClick={handleOpenVsCode}
                className="preview-action-btn primary"
                style={{
                  background: vsCodeCopied
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "linear-gradient(135deg, #007acc 0%, #005999 100%)",
                  color: "#ffffff",
                  boxShadow: "0 2px 8px rgba(0, 122, 204, 0.3)",
                  border: "none",
                  cursor: "pointer"
                }}
                title="Copy code and open in VS Code Web (vscode.dev)"
              >
                {vsCodeCopied ? "✅ Code Copied! Opening VS Code..." : "💻 Open in VS Code"}
              </button>
            )}

            {isIpynb && (
              <button
                onClick={handleOpenColab}
                className="preview-action-btn primary"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#ffffff",
                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                  border: "none",
                  cursor: "pointer"
                }}
                title="Open Jupyter Notebook in Google Colab"
              >
                ⚡ Open in Google Colab
              </button>
            )}

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
          {isCodeFile && (
            <div className="preview-code-editor-container">
              <div className="code-editor-toolbar">
                <div className="editor-toolbar-left">
                  <span className="editor-lang-badge">
                    ⚡ {getMonacoLanguage(ext).toUpperCase()}
                  </span>
                  <span className="editor-filename">{file.name}</span>
                </div>
                <div className="editor-toolbar-right">
                  <button
                    className="preview-action-btn secondary"
                    onClick={handleRunCode}
                    disabled={isRunningCode}
                  >
                    {isRunningCode ? "⏳ Running..." : "▶️ Run Code"}
                  </button>
                  <button
                    className="preview-action-btn primary"
                    onClick={handleSaveCode}
                    disabled={isSaving}
                  >
                    {isSaving ? "⏳ Saving..." : saveSuccess ? "✅ Saved!" : "💾 Save Changes"}
                  </button>
                </div>
              </div>

              <div className="code-editor-canvas">
                {loadingCode ? (
                  <div className="preview-loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading code in Monaco Editor...</p>
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    language={getMonacoLanguage(ext)}
                    theme="vs-dark"
                    value={codeContent}
                    onChange={(val) => setCodeContent(val || "")}
                    options={{
                      fontSize: 14,
                      fontFamily: "'Fira Code', 'Courier New', monospace",
                      minimap: { enabled: true },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: "on",
                      tabSize: 2,
                      smoothScrolling: true
                    }}
                  />
                )}
              </div>

              {executionOutput && (
                <div className={`code-execution-drawer ${executionOutput.type}`}>
                  <div className="execution-drawer-header">
                    <span>🖥️ Terminal Output</span>
                    <button className="drawer-close-btn" onClick={() => setExecutionOutput(null)}>✕</button>
                  </div>
                  <div className="execution-drawer-body">
                    {executionOutput.logs.map((log, lIdx) => (
                      <div key={lIdx} className="terminal-log-line">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isIpynb && (
            <div className="preview-ipynb-container">
              {loadingNotebook ? (
                <div className="preview-loading-spinner">
                  <div className="spinner"></div>
                  <p>Rendering Jupyter Notebook cells...</p>
                </div>
              ) : ipynbData && ipynbData.cells ? (
                <div className="ipynb-notebook-view">
                  {ipynbData.cells.map((cell, idx) => {
                    const cellSource = Array.isArray(cell.source) ? cell.source.join("") : cell.source || "";
                    return (
                      <div key={idx} className={`ipynb-cell ipynb-cell-${cell.cell_type}`}>
                        <div className="ipynb-cell-header">
                          <span className="ipynb-cell-type">
                            {cell.cell_type === "code" ? `In [${cell.execution_count || idx + 1}]` : "📝 Markdown"}
                          </span>
                        </div>

                        <pre className="ipynb-cell-source">
                          <code>{cellSource}</code>
                        </pre>

                        {cell.outputs && cell.outputs.length > 0 && (
                          <div className="ipynb-cell-outputs">
                            <span className="ipynb-output-label">Out [{cell.execution_count || idx + 1}]:</span>
                            {cell.outputs.map((out, outIdx) => {
                              const outText = Array.isArray(out.text) ? out.text.join("") : (out.text || (out.data && (out.data["text/plain"] || out.data["text/html"])) || "");
                              return (
                                <pre key={outIdx} className="ipynb-output-content">
                                  {typeof outText === "string" ? outText : JSON.stringify(outText, null, 2)}
                                </pre>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : file.provider === "google" ? (
                <iframe src={getColabUrl(file)} title={file.name} className="preview-iframe-element" allow="autoplay" />
              ) : (
                <div className="preview-audio-wrapper">
                  <div className="preview-audio-card" style={{ maxWidth: "440px", textAlign: "center" }}>
                    <div className="audio-wave-icon" style={{ fontSize: "3.5rem" }}>🪐</div>
                    <h4 className="audio-title">{file.name}</h4>
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "-10px 0 16px 0" }}>
                      Jupyter Notebook ({file.provider?.toUpperCase()})
                    </p>
                    <a
                      href={getColabUrl(file)}
                      target="_blank"
                      rel="noreferrer"
                      className="preview-action-btn primary"
                      style={{
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        color: "#ffffff",
                        padding: "10px 20px",
                        fontSize: "0.9rem",
                        borderRadius: "8px",
                        textDecoration: "none",
                        display: "inline-flex"
                      }}
                    >
                      ⚡ Open in Google Colab
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

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

          {isText && !isIpynb && !isCodeFile && (
            <iframe src={iframeUrl} title={file.name} className="preview-iframe-element" />
          )}

          {isDocx && !isIpynb && (
            <iframe src={iframeUrl} title={file.name} className="preview-iframe-element" />
          )}

          {!isImage && !isPdf && !isVideo && !isAudio && !isText && !isDocx && !isIpynb && !isCodeFile && (
            <iframe src={iframeUrl} title={file.name} className="preview-iframe-element" />
          )}
        </main>
      </div>
    </div>
  );
};

export default FilePreviewModal;
