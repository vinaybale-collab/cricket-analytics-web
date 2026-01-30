import os
from dotenv import load_dotenv
load_dotenv()  # Load .env file before anything else

import json
import time
import duckdb
from datetime import datetime, date
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from google import genai

# --- Configuration ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Initialize the new Google GenAI client
genai_client = None
if GEMINI_API_KEY:
    genai_client = genai.Client(api_key=GEMINI_API_KEY)

# Model: gemini-2.5-flash-lite has the best free tier (15 RPM, 1,000 RPD)
# Note: gemini-2.0-flash is deprecated and shuts down March 31, 2026
GEMINI_MODEL = 'gemini-2.5-flash-lite'

# --- Rate Limiting (Free Tier Protection) ---
# gemini-2.5-flash-lite Free Tier: 15 RPM, 1,000 RPD
# We limit to 950 to have buffer
DAILY_LIMIT = 950
rate_limit_state = {
    "date": str(date.today()),
    "count": 0
}


def check_rate_limit():
    """Check if we've exceeded daily free tier limit. Raises 429 if exceeded."""
    today = str(date.today())

    # Reset counter if new day
    if rate_limit_state["date"] != today:
        rate_limit_state["date"] = today
        rate_limit_state["count"] = 0

    if rate_limit_state["count"] >= DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Daily free tier limit reached ({DAILY_LIMIT} requests). Service will resume tomorrow. No charges incurred."
        )

    rate_limit_state["count"] += 1
    return rate_limit_state["count"]


# --- Throttling & Retry (Free Tier Protection) ---
# gemini-2.5-flash-lite Free Tier: 15 RPM, 1,000 RPD
# We space calls 5s apart = max 12/min (safely under 15 RPM)
_last_gemini_call_time = 0.0
MIN_CALL_INTERVAL = 5  # seconds between calls


def call_gemini(prompt: str, max_retries: int = 3) -> str:
    """
    Central Gemini API caller with:
    - API key validation
    - Per-minute throttling (5s between calls)
    - Exponential backoff retry on 429 errors
    - Daily rate limit check
    Returns the raw response text (stripped).
    """
    global _last_gemini_call_time

    if not GEMINI_API_KEY or not genai_client:
        raise HTTPException(
            status_code=500,
            detail="Gemini API Key not configured. Set GEMINI_API_KEY environment variable."
        )

    for attempt in range(max_retries):
        try:
            check_rate_limit()

            # Throttle: ensure minimum interval between calls
            now = time.time()
            elapsed = now - _last_gemini_call_time
            if elapsed < MIN_CALL_INTERVAL:
                time.sleep(MIN_CALL_INTERVAL - elapsed)

            response = genai_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )
            _last_gemini_call_time = time.time()
            return response.text.strip()

        except HTTPException:
            raise  # Re-raise our own rate limit errors (daily limit)
        except Exception as e:
            error_str = str(e)
            is_rate_limit = any(
                kw in error_str.lower()
                for kw in ['429', 'quota', 'rate limit', 'resource exhausted', 'rate_limit']
            )

            if is_rate_limit and attempt < max_retries - 1:
                # Exponential backoff: 60s, 120s, 240s
                delay = 60 * (2 ** attempt)
                print(f"[Rate Limit] Attempt {attempt + 1}/{max_retries} failed. Retrying in {delay}s...")
                time.sleep(delay)
                continue

            if is_rate_limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Gemini API rate limit exceeded after {max_retries} retries. Please wait a minute and try again."
                )
            raise


def clean_json_response(text: str) -> str:
    """Clean markdown formatting from Gemini JSON responses."""
    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]
    return text.strip()


app = FastAPI(
    title="Cricket Analytics API",
    description="Natural language to SQL analysis engine for cricket data",
    version="1.0.0"
)

# --- CORS Configuration ---
# Allow all origins (public API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
db_path = "cricket_analytics.duckdb"

# --- Models ---
class QueryRequest(BaseModel):
    prompt: str
    project_id: Optional[str] = None

class AnalysisResponse(BaseModel):
    markdown: str
    sql_used: str
    data: List[dict]


# --- Deep Analysis Models ---
class AnalyticalStep(BaseModel):
    """A single step in the analytical workflow"""
    step_number: int
    title: str
    research_question: str
    sql_query: Optional[str] = None
    results: Optional[List[dict]] = None
    insight: Optional[str] = None
    error: Optional[str] = None


class ChartRecommendation(BaseModel):
    """Recommendation for a chart visualization"""
    chart_type: str  # bar, line, pie, scatter, area, radar, horizontal-bar, composed
    title: str
    data_key: str  # which step's data to use
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    description: str


class DeepAnalysisRequest(BaseModel):
    """Request for comprehensive multi-step analysis"""
    prompt: str
    max_steps: Optional[int] = 4


class DeepAnalysisResponse(BaseModel):
    """Response containing the full deep analysis"""
    title: str
    executive_summary: str
    steps: List[AnalyticalStep]
    article: str
    tweet: str
    charts: List[ChartRecommendation]
    methodology: str
    limitations: str
    total_records_analyzed: int

# --- Helper Functions ---
def get_db_connection():
    # Connect in Read-Only mode for safety
    con = duckdb.connect(db_path, read_only=True)
    return con

def get_database_schema() -> str:
    """Get the database schema for context in prompts"""
    return """
    Database: DuckDB with Cricket Data (5M+ balls, 11,535 matches)

    ===========================================
    TABLE 1: balls - Ball-by-ball delivery data (COMPLETE, 100% ACCURATE)
    ===========================================
    Use for: Career stats, aggregates, strike rates, averages, head-to-head records

    Columns:
       - match_id (VARCHAR): Unique match identifier
       - innings (INTEGER): Innings number (1 or 2)
       - over (INTEGER): Over number
       - ball (INTEGER): Ball number within the over
       - batter (VARCHAR): Batsman facing the ball
       - non_striker (VARCHAR): Batsman at the other end
       - bowler (VARCHAR): Bowler delivering the ball
       - batting_team (VARCHAR): Team batting
       - bowling_team (VARCHAR): Team bowling
       - runs_off_bat (INTEGER): Runs scored off the bat
       - extras (INTEGER): Extra runs
       - total_runs (INTEGER): Total runs from this ball
       - extra_type (VARCHAR): Type of extra (wide, noball, etc.)
       - wicket_type (VARCHAR): Type of dismissal if out
       - dismissed_batter (VARCHAR): Name of dismissed batter
       - phase (VARCHAR): Match phase
       - cumulative_runs (INTEGER): Running total of runs
       - wickets_fallen (INTEGER): Wickets fallen so far

    ===========================================
    TABLE 2: matches - Match-level information (COMPLETE, 100% ACCURATE)
    ===========================================
    Use for: Match results, venue analysis, toss impact, team records

    Columns:
       - match_id (VARCHAR): Unique match identifier
       - date (DATE): Match date
       - venue (VARCHAR): Venue name
       - city (VARCHAR): City
       - country (VARCHAR): Country
       - format (VARCHAR): Match format (ODI, T20, Test, etc.)
       - gender (VARCHAR): male/female
       - team1 (VARCHAR): First team
       - team2 (VARCHAR): Second team
       - winner (VARCHAR): Winning team
       - toss_winner (VARCHAR): Team that won the toss
       - toss_decision (VARCHAR): bat/field
       - player_of_match (VARCHAR): Player of the match

    ===========================================
    TABLE 3: commentary - NLP-extracted delivery features (PARTIAL COVERAGE, IPL ONLY)
    ===========================================
    IMPORTANT: This table has PARTIAL coverage (~48% for length, ~10% for delivery types).
    Use ONLY for delivery-specific analysis that balls table CANNOT answer.

    Coverage: 89,993 entries linked to Cricsheet matches (IPL 2017-2025)

    Columns:
       - commentary_id (TEXT): Unique identifier
       - cricsheet_match_id (TEXT): Links to matches.match_id (use for JOINs)
       - match_id (TEXT): ESPN match ID (do not use for JOINs)
       - innings (INT), over (INT), ball (INT): Ball position
       - text (TEXT): Raw commentary text

       NLP-Extracted Features (BOOLEAN flags):
       - length_short: Mentions short/bouncer (30,169 entries, 20.9%)
       - length_full: Mentions full/yorker/pitched up (28,000 entries, 19.4%)
       - length_good: Mentions good length (14,906 entries, 10.3%)
       - line_off: Mentions off stump/outside off (32,281 entries, 22.3%)
       - line_middle: Mentions middle stump (8,986 entries, 6.2%)
       - line_leg: Mentions leg side (11,226 entries, 7.8%)
       - mention_yorker: Specifically mentions yorker (5,744 entries, 4.0%)
       - mention_bouncer: Specifically mentions bouncer (1,440 entries, 1.0%)
       - mention_swing: Mentions swing movement (3,960 entries, 2.7%)
       - mention_spin: Mentions spin/turn (3,787 entries, 2.6%)
       - mention_beaten: Batsman beaten by delivery (3,273 entries, 2.3%)
       - mention_edge: Ball edged by batsman (11,714 entries, 8.1%)
       - mention_mistimed: Shot mistimed (3,222 entries, 2.2%)
       - sentiment_score (FLOAT): Commentary sentiment (-1 to +1)

    ===========================================
    CRITICAL RULES FOR USING COMMENTARY DATA
    ===========================================

    RULE 1 - USE commentary for DELIVERY-SPECIFIC questions:
       Good: "What's the wicket rate when yorkers are bowled?"
       Good: "Do off-stump deliveries cause more edges?"
       Good: "Which bowlers get batsmen beaten most often?"
       These questions CANNOT be answered from balls table alone.

    RULE 2 - DO NOT USE commentary for AGGREGATE STATISTICS:
       Bad: "Virat Kohli's career strike rate" → Use balls table (100% accurate)
       Bad: "Most wickets in IPL history" → Use balls table (complete data)
       Bad: "Head-to-head: CSK vs MI" → Use balls + matches (complete)

    RULE 3 - ALWAYS JOIN using cricsheet_match_id:
       SELECT b.bowler, COUNT(*) as yorkers, SUM(CASE WHEN b.wicket_type IS NOT NULL THEN 1 ELSE 0 END) as wickets
       FROM commentary c
       JOIN balls b ON c.cricsheet_match_id = b.match_id
                   AND c.innings = b.innings
                   AND c.over = b.over
                   AND c.ball = b.ball
       WHERE c.mention_yorker = TRUE
       GROUP BY b.bowler

    RULE 4 - ALWAYS CAVEAT commentary-based insights:
       Say: "Based on 5,744 deliveries where yorkers were mentioned in IPL commentary..."
       NOT: "Yorkers have a 15% wicket rate" (implies completeness)

    RULE 5 - Commentary is IPL-ONLY (2017-2025):
       Do NOT use for ODIs, Tests, or other T20 leagues.

    ===========================================
    EXAMPLE QUERIES
    ===========================================

    GOOD - Yorker effectiveness (uses commentary):
    SELECT
        b.bowler,
        COUNT(*) as yorkers_bowled,
        SUM(CASE WHEN b.wicket_type IS NOT NULL THEN 1 ELSE 0 END) as wickets,
        ROUND(AVG(b.runs_off_bat), 2) as avg_runs
    FROM commentary c
    JOIN balls b ON c.cricsheet_match_id = b.match_id
                AND c.innings = b.innings AND c.over = b.over AND c.ball = b.ball
    WHERE c.mention_yorker = TRUE AND c.cricsheet_match_id IS NOT NULL
    GROUP BY b.bowler
    HAVING COUNT(*) >= 20
    ORDER BY wickets DESC

    GOOD - Career stats (uses balls only):
    SELECT batter, SUM(runs_off_bat) as runs, COUNT(*) as balls,
           ROUND(SUM(runs_off_bat) * 100.0 / COUNT(*), 2) as strike_rate
    FROM balls
    GROUP BY batter
    ORDER BY runs DESC

    ===========================================
    Common Derived Metrics:
    - Strike Rate = (runs / balls) * 100
    - Batting Average = runs / dismissals
    - Economy Rate = runs_conceded / overs

    ===========================================
    PLAYER NAME FORMAT (CRITICAL)
    ===========================================
    Players are stored in ABBREVIATED Cricsheet format, NOT full names.
    Examples:
       - "V Kohli" (not "Virat Kohli")
       - "RG Sharma" (not "Rohit Sharma")
       - "MS Dhoni" (not "Mahendra Singh Dhoni")
       - "JJ Bumrah" (not "Jasprit Bumrah")
       - "YS Chahal" (not "Yuzvendra Chahal")
       - "Kuldeep Yadav" (some names are full, varies by player)
       - "AB de Villiers" (not "Abraham de Villiers")
       - "SPD Smith" (not "Steve Smith")
       - "JE Root" (not "Joe Root")
       - "BA Stokes" (not "Ben Stokes")

    IMPORTANT: When the user mentions a player by full name, use LIKE patterns to find them:
       WHERE bowler LIKE '%Chahal%' OR bowler LIKE '%Kuldeep%'
    Or use the abbreviated form if you know it.

    Note: Use DuckDB SQL syntax. Common functions: ROW_NUMBER(), SUM(), AVG(), COUNT(), CASE WHEN
    """


def decompose_and_generate_sql(prompt: str, schema: str, max_steps: int = 4) -> List[Dict[str, Any]]:
    """
    Combined: Decomposes prompt into analytical steps AND generates SQL for each.
    This reduces API calls from N+1 to just 1 (was: 1 decompose + N SQL generations).
    The AI AUTONOMOUSLY decides what analyses to perform.
    """
    combined_prompt = f"""
    You are a cricket analytics expert with deep SQL expertise.

    A user wants to understand a cricket topic. Your job is to:
    1. Think AUTONOMOUSLY about ALL analytical dimensions that would help answer this question
    2. Break it into exactly {max_steps} discrete analytical steps
    3. Write a valid DuckDB SQL query for each step

    {schema}

    User's Question:
    "{prompt}"

    AUTONOMOUS ANALYSIS - Think about these dimensions WITHOUT the user telling you:
    - Overall aggregate statistics (career totals, averages, strike rates)
    - Year-by-year or era-wise evolution and trends
    - Opposition-wise breakdown (performance vs different teams)
    - Venue or country-based patterns (home vs away, specific grounds)
    - Format-specific patterns (ODI vs T20 vs Test) if relevant
    - Phase-of-innings analysis (powerplay, middle overs, death overs)
    - Comparative analysis (vs peers, vs benchmarks, together vs apart)
    - Contextual factors (batting first vs chasing, toss impact)
    - Situational analysis (pressure situations, big matches)
    - Partnership and combination analysis if multiple players involved

    Pick the {max_steps} MOST INSIGHTFUL angles. Don't just answer literally - provide deeper insight.

    Return a JSON array (no markdown, raw JSON only):
    [
        {{
            "step_number": 1,
            "title": "Brief title for this analysis angle",
            "research_question": "Specific question this step answers",
            "sql_query": "SELECT ... FROM ... -- valid DuckDB SQL"
        }},
        ...
    ]

    SQL Requirements:
    - DuckDB SQL syntax
    - Appropriate aggregations, GROUP BY, ORDER BY
    - LIMIT 50 max unless aggregating everything
    - Clear column aliases (e.g., AS strike_rate, AS avg_runs)
    - Handle NULLs appropriately
    - Use correct table names: balls, matches, commentary

    Return ONLY valid JSON, no explanations.
    """

    response_text = call_gemini(combined_prompt)
    response_text = clean_json_response(response_text)

    try:
        steps = json.loads(response_text)
        return steps
    except json.JSONDecodeError:
        # Fallback: create a single-step analysis
        return [{
            "step_number": 1,
            "title": "Main Analysis",
            "research_question": prompt,
            "sql_query": None
        }]


def synthesize_article(
    original_prompt: str,
    steps: List[AnalyticalStep],
    schema: str
) -> Dict[str, str]:
    """
    Synthesizes all analytical results into a comprehensive article.
    This is the final stage of the agentic workflow.
    """
    # Build context from all steps
    steps_context = ""
    for step in steps:
        steps_context += f"""

        ### Step {step.step_number}: {step.title}
        Research Question: {step.research_question}
        """
        if step.results:
            # Include sample of results (first 10 rows)
            sample_results = step.results[:10] if len(step.results) > 10 else step.results
            steps_context += f"""
        Results (sample): {json.dumps(sample_results, indent=2)}
        Total records: {len(step.results)}
            """
        if step.error:
            steps_context += f"""
        Error: {step.error}
            """

    synthesis_prompt = f"""
    You are a cricket analytics writer following the Utsav Mamoria narrative style.

    Original User Request:
    "{original_prompt}"

    Analytical Steps Completed:
    {steps_context}

    Write a comprehensive analysis following these rules:

    NARRATIVE STYLE (Utsav Mamoria approach):
    1. Story-first opening - Start with an immersive scene, not a thesis
    2. Use pronoun dance - Balance "you", "we", and "I" naturally
    3. Sentence rhythm - Mix short punchy sentences with longer flowing ones
    4. Use single-sentence paragraphs for emphasis
    5. Ask rhetorical questions to create momentum
    6. Tell player examples as stories, not bullet points
    7. End with an invitation/question, not a summary

    STATISTICAL RIGOR:
    - Include specific numbers from the data
    - Note sample sizes
    - Translate stats into plain English
    - Acknowledge limitations

    Return a JSON object with this exact structure (no markdown, just raw JSON):
    {{
        "title": "Compelling title for the analysis",
        "executive_summary": "2-3 sentence summary of key findings",
        "article": "The full 1200-1800 word article in markdown format",
        "tweet": "A single tweet (under 280 chars) with 2 key points and [link] placeholder",
        "methodology": "Brief methodology section",
        "limitations": "Key limitations of this analysis"
    }}

    Return ONLY valid JSON.
    """

    response_text = call_gemini(synthesis_prompt)
    response_text = clean_json_response(response_text)

    try:
        result = json.loads(response_text)
        return result
    except json.JSONDecodeError:
        # Fallback response
        return {
            "title": "Cricket Analysis",
            "executive_summary": "Analysis completed. See detailed findings below.",
            "article": f"# Analysis\n\nBased on the user's request: {original_prompt}\n\n## Findings\n\n" +
                      "\n\n".join([f"### {s.title}\n{s.insight or 'Data collected.'}" for s in steps]),
            "tweet": "New cricket analysis reveals interesting patterns in the data. [link]",
            "methodology": "SQL queries executed against ball-by-ball ODI data.",
            "limitations": "Analysis limited to available data fields."
        }


def generate_chart_recommendations(
    steps: List[AnalyticalStep]
) -> List[ChartRecommendation]:
    """
    Generates chart recommendations based on the analytical steps and their results.
    """
    # Build context from steps with results
    steps_with_data = []
    for step in steps:
        if step.results and len(step.results) > 0:
            sample = step.results[0] if step.results else {}
            columns = list(sample.keys()) if sample else []
            steps_with_data.append({
                "step_number": step.step_number,
                "title": step.title,
                "columns": columns,
                "row_count": len(step.results),
                "sample_row": sample
            })

    if not steps_with_data:
        return []

    chart_prompt = f"""
    You are a data visualization expert for cricket analytics.

    Given these analytical steps with their data structures:
    {json.dumps(steps_with_data, indent=2)}

    Recommend appropriate charts for visualization.

    Available chart types:
    - bar: For comparing categories
    - horizontal-bar: For comparing many categories or long labels
    - line: For trends over time
    - area: For cumulative trends
    - pie: For part-to-whole (use sparingly, max 6 slices)
    - scatter: For correlation between two numeric variables
    - radar: For multi-dimensional comparison
    - composed: For combining bar and line

    Return a JSON array with recommendations (no markdown, just raw JSON):
    [
        {{
            "chart_type": "bar",
            "title": "Insight-revealing title (what it shows, not just what it is)",
            "data_key": "step_1",
            "x_axis": "column_name",
            "y_axis": "column_name",
            "description": "What insight this chart reveals"
        }}
    ]

    Generate 3-6 chart recommendations. Return ONLY valid JSON.
    """

    response_text = call_gemini(chart_prompt)
    response_text = clean_json_response(response_text)

    try:
        recommendations = json.loads(response_text)
        return [ChartRecommendation(**rec) for rec in recommendations]
    except (json.JSONDecodeError, TypeError):
        return []


def generate_sql_from_prompt(prompt: str) -> str:
    """
    Uses Gemini to convert natural language to DuckDB SQL.
    """
    schema = get_database_schema()

    full_prompt = f"""
    You are an expert Cricket Analyst.

    {schema}

    Convert the following user question into a valid DuckDB SQL query.
    Return ONLY the SQL. No markdown formatting.

    User Question: {prompt}
    """

    response_text = call_gemini(full_prompt)
    sql = response_text.replace('```sql', '').replace('```', '').strip()
    return sql

# --- API Endpoints ---

@app.get("/")
def health_check():
    return {"status": "online", "database": "connected"}

@app.post("/analyze", response_model=AnalysisResponse)
def analyze(request: QueryRequest):
    """
    The Core "Analyst" Endpoint.
    1. Translates Prompt -> SQL (via Gemini)
    2. Runs SQL on DuckDB
    3. Returns Data + Summary
    """
    try:
        # Step 1: Generate SQL
        sql_query = generate_sql_from_prompt(request.prompt)
        
        # Step 2: Execute SQL
        con = get_db_connection()
        df = con.execute(sql_query).fetchdf()
        data_json = df.to_dict(orient='records')
        con.close()
        
        # Step 3: Generate Insights (Optional: Ask Gemini to summarize the data)
        # For now, we return the raw data and SQL.
        summary_md = f"### Analysis Results\nFound {len(data_json)} records based on your query."

        return AnalysisResponse(
            markdown=summary_md,
            sql_used=sql_query,
            data=data_json
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-deep", response_model=DeepAnalysisResponse)
def analyze_deep(request: DeepAnalysisRequest):
    """
    Agentic Deep Analysis Endpoint.

    This endpoint implements a multi-step agentic workflow:
    1. Decomposes the user's comprehensive prompt into analytical steps
    2. Generates SQL for each step
    3. Executes all queries and collects results
    4. Synthesizes findings into a comprehensive article

    Example prompt:
    "I want to understand batsman psychology as they approach 100 in ODIs.
    Analyze: Do players slow down or accelerate between 90-99? Who are the
    best converters vs worst? How does this correlate with team wins?
    Has this evolved over decades?"
    """
    try:
        schema = get_database_schema()

        # Step 1: Decompose prompt into steps WITH SQL in a single API call
        # (Previously required N+1 calls; now just 1)
        raw_steps = decompose_and_generate_sql(
            request.prompt, schema, request.max_steps or 4
        )

        # Step 2: Execute SQL for each step (no API calls needed here)
        analytical_steps: List[AnalyticalStep] = []
        total_records = 0

        for raw_step in raw_steps:
            step = AnalyticalStep(
                step_number=raw_step.get("step_number", len(analytical_steps) + 1),
                title=raw_step.get("title", "Analysis Step"),
                research_question=raw_step.get("research_question", "")
            )

            sql_query = raw_step.get("sql_query")
            if sql_query:
                step.sql_query = sql_query
                try:
                    con = get_db_connection()
                    df = con.execute(sql_query).fetchdf()
                    results = df.to_dict(orient='records')
                    con.close()

                    step.results = results
                    total_records += len(results)

                    if results:
                        step.insight = f"Found {len(results)} records. "
                        if len(results) > 0:
                            first_row = results[0]
                            numeric_cols = [k for k, v in first_row.items()
                                          if isinstance(v, (int, float)) and v is not None]
                            if numeric_cols:
                                key_col = numeric_cols[0]
                                step.insight += f"Key metric ({key_col}): {first_row[key_col]}"

                except Exception as step_error:
                    step.error = str(step_error)
                    step.insight = f"Query failed: {str(step_error)[:100]}"
            else:
                step.error = "No SQL query generated for this step"

            analytical_steps.append(step)

        # Step 3: Synthesize all results into article
        synthesis = synthesize_article(request.prompt, analytical_steps, schema)

        # Step 4: Generate chart recommendations
        charts = generate_chart_recommendations(analytical_steps)

        return DeepAnalysisResponse(
            title=synthesis.get("title", "Cricket Analysis"),
            executive_summary=synthesis.get("executive_summary", ""),
            steps=analytical_steps,
            article=synthesis.get("article", ""),
            tweet=synthesis.get("tweet", ""),
            charts=charts,
            methodology=synthesis.get("methodology", ""),
            limitations=synthesis.get("limitations", ""),
            total_records_analyzed=total_records
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analyze-deep/status")
def analyze_deep_status():
    """Check if the deep analysis endpoint is ready"""
    return {
        "status": "ready",
        "gemini_configured": GEMINI_API_KEY is not None,
        "max_steps": 6,
        "description": "Agentic multi-step analysis endpoint"
    }


# --- Finalize (Conversation to Publication) Models ---
class ConversationMessage(BaseModel):
    """A single message in the conversation history"""
    role: str  # "user" or "assistant"
    content: str
    sql_query: Optional[str] = None
    data: Optional[List[dict]] = None


class FinalizeRequest(BaseModel):
    """Request to finalize a conversation into a publishable project"""
    project_title: str
    conversation: List[ConversationMessage]
    author: Optional[str] = "Vinay Bale"


class ProjectOutput(BaseModel):
    """The finalized project output"""
    slug: str
    title: str
    author: str
    date: str
    executive_summary: str
    article_markdown: str
    tweet: str
    key_stats: List[Dict[str, Any]]
    charts: List[ChartRecommendation]
    data_tables: List[Dict[str, Any]]
    methodology: str
    limitations: str
    verification_notes: str


def extract_data_from_conversation(conversation: List[ConversationMessage]) -> List[Dict[str, Any]]:
    """
    Extracts all data results from a conversation history.
    Returns a list of data sets with their context.
    """
    data_sets = []
    for i, msg in enumerate(conversation):
        if msg.data and len(msg.data) > 0:
            # Find the preceding user message for context
            context = ""
            for j in range(i - 1, -1, -1):
                if conversation[j].role == "user":
                    context = conversation[j].content
                    break

            data_sets.append({
                "query_context": context,
                "sql_query": msg.sql_query,
                "data": msg.data,
                "row_count": len(msg.data)
            })

    return data_sets


def synthesize_conversation_to_article(
    project_title: str,
    conversation: List[ConversationMessage],
    data_sets: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Synthesizes an entire conversation history into a publishable article.
    Uses the Utsav Mamoria narrative style from QUALITY_STANDARDS.md.
    """
    # Build conversation context
    conversation_context = ""
    for msg in conversation:
        conversation_context += f"\n**{msg.role.upper()}**: {msg.content}\n"
        if msg.sql_query:
            conversation_context += f"SQL: {msg.sql_query}\n"
        if msg.data:
            sample = msg.data[:5] if len(msg.data) > 5 else msg.data
            conversation_context += f"Data (sample): {json.dumps(sample)}\n"

    # Build data summary
    data_summary = ""
    total_records = 0
    for i, ds in enumerate(data_sets):
        data_summary += f"\n\nDataset {i + 1}:\n"
        data_summary += f"Context: {ds['query_context']}\n"
        data_summary += f"Records: {ds['row_count']}\n"
        if ds['data']:
            sample = ds['data'][:3]
            data_summary += f"Sample: {json.dumps(sample)}\n"
        total_records += ds['row_count']

    synthesis_prompt = f"""
    You are a cricket analytics writer creating a publication-ready article.

    Project Title: "{project_title}"

    CONVERSATION HISTORY:
    {conversation_context}

    DATA COLLECTED:
    {data_summary}
    Total Records Analyzed: {total_records}

    Create a comprehensive, publication-ready article following the Utsav Mamoria narrative style:

    NARRATIVE STYLE REQUIREMENTS:
    1. Story-first opening - Start with an immersive scene (e.g., "You are at the crease...")
    2. Pronoun dance - Balance "you", "we", and "I" naturally
    3. Sentence rhythm - Mix short punchy sentences with longer flowing ones
    4. Single-sentence paragraphs for emphasis
    5. Rhetorical questions to create momentum
    6. Player examples as stories, not bullet points
    7. End with an invitation/question, not a summary

    STATISTICAL RIGOR:
    - Include specific numbers from the data
    - Note sample sizes (N=X)
    - Translate statistics into plain English
    - Acknowledge limitations honestly

    FACTUAL ACCURACY:
    - Only use statistics that appear in the data
    - Do not fabricate scenes or quotes
    - Use real player names from the data

    Return a JSON object with this exact structure:
    {{
        "executive_summary": "2-3 compelling sentences summarizing key findings",
        "article": "The full 1400-2000 word article in markdown format. Include section headers.",
        "tweet": "Single tweet under 280 chars with 2 key findings and [link] placeholder",
        "key_stats": [
            {{"label": "Stat Name", "value": "X%", "context": "Brief context"}},
            ...
        ],
        "methodology": "Paragraph explaining methodology",
        "limitations": "Paragraph on limitations",
        "verification_notes": "Notes on how findings can be verified"
    }}

    Return ONLY valid JSON.
    """

    response_text = call_gemini(synthesis_prompt)
    response_text = clean_json_response(response_text)

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        return {
            "executive_summary": "Analysis complete. See article for detailed findings.",
            "article": f"# {project_title}\n\nAnalysis based on {total_records} records.",
            "tweet": "New cricket analysis with data-backed insights. [link]",
            "key_stats": [],
            "methodology": "SQL analysis against ball-by-ball ODI data.",
            "limitations": "Limited to available data fields.",
            "verification_notes": "All statistics derived from database queries."
        }


def generate_charts_for_data(data_sets: List[Dict[str, Any]]) -> List[ChartRecommendation]:
    """
    Generates chart recommendations for all data sets from a conversation.
    """
    if not GEMINI_API_KEY or not data_sets:
        return []

    # Build data structure info
    data_info = []
    for i, ds in enumerate(data_sets):
        if ds['data'] and len(ds['data']) > 0:
            sample = ds['data'][0]
            columns = list(sample.keys())
            data_info.append({
                "dataset_index": i,
                "context": ds['query_context'][:100],
                "columns": columns,
                "row_count": ds['row_count'],
                "sample": sample
            })

    if not data_info:
        return []

    chart_prompt = f"""
    You are a data visualization expert creating charts for a cricket analytics publication.

    Data available:
    {json.dumps(data_info, indent=2)}

    Create 4-8 chart recommendations that tell a visual story.

    Available chart types:
    - bar: Comparing categories
    - horizontal-bar: Many categories or long labels
    - line: Trends over time
    - area: Cumulative trends
    - pie: Part-to-whole (max 6 slices)
    - scatter: Correlation between variables
    - radar: Multi-dimensional comparison
    - composed: Bar + line combined

    Chart title rule: Title should state the INSIGHT, not describe the data.
    Good: "Accelerators Convert 35% More Often"
    Bad: "Conversion Rate by Acceleration Category"

    Return a JSON array:
    [
        {{
            "chart_type": "bar",
            "title": "Insight-revealing title",
            "data_key": "dataset_0",
            "x_axis": "column_name",
            "y_axis": "column_name",
            "description": "What this chart shows"
        }}
    ]

    Return ONLY valid JSON.
    """

    response_text = call_gemini(chart_prompt)
    response_text = clean_json_response(response_text)

    try:
        recommendations = json.loads(response_text)
        return [ChartRecommendation(**rec) for rec in recommendations]
    except (json.JSONDecodeError, TypeError):
        return []


@app.post("/finalize", response_model=ProjectOutput)
def finalize_project(request: FinalizeRequest):
    """
    Finalize a conversation into a publishable project.

    This endpoint takes an entire conversation history (queries, responses, data)
    and synthesizes it into a complete, publication-ready project including:
    - Rich markdown article in Utsav Mamoria style
    - Key statistics cards
    - Chart visualizations
    - Data tables
    - Tweet for social sharing
    - Methodology and limitations

    Use this after exploring a topic through the chat interface to create
    a polished, verifiable analysis ready for publication.
    """
    from datetime import datetime

    try:
        # Generate slug from title
        slug = request.project_title.lower()
        slug = slug.replace(" ", "-")
        slug = "".join(c for c in slug if c.isalnum() or c == "-")
        slug = slug[:50]  # Limit length

        # Extract all data from conversation
        data_sets = extract_data_from_conversation(request.conversation)

        # Synthesize into article
        synthesis = synthesize_conversation_to_article(
            request.project_title,
            request.conversation,
            data_sets
        )

        # Generate chart recommendations
        charts = generate_charts_for_data(data_sets)

        # Format data tables for output
        data_tables = []
        for i, ds in enumerate(data_sets):
            if ds['data']:
                data_tables.append({
                    "table_id": f"table_{i}",
                    "title": ds['query_context'][:100] if ds['query_context'] else f"Dataset {i + 1}",
                    "data": ds['data'],
                    "row_count": ds['row_count']
                })

        # Parse key stats
        key_stats = synthesis.get("key_stats", [])
        if not key_stats and data_sets:
            # Generate basic stats from data if none provided
            for ds in data_sets[:4]:
                if ds['data'] and len(ds['data']) > 0:
                    first_row = ds['data'][0]
                    for k, v in first_row.items():
                        if isinstance(v, (int, float)):
                            key_stats.append({
                                "label": k.replace("_", " ").title(),
                                "value": str(round(v, 2)) if isinstance(v, float) else str(v),
                                "context": f"From {ds['row_count']} records"
                            })
                            break

        return ProjectOutput(
            slug=slug,
            title=request.project_title,
            author=request.author or "Vinay Bale",
            date=datetime.now().strftime("%Y-%m-%d"),
            executive_summary=synthesis.get("executive_summary", ""),
            article_markdown=synthesis.get("article", ""),
            tweet=synthesis.get("tweet", ""),
            key_stats=key_stats[:4],  # Limit to 4 key stats
            charts=charts,
            data_tables=data_tables,
            methodology=synthesis.get("methodology", ""),
            limitations=synthesis.get("limitations", ""),
            verification_notes=synthesis.get("verification_notes", "")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/finalize/status")
def finalize_status():
    """Check if the finalize endpoint is ready"""
    return {
        "status": "ready",
        "gemini_configured": GEMINI_API_KEY is not None,
        "description": "Synthesize conversation into publishable project"
    }


# --- Validation Agent Models ---
class ClaimVerification(BaseModel):
    """Verification result for a single claim"""
    claim_id: int
    claim_text: str
    claim_type: str  # "statistical", "factual", "player_stat", "match_detail"
    verification_method: str  # "database_query", "web_search", "both"
    sql_query: Optional[str] = None
    sql_result: Optional[Any] = None
    web_search_query: Optional[str] = None
    web_search_result: Optional[str] = None
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    is_verified: bool
    discrepancy_percent: Optional[float] = None
    notes: str


class ValidationRequest(BaseModel):
    """Request to validate a finalized project"""
    article_markdown: str
    data_tables: List[Dict[str, Any]]
    key_stats: List[Dict[str, Any]]


class ValidationResponse(BaseModel):
    """Complete validation report"""
    overall_status: str  # "VERIFIED", "PARTIAL", "FAILED"
    total_claims: int
    verified_claims: int
    failed_claims: int
    verification_score: float  # percentage
    claims: List[ClaimVerification]
    database_queries_run: int
    web_searches_performed: int
    summary: str
    recommendation: str  # "READY_TO_PUBLISH", "NEEDS_REVISION", "MAJOR_ISSUES"


def extract_claims_from_article(article: str, key_stats: List[Dict]) -> List[Dict[str, Any]]:
    """
    Uses Gemini to extract all verifiable claims from an article.
    """
    extraction_prompt = f"""
    You are a fact-checker for cricket analytics articles.

    Extract ALL verifiable claims from this article that can be checked against:
    1. Database queries (statistical claims)
    2. Web searches (factual claims about matches, players, dates)

    ARTICLE:
    {article}

    KEY STATS PROVIDED:
    {json.dumps(key_stats)}

    For each claim, identify:
    - The exact text of the claim
    - The type (statistical, factual, player_stat, match_detail)
    - The value being claimed
    - How it should be verified

    Return a JSON array:
    [
        {{
            "claim_id": 1,
            "claim_text": "Exact quote from article",
            "claim_type": "statistical",
            "expected_value": "32.9%",
            "verification_method": "database_query",
            "sql_hint": "Query dismissal rates for decelerators"
        }},
        {{
            "claim_id": 2,
            "claim_text": "Dhoni scored 50 in the 2019 World Cup semi-final",
            "claim_type": "match_detail",
            "expected_value": "50",
            "verification_method": "web_search",
            "search_hint": "MS Dhoni 2019 World Cup semi-final score vs New Zealand"
        }}
    ]

    Extract ALL claims with specific numbers, percentages, player statistics, match details.
    Return ONLY valid JSON.
    """

    response_text = call_gemini(extraction_prompt)
    response_text = clean_json_response(response_text)

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        return []


def verify_claim_with_database(claim: Dict[str, Any], schema: str) -> Dict[str, Any]:
    """
    Verifies a statistical claim by generating and running an independent SQL query.
    """
    if not GEMINI_API_KEY:
        return {"verified": False, "error": "Gemini not configured"}

    # Generate verification SQL
    sql_prompt = f"""
    You are verifying a statistical claim from a cricket analytics article.

    {schema}

    CLAIM TO VERIFY:
    "{claim.get('claim_text', '')}"

    Expected value: {claim.get('expected_value', 'unknown')}
    Hint: {claim.get('sql_hint', '')}

    Generate a SQL query to independently verify this claim.
    The query should return the actual value that can be compared to the expected value.

    Return ONLY the SQL query, no markdown, no explanation.
    """

    response_text = call_gemini(sql_prompt)
    sql_query = response_text.replace('```sql', '').replace('```', '').strip()

    # Execute the query
    try:
        con = get_db_connection()
        df = con.execute(sql_query).fetchdf()
        result = df.to_dict(orient='records')
        con.close()

        # Extract the actual value
        actual_value = None
        if result and len(result) > 0:
            first_row = result[0]
            # Try to get the first numeric value
            for v in first_row.values():
                if v is not None:
                    actual_value = v
                    break

        return {
            "sql_query": sql_query,
            "sql_result": result[:5] if result else [],
            "actual_value": str(actual_value) if actual_value else None,
            "verified": True,
            "error": None
        }
    except Exception as e:
        return {
            "sql_query": sql_query,
            "sql_result": None,
            "actual_value": None,
            "verified": False,
            "error": str(e)
        }


def verify_claim_with_web_search(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Verifies a factual claim using web search simulation.
    Note: In production, this would use a real search API.
    For now, we use Gemini's knowledge as a proxy.
    """
    if not GEMINI_API_KEY:
        return {"verified": False, "error": "Gemini not configured"}

    search_prompt = f"""
    You are a cricket fact-checker verifying a claim.

    CLAIM: "{claim.get('claim_text', '')}"
    Expected value: {claim.get('expected_value', 'unknown')}
    Search hint: {claim.get('search_hint', '')}

    Based on your knowledge of cricket history and statistics:
    1. Is this claim factually accurate?
    2. What is the actual/correct information?
    3. If there's a discrepancy, explain it.

    Return a JSON object:
    {{
        "search_query": "The search query you would use",
        "is_accurate": true/false,
        "actual_value": "The correct value/information",
        "source_hint": "Where this could be verified (e.g., ESPNcricinfo, Wikipedia)",
        "explanation": "Brief explanation"
    }}

    Return ONLY valid JSON.
    """

    response_text = call_gemini(search_prompt)
    response_text = clean_json_response(response_text)

    try:
        result = json.loads(response_text)
        return {
            "web_search_query": result.get("search_query", ""),
            "web_search_result": result.get("explanation", ""),
            "actual_value": result.get("actual_value", ""),
            "source_hint": result.get("source_hint", ""),
            "verified": result.get("is_accurate", False),
            "error": None
        }
    except json.JSONDecodeError:
        return {
            "web_search_query": claim.get("search_hint", ""),
            "web_search_result": "Unable to parse verification result",
            "actual_value": None,
            "verified": False,
            "error": "JSON parse error"
        }


def calculate_discrepancy(expected: str, actual: str) -> Optional[float]:
    """Calculate percentage discrepancy between expected and actual values."""
    try:
        # Extract numeric values
        expected_num = float(''.join(c for c in expected if c.isdigit() or c == '.'))
        actual_num = float(''.join(c for c in str(actual) if c.isdigit() or c == '.'))

        if expected_num == 0:
            return 100.0 if actual_num != 0 else 0.0

        return abs((expected_num - actual_num) / expected_num) * 100
    except (ValueError, TypeError):
        return None


@app.post("/validate", response_model=ValidationResponse)
def validate_project(request: ValidationRequest):
    """
    Validation Agent Endpoint.

    This endpoint spawns after /finalize to verify all claims in the article:
    1. Extracts all statistical and factual claims
    2. Runs independent database queries to verify statistics
    3. Performs web searches to verify factual claims
    4. Returns detailed verification report

    If verification fails, the conversation continues to fix issues.
    Only after verification passes should you call /publish.
    """
    try:
        schema = get_database_schema()

        # Step 1: Extract all claims from the article
        raw_claims = extract_claims_from_article(
            request.article_markdown,
            request.key_stats
        )

        if not raw_claims:
            return ValidationResponse(
                overall_status="VERIFIED",
                total_claims=0,
                verified_claims=0,
                failed_claims=0,
                verification_score=100.0,
                claims=[],
                database_queries_run=0,
                web_searches_performed=0,
                summary="No verifiable claims found in article.",
                recommendation="READY_TO_PUBLISH"
            )

        # Step 2: Verify each claim
        verified_claims: List[ClaimVerification] = []
        db_queries = 0
        web_searches = 0

        for claim in raw_claims:
            verification = ClaimVerification(
                claim_id=claim.get("claim_id", len(verified_claims) + 1),
                claim_text=claim.get("claim_text", ""),
                claim_type=claim.get("claim_type", "unknown"),
                verification_method=claim.get("verification_method", "database_query"),
                expected_value=claim.get("expected_value"),
                is_verified=False,
                notes=""
            )

            method = claim.get("verification_method", "database_query")

            if method == "database_query" or method == "both":
                db_result = verify_claim_with_database(claim, schema)
                db_queries += 1

                verification.sql_query = db_result.get("sql_query")
                verification.sql_result = db_result.get("sql_result")
                verification.actual_value = db_result.get("actual_value")

                if db_result.get("error"):
                    verification.notes = f"DB Error: {db_result['error']}"
                    verification.is_verified = False
                elif verification.actual_value:
                    discrepancy = calculate_discrepancy(
                        verification.expected_value or "",
                        verification.actual_value
                    )
                    verification.discrepancy_percent = discrepancy

                    if discrepancy is not None and discrepancy <= 5.0:
                        verification.is_verified = True
                        verification.notes = f"Verified within 5% tolerance (discrepancy: {discrepancy:.1f}%)"
                    elif discrepancy is not None:
                        verification.is_verified = False
                        verification.notes = f"DISCREPANCY: {discrepancy:.1f}% difference from claimed value"
                    else:
                        verification.notes = "Could not calculate discrepancy"

            if method == "web_search" or method == "both":
                web_result = verify_claim_with_web_search(claim)
                web_searches += 1

                verification.web_search_query = web_result.get("web_search_query")
                verification.web_search_result = web_result.get("web_search_result")

                if method == "web_search":
                    verification.actual_value = web_result.get("actual_value")
                    verification.is_verified = web_result.get("verified", False)
                    verification.notes = web_result.get("web_search_result", "")
                    if web_result.get("source_hint"):
                        verification.notes += f" (Source: {web_result['source_hint']})"

            verified_claims.append(verification)

        # Step 3: Calculate overall status
        total = len(verified_claims)
        passed = sum(1 for c in verified_claims if c.is_verified)
        failed = total - passed
        score = (passed / total * 100) if total > 0 else 100.0

        if score >= 95:
            status = "VERIFIED"
            recommendation = "READY_TO_PUBLISH"
        elif score >= 80:
            status = "PARTIAL"
            recommendation = "NEEDS_REVISION"
        else:
            status = "FAILED"
            recommendation = "MAJOR_ISSUES"

        # Generate summary
        if failed == 0:
            summary = f"All {total} claims verified successfully. Article is factually accurate."
        else:
            failed_claims_text = [c.claim_text[:50] + "..." for c in verified_claims if not c.is_verified]
            summary = f"{failed} of {total} claims could not be verified. Issues: {'; '.join(failed_claims_text[:3])}"

        return ValidationResponse(
            overall_status=status,
            total_claims=total,
            verified_claims=passed,
            failed_claims=failed,
            verification_score=round(score, 1),
            claims=verified_claims,
            database_queries_run=db_queries,
            web_searches_performed=web_searches,
            summary=summary,
            recommendation=recommendation
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Publish Models ---
class PublishRequest(BaseModel):
    """Request to publish a validated project"""
    project: ProjectOutput
    validation: ValidationResponse
    output_folder: Optional[str] = None  # Defaults to outputs/


class PublishResponse(BaseModel):
    """Response after publishing"""
    success: bool
    slug: str
    files_created: List[str]
    project_path: str
    message: str


@app.post("/publish", response_model=PublishResponse)
def publish_project(request: PublishRequest):
    """
    Publish a validated project to the outputs folder.

    This endpoint:
    1. Verifies the project passed validation (recommendation = READY_TO_PUBLISH)
    2. Creates the project folder structure
    3. Saves article markdown, data tables (CSV), metadata (JSON)
    4. Returns paths to all created files

    Only call this after /validate returns READY_TO_PUBLISH.
    """
    import csv
    from datetime import datetime

    # Check validation status
    if request.validation.recommendation != "READY_TO_PUBLISH":
        raise HTTPException(
            status_code=400,
            detail=f"Project not ready to publish. Validation status: {request.validation.recommendation}. "
                   f"Score: {request.validation.verification_score}%. Fix issues and re-validate."
        )

    try:
        # Determine output folder
        base_folder = request.output_folder or "outputs"
        project_folder = os.path.join(base_folder, request.project.slug)

        # Create folder structure
        os.makedirs(project_folder, exist_ok=True)
        os.makedirs(os.path.join(project_folder, "data"), exist_ok=True)
        os.makedirs(os.path.join(project_folder, "charts"), exist_ok=True)

        files_created = []

        # 1. Save article markdown
        article_path = os.path.join(project_folder, "article.md")
        with open(article_path, "w", encoding="utf-8") as f:
            f.write(f"# {request.project.title}\n\n")
            f.write(f"**Author:** {request.project.author}\n")
            f.write(f"**Date:** {request.project.date}\n\n")
            f.write(f"---\n\n")
            f.write(f"## Executive Summary\n\n{request.project.executive_summary}\n\n")
            f.write(f"---\n\n")
            f.write(request.project.article_markdown)
            f.write(f"\n\n---\n\n")
            f.write(f"## Methodology\n\n{request.project.methodology}\n\n")
            f.write(f"## Limitations\n\n{request.project.limitations}\n\n")
            f.write(f"## Verification\n\n{request.project.verification_notes}\n")
        files_created.append(article_path)

        # 2. Save tweet
        tweet_path = os.path.join(project_folder, "tweet.txt")
        with open(tweet_path, "w", encoding="utf-8") as f:
            f.write(request.project.tweet)
        files_created.append(tweet_path)

        # 3. Save data tables as CSV
        for table in request.project.data_tables:
            if table.get("data") and len(table["data"]) > 0:
                table_id = table.get("table_id", "data")
                csv_path = os.path.join(project_folder, "data", f"{table_id}.csv")

                with open(csv_path, "w", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=table["data"][0].keys())
                    writer.writeheader()
                    writer.writerows(table["data"])

                files_created.append(csv_path)

        # 4. Save project metadata
        metadata = {
            "slug": request.project.slug,
            "title": request.project.title,
            "author": request.project.author,
            "date": request.project.date,
            "executive_summary": request.project.executive_summary,
            "key_stats": request.project.key_stats,
            "charts": [c.dict() for c in request.project.charts],
            "validation": {
                "status": request.validation.overall_status,
                "score": request.validation.verification_score,
                "claims_verified": request.validation.verified_claims,
                "claims_total": request.validation.total_claims
            },
            "published_at": datetime.now().isoformat()
        }

        metadata_path = os.path.join(project_folder, "metadata.json")
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        files_created.append(metadata_path)

        # 5. Save validation report
        validation_path = os.path.join(project_folder, "validation_report.json")
        with open(validation_path, "w", encoding="utf-8") as f:
            json.dump(request.validation.dict(), f, indent=2, default=str)
        files_created.append(validation_path)

        return PublishResponse(
            success=True,
            slug=request.project.slug,
            files_created=files_created,
            project_path=project_folder,
            message=f"Project '{request.project.title}' published successfully with {len(files_created)} files."
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/validate/status")
def validate_status():
    """Check validation agent status"""
    return {
        "status": "ready",
        "gemini_configured": GEMINI_API_KEY is not None,
        "description": "Validation agent for verifying article claims"
    }


@app.get("/publish/status")
def publish_status():
    """Check publish endpoint status"""
    return {
        "status": "ready",
        "description": "Publish validated projects to output folder"
    }


@app.get("/rate-limit")
def get_rate_limit():
    """Check remaining free tier requests for today"""
    today = str(date.today())

    # Reset counter if new day
    if rate_limit_state["date"] != today:
        rate_limit_state["date"] = today
        rate_limit_state["count"] = 0

    remaining = DAILY_LIMIT - rate_limit_state["count"]

    return {
        "date": today,
        "used": rate_limit_state["count"],
        "remaining": remaining,
        "daily_limit": DAILY_LIMIT,
        "status": "OK" if remaining > 0 else "LIMIT_REACHED",
        "model": GEMINI_MODEL,
        "message": f"{remaining} requests remaining today" if remaining > 0 else "Daily limit reached. Service resumes tomorrow."
    }
