const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Proxy Linear GraphQL through backend so API keys are never exposed to the browser.
router.post('/graphql', authenticate, async (req, res) => {
  const { query, variables } = req.body || {};

  if (typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'GraphQL query is required.' });
  }

  const linearApiKey = process.env.LINEAR_API_KEY;
  if (!linearApiKey) {
    return res.status(500).json({ error: 'LINEAR_API_KEY is not configured on the server.' });
  }

  try {
    const response = await axios.post(
      'https://api.linear.app/graphql',
      {
        query,
        variables: variables || {},
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: linearApiKey,
        },
        timeout: 30000,
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    const status = error?.response?.status || 502;
    const data = error?.response?.data;
    return res.status(status).json({
      error: 'Linear GraphQL request failed.',
      details: data || error.message,
    });
  }
});

module.exports = router;
