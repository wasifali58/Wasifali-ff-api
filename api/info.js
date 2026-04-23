import axios from 'axios';
import * as cheerio from 'cheerio';
import { translate } from '@vitalets/google-translate-api';

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
        
        if (value && !/^[a-zA-Z0-9\s\-_,.!?]+$/.test(value)) {
          try {
            const translated = await translate(value, { to: 'en' });
            value = translated.text;
          } catch (err) {}
        }
        
        value = cleanValue(label, value);
        playerInfo[label] = value;
      }
    }
    
    playerInfo.status = "success";
    return playerInfo;
    
  } catch (error) {
    return {
      status: "error",
      message: error.message
    };
  }
}

function addDeveloperInfo(response) {
  response.developer = "WASIF ALI";
  response.telegram = "@FREEHACKS95";
  return response;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { uid } = req.query;
  
  if (!uid) {
    return res.status(400).json(addDeveloperInfo({
      status: "error",
      message: "UID is required"
    }));
  }
  
  const data = await freefire(uid);
  return res.status(200).json(addDeveloperInfo(data));
}
