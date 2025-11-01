# 🤖 Google Gemini AI Integration Setup

## Overview

The Tab Orchestra extension now uses **real Google Gemini AI** for intelligent tab categorization and discussion prompt generation, replacing the previous mock implementation.

## Features

✅ **AI-Powered Tab Categorization**: Gemini AI analyzes your tabs and intelligently groups them into meaningful categories
✅ **Smart Discussion Prompts**: Generate contextual discussion questions for collaborative learning
✅ **Real-time Processing**: Fast categorization using Gemini 2.0 Flash model
✅ **Secure API Key Storage**: Your API key is stored locally in Chrome storage

## Setup Instructions

### Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (it will look like: `AIzaSy...`)

### Step 2: Configure the Extension

1. Click the Tab Orchestra extension icon in your Chrome toolbar
2. Click the "⚙️ Settings" button
3. Paste your Gemini API key in the "Gemini API Key" field
4. Click "Save API Key"
5. You should see a confirmation message: "API key saved! AI categorization enabled. 🤖"

### Step 3: Test the Integration

1. Join a group or create one (enter any group ID like "test-group")
2. Share some tabs with different content (e.g., YouTube, Wikipedia, ChatGPT, Medium, Behance)
3. Open the side panel (click "Open Orchestra Panel")
4. Click the "Refresh" button
5. Watch as Gemini AI categorizes your tabs into intelligent groups!

## How It Works

### Tab Categorization

When you share tabs, the extension sends them to Gemini AI with a detailed prompt asking it to:
- Analyze the tab titles and URLs
- Group them into meaningful categories (Work, Entertainment, Education, AI, Design, etc.)
- Provide descriptive themes for each category

**Example Categories:**
- 🎬 **Entertainment**: YouTube videos, Netflix, Spotify
- 📚 **Education**: Wikipedia, tutorials, online courses
- 🤖 **AI**: ChatGPT, Claude, AI tools
- 🎨 **Design**: Behance, Dribbble, Figma
- 💼 **Work**: GitHub, Jira, Slack
- 📰 **News**: Medium, tech blogs, news sites
- 💻 **Technology**: Stack Overflow, dev tools

### Discussion Prompts

Click "💡 Generate Discussion" on any category to get AI-generated questions that:
- Encourage deep exploration of the content
- Help find connections between resources
- Promote collaborative learning
- Are specific to your actual tabs

## Technical Details

### Models Used

- **Categorization**: `gemini-2.0-flash-exp` with temperature 0.3 (consistent results)
- **Discussion Prompts**: `gemini-2.0-flash-exp` with temperature 0.9 (creative responses)

### API Integration

The extension uses the official `@google/generative-ai` library loaded via CDN in an offscreen document, allowing it to:
- Make API calls without CORS issues
- Process responses asynchronously
- Handle errors gracefully with fallbacks

### Privacy & Security

- ✅ API key stored locally in Chrome storage (never sent to our servers)
- ✅ Only tab titles and URLs are sent to Gemini AI
- ✅ No personal data or browsing history is shared
- ✅ You control when tabs are shared

## Troubleshooting

### "AI categorizer not initialized" Error

**Solution**: Make sure you've entered your Gemini API key in Settings

### Tabs Still Going to "Other" Category

**Solution**: 
1. Check that your API key is valid
2. Open Chrome DevTools (F12) and check the Console for errors
3. Try clicking "Refresh" in the side panel
4. If using the free tier, you may have hit rate limits - wait a few minutes

### API Key Not Saving

**Solution**:
1. Make sure you're clicking the "Save API Key" button
2. Check Chrome's extension permissions
3. Try reloading the extension

### Rate Limits

The free tier of Gemini API has rate limits:
- 15 requests per minute
- 1,500 requests per day

If you hit these limits, categorization will temporarily fail. Consider:
- Waiting a few minutes between large batches of tabs
- Upgrading to a paid tier for higher limits

## Comparison: Mock vs Real AI

### Before (Mock Implementation)
- ❌ Simple keyword matching
- ❌ Limited categories
- ❌ No context understanding
- ❌ Generic discussion prompts

### After (Real Gemini AI)
- ✅ Intelligent semantic analysis
- ✅ Dynamic category creation
- ✅ Context-aware grouping
- ✅ Personalized discussion questions

## Example Output

### Input Tabs:
1. YouTube - "How to build Chrome Extensions"
2. ChatGPT - AI conversation
3. Wikipedia - "Machine Learning"
4. Medium - "The Future of AI"
5. Behance - "UI/UX Design Portfolio"

### AI Categorization:
```json
{
  "clusters": [
    {
      "name": "AI",
      "tabs": [1, 2, 3],
      "theme": "Artificial Intelligence tools and learning resources"
    },
    {
      "name": "Design",
      "tabs": [4],
      "theme": "Creative design portfolios and inspiration"
    },
    {
      "name": "Education",
      "tabs": [0],
      "theme": "Technical tutorials and learning content"
    }
  ]
}
```

### Generated Discussion Prompts:
1. "How might these AI resources complement each other in building a comprehensive understanding of machine learning?"
2. "What connections do you see between ChatGPT's capabilities and the concepts explained in the Wikipedia article?"
3. "How could you apply insights from these AI resources to real-world projects?"

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your API key is correct
3. Ensure you have internet connectivity
4. Try reloading the extension

## API Costs

Gemini API pricing (as of 2024):
- **Free tier**: 15 RPM, 1,500 RPD
- **Pay-as-you-go**: Very affordable for personal use
- Most users will stay within free tier limits

## Next Steps

1. ✅ Set up your API key
2. ✅ Share some diverse tabs
3. ✅ Watch the AI categorize them
4. ✅ Generate discussion prompts
5. ✅ Collaborate with your team!

---

**Made with ❤️ using Google Gemini AI**