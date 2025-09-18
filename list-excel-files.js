const fs = require("fs");
const path = require("path");

const dirPath = path.join(__dirname, "data/branches");
const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".xlsx"));

console.log("Excel files:", files);
