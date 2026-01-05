# Discovery Database Migration Guide

This guide explains the migration of `discovery.db` from the project root to the `.parade/` directory, why it happens, and how to handle migration manually if needed.

## Overview

### Why Migration Happens

In earlier versions of Parade, the `discovery.db` SQLite database was stored directly in the project root. This has been changed to store all Parade-related files within the `.parade/` directory for several reasons:

1. **Cleaner project root** - Reduces clutter in your project's root directory
2. **Better organization** - All Parade workflow data lives in one place
3. **Easier gitignore management** - Single directory pattern to ignore
4. **Consistency** - Aligns with `.beads/` and other dotfile conventions

### What Gets Migrated

The migration process moves the following files:

| File | Description |
|------|-------------|
| `discovery.db` | Main SQLite database containing briefs, specs, and workflow data |
| `discovery.db-shm` | SQLite shared memory file (if present) |
| `discovery.db-wal` | SQLite write-ahead log file (if present) |

**Source location (legacy):** `<project-root>/discovery.db`
**Destination location (new):** `<project-root>/.parade/discovery.db`

## Automatic Migration

The Parade Electron app automatically handles migration when opening a project:

1. App detects a project with `discovery.db` in the root
2. Checks if `.parade/discovery.db` already exists (skips if so)
3. Creates `.parade/` directory if needed
4. Moves all database files to the new location
5. Logs the migration result

No user action is required for automatic migration. The app handles everything transparently.

### Migration Logic

```
If .parade/discovery.db exists:
    Skip migration (already migrated)

Else if discovery.db exists in project root:
    1. Create .parade/ directory
    2. Move discovery.db to .parade/discovery.db
    3. Move WAL files if present

Else:
    No migration needed (no database found)
```

## Manual Migration

If you need to migrate manually (e.g., without the Electron app), follow these steps:

### Prerequisites

- Ensure no applications are currently accessing the database
- Close Claude Code and any Parade-related processes
- Back up your data if desired (optional but recommended)

### Step-by-Step Instructions

#### macOS / Linux

```bash
# Navigate to your project root
cd /path/to/your/project

# Create the .parade directory if it doesn't exist
mkdir -p .parade

# Move the main database file
mv discovery.db .parade/discovery.db

# Move WAL files if they exist
[ -f discovery.db-shm ] && mv discovery.db-shm .parade/discovery.db-shm
[ -f discovery.db-wal ] && mv discovery.db-wal .parade/discovery.db-wal

# Verify the migration
ls -la .parade/
```

#### Windows (PowerShell)

```powershell
# Navigate to your project root
cd C:\path\to\your\project

# Create the .parade directory if it doesn't exist
New-Item -ItemType Directory -Force -Path .parade

# Move the main database file
Move-Item discovery.db .parade\discovery.db

# Move WAL files if they exist
if (Test-Path discovery.db-shm) { Move-Item discovery.db-shm .parade\discovery.db-shm }
if (Test-Path discovery.db-wal) { Move-Item discovery.db-wal .parade\discovery.db-wal }

# Verify the migration
Get-ChildItem .parade
```

#### Windows (Command Prompt)

```cmd
REM Navigate to your project root
cd C:\path\to\your\project

REM Create the .parade directory if it doesn't exist
if not exist .parade mkdir .parade

REM Move the main database file
move discovery.db .parade\discovery.db

REM Move WAL files if they exist
if exist discovery.db-shm move discovery.db-shm .parade\discovery.db-shm
if exist discovery.db-wal move discovery.db-wal .parade\discovery.db-wal

REM Verify the migration
dir .parade
```

### Post-Migration Verification

After migration, verify your data is intact:

1. Open your project in Claude Code
2. Run `/workflow-status` to check workflow state
3. Verify your briefs, specs, and workflow history are accessible

## Troubleshooting

### Database is locked

**Symptom:** Migration fails with "database is locked" or "EBUSY" error

**Solution:**
1. Close all applications that might be accessing the database
2. Close terminal sessions in the project directory
3. Wait a few seconds and retry
4. On macOS/Linux, use `lsof discovery.db` to find processes using the file

### Permission denied

**Symptom:** Migration fails with "EACCES" or "permission denied" error

**Solution:**
1. Check file permissions: `ls -la discovery.db`
2. Ensure you have write access to the project directory
3. On macOS/Linux: `chmod 644 discovery.db` to fix permissions
4. Run migration with appropriate privileges if needed

### .parade directory already exists with different content

**Symptom:** Migration skipped but `.parade/discovery.db` contains unexpected data

**Solution:**
1. Back up both databases:
   ```bash
   cp discovery.db discovery.db.backup
   cp .parade/discovery.db .parade/discovery.db.backup
   ```
2. Compare contents using a SQLite browser to determine which is current
3. Keep the most recent/complete version
4. Delete or archive the outdated backup

### WAL files present but database seems corrupted

**Symptom:** Database operations fail after migration, WAL files weren't moved

**Solution:**
1. SQLite WAL files contain pending transactions
2. If WAL files were left behind, move them manually:
   ```bash
   mv discovery.db-shm .parade/
   mv discovery.db-wal .parade/
   ```
3. Open the database to force checkpoint and merge WAL data:
   ```bash
   sqlite3 .parade/discovery.db "PRAGMA wal_checkpoint(TRUNCATE);"
   ```

### Migration happened but old file still exists

**Symptom:** Both `discovery.db` and `.parade/discovery.db` exist after migration

**Solution:**
1. This shouldn't happen with normal migration
2. Compare timestamps to determine which is newer: `ls -la discovery.db .parade/discovery.db`
3. The `.parade/` version should be the migrated one
4. Safely remove the root version after confirming `.parade/` version is correct:
   ```bash
   rm discovery.db discovery.db-shm discovery.db-wal 2>/dev/null
   ```

### Recovery from failed migration

If migration fails partway through:

1. Check which files exist in each location:
   ```bash
   ls -la discovery.db* .parade/discovery.db* 2>/dev/null
   ```

2. If only the main database moved but not WAL files:
   ```bash
   mv discovery.db-shm .parade/ 2>/dev/null
   mv discovery.db-wal .parade/ 2>/dev/null
   ```

3. If the database is in an inconsistent state, restore from backup:
   ```bash
   mv discovery.db.backup discovery.db
   rm -rf .parade/discovery.db*
   # Retry migration
   ```

## Updating .gitignore

After migration, update your `.gitignore` to ignore the new location:

```gitignore
# Parade workflow data
.parade/discovery.db
.parade/discovery.db-shm
.parade/discovery.db-wal

# You can also ignore the entire .parade directory if preferred
# .parade/
```

Remove any old patterns referencing the root location:
```gitignore
# Remove these if present (now in .parade/)
# discovery.db
# discovery.db-shm
# discovery.db-wal
```

## FAQ

**Q: Will migration lose my workflow data?**
A: No. Migration simply moves files to a new location. All your briefs, specs, interview questions, and workflow history are preserved.

**Q: Do I need to do anything after migration?**
A: No. The Parade tools automatically look for `discovery.db` in the `.parade/` directory. Everything should work seamlessly.

**Q: Can I migrate back to the root location?**
A: While possible, this is not recommended. The `.parade/` location is the standard going forward.

**Q: What if I have projects using both old and new locations?**
A: The automatic migration handles this on a per-project basis. Each project will be migrated when opened.
