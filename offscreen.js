// Tab Orchestra Offscreen Document - Gemini AI Integration
// This file handles AI-powered tab categorization and discussion prompt generation
// Uses direct Gemini API calls via fetch (no external libraries needed)

console.log('🚀 Offscreen document script loading...');

// Initialize variables
let apiKey = '';
let isAIInitialized = false;

// Gemini API endpoint
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Get API key from Chrome storage
async function getAPIKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      resolve(result.geminiApiKey || null);
    });
  });
}

// Initialize the AI
async function initializeAI(key) {
  try {
    apiKey = key || await getAPIKey();
    
    if (!apiKey) {
      console.warn('⚠️ No Gemini API key provided. Please set your API key.');
      return false;
    }
    
    console.log('✅ Gemini API key configured');
    isAIInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize AI:', error);
    isAIInitialized = false;
    return false;
  }
}

// Make a request to Gemini API
async function callGeminiAPI(prompt, temperature = 0.3) {
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const url = `${GEMINI_API_BASE}/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: temperature,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Categorize tabs using Gemini AI
async function categorizeTabs(tabs) {
  try {
    if (!isAIInitialized) {
      throw new Error('AI not initialized. Please set your Gemini API key.');
    }
    
    console.log('🤖 Categorizing', tabs.length, 'tabs using Gemini AI...');
    
    // Prepare tab data
    const tabData = tabs.map((tab, index) => ({
      index: index,
      title: tab.title,
      url: tab.url
    }));
    
    // Create prompt with better instructions
    const prompt = `You are an expert at categorizing browser tabs. Analyze these tabs and create intelligent, concise categories.

CRITICAL RULES:
1. Return ONLY valid JSON (no markdown, no code blocks, no extra text)
2. Category names must be 1-2 words maximum (e.g., "Design", "Tech News", "Learning")
3. Create specific, meaningful categories based on actual content
4. Every tab must be categorized
5. Group similar content together

Analyze these tabs:
${JSON.stringify(tabData, null, 2)}

Create categories that best describe the content. Examples of good category names:
- "Design" (for Behance, Dribbble, design portfolios)
- "Videos" (for YouTube, streaming)
- "Learning" (for Wikipedia, tutorials, educational content)
- "Tech News" (for Medium tech articles, tech blogs)
- "AI Tools" (for ChatGPT, Claude, AI services)
- "Social" (for social media)
- "Shopping" (for e-commerce)
- "Development" (for GitHub, Stack Overflow, coding)

Return JSON with this EXACT structure:
{
  "clusters": [
    {
      "name": "CategoryName",
      "tabs": [0, 1, 2],
      "theme": "Brief description of what these tabs have in common"
    }
  ]
}

Use tab indices (0, 1, 2, etc.) in the "tabs" arrays. Create concise, descriptive category names.`;
    
    // Call Gemini API
    const responseText = await callGeminiAPI(prompt, 0.3);
    console.log('🤖 Raw AI response:', responseText);
    
    // Parse response
    let jsonStr = responseText.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }
    
    // Extract JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    if (!parsed.clusters || !Array.isArray(parsed.clusters)) {
      throw new Error('Invalid response structure');
    }
    
    // Convert indices to actual tab objects
    const clusters = parsed.clusters.map(cluster => ({
      name: cluster.name,
      tabs: cluster.tabs.map(index => tabs[index]).filter(tab => tab !== undefined),
      theme: cluster.theme || `Collection of ${cluster.name.toLowerCase()} content`
    })).filter(cluster => cluster.tabs.length > 0);
    
    console.log('✅ Successfully categorized into', clusters.length, 'clusters');
    return clusters;
  } catch (error) {
    console.error('❌ AI categorization failed:', error);
    throw error;
  }
}

// Generate discussion prompts using Gemini AI
async function generateDiscussionPrompts(clusterData) {
  try {
    if (!isAIInitialized) {
      throw new Error('AI not initialized. Please set your Gemini API key.');
    }
    
    console.log('💡 Generating discussion prompts for:', clusterData.name);
    
    const clusterName = clusterData.name || 'this content';
    const tabTitles = clusterData.tabs.map(tab => tab.title).slice(0, 10).join('\n- ');
    const tabCount = clusterData.tabs.length;
    
    const prompt = `You are an expert facilitator. Create 3 thought-provoking discussion questions for ${tabCount} browser tabs in the "${clusterName}" category.

Sample titles:
- ${tabTitles}

Create questions that:
1. Encourage deep exploration and critical thinking
2. Help find connections between resources
3. Promote collaborative learning
4. Are specific and actionable
5. Inspire curiosity

Return ONLY the 3 questions, one per line, without numbering or bullets. Each must end with "?".`;
    
    const responseText = await callGeminiAPI(prompt, 0.9);
    console.log('🤖 AI discussion response:', responseText);
    
    // Parse questions
    const questions = responseText
      .split(/\n+/)
      .map(line => line.trim())
      .map(line => line.replace(/^[\d\.\-\*\•]\s*/, ''))
      .filter(line => line.length > 10 && line.includes('?'))
      .slice(0, 3);
    
    if (questions.length === 0) {
      throw new Error('No valid questions generated');
    }
    
    console.log('✅ Generated', questions.length, 'discussion prompts');
    return questions;
  } catch (error) {
    console.error('❌ Discussion prompt generation failed:', error);
    throw error;
  }
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.target !== 'offscreen') {
      return false;
    }
    
    if (!message || !message.type) {
      console.warn('⚠️ Invalid message:', message);
      sendResponse({ error: 'Invalid message format' });
      return false;
    }
    
    console.log('📨 Offscreen received message:', message.type);
    
    switch (message.type) {
      case 'init-ai':
        (async () => {
          try {
            const success = await initializeAI(message.apiKey);
            sendResponse({ success });
            setTimeout(() => {
              sendToServiceWorker('ai-initialized', { success });
            }, 0);
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        })();
        return true;
        
      case 'categorize-tabs':
        (async () => {
          try {
            const clusters = await categorizeTabs(message.tabs);
            sendResponse({ clusters });
            setTimeout(() => {
              sendToServiceWorker('tabs-categorized', { clusters });
            }, 0);
          } catch (error) {
            console.error('Error in categorize-tabs:', error);
            sendResponse({ error: error.message });
          }
        })();
        return true;
        
      case 'generate-discussion-prompts':
        (async () => {
          try {
            const prompts = await generateDiscussionPrompts(message.clusterData);
            sendResponse({ prompts });
            setTimeout(() => {
              sendToServiceWorker('discussion-prompts-generated', { prompts });
            }, 0);
          } catch (error) {
            console.error('Error in generate-discussion-prompts:', error);
            sendResponse({ error: error.message });
          }
        })();
        return true;
        
      default:
        console.warn(`⚠️ Unknown message type: ${message.type}`);
        sendResponse({ error: `Unknown message type: ${message.type}` });
        return false;
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    sendResponse({ error: error.message });
    return false;
  }
});

// Helper function to send messages to service worker
function sendToServiceWorker(type, data) {
  try {
    chrome.runtime.sendMessage({
      type,
      target: 'service-worker',
      data
    }).catch(error => {
      if (error.message.includes('Receiving end does not exist')) {
        console.log('ℹ️ Service worker not ready, will retry...');
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type,
            target: 'service-worker',
            data
          }).catch(retryError => {
            console.error('❌ Retry failed:', retryError.message);
          });
        }, 500);
      } else {
        console.error('❌ Failed to send to service worker:', error);
      }
    });
  } catch (error) {
    console.error('❌ Exception sending to service worker:', error);
  }
}

console.log('✅ Tab Orchestra AI offscreen document initialized');
