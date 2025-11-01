// AI-Based Collaborative Tab Orchestra - Service Worker
// Handles real-time communication, AI processing, and tab management

let wsConnection = null;
let currentGroupId = null;
let aiSessions = {};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Tab Orchestra extension installed');

  // Initialize storage
  await chrome.storage.local.set({
    userGroups: [],
    sharedTabs: [],
    aiClusters: [],
    userPreferences: {
      autoShare: false,
      aiEnabled: true,
      privacyMode: 'selective'
    }
  });

  // Enable side panel for all tabs
  chrome.sidePanel.setOptions({
    enabled: true,
    path: 'sidepanel/sidepanel.html'
  });
});

// Connection state tracking
let connectionAttemptInProgress = false;
let lastConnectionAttempt = 0;
const CONNECTION_COOLDOWN = 5000; // 5 seconds between connection attempts

// Enhanced WebSocket connection with detailed logging and better error handling
async function initializeWebSocket() {
  // Prevent multiple simultaneous connection attempts
  if (connectionAttemptInProgress) {
    console.log('⏳ Connection attempt already in progress, skipping...');
    return;
  }
  
  // Implement connection cooldown to prevent rapid reconnection attempts
  const now = Date.now();
  if (now - lastConnectionAttempt < CONNECTION_COOLDOWN) {
    console.log('⏳ Connection attempt too soon, waiting for cooldown...');
    return;
  }
  
  try {
    connectionAttemptInProgress = true;
    lastConnectionAttempt = now;
    
    // Close existing connection if any
    if (wsConnection) {
      console.log('🔄 Closing existing connection...');
      wsConnection.close();
    }
    
    console.log('🔄 Attempting WebSocket connection...');
    wsConnection = new WebSocket('ws://localhost:8080');
    
    wsConnection.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      console.log('📡 Connection state:', wsConnection.readyState);
      
      // Notify UI components about connection status
      try {
        chrome.runtime.sendMessage({
          type: 'connection_status_changed',
          connected: true
        }).catch(() => {
          // Ignore errors when no receivers are available
          console.log('No receivers for connection status message');
        });
      } catch (error) {
        // Ignore errors when sending messages
        console.log('Error sending connection status message');
      }
      
      // If we have a current group, rejoin it
      if (currentGroupId) {
        joinGroup(currentGroupId);
      }
      
      sendHeartbeat();
    };
    
    wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Only log non-heartbeat messages to reduce console spam
        if (message.type !== 'pong') {
          console.log('📨 Received message:', message);
        }
        
        handleWebSocketMessage(message);
      } catch (e) {
        console.error('❌ Failed to parse message:', e);
      }
    };
    
    wsConnection.onclose = (event) => {
      console.log('❌ WebSocket disconnected, code:', event.code, 'reason:', event.reason);
      
      // Notify UI components about connection status
      try {
        chrome.runtime.sendMessage({
          type: 'connection_status_changed',
          connected: false
        }).catch(() => {
          // Ignore errors when no receivers are available
          console.log('No receivers for connection status message');
        });
      } catch (error) {
        // Ignore errors when sending messages
        console.log('Error sending connection status message');
      }
      
      // Attempt to reconnect after a delay
      setTimeout(initializeWebSocket, 3000);
    };
    
    wsConnection.onerror = (error) => {
      console.error('🔥 WebSocket error:', error);
      
      // Notify UI components about connection error
      try {
        chrome.runtime.sendMessage({
          type: 'connection_status_changed',
          connected: false,
          error: 'Connection error'
        }).catch(() => {
          // Ignore errors when no receivers are available
          console.log('No receivers for connection status message');
        });
      } catch (error) {
        // Ignore errors when sending messages
        console.log('Error sending connection status message');
      }
    };
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket:', error);
    
    // Notify UI components about connection error
    try {
      chrome.runtime.sendMessage({
        type: 'connection_status_changed',
        connected: false,
        error: error.message
      }).catch(() => {
        // Ignore errors when no receivers are available
        console.log('No receivers for connection status message');
      });
    } catch (error) {
      // Ignore errors when sending messages
      console.log('Error sending connection status message');
    }
    
    // Attempt to reconnect after a delay
    setTimeout(initializeWebSocket, 5000);
  } finally {
    // Reset connection attempt flag
    connectionAttemptInProgress = false;
  }
}

// Enhanced message handling from UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📬 Received UI message:', message);
  
  switch (message.type) {
    case 'join_group':
      console.log('🏠 Joining group:', message.groupId);
      joinGroup(message.groupId);
      break;
    case 'share_current_tab':
      console.log('📤 Sharing current tab');
      shareCurrentTab();
      break;
    case 'generate_discussion_prompt':
      console.log('💡 Generating discussion prompt');
      generateDiscussionPrompt(message.clusterData, sendResponse);
      return true; // Indicate we'll send response asynchronously
      break;
    case 'get_clusters':
      console.log('📊 Getting clusters');
      getClusters(sendResponse);
      return true;
    case 'initialize_websocket':
      console.log('🔌 Initializing WebSocket');
      // Only initialize if we don't have an active connection
      if (!wsConnection || wsConnection.readyState === WebSocket.CLOSED || wsConnection.readyState === WebSocket.CLOSING) {
        initializeWebSocket();
      } else {
        console.log('✅ WebSocket already connected, state:', wsConnection.readyState);
      }
      break;
    case 'connection_status':
      sendResponse({
        connected: wsConnection && wsConnection.readyState === WebSocket.OPEN
      });
      return true;
    case 'initialize_ai':
      console.log('🤖 Initializing AI');
      initializeAI();
      break;
  }
});


// Send periodic heartbeat to keep connection alive
function sendHeartbeat() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    // Send heartbeat without logging to reduce console spam
    wsConnection.send(JSON.stringify({ type: 'heartbeat' }));
    setTimeout(sendHeartbeat, 25000); // Send every 25 seconds
  }
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'tab_shared':
      handleSharedTab(message.data);
      break;
    case 'group_update':
      handleGroupUpdate(message.data);
      break;
    case 'ai_cluster_update':
      handleAIClusterUpdate(message.data);
      break;
    case 'annotation_update':
      handleAnnotationUpdate(message.data);
      break;
    case 'group_data':
      handleGroupData(message.data);
      break;
  }
}

function handleGroupData(groupData) {
  console.log('📥 handleGroupData:', groupData);
  const { sharedTabs = [], annotations = [] } = groupData;
  
  // Store sharedTabs locally
  chrome.storage.local.set({ sharedTabs, annotations }, () => {
    // Compute clusters from the shared tabs
    const clusters = computeClusters(sharedTabs);
    
    // Store clusters
    chrome.storage.local.set({ aiClusters: clusters }, () => {
      // Notify UI components about updated clusters with better error handling
      try {
        chrome.runtime.sendMessage({
          type: 'clusters_updated',
          data: clusters
        }).catch((error) => {
          // Handle specific error types
          if (error.message.includes('Receiving end does not exist')) {
            console.log('ℹ️ No active UI components to receive clusters update');
          } else {
            console.error('❌ Error sending clusters update message:', error);
          }
        });
      } catch (error) {
        console.error('❌ Error sending clusters update message:', error);
      }
      
      // Log the clusters for debugging
      console.log('🔍 Computed clusters:', clusters);
      console.log('📊 Number of shared tabs:', sharedTabs.length);
    });
  });
}

function handleGroupUpdate(update) {
  console.log('👥 handleGroupUpdate:', update);
  chrome.storage.local.get(['groups'], ({ groups = {} }) => {
    groups[update.groupId] = {
      ...(groups[update.groupId] || {}),
      memberCount: update.memberCount
    };
    chrome.storage.local.set({ groups }, () => {
      try {
        chrome.runtime.sendMessage({
          type: 'group_info_updated',
          data: { groupId: update.groupId, memberCount: update.memberCount }
        }).catch(() => {
          // Ignore errors when no receivers are available
          console.log('No receivers for group info update message');
        });
      } catch (error) {
        // Ignore errors when sending messages
        console.log('Error sending group info update message');
      }
    });
  });
}
// Called when a "tab_shared" message arrives from the server
function handleSharedTab(tabData) {
  console.log('🔄 handleSharedTab:', tabData);
  chrome.storage.local.get(['sharedTabs'], ({ sharedTabs = [] }) => {
    // Check if tab already exists by URL AND groupId (to allow same URL in different groups)
    // Also check if timestamp is significantly different (more than 1 second) to avoid echo from server
    const existingTab = sharedTabs.find(tab =>
      tab.url === tabData.url &&
      tab.groupId === tabData.groupId &&
      Math.abs(tab.timestamp - tabData.timestamp) > 1000 // More than 1 second difference
    );
    
    if (existingTab) {
      console.warn('⚠️ Duplicate tab detected:', tabData.url);
      console.warn('⚠️ This tab was already shared at:', new Date(existingTab.timestamp).toLocaleString());
      
      // Notify UI about duplicate
      try {
        chrome.runtime.sendMessage({
          type: 'duplicate_tab_warning',
          data: {
            url: tabData.url,
            title: tabData.title,
            originalTimestamp: existingTab.timestamp
          }
        }).catch(() => {
          console.log('No receivers for duplicate warning');
        });
      } catch (error) {
        console.log('Error sending duplicate warning');
      }
      
      // Don't add duplicate
      return;
    }
    
    // Check if this is just an echo from the server (same timestamp within 1 second)
    const isEcho = sharedTabs.some(tab =>
      tab.url === tabData.url &&
      Math.abs(tab.timestamp - tabData.timestamp) <= 1000
    );
    
    if (isEcho) {
      console.log('ℹ️ Ignoring echo from server for:', tabData.url);
      return;
    }
    
    // Tab is new, add it
    sharedTabs.push(tabData);
    chrome.storage.local.set({ sharedTabs }, () => {
      const clusters = computeClusters(sharedTabs);
      
      // Store clusters
      chrome.storage.local.set({ aiClusters: clusters }, () => {
        // Notify UI components about updated clusters with better error handling
        try {
          chrome.runtime.sendMessage({
            type: 'clusters_updated',
            data: clusters
          }).catch((error) => {
            // Handle specific error types
            if (error.message.includes('Receiving end does not exist')) {
              console.log('ℹ️ No active UI components to receive clusters update');
            } else {
              console.error('❌ Error sending clusters update message:', error);
            }
          });
        } catch (error) {
          console.error('❌ Error sending clusters update message:', error);
        }
        
        console.log('📊 Updated clusters after new tab:', clusters);
      });
    });
  });
}

// Called when a "annotation_update" arrives
function handleAnnotationUpdate(annData) {
  console.log('🖋 handleAnnotationUpdate called with:', annData);
  // (Implement annotation handling similarly)
}

// Called when a "ai_cluster_update" arrives
function handleAIClusterUpdate(clusterData) {
  console.log('🤖 handleAIClusterUpdate called with:', clusterData);
  chrome.storage.local.set({ aiClusters: clusterData }, () => {
    try {
      chrome.runtime.sendMessage({
        type: 'clusters_updated',
        data: clusterData
      }).catch(() => {
        // Ignore errors when no receivers are available
        console.log('No receivers for clusters update message');
      });
    } catch (error) {
      // Ignore errors when sending messages
      console.log('Error sending clusters update message');
    }
  });
}

// Compute clusters based on content categories
function computeClusters(sharedTabs) {
  console.log('🧩 Computing clusters from tabs:', sharedTabs);
  
  if (!Array.isArray(sharedTabs) || sharedTabs.length === 0) {
    console.log('⚠️ No tabs to cluster');
    return [];
  }
  
  // Trigger AI clustering asynchronously (don't wait for it)
  // Lower threshold to 1 tab so AI can categorize even single tabs
  if (sharedTabs.length >= 1) {
    console.log('🤖 Triggering AI categorization for', sharedTabs.length, 'tabs');
    updateAIClusters().catch(error => {
      console.error('❌ AI clustering failed:', error);
    });
  } else {
    console.log('ℹ️ Skipping AI categorization - no tabs to process');
  }
  
  // Return simple domain grouping immediately as a fallback
  // AI results will update the clusters when ready
  console.log('🔄 Using simple domain grouping as initial fallback');
  return simpleGroupByDomain(sharedTabs);
}

// Simple temporary clustering function as a fallback
function temporaryClustering(tabs) {
  // This is just an alias for simpleGroupByDomain to fix the reference error
  return simpleGroupByDomain(tabs);
}

// Path to the offscreen document
const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

// Flag to track if AI is initialized
let aiInitialized = false;

// Chrome AI integration for service workers using offscreen document
async function initializeAI() {
  try {
    console.log('🔄 Initializing AI in service worker context...');
    
    // Create an offscreen document to access the AI APIs
    const offscreenCreated = await createOffscreenDocumentIfNeeded();
    if (!offscreenCreated) {
      console.error('❌ Failed to create offscreen document');
      return false;
    }
    
    // Wait a moment to ensure the offscreen document is fully loaded
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get the API key from storage
    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
    
    if (!geminiApiKey) {
      console.warn('⚠️ No Gemini API key found in storage. Please set your API key in Settings.');
      return false;
    }
    
    try {
      // Use a Promise to handle the response
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'init-ai',
          target: 'offscreen',
          apiKey: geminiApiKey
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      console.log('✅ AI initialization response:', response);
      
      // Update the AI initialized flag
      aiInitialized = response && response.success;
      
      return aiInitialized;
    } catch (sendError) {
      console.error('❌ Failed to send message to offscreen document:', sendError);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize AI:', error);
    return false;
  }
}

// Helper function to create an offscreen document if it doesn't exist
async function createOffscreenDocumentIfNeeded() {
  try {
    // Check if the offscreen document already exists
    if (await hasOffscreenDocument()) {
      console.log('✅ Offscreen document already exists');
      return true;
    }
    
    console.log('🔄 Creating offscreen document for AI processing');
    
    // Close any existing documents first to avoid conflicts
    try {
      await chrome.offscreen.closeDocument();
      console.log('🔄 Closed any existing offscreen documents');
    } catch (closeError) {
      // Ignore errors if no document exists
      console.log('ℹ️ No existing offscreen document to close');
    }
    
    // Create the offscreen document
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Access Google Gemini AI for tab categorization and discussion prompts'
    });
    
    console.log('✅ Offscreen document created successfully');
    
    // Wait a moment to ensure the document is fully loaded
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create offscreen document:', error);
    return false;
  }
}

// Check if the offscreen document exists
async function hasOffscreenDocument() {
  // Check all windows controlled by the service worker
  const matchedClients = await clients.matchAll();
  
  for (const client of matchedClients) {
    if (client.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
      return true;
    }
  }
  
  return false;
}

// Close the offscreen document when it's no longer needed
async function closeOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    await chrome.offscreen.closeDocument();
    console.log('✅ Offscreen document closed');
  }
}

// Tab management and sharing
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (currentGroupId) {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await processTabForSharing(tab);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && currentGroupId) {
    await processTabForSharing(tab);
  }
});

async function processTabForSharing(tab) {
  const settings = await chrome.storage.local.get(['userPreferences']);

  if (settings.userPreferences?.autoShare) {
    await shareTab(tab);
  }
}

// Enhanced share tab function
async function shareTab(tab) {
  console.log('📤 Sharing tab:', tab.title, tab.url);
  
  if (!currentGroupId) {
    console.error('❌ No group to share to!');
    return;
  }
  
  const sharedTab = {
    id: tab.id,
    title: tab.title,
    url: tab.url,
    summary: 'No summary available',
    timestamp: Date.now(),
    groupId: currentGroupId
  };
  
  console.log('📦 Prepared tab data:', sharedTab);
  
  // Store locally
  const { sharedTabs = [] } = await chrome.storage.local.get(['sharedTabs']);
  sharedTabs.push(sharedTab);
  await chrome.storage.local.set({ sharedTabs });
  console.log('💾 Stored locally, total tabs:', sharedTabs.length);
  
  // Send to server
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    const shareMessage = {
      type: 'share_tab',
      data: sharedTab
    };
    console.log('📤 Sending share message:', shareMessage);
    wsConnection.send(JSON.stringify(shareMessage));
  } else {
    console.error('❌ Cannot send to server, WebSocket state:', wsConnection?.readyState);
  }
  
  // Update UI
  try {
    chrome.runtime.sendMessage({
      type: 'tab_shared',
      data: sharedTab
    }).catch(() => {
      // Ignore errors when no receivers are available
      console.log('No receivers for tab shared message');
    });
  } catch (error) {
    // Ignore errors when sending messages
    console.log('Error sending tab shared message');
  }
}

// AI-powered tab clustering using Gemini AI
async function updateAIClusters() {
  console.log('🤖 Attempting AI-powered tab clustering...');
  
  try {
    const { sharedTabs = [] } = await chrome.storage.local.get(['sharedTabs']);

    if (sharedTabs.length < 1) {
      console.log('⚠️ No tabs to cluster');
      return;
    }
    
    console.log('📊 Processing', sharedTabs.length, 'tab(s) for AI categorization');

    // Make sure the offscreen document is created
    const offscreenCreated = await createOffscreenDocumentIfNeeded();
    
    if (!offscreenCreated) {
      throw new Error('Failed to create offscreen document');
    }
    
    // Wait a moment to ensure the document is fully loaded
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Send the tabs to the offscreen document for AI categorization
    console.log('🧠 Sending tabs to Gemini AI for categorization');
    try {
      // Use a Promise to handle the response
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'categorize-tabs',
          target: 'offscreen',
          tabs: sharedTabs
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      console.log('✅ Tab categorization response:', response);
      
      // Process the clusters directly from the response
      if (response && response.clusters) {
        await handleTabsCategorized({ clusters: response.clusters });
      } else if (response && response.error) {
        throw new Error(response.error);
      }
    } catch (sendError) {
      console.error('❌ Failed to send message to offscreen document:', sendError);
      throw sendError;
    }

  } catch (error) {
    console.error('❌ AI clustering failed:', error);
    
    // Get the shared tabs again in case they've changed
    const { sharedTabs = [] } = await chrome.storage.local.get(['sharedTabs']);
    
    // If AI clustering fails, fall back to a simple categorization
    console.log('⚠️ Falling back to simple domain grouping temporarily');
    const simpleClusters = simpleGroupByDomain(sharedTabs);
    
    // Store the clusters
    await chrome.storage.local.set({ aiClusters: simpleClusters });
    
    // Notify UI components with better error handling
    try {
      chrome.runtime.sendMessage({
        type: 'clusters_updated',
        data: simpleClusters
      }).catch((error) => {
        // Handle specific error types
        if (error.message.includes('Receiving end does not exist')) {
          console.log('ℹ️ No active UI components to receive clusters update');
        } else {
          console.error('❌ Error sending clusters update message:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error sending clusters update message:', error);
    }
  }
}

// Simple domain grouping as a temporary fallback
// This doesn't use hardcoded patterns, just groups by domain
function simpleGroupByDomain(tabs) {
  const domainGroups = {};
  
  tabs.forEach(tab => {
    try {
      // Extract domain from URL
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      // Initialize group if it doesn't exist
      if (!domainGroups[domain]) {
        domainGroups[domain] = [];
      }
      
      // Add tab to group
      domainGroups[domain].push(tab);
    } catch (error) {
      // Handle invalid URLs
      console.error('❌ Error parsing URL:', tab.url, error);
      
      // Put in "Other" category
      if (!domainGroups['Other']) {
        domainGroups['Other'] = [];
      }
      domainGroups['Other'].push(tab);
    }
  });
  
  // Convert to clusters format
  return Object.entries(domainGroups).map(([domain, tabs]) => ({
    name: domain,
    tabs: tabs,
    theme: `Content from ${domain}`
  }));
}

// Enhanced message handling for AI-related messages with error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    // Only process messages targeted to the service worker
    if (message.target !== 'service-worker') {
      return false;
    }
    
    // Check if message is valid
    if (!message || !message.type) {
      console.warn('⚠️ Received invalid message:', message);
      return false;
    }
    
    console.log('📨 Service worker received message:', message);
    
    // Handle different message types
    switch (message.type) {
      case 'ai-initialized':
        handleAIInitialized(message.data);
        break;
        
      case 'tabs-categorized':
        handleTabsCategorized(message.data);
        break;
        
      case 'discussion-prompts-generated':
        handleDiscussionPromptsGenerated(message.data);
        break;
        
      case 'offscreen-document-ready':
        console.log('✅ Offscreen document is ready');
        // Initialize AI now that the document is ready
        setTimeout(() => {
          initializeAI();
        }, 500);
        break;
        
      case 'error':
        console.error('❌ Error from offscreen document:', message.data?.error);
        break;
        
      default:
        console.warn(`⚠️ Unknown message type for service worker: ${message.type}`);
    }
  } catch (error) {
    console.error('❌ Error handling service worker message:', error);
  }
  
  return false;
});

// Handle AI initialization result
function handleAIInitialized(data) {
  aiInitialized = data.success;
  console.log(`🤖 AI initialization ${data.success ? 'successful' : 'failed'}`);
  
  if (!data.success && data.error) {
    console.error('❌ AI initialization error:', data.error);
  }
}

// Handle tabs categorization result
async function handleTabsCategorized(data) {
  if (data.error) {
    console.error('❌ Tab categorization error:', data.error);
    return;
  }
  
  if (!data.clusters || !Array.isArray(data.clusters)) {
    console.error('❌ Invalid clusters data received');
    return;
  }
  
  console.log('✅ Received AI-generated clusters:', data.clusters);
  
  // Store the clusters
  await chrome.storage.local.set({ aiClusters: data.clusters });
  
  // Notify UI components
  try {
    chrome.runtime.sendMessage({
      type: 'clusters_updated',
      data: data.clusters
    }).catch(() => {
      console.log('No receivers for clusters update message');
    });
  } catch (error) {
    console.log('Error sending clusters update message');
  }
}

// Handle discussion prompts generation result
function handleDiscussionPromptsGenerated(data) {
  if (data.error) {
    console.error('❌ Discussion prompts generation error:', data.error);
    return;
  }
  
  if (!data.prompts || !Array.isArray(data.prompts)) {
    console.error('❌ Invalid prompts data received');
    return;
  }
  
  console.log('✅ Received AI-generated discussion prompts:', data.prompts);
  
  // Send the prompts to the UI
  try {
    chrome.runtime.sendMessage({
      type: 'discussion_prompts_generated',
      data: data.prompts
    }).catch(() => {
      console.log('No receivers for discussion prompts message');
    });
  } catch (error) {
    console.log('Error sending discussion prompts message');
  }
}

// Removed duplicate message handler - using the one at the top of the file

// Enhanced share tab function
async function shareCurrentTab() {
  console.log('📤 shareCurrentTab called, currentGroupId:', currentGroupId);
  
  if (!currentGroupId) {
    console.error('❌ No group joined! Cannot share tab.');
    alert('Please join a group first before sharing tabs!');
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('📋 Current tab:', tab);
    await shareTab(tab);
  } catch (error) {
    console.error('❌ Failed to get current tab:', error);
  }
}

// AI-powered discussion prompt generation
async function generateDiscussionPrompt(clusterData, sendResponse) {
  console.log('💡 Generating discussion prompts for:', clusterData);
  
  try {
    // Make sure the offscreen document is created
    const offscreenCreated = await createOffscreenDocumentIfNeeded();
    
    if (!offscreenCreated) {
      throw new Error('Failed to create offscreen document');
    }
    
    // Wait a moment to ensure the document is fully loaded
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Send the cluster data to the offscreen document for AI prompt generation
    console.log('🧠 Sending cluster data to Gemini AI for discussion prompt generation');
    try {
      // Use a Promise to handle the response
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'generate-discussion-prompts',
          target: 'offscreen',
          clusterData
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      console.log('✅ Discussion prompt generation response:', response);
      
      // If we have prompts in the response, use them directly
      if (response && response.prompts) {
        if (sendResponse) {
          sendResponse(response.prompts);
        }
        return response.prompts;
      } else if (response && response.error) {
        throw new Error(response.error);
      }
    } catch (sendError) {
      console.error('❌ Failed to send message to offscreen document:', sendError);
      throw sendError;
    }
    
    // Fallback if we didn't get a proper response
    const fallbackPrompts = [
      `What are the most valuable insights from these ${clusterData.name} resources?`,
      `How might these ${clusterData.name} resources connect to your current projects?`,
      `What questions arise after reviewing these ${clusterData.name} materials?`
    ];
    
    if (sendResponse) {
      sendResponse(fallbackPrompts);
    }
    
    return fallbackPrompts;
  } catch (error) {
    console.error('❌ Failed to generate discussion prompts:', error);
    
    // Generate simple generic questions based on the cluster name
    const genericQuestions = [
      `What are the most valuable insights from these ${clusterData.name} resources?`,
      `How might these ${clusterData.name} resources connect to your current projects?`,
      `What questions arise after reviewing these ${clusterData.name} materials?`
    ];
    
    // Send response
    if (sendResponse) {
      sendResponse(genericQuestions);
    }
    
    return genericQuestions;
  }
}

async function getClusters(sendResponse) {
  const { aiClusters = [] } = await chrome.storage.local.get(['aiClusters']);
  sendResponse(aiClusters);
}

// Enhanced join group function with better error handling
function joinGroup(groupId) {
  console.log('🏠 Setting currentGroupId to:', groupId);
  currentGroupId = groupId;
  
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    const joinMessage = {
      type: 'join_group',
      groupId: groupId
    };
    console.log('📤 Sending join message:', joinMessage);
    wsConnection.send(JSON.stringify(joinMessage));
  } else {
    console.error('❌ WebSocket not connected, readyState:', wsConnection?.readyState);
    
    // Initialize WebSocket if not connected
    if (!wsConnection || wsConnection.readyState === WebSocket.CLOSED) {
      initializeWebSocket();
    }
    
    // Store the group ID to join after connection is established
    // The onopen handler will call joinGroup with this ID
  }
}


// Initialize AI on startup with a delay to ensure everything is loaded
setTimeout(() => {
  initializeAI();
}, 1000);

console.log('Tab Orchestra service worker initialized');

// Add a listener for extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Extension starting up');
  // Initialize AI with a delay
  setTimeout(() => {
    initializeAI();
  }, 2000);
});
