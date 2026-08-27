const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const tempStageDir = path.join(process.env.TEMP || 'C:\\temp', `careervoice-src-${Date.now()}`);
const zipPath = path.join(process.env.TEMP || 'C:\\temp', 'careervoice-source.zip');

const excludeList = new Set([
  'node_modules',
  '.git',
  '.worktrees',
  'dist',
  '.gemini',
  '.system_generated',
  '.temp',
  'tests'
]);

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (excludeList.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(tempStageDir)) {
  fs.rmSync(tempStageDir, { recursive: true, force: true });
}
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log('Staging files...');
copyDirRecursive(rootDir, tempStageDir);

// Collect all files with exact relative paths
function getAllFiles(dir, base = '') {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(full, rel));
    } else {
      files.push({ fullPath: full, relPath: rel });
    }
  }
  return files;
}

const fileList = getAllFiles(tempStageDir);
console.log(`Found ${fileList.length} files to zip.`);

// Write file manifest for PowerShell
const manifestPath = path.join(process.env.TEMP || 'C:\\temp', `manifest-${Date.now()}.json`);
fs.writeFileSync(manifestPath, JSON.stringify(fileList), 'utf-8');

console.log('Creating zip archive with POSIX forward slashes (/)...');
const psScript = `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$manifest = Get-Content -Raw '${manifestPath.replace(/\\/g, '\\\\')}' | ConvertFrom-Json
$targetZip = '${zipPath.replace(/\\/g, '\\\\')}'

$zip = [System.IO.Compression.ZipFile]::Open($targetZip, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($f in $manifest) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.fullPath, $f.relPath, [System.IO.Compression.CompressionLevel]::Optimal)
}
$zip.Dispose()
`;

execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], { stdio: 'inherit' });

fs.rmSync(tempStageDir, { recursive: true, force: true });
fs.unlinkSync(manifestPath);

const stat = fs.statSync(zipPath);
console.log(`Successfully created source zip: ${zipPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
