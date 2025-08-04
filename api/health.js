module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    res.status(200).json({ 
      success: true, 
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
