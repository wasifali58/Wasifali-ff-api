import axios from 'axios';
import * as cheerio from 'cheerio';

function cleanLabel(label) {
  return label.replace(/[^\x00-\x7F]/g, '').trim();
}

function cleanValue(label, value) {
  if (label.includes("Likes")) {
    value = value.split("–")[0].trim();
  }
  return value;
}

async function freefire(uid) {
  const url = `https://freefirejornal.com/en/perfil-jogador-freefire/${uid}/`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
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
        
        value = cleanValue(label, value);
        playerInfo[label] = value;
      }
    }
    
    if (Object.keys(playerInfo).length === 0) {
      return {
        status: "error",
        message: "No data found for this UID"
      };
    }
    
    playerInfo.status = "success";
    return playerInfo;
    
  } catch (error) {
    console.error('Error:', error.message);
    return {
      status: "error",
      message: "Failed to fetch player data. Please check UID or try again later."
    };
  }
}

function addDeveloperInfo(response) {
  response.developer = "WASIF ALI";
  response.telegram = "@FREEHACKS95";
  return response;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json(addDeveloperInfo({
      status: "error",
      message: "Method not allowed. Use GET request."
    }));
  }
  
  // Home route
  if (req.url === '/' || req.url === '') {
    return res.status(200).json(addDeveloperInfo({
      status: "ok",
      message: "Free Fire API is running",
      endpoints: {
        info: "/api/info?uid=YOUR_UID",
        home: "/"
      },
      example: "/api/info?uid=123456789"
    }));
  }
  
  // Get UID from query
  const { uid } = req.query;
  
  if (!uid) {
    return res.status(400).json(addDeveloperInfo({
      status: "error",
      message: "UID is required. Use: /api/info?uid=YOUR_UID"
    }));
  }
  
  // Validate UID (only numbers)
  if (!/^\d+$/.test(uid)) {
    return res.status(400).json(addDeveloperInfo({
      status: "error",
      message: "UID must contain only numbers"
    }));
  }
  
  // Fetch player data
  const data = await freefire(uid);
  return res.status(200).json(addDeveloperInfo(data));
}
