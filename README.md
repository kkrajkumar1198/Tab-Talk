# Tab Talk

A Chrome extension for intelligent collaborative tab sharing with AI-powered clustering and orchestration.

## Features

- **Real-time Tab Sharing**: Share tabs with collaborators in real-time
- **AI-Powered Clustering**: Automatically organize shared tabs into thematic clusters
- **Group Collaboration**: Create or join collaboration groups
- **Discussion Prompts**: Generate AI-powered discussion prompts based on shared content
- **Annotations**: Add annotations to shared web content

## Installation

### Extension Setup

1. Download the extension files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Tab Orchestra extension should now be installed and visible in your browser

### Server Setup

The extension requires a WebSocket server for real-time communication:

1. Make sure you have Node.js installed
2. Navigate to the extension directory in your terminal
3. Install dependencies: `npm install`
4. Start the server: `node server.js`
5. The server will run on port 8080 by default

## Usage

### Joining a Group

1. Click the Tab Orchestra extension icon in your browser toolbar
2. Click "Join Group" and enter a group ID
3. Any name can be used as a group ID - others who join with the same ID will be in your group

### Sharing Tabs

1. Navigate to a web page you want to share
2. Click the Tab Orchestra extension icon
3. Click "Share Current Tab"
4. The tab will be shared with all members of your current group

### Viewing Shared Tabs

1. Open the Tab Orchestra side panel by clicking "Open Orchestra Panel" in the popup
2. View AI-clustered tabs shared by your group
3. Click on any tab to open it in your browser

### Adding Annotations

1. On any web page, click the annotation button (💬) that appears in the top-right corner
2. Select text you want to annotate
3. Add your comment in the prompt
4. Your annotation will be shared with the group

## Troubleshooting

- **Connection Issues**: Make sure the WebSocket server is running on port 8080
- **Tabs Not Appearing**: Try refreshing the side panel or rejoining the group
- **Clustering Not Working**: Ensure you have shared at least 2 tabs for clustering to work

## Development

- Built with vanilla JavaScript
- Uses Chrome Extension Manifest V3
- WebSocket server built with Node.js
- AI features use Chrome's built-in AI APIs when available, with fallbacks

## License

MIT License - See LICENSE file for details

## Multi-Machine Setup

To use Tab Orchestra across multiple machines:

### Option 1: Local Network Setup

1. **Server on Host Machine**:
   - Run the WebSocket server on one machine: `node server.js`
   - Find the local IP address of this machine (e.g., 192.168.1.100)
   - Update the WebSocket connection URL in `background.js` on all clients:
     ```javascript
     wsConnection = new WebSocket('ws://192.168.1.100:8080');
     ```

2. **Client Setup**:
   - Install the extension on each machine
   - Make sure all machines are on the same local network
   - Join the same group ID on all machines

### Option 2: Public Server Setup

1. **Deploy Server to Cloud**:
   - Deploy the WebSocket server to a cloud provider (Heroku, AWS, etc.)
   - Update the WebSocket connection URL in `background.js` to point to your cloud server:
     ```javascript
     wsConnection = new WebSocket('wss://your-server-domain.com');
     ```

2. **Client Setup**:
   - Install the extension on each machine
   - Join the same group ID on all machines

### Troubleshooting Multi-Machine Setup

- **Connection Issues**: Ensure firewalls allow WebSocket connections on port 8080
- **Tabs Not Syncing**: Verify all clients are connected to the same server and joined the same group
- **Server Not Reachable**: For local setup, make sure all machines are on the same network

### Testing Multiple Clients on One Machine

For testing purposes, you can simulate multiple clients on one machine:

1. Create different Chrome profiles
2. Install the extension in each profile
3. Run the server: `node server.js`
4. Open Chrome with each profile and join the same group
5. Share tabs from each profile to test collaboration features
