import pino from 'pino';

/** @param {{ logLevel: string }} config */
export function createLogger(config) {
  return pino({
    level: config.logLevel,
    base: { service: 'cloud-native-graphql-gateway' },
    formatters: { level: (label) => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers["x-api-key"]', 'req.headers.cookie'],
      censor: '[REDACTED]',
    },
  });
}
