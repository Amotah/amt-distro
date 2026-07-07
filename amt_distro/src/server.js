const env = require('./config/env');
const { connectDatabase } = require('./db/mongoose');
const app = require('./app');

async function startServer() {
  await connectDatabase();

  app.listen(env.port, () => {
    // Keep startup logging minimal and useful for deployments.
    console.log(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
};
