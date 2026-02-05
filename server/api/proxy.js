const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const router = express.Router();

// 启用CORS
router.use(cors());

/**
 * 蛋卷基金API代理
 */
router.get('/danjuan/:path*', async (req, res) => {
  try {
    const path = req.params.path;
    const restPath = req.params[0] || '';
    const queryString = new URLSearchParams(req.query).toString();
    
    // 构建目标URL
    const targetUrl = `https://danjuanfunds.com/djapi/fundx/${path}${restPath}${queryString ? '?' + queryString : ''}`;
    
    console.log('代理请求:', targetUrl);
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://danjuanfunds.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('代理请求失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 东方财富基金数据代理
 */
router.get('/eastmoney/:path*', async (req, res) => {
  try {
    const path = req.params.path;
    const restPath = req.params[0] || '';
    const queryString = new URLSearchParams(req.query).toString();
    
    const targetUrl = `https://fund.eastmoney.com/${path}${restPath}${queryString ? '?' + queryString : ''}`;
    
    console.log('东方财富代理请求:', targetUrl);
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://fund.eastmoney.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.text();
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('东方财富代理请求失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;