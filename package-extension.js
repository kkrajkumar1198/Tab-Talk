// Script to package the Tab Orchestra extension
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create a file to stream archive data to
const output = fs.createWriteStream(path.join(__dirname, 'tab-orchestra.zip'));
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log('✅ Extension packaged successfully!');
  console.log(`📦 Total size: ${archive.pointer()} bytes`);
  console.log('📂 Output: tab-orchestra.zip');
});

// Handle warnings and errors
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('⚠️ Warning:', err);
  } else {
    throw err;
  }
});

archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Files and directories to include
const filesToInclude = [
  'manifest.json',
  'background.js',
  'LICENSE',
  'README.md'
];

const dirsToInclude = [
  'assets',
  'content',
  'popup',
  'sidepanel'
];

// Add individual files
filesToInclude.forEach(file => {
  if (fs.existsSync(file)) {
    archive.file(file, { name: file });
    console.log(`📄 Adding file: ${file}`);
  } else {
    console.warn(`⚠️ File not found: ${file}`);
  }
});

// Add directories
dirsToInclude.forEach(dir => {
  if (fs.existsSync(dir)) {
    archive.directory(dir, dir);
    console.log(`📁 Adding directory: ${dir}`);
  } else {
    console.warn(`⚠️ Directory not found: ${dir}`);
  }
});

// Finalize the archive
archive.finalize();

console.log('🔄 Packaging extension...');
