const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const xlsx = require("xlsx");
const app = express();
app.use(cors());

app.use(express.json()); // For parsing JSON bodies

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "data/branches");
// Delete branch Excel file (API for Render.com)
app.use(express.json()); // Ensure JSON body parsing for DELETE
app.delete("/sync/delete-branch-excel", (req, res) => {
  const { branchCode } = req.body;
  if (!branchCode) return res.status(400).json({ error: "Branch code required" });

  const filePath = path.join(__dirname, "data/branches", `branch_${branchCode}.xlsx`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true, message: "Excel file deleted" });
  } else {
    res.status(404).json({ success: false, message: "File not found" });
  }
});
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
  let branch = req.body.branch;
  const file = req.files && req.files.file && req.files.file[0];
  // If branch is missing, extract from filename
  if (!branch && file && file.originalname) {
    const match = file.originalname.match(/^branch_(BR\d{3})\.xlsx$/);
    if (match) branch = match[1];
  }
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

// Find branch by password
app.post("/sync/find-branch-by-password", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: "Password required" });

  const branchesDir = path.join(__dirname, "data/branches");
  let found = null;
  let fileBuffer = null;

  try {
    const files = fs.readdirSync(branchesDir).filter(f => f.endsWith(".xlsx"));
    for (const file of files) {
      const filePath = path.join(branchesDir, file);
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets["branch_details"];
      if (!sheet) continue;
      const data = xlsx.utils.sheet_to_json(sheet);
      // Assume password is in a column named 'password' (case-insensitive)
      const branchRow = data.find(row => row.password == password || row.Password == password);
      if (branchRow) {
        found = {
          branchCode: branchRow.branchCode || branchRow.BranchCode || branchRow.branch_code || branchRow["Branch Code"] || file.replace(/\.xlsx$/, ""),
        };
        if (filePath && fs.existsSync(filePath)) {
          fileBuffer = fs.readFileSync(filePath);
        }
        break;
      }
    }
    if (found && fileBuffer) {
      res.json({ branchCode: found.branchCode, fileBuffer: fileBuffer.toString("base64") });
    } else {
      res.status(404).json({ success: false, message: "Branch not found or file missing" });
    }
  } catch (err) {
    console.error("Error searching branches:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));