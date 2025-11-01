// Tab Orchestra WebSocket Server
// Handles real-time communication between extension instances

const WebSocket = require('ws');
const http = require('http');

class TabOrchestraServer {
    constructor(port = 8080) {
        this.port = port;
        this.groups = new Map();
        this.clients = new Map();
        this.init();
    }

    init() {
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });

        this.wss.on('connection', (ws, req) => {
            console.log('New client connected');

            const clientId = this.generateClientId();
            this.clients.set(clientId, {
                ws: ws,
                groups: new Set(),
                lastSeen: Date.now()
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log(`Received message from ${clientId}:`, message);
                    this.handleMessage(clientId, message);
                } catch (error) {
                    console.error('Invalid message format:', error);
                }
            });

            ws.on('close', (code, reason) => {
                console.log(`Client ${clientId} disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
                this.handleClientDisconnect(clientId);
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
            });

            // Send welcome message
            try {
                ws.send(JSON.stringify({
                    type: 'welcome',
                    clientId: clientId
                }));
                console.log(`Welcome message sent to client ${clientId}`);
            } catch (error) {
                console.error(`Failed to send welcome message to client ${clientId}:`, error);
            }
        });

        this.server.listen(this.port, () => {
            console.log(`🎼 Tab Orchestra server running on port ${this.port}`);
            console.log(`Connect your extensions to ws://localhost:${this.port}`);
        });

        // Cleanup inactive connections
        this.startCleanupTimer();
    }

    generateClientId() {
        return Math.random().toString(36).substr(2, 9);
    }

    handleMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.lastSeen = Date.now();

        switch (message.type) {
            case 'heartbeat':
                this.handleHeartbeat(clientId);
                break;
            case 'join_group':
                this.handleJoinGroup(clientId, message.groupId);
                break;
            case 'leave_group':
                this.handleLeaveGroup(clientId, message.groupId);
                break;
            case 'share_tab':
                this.handleShareTab(clientId, message.data);
                break;
            case 'annotation_created':
                this.handleAnnotation(clientId, message.data);
                break;
            case 'ai_cluster_update':
                this.handleClusterUpdate(clientId, message.data);
                break;
        }
    }

    handleHeartbeat(clientId) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(JSON.stringify({ type: 'pong' }));
                client.lastSeen = Date.now(); // Update last seen timestamp
            } catch (error) {
                console.error(`Failed to send pong to client ${clientId}:`, error);
            }
        }
    }

    handleJoinGroup(clientId, groupId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Create group if it doesn't exist
        if (!this.groups.has(groupId)) {
            this.groups.set(groupId, {
                id: groupId,
                members: new Set(),
                sharedTabs: [],
                annotations: [],
                created: Date.now()
            });
        }

        const group = this.groups.get(groupId);
        group.members.add(clientId);
        client.groups.add(groupId);

        // Notify client of successful join
        try {
            client.ws.send(JSON.stringify({
                type: 'group_joined',
                groupId: groupId,
                memberCount: group.members.size
            }));

            // Send existing group data
            client.ws.send(JSON.stringify({
                type: 'group_data',
                data: {
                    sharedTabs: group.sharedTabs,
                    annotations: group.annotations
                }
            }));
        } catch (error) {
            console.error(`Failed to send group data to client ${clientId}:`, error);
        }

        // Notify other group members
        this.broadcastToGroup(groupId, {
            type: 'member_joined',
            clientId: clientId,
            memberCount: group.members.size
        }, clientId);

        console.log(`Client ${clientId} joined group ${groupId} (${group.members.size} members)`);
    }

    handleLeaveGroup(clientId, groupId) {
        const client = this.clients.get(clientId);
        const group = this.groups.get(groupId);

        if (client && group) {
            group.members.delete(clientId);
            client.groups.delete(groupId);

            // Notify other group members
            this.broadcastToGroup(groupId, {
                type: 'member_left',
                clientId: clientId,
                memberCount: group.members.size
            }, clientId);

            // Remove empty groups
            if (group.members.size === 0) {
                this.groups.delete(groupId);
                console.log(`Removed empty group ${groupId}`);
            }
        }
    }

    handleShareTab(clientId, tabData) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Broadcast to all groups the client is in
        client.groups.forEach(groupId => {
            const group = this.groups.get(groupId);
            if (group) {
                // Create a complete tab object with all necessary data
                const completeTabData = {
                    ...tabData,
                    sharedBy: clientId,
                    timestamp: Date.now()
                };
                
                // Add to group's shared tabs
                group.sharedTabs.push(completeTabData);

                // Keep only recent tabs (last 100)
                if (group.sharedTabs.length > 100) {
                    group.sharedTabs = group.sharedTabs.slice(-100);
                }

                // Broadcast to group members including the sender
                this.broadcastToGroup(groupId, {
                    type: 'tab_shared',
                    data: completeTabData
                });
                
                // Also send updated group data to all members
                this.broadcastToGroup(groupId, {
                    type: 'group_data',
                    data: {
                        sharedTabs: group.sharedTabs,
                        annotations: group.annotations
                    }
                });

                console.log(`Tab shared in group ${groupId}: ${tabData.title}`);
            }
        });
    }

    handleAnnotation(clientId, annotationData) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.groups.forEach(groupId => {
            const group = this.groups.get(groupId);
            if (group) {
                group.annotations.push({
                    ...annotationData,
                    createdBy: clientId,
                    timestamp: Date.now()
                });

                this.broadcastToGroup(groupId, {
                    type: 'annotation_update',
                    data: annotationData,
                    createdBy: clientId
                }, clientId);
            }
        });
    }

    handleClusterUpdate(clientId, clusterData) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.groups.forEach(groupId => {
            this.broadcastToGroup(groupId, {
                type: 'ai_cluster_update',
                data: clusterData,
                updatedBy: clientId
            }, clientId);
        });
    }

    broadcastToGroup(groupId, message, excludeClientId = null) {
        const group = this.groups.get(groupId);
        if (!group) return;

        const messageStr = JSON.stringify(message);
        let sentCount = 0;

        group.members.forEach(memberId => {
            if (excludeClientId === null || memberId !== excludeClientId) {
                const client = this.clients.get(memberId);
                if (client && client.ws.readyState === WebSocket.OPEN) {
                    try {
                        client.ws.send(messageStr);
                        sentCount++;
                    } catch (error) {
                        console.error(`Failed to broadcast to client ${memberId}:`, error);
                    }
                }
            }
        });

        console.log(`Broadcast message to ${sentCount} clients in group ${groupId}`);
    }

    handleClientDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Remove from all groups
        client.groups.forEach(groupId => {
            this.handleLeaveGroup(clientId, groupId);
        });

        this.clients.delete(clientId);
        console.log(`Client ${clientId} disconnected`);
    }

    startCleanupTimer() {
        setInterval(() => {
            const now = Date.now();
            const timeout = 5 * 60 * 1000; // 5 minutes

            // Remove inactive clients
            this.clients.forEach((client, clientId) => {
                if (now - client.lastSeen > timeout) {
                    console.log(`Removing inactive client ${clientId}`);
                    this.handleClientDisconnect(clientId);
                }
            });

            // Remove empty groups older than 1 hour
            this.groups.forEach((group, groupId) => {
                if (group.members.size === 0 && now - group.created > 60 * 60 * 1000) {
                    this.groups.delete(groupId);
                    console.log(`Cleaned up old empty group ${groupId}`);
                }
            });
            
            // Log active stats
            console.log(`Active clients: ${this.clients.size}, Active groups: ${this.groups.size}`);
        }, 60000); // Run every minute
    }

    getStats() {
        return {
            connectedClients: this.clients.size,
            activeGroups: this.groups.size,
            totalSharedTabs: Array.from(this.groups.values())
                .reduce((sum, group) => sum + group.sharedTabs.length, 0)
        };
    }
}

// Start server
const server = new TabOrchestraServer(process.env.PORT || 8080);

// Log stats every 30 seconds
setInterval(() => {
    const stats = server.getStats();
    console.log(`📊 Stats: ${stats.connectedClients} clients, ${stats.activeGroups} groups, ${stats.totalSharedTabs} tabs shared`);
}, 30000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down Tab Orchestra server...');
    server.wss.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nShutting down Tab Orchestra server...');
    server.wss.close(() => {
        process.exit(0);
    });
});