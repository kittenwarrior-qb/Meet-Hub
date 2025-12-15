# MeetHub

A real-time video call platform with multi-room management.

![MeetHub](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-black) ![Docker](https://img.shields.io/badge/Docker-Compose-blue)

## Features

- **Real-time video calls** - WebRTC-based video communication
- **Room management** - Create public or password-protected rooms
- **Multi-participant** - Support multiple users per room
- **In-room chat** - Communicate with participants
- **Reconnection support** - Rejoin calls after disconnection
- **Responsive design** - Works on desktop and mobile

## Tech Stack

### Frontend
- React 18 + Vite
- WebRTC
- Socket.IO Client
- React Router

### Backend
- Node.js + Express
- Socket.IO
- bcrypt (password hashing)

### Deployment
- Docker Compose
- Caddy (reverse proxy, HTTPS)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meethub
   ```

2. **Start the backend**
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Start the frontend** (in another terminal)
   ```bash
   cd client
   npm install
   npm run dev
   ```

4. **Open the app**
   
   Navigate to http://localhost:5173

### Using Docker (Development)

Run both frontend and backend with hot reloading:

```bash
docker-compose -f docker-compose.dev.yml up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3002

Stop with:
```bash
docker-compose -f docker-compose.dev.yml down
```

## Production Deployment

### Using Docker Compose

1. **Update configuration**
   
   Edit `Caddyfile` and replace the domain with your domain.
   
   Edit `docker-compose.yml` and update `CORS_ORIGIN` environment variable.

2. **Build and start**
   ```bash
   docker-compose up -d --build
   ```

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop**
   ```bash
   docker-compose down
   ```

## Project Structure

```
meethub/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   └── styles/         # CSS styles
│   ├── Dockerfile
│   └── nginx.conf
├── server/                 # Backend (Node.js + Socket.IO)
│   ├── src/
│   │   ├── index.js        # Express server
│   │   ├── config.js       # Configuration
│   │   ├── roomManager.js  # Room logic
│   │   └── socketHandlers.js # Socket events
│   └── Dockerfile
├── docker-compose.yml
├── Caddyfile
└── README.md
```

## Configuration

### Environment Variables (Backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Server port |
| `CORS_ORIGIN` | `*` | Allowed origins |

### Environment Variables (Frontend)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SOCKET_URL` | `` | Socket.IO server URL (empty for same origin) |

## Security Considerations

- Passwords are hashed using bcrypt
- Rooms expire after inactivity
- Reconnection window is 5 minutes

## License

MIT
