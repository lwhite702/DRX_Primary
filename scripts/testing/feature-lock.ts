import fs from "node:fs";
import path from "node:path";

type LockEntry = {
  file: string;
  mustContain: string[];
};

type LockFile = {
  name: string;
  description?: string;
  locks: LockEntry[];
};

type Failure = {
  file: string;
  message: string;
};

const root = process.cwd();
const lockFilePath = path.join(root, "scripts/testing/feature-lock.ai.json");

function readLockFile(): LockFile {
  if (!fs.existsSync(lockFilePath)) {
    throw new Error("Feature lock file missing: scripts/testing/feature-lock.ai.json");
  }

  const parsed = JSON.parse(fs.readFileSync(lockFilePath, "utf8")) as LockFile;

  if (!Array.isArray(parsed.locks) || parsed.locks.length === 0) {
    throw new Error("Feature lock file has no lock entries");
  }

  return parsed;
}

function runChecks(lockFile: LockFile): Failure[] {
  const failures: Failure[] = [];

  for (const entry of lockFile.locks) {
    const absPath = path.join(root, entry.file);

    if (!fs.existsSync(absPath)) {
      failures.push({
        file: entry.file,
        message: "Locked file is missing",
      });
      continue;
    }

    const content = fs.readFileSync(absPath, "utf8");

    for (const token of entry.mustContain) {
      if (!content.includes(token)) {
        failures.push({
          file: entry.file,
          message: `Missing locked token: ${token}`,
        });
      }
    }
  }

  return failures;
}

function main() {
  try {
    const lockFile = readLockFile();
    const failures = runChecks(lockFile);

    if (failures.length > 0) {
      console.error(`Feature lock failed (${failures.length} issue${failures.length === 1 ? "" : "s"})`);
      for (const failure of failures) {
        console.error(`- ${failure.file}: ${failure.message}`);
      }
      process.exit(1);
    }

    console.log(`Feature lock passed: ${lockFile.name}`);
  } catch (error) {
    console.error(
      `Feature lock check crashed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

main();
