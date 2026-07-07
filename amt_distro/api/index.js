const app = require('../src/app');
const { connectDatabase, resetDatabaseConnection } = require('../src/db/mongoose');

module.exports = async (req, res) => {
  const requestPath = (req.url || '').split('?')[0] || '/';
  const skipBootstrapPaths = new Set(['/', '/health', '/db-health']);

  try {
    if (!skipBootstrapPaths.has(requestPath)) {
      await connectDatabase();
    }

    return app(req, res);
  } catch (error) {
    resetDatabaseConnection();
    console.error('Request bootstrap failed:', error);
    return res.status(503).json({ message: 'Backend bootstrap failed' });
  }
};