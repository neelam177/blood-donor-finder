# Database Backup & Restore Guide

Complete guide for backing up and restoring your BloodConnect database.

---

## Quick Reference

```bash
# Backup
mysqldump -u root -p blood_donor_db > backup.sql

# Restore
mysql -u root -p blood_donor_db < backup.sql
```

---

## Backup Strategies

### 1. Manual Backup (Using TablePlus)

#### Export Full Database

1. Open TablePlus
2. Connect to your database
3. Right-click on `blood_donor_db` → **Export**
4. Choose **SQL Dump**
5. Select options:
   - ✅ Structure (CREATE TABLE statements)
   - ✅ Data (INSERT statements)
   - ✅ Drop tables if exists (recommended)
   - ✅ Include database creation
6. Choose destination folder
7. Click **Export**

#### Export Individual Tables

1. Select specific table (e.g., `users`)
2. Right-click → **Export**
3. Choose format:
   - **SQL** - For database restore
   - **CSV** - For data analysis
   - **JSON** - For API/JavaScript use

---

### 2. Command Line Backup

#### Full Database Backup

```bash
# Backup everything (structure + data)
mysqldump -u root -p blood_donor_db > backup_full_$(date +%Y%m%d).sql

# With compression
mysqldump -u root -p blood_donor_db | gzip > backup_full_$(date +%Y%m%d).sql.gz
```

#### Schema Only (No Data)

```bash
# Just table structures
mysqldump -u root -p --no-data blood_donor_db > schema_only.sql
```

#### Data Only (No Structure)

```bash
# Just table data
mysqldump -u root -p --no-create-info blood_donor_db > data_only.sql
```

#### Specific Tables Only

```bash
# Backup only users and donor_profiles
mysqldump -u root -p blood_donor_db users donor_profiles > backup_users.sql
```

#### Include Routines, Triggers, Events

```bash
mysqldump -u root -p \
  --routines \
  --triggers \
  --events \
  blood_donor_db > backup_complete.sql
```

---

### 3. Automated Backup Script

#### For Linux/Mac

Create file: `backup-db.sh`

```bash
#!/bin/bash

# Configuration
DB_USER="root"
DB_PASS="your_password"  # Or use mysql_config_editor for security
DB_NAME="blood_donor_db"
BACKUP_DIR="$HOME/db_backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory if doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/backup_${DATE}.sql"

# Create backup
echo "Starting backup..."
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Delete old backups (keep last 7 days)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
echo "Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"
```

Make it executable:
```bash
chmod +x backup-db.sh
```

Run it:
```bash
./backup-db.sh
```

#### For Windows (PowerShell)

Create file: `backup-db.ps1`

```powershell
# Configuration
$dbUser = "root"
$dbPass = "your_password"
$dbName = "blood_donor_db"
$backupDir = "$env:USERPROFILE\db_backups"
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$retentionDays = 7

# Create backup directory
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# Backup file
$backupFile = Join-Path $backupDir "backup_$date.sql"

# Create backup
Write-Host "Starting backup..."
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" `
    -u $dbUser `
    -p$dbPass `
    $dbName > $backupFile

# Compress
Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip"
Remove-Item $backupFile

# Delete old backups
Get-ChildItem $backupDir -Filter "backup_*.sql.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$retentionDays) } |
    Remove-Item

Write-Host "Backup completed: $backupFile.zip"
```

Run it:
```powershell
.\backup-db.ps1
```

---

### 4. Schedule Automated Backups

#### Linux/Mac (Cron Job)

```bash
# Edit crontab
crontab -e

# Add these lines:

# Daily backup at 2 AM
0 2 * * * /path/to/backup-db.sh >> /var/log/db-backup.log 2>&1

# Weekly backup on Sunday at 3 AM
0 3 * * 0 /path/to/backup-db.sh >> /var/log/db-backup.log 2>&1

# Save and exit
```

#### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Name: "BloodConnect DB Backup"
4. Trigger: Daily at 2:00 AM
5. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-File "C:\path\to\backup-db.ps1"`
6. Finish

---

## Restore Procedures

### 1. Using TablePlus

1. Open TablePlus
2. Connect to your database
3. Select `blood_donor_db` database
4. Click **File** → **Import** → **From SQL Dump**
5. Select your backup file
6. Click **Import**
7. Wait for completion

### 2. Command Line Restore

#### Full Restore

```bash
# Restore from uncompressed file
mysql -u root -p blood_donor_db < backup.sql

# Restore from compressed file
gunzip < backup.sql.gz | mysql -u root -p blood_donor_db

# Or
zcat backup.sql.gz | mysql -u root -p blood_donor_db
```

#### Drop and Recreate (Clean Restore)

```bash
# Drop existing database
mysql -u root -p -e "DROP DATABASE IF EXISTS blood_donor_db;"

# Create fresh database
mysql -u root -p -e "CREATE DATABASE blood_donor_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Restore
mysql -u root -p blood_donor_db < backup.sql
```

#### Restore Specific Tables Only

```bash
# Extract specific table from backup
sed -n '/CREATE TABLE.*users/,/UNLOCK TABLES/p' backup.sql > users_only.sql

# Restore just that table
mysql -u root -p blood_donor_db < users_only.sql
```

---

## Backup to Cloud Storage

### AWS S3

```bash
#!/bin/bash
# backup-to-s3.sh

BACKUP_FILE="backup_$(date +%Y%m%d).sql.gz"
S3_BUCKET="s3://your-bucket/database-backups"

# Create backup
mysqldump -u root -p blood_donor_db | gzip > "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/"

# Clean local file
rm "$BACKUP_FILE"

echo "Backup uploaded to S3"
```

### Google Drive (using rclone)

```bash
#!/bin/bash
# backup-to-gdrive.sh

BACKUP_FILE="backup_$(date +%Y%m%d).sql.gz"

# Create backup
mysqldump -u root -p blood_donor_db | gzip > "$BACKUP_FILE"

# Upload to Google Drive
rclone copy "$BACKUP_FILE" gdrive:db-backups/

# Clean local file
rm "$BACKUP_FILE"

echo "Backup uploaded to Google Drive"
```

### Dropbox (using Dropbox CLI)

```bash
#!/bin/bash
# backup-to-dropbox.sh

BACKUP_FILE="backup_$(date +%Y%m%d).sql.gz"

# Create backup
mysqldump -u root -p blood_donor_db | gzip > "$BACKUP_FILE"

# Upload to Dropbox
dbxcli put "$BACKUP_FILE" /db-backups/

# Clean local file
rm "$BACKUP_FILE"

echo "Backup uploaded to Dropbox"
```

---

## Migration Between Environments

### From Development to Production

```bash
# 1. Backup development database
mysqldump -u root -p blood_donor_db > dev_backup.sql

# 2. Transfer to production server
scp dev_backup.sql user@production-server:/tmp/

# 3. On production server, restore
ssh user@production-server
mysql -u root -p blood_donor_db < /tmp/dev_backup.sql
rm /tmp/dev_backup.sql
```

### From TablePlus to Production

1. Export from TablePlus (as described above)
2. Upload SQL file to server
3. SSH into server and restore:
   ```bash
   mysql -u root -p blood_donor_db < backup.sql
   ```

---

## Disaster Recovery

### Scenario 1: Corrupted Table

```bash
# Check table
mysql -u root -p blood_donor_db -e "CHECK TABLE users;"

# Repair table
mysql -u root -p blood_donor_db -e "REPAIR TABLE users;"

# If repair fails, restore from backup
mysql -u root -p blood_donor_db < backup.sql
```

### Scenario 2: Accidental Data Deletion

```bash
# Restore to temporary database
mysql -u root -p -e "CREATE DATABASE blood_donor_db_temp;"
mysql -u root -p blood_donor_db_temp < backup.sql

# Extract specific data
mysql -u root -p blood_donor_db_temp -e "SELECT * FROM users WHERE id=123;" > recovered_user.sql

# Import to production
mysql -u root -p blood_donor_db < recovered_user.sql

# Clean up
mysql -u root -p -e "DROP DATABASE blood_donor_db_temp;"
```

### Scenario 3: Full Database Loss

```bash
# 1. Recreate database
mysql -u root -p -e "CREATE DATABASE blood_donor_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Restore from latest backup
mysql -u root -p blood_donor_db < latest_backup.sql

# 3. Verify
mysql -u root -p blood_donor_db -e "SHOW TABLES;"
mysql -u root -p blood_donor_db -e "SELECT COUNT(*) FROM users;"
```

---

## Point-in-Time Recovery

### Enable Binary Logs (for production)

Add to MySQL config (`my.cnf` or `my.ini`):

```ini
[mysqld]
log-bin=mysql-bin
binlog_format=ROW
expire_logs_days=7
```

Restart MySQL:
```bash
sudo systemctl restart mysql
```

### Restore to Specific Time

```bash
# 1. Restore last full backup
mysql -u root -p blood_donor_db < backup.sql

# 2. Apply binary logs up to specific time
mysqlbinlog --stop-datetime="2024-01-15 10:30:00" \
  mysql-bin.000001 mysql-bin.000002 | \
  mysql -u root -p blood_donor_db
```

---

## Best Practices

### ✅ DO

- Backup before major updates
- Test your backups regularly
- Keep multiple backup copies
- Store backups in different locations
- Automate backups
- Document restore procedures
- Encrypt sensitive backups
- Monitor backup success/failure

### ❌ DON'T

- Don't rely on a single backup
- Don't store backups on same server
- Don't forget to test restores
- Don't keep backups unencrypted
- Don't backup root password in scripts
- Don't skip verification after restore

---

## Verification After Restore

```sql
-- Check all tables exist
SHOW TABLES;

-- Check row counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'donor_profiles', COUNT(*) FROM donor_profiles
UNION ALL
SELECT 'blood_requests', COUNT(*) FROM blood_requests
UNION ALL
SELECT 'request_responses', COUNT(*) FROM request_responses;

-- Check latest records
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;
SELECT * FROM blood_requests ORDER BY created_at DESC LIMIT 5;

-- Check database size
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES 
WHERE table_schema = 'blood_donor_db'
ORDER BY (data_length + index_length) DESC;
```

---

## Troubleshooting

### "Table doesn't exist" after restore

```bash
# Check if backup file is complete
tail backup.sql

# Should end with:
# /*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
# /*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
# /*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
```

### "Access denied" during restore

```bash
# Grant necessary permissions
mysql -u root -p -e "GRANT ALL ON blood_donor_db.* TO 'your_user'@'localhost';"
mysql -u root -p -e "FLUSH PRIVILEGES;"
```

### Backup file too large

```bash
# Compress during backup
mysqldump -u root -p blood_donor_db | gzip > backup.sql.gz

# Or use split
mysqldump -u root -p blood_donor_db | split -b 100m - backup.sql.part_
```

---

## Emergency Contacts

- Database Admin: ___________
- Backup Location: ___________
- Last Verified Backup: ___________
- Recovery Time Objective (RTO): ___________
- Recovery Point Objective (RPO): ___________

---

**Remember: A backup is only good if you can restore from it. Test your backups regularly!**
