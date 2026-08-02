/**
 * Strict Media File Whitelist Validator for Unicloud Photos Module
 * @param {string} name 
 * @param {string} mimeType 
 * @returns {boolean}
 */
export function isMediaFile(name = "", mimeType = "") {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();

  // 1. Explicitly reject dotfiles, system files, and code/document extensions
  if (lowerName.startsWith(".")) return false;
  
  const codeDocPattern = /\.(d\.ts|d\.mts|ts|tsx|mts|cts|js|jsx|json|html|css|py|cpp|c|java|sql|md|txt|sh|env|log|xml|yaml|yml|ipynb|pdf|docx?|xlsx?|pptx?|zip|tar|gz|7z|rar|exe|dll|bin|dmg|iso|apk)$/i;
  if (codeDocPattern.test(lowerName)) {
    return false;
  }

  // 2. Strict Whitelist for Images & Videos
  const validImageExts = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "tiff", "raw", "cr2", "nef", "arw", "dng", "svg"];
  const validVideoExts = ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v", "3gp", "ogv"];

  const ext = lowerName.split(".").pop();
  const isImageMime = lowerMime.startsWith("image/");
  const isVideoMime = lowerMime.startsWith("video/");

  const isImageExt = validImageExts.includes(ext);
  const isVideoExt = validVideoExts.includes(ext);

  return (isImageMime || isVideoMime || isImageExt || isVideoExt);
}
