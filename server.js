const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const app = express();
app.use(cors());
// Storage setup: Save Excel files in "data/branches/"
const storage = multer.diskStorage({
 destination: (req, file, cb) => cb(null, "data/branches"),
 filename: (req, file, cb) => cb(null, req.body.branch + ".xlsx")
});
const upload = multer({ storage });
// Upload Excel file for a branch (Admin)
app.post("/sync/upload", upload.single("file"), (req, res) => {
 if (!req.body.branch) return res.status(400).json({ error: "Branch name required" });
 res.json({ message: `Excel uploaded for branch: ${req.body.branch}` });
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