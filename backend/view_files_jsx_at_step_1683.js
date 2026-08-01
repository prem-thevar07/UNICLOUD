import fs from "fs";

const editsFile = "C:/Users/prem/.gemini/antigravity-ide/brain/54325f35-25f9-403f-800d-6cd4adafb70b/scratch/all_edits.txt";
const baseFile = "c:/Users/prem/Documents/anti_gravity/de_unicloud_git_init/unicloud/frontend/src/pages/Files.jsx";

const parseEdits = () => {
  const content = fs.readFileSync(editsFile, "utf8");
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  
  const edits = [];
  let currentEdit = null;
  let mode = null;
  let buffer = [];
  let currentChunk = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith("========================================")) {
      if (currentEdit) {
        if (currentChunk) {
          if (mode === "target") currentChunk.target = buffer.join("\n");
          if (mode === "replacement") currentChunk.replacement = buffer.join("\n");
          currentEdit.chunks.push(currentChunk);
          currentChunk = null;
        }
        edits.push(currentEdit);
      }
      currentEdit = { step: 0, tool: "", description: "", chunks: [] };
      mode = null;
      buffer = [];
      continue;
    }

    if (!currentEdit) continue;

    const editHeader = line.match(/^\[EDIT #(\d+)\] Step: (\d+) \| Tool: (\w+)/);
    if (editHeader) {
      currentEdit.step = parseInt(editHeader[2]);
      currentEdit.tool = editHeader[3];
      continue;
    }

    if (line.startsWith("Description: ")) {
      currentEdit.description = line.substring(13);
      continue;
    }

    const chunkHeader = line.match(/^--- Chunk #(\d+)/);
    if (chunkHeader) {
      if (currentChunk) {
        if (mode === "target") currentChunk.target = buffer.join("\n");
        if (mode === "replacement") currentChunk.replacement = buffer.join("\n");
        currentEdit.chunks.push(currentChunk);
      }
      currentChunk = { target: "", replacement: "" };
      mode = null;
      buffer = [];
      continue;
    }

    if (line.startsWith("--- Single Replace ---")) {
      if (currentChunk) {
        if (mode === "target") currentChunk.target = buffer.join("\n");
        if (mode === "replacement") currentChunk.replacement = buffer.join("\n");
        currentEdit.chunks.push(currentChunk);
      }
      currentChunk = { target: "", replacement: "" };
      mode = null;
      buffer = [];
      continue;
    }

    if (line === "Target:") {
      mode = "target";
      buffer = [];
      continue;
    }

    if (line === "Replacement:") {
      if (mode === "target") currentChunk.target = buffer.join("\n");
      mode = "replacement";
      buffer = [];
      continue;
    }

    if (mode === "target" || mode === "replacement") {
      buffer.push(line);
    }
  }

  if (currentEdit) {
    if (currentChunk) {
      if (mode === "target") currentChunk.target = buffer.join("\n");
      if (mode === "replacement") currentChunk.replacement = buffer.join("\n");
      currentEdit.chunks.push(currentChunk);
    }
    edits.push(currentEdit);
  }

  return edits;
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const replaceRegExpFuzzy = (content, target, replacement) => {
  const trimmedTarget = target.trim();
  if (trimmedTarget === "") return content;

  let escaped = escapeRegExp(trimmedTarget);
  escaped = escaped.replace(/\s+/g, '\\s+');
  
  const regex = new RegExp(escaped, '');
  if (regex.test(content)) {
    return content.replace(regex, replacement);
  }
  return null;
};

const run = () => {
  const edits = parseEdits();
  let content = fs.readFileSync(baseFile, "utf8").replace(/\r\n/g, "\n");

  for (let i = 0; i < 36; i++) {
    const edit = edits[i];
    edit.chunks.forEach(chunk => {
      if (chunk.target.trim() !== "") {
        const res = replaceRegExpFuzzy(content, chunk.target, chunk.replacement);
        if (res !== null) content = res;
      }
    });
  }

  const edit37 = edits[36];
  const target37 = edit37.chunks[0].target;
  const res37 = replaceRegExpFuzzy(content, target37, edit37.chunks[0].replacement);
  if (res37 !== null) {
    content = res37;
    console.log("Edit 37 applied successfully!");
  } else {
    console.log("Edit 37 FAILED!");
    
    // Diagnostic print
    const trimmed = target37.trim();
    const targetWords = trimmed.split(/\s+/);
    let matchedPrefix = "";
    for (let j = 0; j < targetWords.length; j++) {
      const testPrefix = targetWords.slice(0, j + 1).join(" ");
      let esc = escapeRegExp(testPrefix).replace(/\s+/g, '\\s+');
      if (new RegExp(esc, '').test(content)) {
        matchedPrefix = testPrefix;
      } else {
        console.log(`Failed to match after word: "${targetWords[j]}"`);
        console.log("Matched prefix:", JSON.stringify(matchedPrefix));
        break;
      }
    }
  }
};

run();
