import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export default async function handler(req, res) {
  const { path, ...queryParams } = req.query;
  // Remove 'api' from path if it's the first segment
  const cleanPath = path[0] === 'api' ? path.slice(1) : path;
  const apiPath = `/${cleanPath.join('/')}`;
  
  try {
    const config = {
      method: req.method,
      url: `${API_BASE}${apiPath}`,
      headers: {},
    };

    // Copy relevant headers
    if (req.headers.authorization) {
      config.headers.Authorization = req.headers.authorization;
    }
    if (req.headers['content-type']) {
      config.headers['Content-Type'] = req.headers['content-type'];
    }

    // Add query parameters
    if (Object.keys(queryParams).length > 0) {
      config.params = queryParams;
    }

    // Add body for POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      config.data = req.body;
    }

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('API Proxy Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.response?.data || error.message,
    });
  }
}

