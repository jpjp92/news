import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
// Vite is only needed for development, lazy loaded later
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
export default app; // Export for Vercel serverless functions
const PORT = process.env.PORT || 3000;

// Initialize Gemini with API Key from environment variables
// Support both uppercase and lowercase for consistency in Vercel UI
const apiKeyToUse = process.env.GEMINI_API_KEY || process.env.gemini_api_key || '';
if (!apiKeyToUse) {
  console.warn('GEMINI_API_KEY is not set in environment variables. Check Vercel project settings.');
}
console.log(`Using API Key starting with: ${apiKeyToUse.substring(0, 10)}...`);
const ai = new GoogleGenerativeAI(apiKeyToUse);

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemma-3-1b-it', 'gemma-3-4b-it'];
let currentModelIndex = 0;

// Limit to top 30 headlines for analysis (5 per category * 6 categories = 30)

function sanitizeText(text: string): string {
  return text.replace(/[\[\]"{}]/g, '').trim();
}

function extractAndFixJson(text: string): any {
  // 1. Find the first '{' and last '}'
  let start = text.indexOf('{');
  let end = text.lastIndexOf('}');
  
  if (start === -1) return null;
  
  // If no closing brace, or it's before start, try to fix truncation
  if (end === -1 || end < start) {
    let truncated = text.substring(start);
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    
    for (let i = 0; i < truncated.length; i++) {
      const char = truncated[i];
      if (char === '"' && truncated[i-1] !== '\\') inString = !inString;
      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }
    
    let fixed = truncated;
    if (inString) fixed += '"';
    
    // Attempt to close arrays first, then objects
    // This is a simple heuristic for truncated lists
    while (openBrackets > 0) { 
      // If the last character is a comma, remove it to make JSON valid
      if (fixed.trim().endsWith(',')) fixed = fixed.trim().slice(0, -1);
      fixed += ']'; 
      openBrackets--; 
    }
    while (openBraces > 0) { 
      if (fixed.trim().endsWith(',')) fixed = fixed.trim().slice(0, -1);
      fixed += '}'; 
      openBraces--; 
    }
    
    try {
      // Last resort: some models put unescaped double quotes inside strings.
      // We try a common but risky fix: replacing "title": "Some "quoted" text" with safe version
      const partiallyFixed = fixed
        .replace(/"(title|summary|overallTrend|keyword|sentiment)":\s*"(.*?)"/g, (match, key, value) => {
          // If the value contains internal unescaped quotes, they will break the regex match group 2
          // This regex is limited but helps in some cases. 
          // A better way is to minimize quotes in the prompt.
          return `"${key}": "${value.replace(/"/g, "'")}"`;
        });
      return JSON.parse(partiallyFixed);
    } catch (e) {
      // Partial fix failed, try parsing the original fixed version
      try {
        return JSON.parse(fixed);
      } catch (innerE) {
        return null;
      }
    }
  }

  const jsonCandidate = text.substring(start, end + 1);
  try {
    return JSON.parse(jsonCandidate);
  } catch (e) {
    // Attempt cleaning unescaped quotes in the candidate
    try {
      const cleaned = jsonCandidate.replace(/"(.*?)"/g, (match, p1) => {
        // This is dangerous but might help for simple cases
        // Only do this if we find obviously broken patterns
        return match; 
      });
      // Instead of complex regex, let's just try to remove the most common offenders
      // which are internal unescaped quotes.
      return null; // For now, rely on prompt strictness and basic extract
    } catch (innerE) {
      return null;
    }
  }
}

app.get('/api/news-analysis', async (req, res) => {
  try {
    let headlines: { title: string; url: string; expectedCategory?: string }[] = [];
    
    const NAVER_SECTIONS = [
      { id: '100', name: '정치' },
      { id: '101', name: '경제' },
      { id: '102', name: '사회' },
      { id: '103', name: '생활/문화' },
      { id: '105', name: 'IT/과학' },
      { id: '104', name: '세계' }
    ];

    try {
      // Fetch up to 5 articles from each specific section
      await Promise.all(NAVER_SECTIONS.map(async (section) => {
        try {
          const response = await fetch(`https://news.naver.com/section/${section.id}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          const html = await response.text();
          const $ = cheerio.load(html);
          
          let count = 0;
          // .sa_text_strong is commonly used in Naver News section pages
          $('.sa_text_strong, .cjs_t, .sh_text_headline').each((i, el) => {
            if (count >= 5) return; // Get up to 5 articles per category
            
            const text = $(el).text().trim();
            const $a = $(el).closest('a');
            let url = $a.attr('href') || '';
            
            if (url && !url.startsWith('http')) {
              url = 'https://news.naver.com' + url;
            }

            if (text && !headlines.some(h => h.title === text)) {
              headlines.push({ title: text, url, expectedCategory: section.name });
              count++;
            }
          });
        } catch (e) {
          console.warn(`Failed to fetch from Naver News section ${section.name}`, e);
        }
      }));
      
      // Shuffle the headlines so they are mixed in the UI
      headlines.sort(() => Math.random() - 0.5);
      
    } catch (e) {
      console.warn('Failed to fetch from Naver News', e);
    }

    // Limit to top 18 headlines for analysis (3 per category * 6 categories = 18)
    // This reduction helps smaller models like gemma-3-4b-it complete the output without truncation.
    const topHeadlines = headlines.slice(0, 18);

    if (topHeadlines.length === 0) {
      return res.json({ 
        success: true, 
        data: {
          overallTrend: "현재 수집된 뉴스가 없습니다. 잠시 후 다시 시도해주세요.",
          categories: [],
          keyTopics: [],
          summaries: []
        }, 
        rawHeadlines: [],
        modelUsed: GEMINI_MODELS[currentModelIndex] 
      });
    }

    // Select the next Gemini model in the rotation
    const currentModel = GEMINI_MODELS[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
    console.log(`Analyzing news using model: ${currentModel}`);

    // Use Gemini to analyze trends and summarize
    const prompt = `
    Analyze the following news headlines and provide a JSON response.
    STRICT INSTRUCTION: ALL text fields (overallTrend, summaries, keyword) MUST be written in KOREAN. 
    ENGLISH IS STRICTLY FORBIDDEN for any descriptive text.
    
    Headlines:
    ${topHeadlines.map((h, i) => `${i + 1}. [Category: ${h.expectedCategory || 'Unknown'}] [${sanitizeText(h.title)}](${h.url})`).join('\n')}

    Respond ONLY with a valid JSON object.
    CRITICAL JSON RULES:
    1. NEVER use double quotes (") inside value strings. Use single quotes (') or just plain text if needed.
    2. Ensure every property name is in double quotes.
    3. NO trailing commas.
    4. Provide the result as ONE compact JSON object.
    
    IMPORTANT: Keep the "summary" field extremely brief (under 50 characters).
    The "overallTrend" should be a comprehensive summary of 2-3 sentences.
    
    Structure:
    {
      "overallTrend": "현재 수집된 뉴스들의 핵심 이슈와 전반적인 흐름을 한국어 2-3문장으로 집약적으로 요약.",
      "categories": [
        { "name": "카테고리명 (정치, 경제, 사회, 생활/문화, IT/과학, 세계)", "count": 1 }
      ],
      "keyTopics": [
        { "keyword": "핵심 키워드 (한국어)", "sentiment": "positive/negative/neutral", "score": 1-100 }
      ],
      "summaries": [
        { "title": "원본 헤드라인", "summary": "한국어 1줄 요약(50자 이내)", "category": "카테고리명", "url": "원본 URL" }
      ]
    }
    `;

    const normalizedModel = currentModel.toLowerCase();
    const isGemini = normalizedModel.includes('gemini');
    console.log(`[SERVER] Requesting analysis using model: ${currentModel} | JSON Mode: ${isGemini}`);
    
    const aiResponse = await ai.getGenerativeModel({ 
      model: currentModel,
      generationConfig: {
        ...(isGemini ? { responseMimeType: "application/json" } : {}),
        maxOutputTokens: 6000,
        temperature: 0, // Set to 0 for maximum consistency
      }
    }).generateContent(prompt);

    const responseText = aiResponse.response.text() || '';
    let analysis = extractAndFixJson(responseText);

    if (!analysis) {
      console.warn(`[${currentModel}] Failed to extract valid JSON. Raw response:`, responseText);
      
      // Fallback for smaller models that might fail to generate valid JSON
      analysis = {
        overallTrend: `[Model ${currentModel} response processing failed]`,
        categories: [{ name: "Error", count: 1 }],
        keyTopics: [{ keyword: "Parsing Error", sentiment: "negative", score: 100 }],
        summaries: [{ title: "Error parsing AI response", summary: "The model did not return a valid JSON format.", category: "Error" }]
      };
    } else {
      // Ensure required arrays exist and have valid structure
      if (!Array.isArray(analysis.summaries)) analysis.summaries = [];
      if (!Array.isArray(analysis.categories)) analysis.categories = [];
      if (!Array.isArray(analysis.keyTopics)) analysis.keyTopics = [];
      
      // Sanitize fields to ensure they don't break UI
      analysis.overallTrend = analysis.overallTrend || "";
    }
    
    res.json({ 
      success: true, 
      data: analysis, 
      rawHeadlines: topHeadlines,
      modelUsed: currentModel 
    });
  } catch (error: any) {
    console.error('Error fetching/analyzing news:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze news: ' + (error.message || 'Unknown error') 
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server if not running on Vercel as a serverless function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
