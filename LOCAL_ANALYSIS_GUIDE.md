# Local Deep Cricket Analysis Guide

## Two Paths for Cricket Analytics

### Path 1: Website (Public-Facing)
The web interface at `localhost:3000` uses Gemini's free tier for quick analysis. Good for audience engagement and shareable projects.

### Path 2: Local Deep Analysis with Claude Code + Opus (This Guide)
Use Claude Code with Opus 4.5 (via your Claude Max subscription) to run comprehensive, publication-quality analysis directly against the DuckDB database. This produces far deeper insights for your YouTube channel content.

---

## Setup (One-Time)

### 1. Database Access
The DuckDB database is at:
```
backend/cricket_analytics.duckdb
```

It contains:
- **5M+ ball-by-ball records** (1990-2025) in the `balls` table
- **11,535 matches** in the `matches` table
- **89,993 commentary entries** (IPL 2017-2025) in the `commentary` table

### 2. Install DuckDB CLI (Optional)
```bash
pip install duckdb
```

You can query the database directly:
```python
import duckdb
con = duckdb.connect('backend/cricket_analytics.duckdb', read_only=True)
result = con.execute("SELECT COUNT(*) FROM balls").fetchall()
print(result)
```

### 3. Claude Code Setup
With Claude Max, you have access to Opus 4.5 which provides the deepest reasoning. Open Claude Code in the project directory:
```bash
cd cricket_analytics
claude
```

---

## Running a Deep Analysis

### Step 1: Ask Claude Code to Query the Database

Give Claude Code a prompt like this:

```
I want to do a deep analysis for my YouTube channel on [TOPIC].

The cricket database is at backend/cricket_analytics.duckdb (DuckDB, read-only).

Tables:
- balls: ball-by-ball data (match_id, innings, over, ball, batter, non_striker, bowler, batting_team, bowling_team, runs_off_bat, extras, total_runs, extra_type, wicket_type, dismissed_batter, phase, cumulative_runs, wickets_fallen)
- matches: match info (match_id, date, venue, city, country, format, gender, team1, team2, winner, toss_winner, toss_decision, player_of_match)
- commentary: NLP features from IPL commentary (commentary_id, cricsheet_match_id, innings, over, ball, text, length_short, length_full, length_good, line_off, line_middle, line_leg, mention_yorker, mention_bouncer, mention_swing, mention_spin, mention_beaten, mention_edge, mention_mistimed, sentiment_score)

Please:
1. Think about ALL possible analysis angles (year-wise, opposition-wise, venue-wise, format-wise, phase-wise, situational, comparative)
2. Run at least 8-10 different SQL queries to explore the topic comprehensively
3. Look for surprising patterns, outliers, and counter-intuitive findings
4. Cross-reference findings across different dimensions
5. Generate a publication-ready markdown article with:
   - A compelling narrative opening
   - Specific statistics with sample sizes
   - Year-by-year trends
   - Opposition breakdowns
   - Key insights that would surprise viewers
   - Limitations acknowledged
6. Save the output to outputs/[topic-slug]/analysis.md
```

### Step 2: Iterative Deep Dive

After the initial analysis, ask follow-up questions to go deeper:

```
Great analysis. Now go deeper on these specific areas:

1. The finding about [X] is interesting - can you break that down by:
   - Year-by-year progression
   - Against specific opponents
   - Home vs away
   - In pressure situations (chases, knockout matches)

2. Are there any outlier matches that skew the data? Remove those and re-run.

3. Compare this player's numbers against the top 5 peers in the same era.

4. What's the statistical significance? Run a basic comparison to see if the difference is meaningful or just noise.
```

### Step 3: Generate YouTube-Ready Content

```
Based on all the analysis above, create YouTube-ready content:

1. A markdown article (1500-2500 words) with:
   - Hook/opening that grabs attention in the first line
   - 3-5 key "did you know" facts
   - Narrative flow that builds to a surprising conclusion
   - All statistics sourced from our database

2. A script outline for a 10-15 minute video:
   - Intro hook (30 seconds)
   - Context/background (2 minutes)
   - Main findings broken into 3-4 segments
   - Counter-arguments or caveats
   - Conclusion with a call-to-action question

3. 5 tweet-worthy one-liners from the analysis

4. A list of charts/visualizations I should create:
   - What type of chart
   - What data to show
   - What insight it reveals

Save all of this to outputs/[topic-slug]/
```

---

## Example Analysis Topics

Here are compelling topics to analyze for your channel:

### Player Deep Dives
- "Is Virat Kohli really a chase master? What do 5M balls say?"
- "Jasprit Bumrah's death bowling: Why can't anyone score off him?"
- "The Rohit Sharma paradox: Slow starts, explosive finishes"
- "MS Dhoni's finishing: Clutch or statistical illusion?"

### Tactical Analysis
- "Does winning the toss actually matter? 11,535 matches say..."
- "The death over revolution: How T20 batting has changed decade by decade"
- "Powerplay aggression vs conservation: What actually wins matches?"
- "Spin vs pace in the middle overs: The optimal bowling strategy"

### Comparative Studies
- "Kuldeep + Chahal together vs apart: The Kulcha effect"
- "Top 5 all-rounders compared: Who truly changed matches?"
- "IPL auction busts: Did expensive players deliver?"
- "Home advantage in cricket: Which teams benefit most?"

### Counter-Intuitive Findings
- "The nervous nineties: Do batsmen really choke before 100?"
- "Is the 2nd innings advantage real in ODIs?"
- "Night vs day cricket: Does the time of play matter?"

---

## Database Query Tips

### Batting Stats
```sql
-- Career stats for a player
SELECT
    batter,
    COUNT(DISTINCT match_id) AS matches,
    SUM(runs_off_bat) AS runs,
    COUNT(*) AS balls_faced,
    ROUND(SUM(runs_off_bat) * 100.0 / COUNT(*), 2) AS strike_rate,
    SUM(CASE WHEN runs_off_bat >= 4 THEN 1 ELSE 0 END) AS fours,
    SUM(CASE WHEN runs_off_bat >= 6 THEN 1 ELSE 0 END) AS sixes
FROM balls
WHERE batter = 'V Kohli'
GROUP BY batter;
```

### Bowling Stats
```sql
-- Bowling performance by phase
SELECT
    bowler,
    phase,
    COUNT(*) AS balls,
    SUM(CASE WHEN wicket_type IS NOT NULL THEN 1 ELSE 0 END) AS wickets,
    ROUND(SUM(runs_off_bat + extras) * 6.0 / COUNT(*), 2) AS economy
FROM balls
WHERE bowler = 'JJ Bumrah'
GROUP BY bowler, phase
ORDER BY phase;
```

### Match Context
```sql
-- Win percentage by toss decision
SELECT
    toss_decision,
    COUNT(*) AS matches,
    SUM(CASE WHEN toss_winner = winner THEN 1 ELSE 0 END) AS toss_winner_wins,
    ROUND(SUM(CASE WHEN toss_winner = winner THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS win_pct
FROM matches
WHERE format = 'T20'
GROUP BY toss_decision;
```

### Year-Wise Trends
```sql
-- Batting strike rate evolution by year
SELECT
    EXTRACT(YEAR FROM m.date) AS year,
    m.format,
    ROUND(SUM(b.runs_off_bat) * 100.0 / COUNT(*), 2) AS avg_strike_rate,
    COUNT(DISTINCT b.match_id) AS matches
FROM balls b
JOIN matches m ON b.match_id = m.match_id
WHERE m.format = 'T20'
GROUP BY year, m.format
HAVING COUNT(DISTINCT b.match_id) > 20
ORDER BY year;
```

### Commentary-Based (IPL Only)
```sql
-- Yorker effectiveness by bowler (IPL 2017-2025)
SELECT
    b.bowler,
    COUNT(*) AS yorkers_bowled,
    SUM(CASE WHEN b.wicket_type IS NOT NULL THEN 1 ELSE 0 END) AS wickets,
    ROUND(AVG(b.runs_off_bat), 2) AS avg_runs_per_yorker
FROM commentary c
JOIN balls b ON c.cricsheet_match_id = b.match_id
    AND c.innings = b.innings AND c.over = b.over AND c.ball = b.ball
WHERE c.mention_yorker = TRUE AND c.cricsheet_match_id IS NOT NULL
GROUP BY b.bowler
HAVING COUNT(*) >= 20
ORDER BY wickets DESC
LIMIT 20;
```

---

## Output Structure

For each analysis, save outputs to:
```
outputs/
  [topic-slug]/
    analysis.md          # Full article with stats
    script_outline.md    # YouTube video script
    tweet_threads.md     # Social media content
    key_findings.md      # Quick reference of findings
    queries_used.sql     # All SQL queries for reproducibility
```

---

## Tips for Getting the Best Analysis from Claude Opus

1. **Be specific about what you want**: Instead of "analyze Kohli", say "analyze Kohli's performance in successful chases in ODIs, broken down by era and opposition strength"

2. **Ask for multiple dimensions**: Always request year-wise, opposition-wise, format-wise, and venue-wise breakdowns

3. **Ask for counter-arguments**: "What data contradicts this finding?" forces more rigorous analysis

4. **Request statistical context**: "Is this difference statistically meaningful or could it be random variation?"

5. **Iterate**: The first pass gives you the broad strokes. The second and third passes reveal the nuances that make for great content

6. **Ask for storytelling**: "Frame this finding as a story a cricket fan would find surprising"

7. **Cross-reference**: "Do these findings hold true across formats, or is this format-specific?"
