# Performance Analysis Reproduction Checklist

This checklist guides you through reproducing the performance analysis locally.

## Prerequisites

- [ ] Redmine 6.0 codebase
- [ ] Production log files (or staging logs with similar traffic)
- [ ] Read-only database access (for EXPLAIN ANALYZE)
- [ ] Ruby 2.7+ installed
- [ ] Basic command-line tools (grep, awk, jq optional)

---

## Step 1: Baseline Setup

- [ ] Navigate to project root:
  ```bash
  cd /home/cis/pms/new-pms-cursur/redmine-6.0
  ```

- [ ] Make scripts executable:
  ```bash
  chmod +x performance_analysis/scripts/*.rb
  ```

- [ ] Create results directory:
  ```bash
  mkdir -p performance_analysis/results
  ```

---

## Step 2: Log Analysis

- [ ] Run log parser:
  ```bash
  ruby performance_analysis/scripts/log_parse.rb log/production.log --top-n=50
  ```

- [ ] Verify output file created:
  ```bash
  ls -lh performance_analysis/results/log_analysis.json
  ```

- [ ] Review top slow endpoints in terminal output

**Expected Output**: List of slow endpoints with p50, p95, max times

---

## Step 3: SQL Query Analysis

- [ ] Run SQL analyzer:
  ```bash
  ruby performance_analysis/scripts/sql_analyzer.rb log/production.log
  ```

- [ ] Review N+1 candidates in output

- [ ] Verify JSON output:
  ```bash
  cat performance_analysis/results/sql_analysis.json | jq '.top_queries[0:5]'
  ```

**Expected Output**: List of most impactful SQL queries and N+1 patterns

---

## Step 4: Code Analysis

- [ ] Run code analyzer:
  ```bash
  ruby performance_analysis/scripts/code_analyzer.rb
  ```

- [ ] Review findings:
  ```bash
  cat performance_analysis/results/code_analysis.json | jq '.findings_by_severity'
  ```

**Expected Output**: List of potential performance issues by file

---

## Step 5: Database Analysis (Read-Only)

⚠️ **CRITICAL**: Only run on read-only database replica!

- [ ] Connect to read-only database:
  ```bash
  psql -h <readonly-db-host> -U <readonly-user> -d redmine_production
  ```

- [ ] Load EXPLAIN templates:
  ```sql
  \i /home/cis/pms/new-pms-cursur/redmine-6.0/performance_analysis/scripts/run_explain.sql
  ```

- [ ] Run EXPLAIN ANALYZE for specific queries:
  ```sql
  -- Replace ? with actual values
  EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
  SELECT ... -- (see run_explain.sql for examples)
  ```

- [ ] Save EXPLAIN output:
  ```bash
  # Save output to evidence directory
  psql ... > performance_analysis/evidence/FINDING-001/explain_main_query.txt
  ```

**Expected Output**: Query execution plans showing seq scans, index usage, buffer reads

---

## Step 6: Validate Findings

- [ ] Review `summary.json`:
  ```bash
  cat performance_analysis/summary.json | jq '.findings[0:3]'
  ```

- [ ] Read detailed finding:
  ```bash
  cat performance_analysis/findings/FINDING-001.md
  ```

- [ ] Verify metrics match your environment:
  - Check if p95 times are similar
  - Verify request counts make sense
  - Confirm endpoints are actually slow

---

## Step 7: Reproduce Specific Issues

### Reproduce FINDING-001 (IssuesController#index)

- [ ] Enable SQL logging in development:
  ```ruby
  # config/environments/development.rb (temporarily)
  config.log_level = :debug
  ```

- [ ] Navigate to issues list:
  ```bash
  # Start Rails server
  rails server
  
  # In browser: http://localhost:3000/issues
  ```

- [ ] Count SQL queries in log:
  ```bash
  grep "SELECT" log/development.log | wc -l
  # Should see 45-60 queries (before fix)
  ```

- [ ] Measure response time:
  ```bash
  # Use curl with timing
  curl -w "@-" -o /dev/null -s http://localhost:3000/issues <<'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
  EOF
  ```

---

## Step 8: Apply Fixes (Staging Only)

⚠️ **DO NOT APPLY TO PRODUCTION** - This is for staging validation only

- [ ] Create feature branch:
  ```bash
  git checkout -b performance/fix-n-plus-one-issues-index
  ```

- [ ] Apply fix from FINDING-001.md:
  ```ruby
  # Edit app/controllers/issues_controller.rb
  # Add eager loading as documented
  ```

- [ ] Run tests:
  ```bash
  rails test test/controllers/issues_controller_test.rb
  ```

- [ ] Validate performance improvement:
  ```bash
  # Re-run curl timing above
  # Should see <500ms response time
  # Should see <15 SQL queries
  ```

---

## Step 9: Generate Reports

- [ ] Review manager summary:
  ```bash
  cat performance_analysis/manager_summary.md
  ```

- [ ] Check ticket templates:
  ```bash
  ls -la performance_analysis/tickets/
  ```

- [ ] Export JSON for other tools:
  ```bash
  cat performance_analysis/summary.json | jq '.findings[] | {id, priority_score, manager_summary}'
  ```

---

## Step 10: Create Monitoring

- [ ] Set up APM tool (New Relic, Datadog, etc.)
- [ ] Configure alerts:
  - P95 > 1 second on critical endpoints
  - SQL query count > 20 per request
  - DB time > 500ms per request

- [ ] Create dashboard:
  - Track p50, p95, p99 for top 10 endpoints
  - Monitor SQL query counts
  - Track DB time vs total response time

---

## Troubleshooting

### Log parser not finding requests
- **Issue**: No "Processing by" or "Completed" lines in logs
- **Fix**: Check log format matches Rails production format
- **Alternative**: Use different log file or configure log format

### SQL analyzer not detecting N+1
- **Issue**: Patterns not matching
- **Fix**: Logs may need SQL query logging enabled
- **Alternative**: Use Bullet gem for runtime detection

### Code analyzer shows false positives
- **Issue**: Pattern matches but code is actually optimized
- **Fix**: Manually review each finding
- **Note**: Some findings may be intentional design decisions

### EXPLAIN queries fail
- **Issue**: Missing tables or columns
- **Fix**: Check database schema matches Redmine version
- **Alternative**: Adapt queries to your schema

---

## Validation Commands

### Quick validation:
```bash
# Check all scripts run without errors
ruby performance_analysis/scripts/log_parse.rb --help
ruby performance_analysis/scripts/sql_analyzer.rb --help
ruby performance_analysis/scripts/code_analyzer.rb --help

# Verify JSON output is valid
cat performance_analysis/results/*.json | jq '.' > /dev/null && echo "JSON valid"
```

### Performance comparison:
```bash
# Before fix (baseline)
ruby performance_analysis/scripts/log_parse.rb log/production.log | grep "IssuesController#index"

# After fix (re-run after deployment)
ruby performance_analysis/scripts/log_parse.rb log/production.log | grep "IssuesController#index"

# Compare metrics
```

---

## Success Criteria

✅ Analysis complete when:
- [ ] All scripts run successfully
- [ ] JSON outputs generated
- [ ] Top 10 slow endpoints identified
- [ ] N+1 patterns detected
- [ ] Code anti-patterns identified
- [ ] EXPLAIN ANALYZE run for top queries (if DB access available)
- [ ] Findings documented
- [ ] Tickets created (if using)

---

## Next Steps After Analysis

1. **Review Findings**: Share `manager_summary.md` with stakeholders
2. **Prioritize**: Use priority scores in `summary.json`
3. **Plan Sprint**: Estimate effort from findings
4. **Create Tickets**: Use templates in `tickets/` directory
5. **Implement Fixes**: Follow detailed finding documents
6. **Validate**: Measure improvements after each fix
7. **Monitor**: Set up ongoing performance monitoring

---

**Last Updated**: 2025-10-31  
**Analysis Version**: 1.0

