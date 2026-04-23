import http from 'http';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { translate } from '@vitalets/google-translate-api';

// Helper functions
function cleanLabel(label) {
  return label.replace(/[^\x00-\x7F]/g, '').trim();
}

function cleanValue(label, value) {
  if (label.includes("Likes")) {
    value = value.split("–")[0].trim();
  }
  return value;
}

// Main scraping function
async function freefire(uid) {
  const url = `https://freefirejornal.com/en/perfil-jogador-freefire/${uid}/`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const playerInfo = {};
    
    const divTag = $('div.jg-player-infos');
    
    if (!divTag.length) {
      return {
        status: "error",
        message: "Invalid UID or data not found"
      };
    }
    
    const items = divTag.find('li');
    
    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      const strong = $(li).find('strong');
      
      if (strong.length) {
        let rawLabel = strong.text().replace(':', '').trim();
        let label = cleanLabel(rawLabel);
        
        let fullText = $(li).text().trim();
        let value = fullText.replace(strong.text(), '').trim();
        
        // Translate only if non-English characters exist
        if (value && !/^[a-zA-Z0-9\s\-_,.!?]+$/.test(value)) {
          try {
            const translated = await translate(value, { to: 'en' });
            value = translated.text;
          } catch (err) {
            // Keep original on translation failure
          }
        }
        
        value = cleanValue(label, value);
        playerInfo[label] = value;
      }
    }
    
    playerInfo.status = "success";
    return playerInfo;
    
  } catch (error) {
    if (error.response) {
      return {
        status: "error",
        message: "Failed to fetch data",
        code: error.response.status
      };
    }
    return {
      status: "error",
      message: error.message
    };
  }
}

// Add developer info to every response
function addDeveloperInfo(response) {
  response.developer = "WASIF ALI";
  response.telegram = "@FREEHACKS95";
  return response;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers - Allow all
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Only GET requests
  if (req.method !== 'GET') {
    const error = addDeveloperInfo({ status: "error", message: "Method not allowed" });
    res.writeHead(405);
    res.end(JSON.stringify(error));
    return;
  }
  
  const urlPath = req.url.split('?')[0];
  
  // Home route
  if (urlPath === '/') {
    const response = addDeveloperInfo({
      status: "ok",
      message: "Free Fire API is running",
      endpoints: {
        info: "/info?uid=YOUR_UID"
      }
    });
    res.writeHead(200);
    res.end(JSON.stringify(response));
    return;
  }
  
  // Info route
  if (urlPath === '/info') {
    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    const uid = urlParams.searchParams.get('uid');
    
    if (!uid) {
      const error = addDeveloperInfo({
        status: "error",
        message: "UID is required"
      });
      res.writeHead(400);
      res.end(JSON.stringify(error));
      return;
    }
    
    const data = await freefire(uid);
    const finalData = addDeveloperInfo(data);
    res.writeHead(200);
    res.end(JSON.stringify(finalData));
    return;
  }
  
  // 404 - route not found
  const notFound = addDeveloperInfo({
    status: "error",
    message: "Route not found"
  });
  res.writeHead(404);
  res.end(JSON.stringify(notFound));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Free Fire API running on http://localhost:${PORT}`);
  console.log(`👨‍💻 Developer: WASIF ALI`);
  console.log(`📱 Telegram: @FREEHACKS95`);
});
