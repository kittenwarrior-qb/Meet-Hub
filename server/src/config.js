export const config = {
  port: process.env.PORT || 3002,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  roomCodeLength: 6,
  maxParticipants: 10, // Max users per room
  roomExpiryTime: 24 * 60 * 60 * 1000, // 24 hours
  reconnectWindow: 2 * 60 * 1000 // 2 minutes
};
