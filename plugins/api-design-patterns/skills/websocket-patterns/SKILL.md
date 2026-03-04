---
description: When the user asks about WebSocket, real-time communication, Socket.IO, ws library, gorilla/websocket, chat, live updates, rooms, channels, heartbeat, reconnection, or WebSocket authentication
---

# WebSocket Patterns

Build real-time features with WebSockets — live updates, chat, notifications, collaborative editing. Covers server setup, rooms/channels, authentication, heartbeat, reconnection, and scaling with Redis pub/sub.

## When to Use WebSockets

| Use Case | Protocol |
|----------|----------|
| Live notifications, chat, collaboration | ✅ WebSocket |
| Real-time dashboards, stock prices | ✅ WebSocket or SSE |
| One-way server → client updates | ✅ SSE (simpler) |
| Request/response API calls | ❌ Use HTTP |
| File uploads | ❌ Use HTTP |
| Occasional polling (every 30s+) | ❌ Use HTTP polling |

## Node.js — ws (Raw WebSocket)

### Server Setup

```typescript
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { parse } from "url";

const server = createServer(app); // Express app
const wss = new WebSocketServer({ server });

// Connection handling
wss.on("connection", (ws: WebSocket, req) => {
  const { query } = parse(req.url || "", true);
  const userId = ws.userId; // Set during authentication

  console.log(`Client connected: ${userId}`);

  // Send welcome
  ws.send(JSON.stringify({
    type: "connected",
    data: { userId, timestamp: new Date().toISOString() },
  }));

  // Handle messages
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch {
      ws.send(JSON.stringify({ type: "error", data: { message: "Invalid JSON" } }));
    }
  });

  // Handle disconnect
  ws.on("close", (code, reason) => {
    console.log(`Client disconnected: ${userId} (code: ${code})`);
    removeFromRooms(ws);
  });

  // Handle errors
  ws.on("error", (err) => {
    console.error(`WebSocket error for ${userId}:`, err.message);
  });
});

server.listen(3000);
```

### Message Protocol

```typescript
// Define a typed message protocol
interface WSMessage {
  type: string;
  data: unknown;
  id?: string; // For request/response correlation
}

// Server → Client messages
type ServerMessage =
  | { type: "connected"; data: { userId: string } }
  | { type: "message"; data: { roomId: string; from: string; text: string; timestamp: string } }
  | { type: "user_joined"; data: { roomId: string; userId: string } }
  | { type: "user_left"; data: { roomId: string; userId: string } }
  | { type: "typing"; data: { roomId: string; userId: string } }
  | { type: "error"; data: { message: string; code: string } }
  | { type: "pong"; data: {} };

// Client → Server messages
type ClientMessage =
  | { type: "join_room"; data: { roomId: string } }
  | { type: "leave_room"; data: { roomId: string } }
  | { type: "send_message"; data: { roomId: string; text: string } }
  | { type: "typing"; data: { roomId: string } }
  | { type: "ping"; data: {} };

function handleMessage(ws: WebSocket & { userId: string }, message: ClientMessage) {
  switch (message.type) {
    case "join_room":
      joinRoom(ws, message.data.roomId);
      break;
    case "leave_room":
      leaveRoom(ws, message.data.roomId);
      break;
    case "send_message":
      broadcastToRoom(message.data.roomId, {
        type: "message",
        data: {
          roomId: message.data.roomId,
          from: ws.userId,
          text: message.data.text,
          timestamp: new Date().toISOString(),
        },
      }, ws); // Exclude sender
      break;
    case "ping":
      ws.send(JSON.stringify({ type: "pong", data: {} }));
      break;
  }
}
```

### Rooms / Channels

```typescript
const rooms = new Map<string, Set<WebSocket>>();

function joinRoom(ws: WebSocket & { userId: string }, roomId: string) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId)!.add(ws);

  // Notify others in room
  broadcastToRoom(roomId, {
    type: "user_joined",
    data: { roomId, userId: ws.userId },
  }, ws);
}

function leaveRoom(ws: WebSocket & { userId: string }, roomId: string) {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(ws);
    broadcastToRoom(roomId, {
      type: "user_left",
      data: { roomId, userId: ws.userId },
    });
    if (room.size === 0) rooms.delete(roomId);
  }
}

function removeFromRooms(ws: WebSocket) {
  for (const [roomId, members] of rooms.entries()) {
    if (members.has(ws)) {
      members.delete(ws);
      if (members.size === 0) rooms.delete(roomId);
    }
  }
}

function broadcastToRoom(roomId: string, message: ServerMessage, exclude?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const client of room) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
```

### Authentication

```typescript
import { verify } from "jsonwebtoken";

// Option 1: Token in query parameter (during upgrade)
wss.on("connection", (ws, req) => {
  const { query } = parse(req.url || "", true);
  const token = query.token as string;

  try {
    const payload = verify(token, process.env.JWT_SECRET!);
    (ws as any).userId = payload.sub;
  } catch {
    ws.close(4001, "Authentication failed");
    return;
  }
});

// Option 2: Token in first message
wss.on("connection", (ws) => {
  let authenticated = false;
  const authTimeout = setTimeout(() => {
    if (!authenticated) ws.close(4001, "Authentication timeout");
  }, 5000);

  ws.on("message", (data) => {
    if (!authenticated) {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type !== "authenticate") {
          ws.close(4001, "First message must be authenticate");
          return;
        }
        const payload = verify(msg.data.token, process.env.JWT_SECRET!);
        (ws as any).userId = payload.sub;
        authenticated = true;
        clearTimeout(authTimeout);
        ws.send(JSON.stringify({ type: "authenticated", data: {} }));
      } catch {
        ws.close(4001, "Authentication failed");
      }
      return;
    }

    // Handle authenticated messages
    handleMessage(ws as any, JSON.parse(data.toString()));
  });
});
```

### Heartbeat (Keep-Alive)

```typescript
// Server-side heartbeat detection
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 10000;  // 10 seconds to respond

function setupHeartbeat(wss: WebSocketServer) {
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if ((ws as any).isAlive === false) {
        console.log("Client unresponsive, terminating");
        ws.terminate();
        continue;
      }

      (ws as any).isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL);

  wss.on("connection", (ws) => {
    (ws as any).isAlive = true;
    ws.on("pong", () => {
      (ws as any).isAlive = true;
    });
  });

  wss.on("close", () => clearInterval(interval));
}
```

## Client-Side — Reconnection

```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000; // 1 second
  private maxDelay = 30000; // 30 seconds
  private messageQueue: string[] = [];

  constructor(
    private url: string,
    private onMessage: (data: unknown) => void,
    private onStatusChange?: (status: "connected" | "disconnected" | "reconnecting") => void
  ) {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.onStatusChange?.("connected");
      // Flush queued messages
      while (this.messageQueue.length > 0) {
        this.ws!.send(this.messageQueue.shift()!);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage(data);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    this.ws.onclose = (event) => {
      if (event.code === 4001) {
        // Auth failure — don't reconnect
        this.onStatusChange?.("disconnected");
        return;
      }
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onStatusChange?.("disconnected");
      return;
    }

    this.onStatusChange?.("reconnecting");
    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
      this.maxDelay
    );

    setTimeout(() => this.connect(), delay);
  }

  send(data: unknown) {
    const payload = JSON.stringify(data);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.messageQueue.push(payload); // Queue for when reconnected
    }
  }

  close() {
    this.maxReconnectAttempts = 0;
    this.ws?.close(1000, "Client closed");
  }
}
```

## Go — gorilla/websocket

```go
import "github.com/gorilla/websocket"

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        return origin == "https://myapp.com" // Validate origin
    },
}

type Client struct {
    conn   *websocket.Conn
    userID string
    rooms  map[string]bool
    send   chan []byte
}

type Hub struct {
    clients    map[*Client]bool
    rooms      map[string]map[*Client]bool
    broadcast  chan Message
    register   chan *Client
    unregister chan *Client
    mu         sync.RWMutex
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.mu.Unlock()

        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
                for roomID := range client.rooms {
                    delete(h.rooms[roomID], client)
                }
            }
            h.mu.Unlock()

        case message := <-h.broadcast:
            h.mu.RLock()
            if room, ok := h.rooms[message.RoomID]; ok {
                data, _ := json.Marshal(message)
                for client := range room {
                    select {
                    case client.send <- data:
                    default:
                        close(client.send)
                        delete(h.clients, client)
                    }
                }
            }
            h.mu.RUnlock()
        }
    }
}

func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        return
    }

    // Authenticate
    token := r.URL.Query().Get("token")
    userID, err := validateToken(token)
    if err != nil {
        conn.WriteMessage(websocket.CloseMessage,
            websocket.FormatCloseMessage(4001, "Authentication failed"))
        conn.Close()
        return
    }

    client := &Client{
        conn:   conn,
        userID: userID,
        rooms:  make(map[string]bool),
        send:   make(chan []byte, 256),
    }

    hub.register <- client

    go client.writePump()
    go client.readPump(hub)
}
```

## Scaling with Redis Pub/Sub

```typescript
// When you have multiple server instances, use Redis pub/sub
// to broadcast messages across all instances
import { Redis } from "ioredis";

const pub = new Redis();
const sub = new Redis();

// Subscribe to room channels
sub.on("message", (channel, message) => {
  const roomId = channel.replace("ws:room:", "");
  const parsed = JSON.parse(message);

  // Broadcast to local clients in this room
  broadcastToRoom(roomId, parsed);
});

// When a message is sent, publish to Redis (reaches all instances)
function publishToRoom(roomId: string, message: ServerMessage) {
  pub.publish(`ws:room:${roomId}`, JSON.stringify(message));
}

// When a client joins a room, subscribe to the Redis channel
function joinRoom(ws: WebSocket, roomId: string) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
    sub.subscribe(`ws:room:${roomId}`);
  }
  rooms.get(roomId)!.add(ws);
}
```

## Connection Lifecycle

```
Client                          Server
  │                               │
  │──── HTTP Upgrade ────────────→│
  │                               │ Authenticate
  │←── 101 Switching Protocols ──│
  │                               │
  │──── { type: "join_room" } ──→│
  │←── { type: "user_joined" } ──│
  │                               │
  │──── { type: "message" } ────→│
  │←── { type: "message" } ──────│  (broadcast)
  │                               │
  │←── ping ──────────────────────│  (every 30s)
  │──── pong ────────────────────→│
  │                               │
  │──── close(1000) ─────────────→│
  │←── close(1000) ──────────────│
```

## Best Practices

| Practice | Details |
|----------|---------|
| Authenticate on connect | Don't allow unauthenticated WebSocket access |
| Use structured message format | `{ type, data, id }` not raw strings |
| Implement heartbeat | Detect dead connections, clean up resources |
| Client reconnection | Exponential backoff with jitter |
| Message queuing | Buffer messages during reconnection |
| Validate all messages | Malformed messages shouldn't crash the server |
| Use Redis pub/sub for scaling | Required for multi-instance deployments |
| Close codes | Use 1000 (normal), 4001 (auth), 4002 (invalid) |
