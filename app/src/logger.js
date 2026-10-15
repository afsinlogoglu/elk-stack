const fs = require('fs');
const path = require('path');
const pino = require('pino');

const logFile = process.env.LOG_FILE || path.join(__dirname, '..', '..', 'logs', 'app.log');

fs.mkdirSync(path.dirname(logFile), { recursive: true });

const fileStream = pino.destination({ dest: logFile, sync: true, mkdir: true });

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    messageKey: 'message',
    base: null,
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
  pino.multistream([{ stream: fileStream }, { stream: process.stdout }])
);

module.exports = logger;
