const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const app = express();
app.use(cors());

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "data/branches");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage setup: Save Excel files in "data/branches/"
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Defensive: fallback to 'unknown' if branch missing
    const branch = req.body.branch || (req.body['branch'] ? req.body['branch'] : 'unknown');
    cb(null, branch + ".xlsx");
  }
});
const upload = multer({ storage });
// Upload Excel file for a branch (Admin)
app.post("/sync/upload", upload.fields([{ name: 'file', maxCount: 1 }, { name: 'branch', maxCount: 1 }]), (req, res) => {
  // Multer puts non-file fields in req.body
  const branch = req.body.branch;
  const file = req.files && req.files.file && req.files.file[0];
  console.log('[UPLOAD] Incoming upload request:', {
    branch,
    file: file && file.originalname,
    filePath: file && file.path
  });
  if (!branch) {
    console.error('[UPLOAD] Missing branch name');
    return res.status(400).json({ error: "Branch name required" });
  }
  if (!file) {
    console.error('[UPLOAD] File upload failed');
    return res.status(400).json({ error: "File upload failed" });
  }
  console.log(`[UPLOAD] Excel uploaded for branch: ${branch} at ${file.path}`);
  res.json({ message: `Excel uploaded for branch: ${branch}` });
});
// Download Excel file for a branch (User)
app.get("/sync/download", (req, res) => {
 const branch = req.query.branch;
 if (!branch) return res.status(400).json({ error: "Branch name required" });
 res.sendFile(path.resolve(`data/branches/${branch}.xlsx`), (err) => {
   if (err) res.status(404).json({ error: "Branch file not found" });
 });
});
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));