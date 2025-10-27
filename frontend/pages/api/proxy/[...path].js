import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export default async function handler(req, res) {
  const { path, ...queryParams } = req.query;
  const apiPath = `/${path.join('/')}`;
  
  try {
    const config = {
      method: req.method,
      url: `${API_BASE}${apiPath}`,
      headers: {
        ...req.headers,
        host: undefined,
      },
    };

    // Add query parameters
    if (Object.keys(queryParams).length > 0) {
      config.params = queryParams;
    }

    // Add body for POST, PUT, PATCH
    if (req.method !== 'GET') {
      config.data = req.body;
    }

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('API Proxy Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message,
    });
  }
}

