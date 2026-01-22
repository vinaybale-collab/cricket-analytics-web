# Cricket Analytics System

**Professional cricket analytics using open data - Zero cost, publication-ready content in minutes**

---

## 🎯 What This System Does

Generate publication-quality cricket analytics articles and Twitter threads using:
- 16,000+ matches from Cricsheet (1990-2025)
- 3+ million ball-by-ball records
- Commentary text analysis with NLP
- Claude AI for instant insights

**Output:** Copy-paste ready Substack articles + X/Twitter threads

---

## 📚 Documentation

**New to this system? Start here:**
1. **[START_HERE.md](START_HERE.md)** - Complete beginner's setup guide (3-4 hours)
2. **[How_To_Use_Guide.md](How_To_Use_Guide.md)** - How to run analyses + weekly maintenance
3. **[cricket_analytics_system_specification.md](cricket_analytics_system_specification.md)** - Full technical details

---

## ⚡ Quick Start (For Returning Users)

**Run an analysis:**
```bash
# Navigate to your cloned repo directory
cd cricket-analytics-web
python scripts/century_acceleration_analysis.py
```

**Update database:**
```bash
# On Windows:
scripts\update_database.bat

# On Mac/Linux:
python scripts/download_cricsheet.py --new-only
python scripts/ingest_cricsheet.py --new-only
```

**Use Claude Projects:**
1. Go to claude.ai → Projects → "Cricket Analytics System"
2. Ask: "Compare Bumrah vs Starc in T20 death overs. Generate article."

---

## 📊 System Overview

```
cricket_analytics/
├── cricket_analytics.duckdb     # Database (2GB)
├── scripts/
│   ├── analysis_helpers.py      # Query functions (upload to Claude)
│   ├── century_acceleration_analysis.py
│   └── update_database.bat      # Weekly updates
├── outputs/
│   ├── articles/                # Generated Substack articles
│   ├── threads/                 # X/Twitter threads
│   └── charts/                  # Publication-quality charts
└── data/
    └── raw/cricsheet/           # Downloaded match data
```

---

## 🏏 Example Analyses You Can Run

**Pre-built:**
- Century acceleration/deceleration patterns

**Via Claude Projects (ask anything!):**
- "Top 10 death overs bowlers in IPL since 2020"
- "Batsmen with highest average vs spin in powerplay"
- "Toss decision impact on wins by venue"
- "Player comparison: Kohli vs Rohit in ODI chases"

---

## 🔧 Common Commands

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Download data (first time):**
```bash
python scripts/download_cricsheet.py
```

**Create database (first time):**
```bash
duckdb cricket_analytics.duckdb < scripts/create_database.sql
```

**Load data (first time):**
```bash
python scripts/ingest_cricsheet.py
```

**Check database:**
```bash
python -c "import duckdb; conn = duckdb.connect('cricket_analytics.duckdb'); print('Matches:', conn.execute('SELECT COUNT(*) FROM matches').fetchone()[0])"
```

---

## 📈 Data Sources

- **Cricsheet:** Ball-by-ball data (Creative Commons license)
- **Kaggle:** Commentary datasets (community uploads)

**Legal:** 100% legal to use, analyze, and publish. Attribution required.

---

## 🎓 Support

**Need help?**
1. Check `How_To_Use_Guide.md`
2. Review logs in `logs/` folder
3. See full specification document

**System Requirements:**
- Windows 10/11
- Python 3.8+
- 20GB free disk space
- Internet connection
- Claude Pro subscription (for Claude Projects)

---

## ✨ Features

- **Zero-cost data** (Creative Commons)
- **Token-efficient** (database stays local, ~20K tokens per analysis)
- **Publication-ready** (95%+ final quality)
- **Fast** (10 minutes from idea to article)
- **Flexible** (Claude writes custom SQL for any question)

---

**Built with:** Python, DuckDB, pandas, matplotlib, Claude AI

**License:** Your analyses are fully yours. Data from Cricsheet (CC BY 4.0).
