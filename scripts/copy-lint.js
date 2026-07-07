const fs = require('fs');
const path = require('path');

const BANNED_TERMS = [
  'drug', 'dealer', 'stash', 'trap', 'coke', 'pills', 'weed', 
  'cops', 'police', 'feds', 'law enforcement', 'get caught', 
  'hide your', 'evade', 'subpoena-proof'
];

const JARGON_TERMS = [
  'enterprise', 'synergy', 'robust', 'scalable', 'methodology', 
  'authenticate', 'immutable', 'omnichannel', 'leverage'
];

// Combine all forbidden terms
const ALL_FORBIDDEN = [...BANNED_TERMS, ...JARGON_TERMS];

const EXCLUDED_DIRS = [
  'node_modules',
  '.next',
  'dist',
  '.expo',
  '.expo-shared',
  'ios',
  'android',
  '.git',
  'generator-build',
  'build',
  '.prisma'
];

const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

let violationsCount = 0;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.includes(file)) continue;
      scanDir(fullPath);
    } else {
      const ext = path.extname(file);
      if (!ALLOWED_EXTENSIONS.includes(ext)) continue;
      // Skip the linter script itself
      if (fullPath === __filename) continue;
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  // Skip JSON files for package definitions and locks
  if (filePath.endsWith('package.json') || filePath.endsWith('package-lock.json')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // If copy-lint-disable is present on this line, skip
    if (line.includes('copy-lint-disable')) return;

    // Check each forbidden word
    ALL_FORBIDDEN.forEach((word) => {
      // Use regex to match word boundaries
      const regex = new RegExp('\\b' + word + '\\b', 'i');
      if (regex.test(line)) {
        // Special exclusions for code/technical items (e.g. database schema, schema declarations, import paths)
        // that are not user facing.
        if (filePath.endsWith('.prisma') || filePath.endsWith('schema.ts') || filePath.endsWith('prisma-mcp-server') || line.trim().startsWith('import')) {
          return;
        }

        console.error(`❌ Banned/Jargon term "${word}" found in ${filePath} at line ${index + 1}:`);
        console.error(`   > ${line.trim()}`);
        violationsCount++;
      }
    });
  });
}

const targetDirs = [
  path.join(__dirname, '..', 'apps', 'app'),
  path.join(__dirname, '..', 'apps', 'mobile')
];

console.log('🔍 Running DRX Copy Linter...');
targetDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    scanDir(dir);
  }
});

if (violationsCount > 0) {
  console.error(`\n❌ Copy lint failed: Found ${violationsCount} violations of banned or corporate jargon terms.`);
  process.exit(1);
} else {
  console.log('✅ Copy lint passed. DRX Brand Voice is clean.');
  process.exit(0);
}
