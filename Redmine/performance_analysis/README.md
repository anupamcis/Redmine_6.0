# Redmine Performance Analysis Framework

This directory contains a comprehensive performance analysis of the Redmine 6.0 application, including scripts, findings, and remediation plans.

## Directory Structure

```
performance_analysis/
├── README.md                    # This file
├── summary.json                 # Machine-readable summary of all findings
├── manager_summary.md           # Executive summary for management
├── scripts/
│   ├── log_parse.rb             # Parse production logs for slow endpoints
│   ├── sql_analyzer.rb          # Analyze SQL queries from logs
│   ├── code_analyzer.rb         # Static code analysis for anti-patterns
│   └── run_explain.sql          # SQL EXPLAIN ANALYZE templates
├── findings/
│   ├── FINDING-001.md           # Detailed findings (IssuesController#index)
│   ├── FINDING-002.md           # Detailed findings (IssuesController#show)
│   └── ...                      # Additional findings
├── tickets/
│   └── (ready-to-create tickets in Markdown)
└── results/                     # Generated analysis results (JSON)
    ├── log_analysis.json
    ├── sql_analysis.json
    └── code_analysis.json
```

## Quick Start

### 1. Analyze Logs

```bash
cd /home/cis/pms/new-pms-cursur/redmine-6.0
ruby performance_analysis/scripts/log_parse.rb log/production.log --top-n=50
```

This will:
- Parse production logs for request timing data
- Identify top slow endpoints
- Generate `performance_analysis/results/log_analysis.json`

### 2. Analyze SQL Queries

```bash
ruby performance_analysis/scripts/sql_analyzer.rb log/production.log
```

This will:
- Extract SQL queries from logs
- Identify N+1 patterns
- Generate `performance_analysis/results/sql_analysis.json`

### 3. Analyze Code for Anti-patterns

```bash
ruby performance_analysis/scripts/code_analyzer.rb
```

This will:
- Scan controllers and views for performance issues
- Detect N+1 candidates, unbounded queries, etc.
- Generate `performance_analysis/results/code_analysis.json`

### 4. Run EXPLAIN ANALYZE

**⚠️ IMPORTANT: Run on read-only database replica only**

```bash
# Connect to read-only replica
psql -h replica-db-host -U readonly_user -d redmine_production

# Load and run queries
\i performance_analysis/scripts/run_explain.sql
```

Or run individual queries manually with representative values.

## Findings Overview

### Summary
- **Total Findings**: 10
- **Critical/High**: 6 findings
- **Daily Requests Affected**: 13,876+
- **Estimated P95 Reduction**: 8.5 seconds

### Top Findings
1. **FINDING-001**: IssuesController#index - 1.85s p95, 1,250 daily requests
2. **FINDING-002**: IssuesController#show - 1.2s p95, 3,420 daily requests
3. **FINDING-003**: ProjectsController#index - 980ms p95, 890 daily requests

See `summary.json` for complete list.

## Detailed Findings

Each finding in `findings/FINDING-XXX.md` contains:
- Full evidence (logs, SQL, stack traces)
- Root cause analysis
- EXACT code changes needed
- SQL/index suggestions
- Repro steps
- Risk & effort estimates
- Test plans

## Manager Summary

See `manager_summary.md` for:
- Executive overview
- Business impact
- Recommended action plan
- Resource requirements
- Success metrics

## Configuration

### Priority Formula
Default priority scoring:
```
priority_score = (p95_ms / 1000 * 40) + (log10(request_count) * 10, max 30) + (avg_db_time / 1000 * 30)
```

Weights:
- p95 response time: 40%
- request count: 30%
- average DB time: 30%

### Top N Endpoints
Default: Analyze top 50 endpoints. Override with:
```bash
ruby scripts/log_parse.rb --top-n=100
```

## Safety & Constraints

### Read-Only Analysis
- ✅ Log parsing - safe
- ✅ Code analysis - safe
- ✅ EXPLAIN ANALYZE on read-only DB - safe
- ❌ No code modifications
- ❌ No database migrations
- ❌ No data changes

### Database Access
All database commands in this analysis are **read-only**:
- `EXPLAIN ANALYZE` - safe (read-only)
- Index suggestions - **DO NOT EXECUTE** without DBA approval
- Query analysis - read-only

## Measurement & Validation

### Before Fix
```bash
# Collect baseline metrics
ruby scripts/log_parse.rb log/production.log | grep "IssuesController#index"
```

### After Fix
```bash
# Re-run analysis to measure improvement
ruby scripts/log_parse.rb log/production.log | grep "IssuesController#index"

# Compare before/after
# Target: p95 < 500ms (from 1850ms)
```

### Acceptance Criteria per Finding
See individual finding documents for specific acceptance criteria.

## Integration with Monitoring

### APM Tools
Suggested APM tools for ongoing monitoring:
- New Relic
- Datadog
- Scout APM
- Skylight

### Alerting
Set up alerts for:
- p95 > 1 second on critical endpoints
- SQL query count > 20 per request
- DB time > 500ms per request

## Ticket Creation

Ready-to-use tickets are provided in `tickets/` directory:
- Title, description, acceptance criteria
- Technical details with code examples
- Test plans
- Risk assessment

Copy to your issue tracker (Redmine, Jira, etc.).

## Troubleshooting

### Log Parsing Issues
- Ensure log format matches expected Rails format
- Check log file permissions
- Verify Ruby version (requires 2.7+)

### SQL Analysis Issues
- Logs must contain SQL query timing information
- Enable SQL logging: `config.log_level = :debug` in development

### Code Analysis False Positives
- Some patterns may be false positives
- Review each finding manually
- Check if eager loading is actually missing

## Contributing

When adding new findings:
1. Update `summary.json` with new finding
2. Create `findings/FINDING-XXX.md` with full details
3. Update `manager_summary.md` if high priority
4. Generate ticket in `tickets/`

## References

- [Rails Performance Best Practices](https://guides.rubyonrails.org/performance.html)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [N+1 Query Detection with Bullet](https://github.com/flyerhzm/bullet)

## Support

For questions or issues with this analysis:
1. Review finding details in `findings/`
2. Check ticket templates in `tickets/`
3. Contact development team lead

---

**Analysis Date**: October 31, 2025  
**Redmine Version**: 6.0  
**Rails Version**: 7.2.2.2

