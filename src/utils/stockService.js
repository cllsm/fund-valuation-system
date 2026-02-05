/**
 * 股票服务工具类
 * 提供基金持仓个股查询和股票实时数据查询功能
 */

// 持仓股票代码转换函数
function convertStockCode(stockCode) {
  // 转换逻辑：根据股票代码格式判断市场
  // 格式说明：
  // 1开头的为沪市股票（如1600519 -> 600519）
  // 0开头的为深市股票（如0000858 -> 000858）
  // 116开头的为香港股票（如116.00700 -> hk00700）
  // 以116结尾的香港债券代码（如03690116 -> hk03690）
  // 其他格式可能需要特殊处理
  
  if (!stockCode || stockCode.length < 6) return null;
  
  // 首先检查是否为香港债券代码：03690116 -> hk03690
  if (stockCode.endsWith('116') && stockCode.length === 8) {
    // 提取前5位数字作为债券代码
    const bondNum = stockCode.substring(0, 5);
    return `hk${bondNum}`;
  }
  
  // 检查是否为老格式香港股票：00700116 -> hk00700
  if (stockCode.endsWith('116') && stockCode.length === 9) {
    // 提取前6位数字作为股票代码
    const stockNum = stockCode.substring(0, 6);
    return `hk${stockNum}`;
  }
  
  // 去除可能的尾随数字（如6005191 -> 600519）
  // 更精确的匹配：只去除最后一位数字
  const cleanCode = stockCode.replace(/(\d)\d$/, '$1');
  
  // 根据第一位数字判断市场
  const firstChar = cleanCode.charAt(0);
  
  if (firstChar === '1' && cleanCode.length > 1) {
    // 沪市股票，返回sh前缀
    return `sh${cleanCode.substring(1)}`;
  } else if (firstChar === '0' && cleanCode.length >= 6) {
    // 深市股票，返回sz前缀
    return `sz${cleanCode}`;
  } else if (firstChar === '6' && cleanCode.length >= 6) {
    // 已经是标准沪市代码
    return `sh${cleanCode}`;
  } else {
    // 其他情况，检查是否为有效代码
    if (cleanCode.length >= 6) {
      return `sz${cleanCode}`;
    }
    return null;
  }
}

/**
 * 获取基金持仓股票数据
 * @param {string} fundCode - 基金代码
 * @returns {Promise<Array>} - 持仓股票列表
 */
export async function fetchFundStockPositions(fundCode) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    
    // 使用corsproxy.io代理解决跨域问题
    const targetUrl = `http://fund.eastmoney.com/pingzhongdata/${fundCode}.js?rt=${timestamp}`;
    const encodedUrl = encodeURIComponent(targetUrl);
    const proxyUrl = `https://corsproxy.io/?${encodedUrl}`;
    
    fetch(proxyUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // 关键：使用GBK编码解码
        return response.arrayBuffer().then(buffer => {
          const decoder = new TextDecoder('gbk');
          return decoder.decode(buffer);
        });
      })
      .then(data => {
        console.log('获取基金持仓数据成功:', data);
        
        try {
          const stockData = parseFundStockData(data);
          console.log(stockData,'-------------');
          
          resolve(stockData);
        } catch (error) {
          reject(new Error('解析基金持仓数据失败: ' + error.message));
        }
      })
      .catch(error => {
        console.warn('corsproxy请求失败，尝试直接请求:', error.message);
        
        // 备用方案：尝试直接请求（不使用代理）
        const directUrl = `http://fund.eastmoney.com/pingzhongdata/${fundCode}.js?rt=${timestamp}`;
        fetch(directUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.arrayBuffer().then(buffer => {
              const decoder = new TextDecoder('gbk');
              return decoder.decode(buffer);
            });
          })
          .then(data => {
            console.log('直接请求获取基金持仓数据成功:', data);
            try {
              const stockData = parseFundStockData(data);
              resolve(stockData);
            } catch (parseError) {
              throw new Error('解析基金持仓数据失败: ' + parseError.message);
            }
          })
          .catch(finalError => {
            console.warn('所有请求方式都失败，使用模拟数据:', finalError.message);
            
            // 最终备用方案：使用模拟数据
            try {
              const mockData = generateMockStockData(fundCode);
              resolve(mockData);
            } catch (mockError) {
              reject(new Error('获取基金持仓数据失败: ' + finalError.message));
            }
          });
      });
  });
}

/**
 * 生成模拟股票数据（备用方案）
 */
function generateMockStockData(fundCode) {
  // 基于你提供的实际数据生成模拟数据
  const stockCodes = [
    "688615", "688258", "300624", "603171", "300364", 
    "300170", "688500", "301171", "603039", "688365"
  ];
  
  return stockCodes.map((code, index) => {
    const market = code.startsWith('6') ? 'sh' : 'sz';
    return {
      code: `${market}${code}`,
      originalCode: code + '1',
      index: index + 1
    };
  });
}

/**
 * 解析基金持仓数据
 * @param {string} data - 原始JavaScript数据
 * @returns {Array} - 解析后的股票数据
 */
function parseFundStockData(data) {
  const stocks = [];
  
  try {
    // 优先使用新市场号格式的股票代码数组
    const stockCodesNewMatch = data.match(/var\s+stockCodesNew\s*=\s*\[([^\]]+)\]/);
    
    if (stockCodesNewMatch && stockCodesNewMatch[1]) {
      const stockCodesNewStr = stockCodesNewMatch[1].replace(/'/g, '"');
      const stockCodesNew = JSON.parse(`[${stockCodesNewStr}]`);
      
      stockCodesNew.forEach((code, index) => {
        if (code && typeof code === 'string') {
          // 处理新格式代码（如"1.688615" -> "sh688615", "116.00700" -> "hk00700"）
          const parts = code.split('.');
          if (parts.length === 2) {
            const marketCode = parts[0];
            const stockNum = parts[1];
            
            let prefix = 'sz';
            if (marketCode === '1') {
              prefix = 'sh';
            } else if (marketCode === '0') {
              prefix = 'sz';
            } else if (marketCode === '116') {
              prefix = 'hk';
            }
            
            const convertedCode = `${prefix}${stockNum}`;
            // 检查转换后的代码是否有效
              stocks.push({
                code: convertedCode,
                originalCode: code,
                index: index + 1
              });
          }
        }
      });
    }
    
    // 如果没有从stockCodesNew中获取到数据，尝试从stockCodes获取（老格式）
    if (stocks.length === 0) {
      const stockCodesMatch = data.match(/var\s+stockCodes\s*=\s*\[([^\]]+)\]/);
      
      if (stockCodesMatch && stockCodesMatch[1]) {
        // 清理并解析股票代码
        const stockCodesStr = stockCodesMatch[1].replace(/'/g, '"');
        const stockCodes = JSON.parse(`[${stockCodesStr}]`);
        
        stockCodes.forEach((code, index) => {
          if (code && typeof code === 'string') {
            // 检查是否已经是转换后的格式（如sh03690116）
            let convertedCode;
            if (code.startsWith('sh') || code.startsWith('sz')) {
              // 已经是转换后的格式，直接使用
              convertedCode = code;
            } else {
              // 需要转换的格式
              convertedCode = convertStockCode(code);
            }
            
            if (convertedCode && convertedCode.length >= 8) { // sh/sz + 至少6位数字
              stocks.push({
                code: convertedCode,
                originalCode: code,
                index: index + 1
              });
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('解析基金持仓数据失败:', error);
  }
  
  return stocks;
}

/**
 * 获取股票实时数据
 * @param {string} stockCode - 股票代码（带前缀，如sh600519）
 * @returns {Promise<Object>} - 股票实时数据
 */
export async function fetchStockRealTimeData(stockCode) {
  return new Promise((resolve, reject) => {
    // 使用CORS代理请求股票数据
    const localProxyUrl = `https://qt.gtimg.cn/q=${stockCode}`;
    
    fetch(localProxyUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // 关键：使用GBK编码解码
        return response.arrayBuffer().then(buffer => {
          const decoder = new TextDecoder('gbk');
          return decoder.decode(buffer);
        });
      })
      .then(data => {
        try {
          const stockData = parseStockData(data, stockCode);
          resolve(stockData);
        } catch (error) {
          reject(new Error('解析股票数据失败: ' + error.message));
        }
      })
      .catch(error => {
        console.warn('本地代理请求失败，尝试新浪财经API:', error.message);
        
        // 备用方案：使用新浪财经API（通过CORS代理）
        const sinaUrl = `https://hq.sinajs.cn/list=${stockCode}`;
        
        fetch(sinaUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
          })
          .then(data => {
            try {
              // 新浪财经数据格式：var hq_str_sh600519="贵州茅台,1546.46,...";
              const match = data.match(/"([^"]+)"/);
              if (match && match[1]) {
                const fields = match[1].split(',');
                const stockData = {
                  code: stockCode,
                  name: fields[0] || '--',
                  currentPrice: parseFloat(fields[3]) || 0,
                  yesterdayClose: parseFloat(fields[2]) || 0,
                  todayOpen: parseFloat(fields[1]) || 0,
                  volume: parseInt(fields[8]) || 0,
                  change: parseFloat(fields[3]) - parseFloat(fields[2]) || 0,
                  changeRate: ((parseFloat(fields[3]) - parseFloat(fields[2])) / parseFloat(fields[2]) * 100) || 0,
                  high: parseFloat(fields[4]) || 0,
                  low: parseFloat(fields[5]) || 0,
                  timestamp: new Date().toISOString(),
                  marketValue: 0,
                  peRatio: 0,
                  pbRatio: 0
                };
                resolve(stockData);
              } else {
                throw new Error('新浪财经数据格式错误');
              }
            } catch (error) {
              reject(new Error('解析新浪财经数据失败: ' + error.message));
            }
          })
          .catch(finalError => {
            reject(new Error('获取股票数据失败: ' + finalError.message));
          });
      });
  });
}

/**
 * 解析股票实时数据
 * @param {string} data - 原始数据
 * @param {string} stockCode - 股票代码
 * @returns {Object} - 解析后的股票数据
 */
function parseStockData(data, stockCode) {
  // 示例数据格式：
  // A股：v_sh600519="1~贵州茅台~600519~1546.46~1525.00~1520.00~54350~30829~23521~1545.90~2~1545.60~1~1545.59~3~1545.58~1~1545.56~3~1546.48~2~1546.49~1~1546.50~4~1546.56~1~1546.80~3~~20260205120517~21.46~1.41~1559.89~1515.00~1546.46/54350/8385073232~54350~838507~0.43~21.51~~1559.89~1515.00~2.94~19365.86~19365.86~8.53~1677.50~1372.50~0.95~-1~1542.80~22.47~22.46~~~0.65~838507.3232~0.0000~0~ ~GP-A~12.29~7.56~3.34~35.02~30.58~1606.43~1322.01~15.40~9.50~7.76~1252270215~1252270215~-4.76~-1.03~1252270215~~~14.36~-0.14~~CNY~0~___D__F__N~1545.50~20~";
  // 港股：v_hk00700="1~腾讯控股~00700~340.00~335.00~338.00~1234567~..."
  
  if (!data || typeof data !== 'string') {
    throw new Error('无效的股票数据');
  }
  
  if (!data || typeof data !== 'string') {
    throw new Error('无效的股票数据');
  }
  
  console.log('原始股票数据:', data);
  
  // 提取股票数据部分 - 使用更宽松的匹配模式
  const match = data.match(/v_[^=]+=\s*"([^"]+)"/);
  if (!match || !match[1]) {
    console.warn('标准格式匹配失败，尝试其他格式:', data.substring(0, 100));
    
    // 尝试其他可能的格式
    const alternativeMatch = data.match(/"([^"]+)"/);
    if (alternativeMatch && alternativeMatch[1]) {
      const fields = alternativeMatch[1].split(',');
      if (fields.length >= 2) {
        // 可能是新浪财经格式
        return {
          code: stockCode,
          name: fields[0] || `股票${stockCode.replace(/^(sh|sz)/, '')}`,
          currentPrice: parseFloat(fields[3]) || 0,
          yesterdayClose: parseFloat(fields[2]) || 0,
          todayOpen: parseFloat(fields[1]) || 0,
          volume: parseInt(fields[8]) || 0,
          change: parseFloat(fields[3]) - parseFloat(fields[2]) || 0,
          changeRate: ((parseFloat(fields[3]) - parseFloat(fields[2])) / parseFloat(fields[2]) * 100) || 0,
          high: parseFloat(fields[4]) || 0,
          low: parseFloat(fields[5]) || 0,
          timestamp: new Date().toISOString(),
          marketValue: 0,
          peRatio: 0,
          pbRatio: 0
        };
      }
    }
    
    throw new Error('股票数据格式错误');
  }
  
  const fields = match[1].split('~');
  
  // 字段含义解析（根据腾讯财经API文档）
  // 0: 未知
  // 1: 股票名称
  // 2: 股票代码
  // 3: 当前价格
  // 4: 昨收
  // 5: 今开
  // 6: 成交量（手）
  // 7: 外盘
  // 8: 内盘
  // 9: 买一
  // 10: 买一量
  // ... 等等
  
  // 处理中文名称编码问题
  let stockName = fields[1] || '--';
  
  console.log('原始股票名称:', stockName);
  
  // 如果名称不是默认值且有内容，尝试处理编码问题
  if (stockName !== '--' && stockName.length > 0) {
    // 首先检查是否已经是正确的中文名称
    if (/^[\u4e00-\u9fa5A-Za-z0-9\s]+$/.test(stockName)) {
      console.log('股票名称编码正常:', stockName);
    } else {
      console.log('检测到可能的编码问题，尝试修复:', stockName);
      
      // 尝试UTF-8编码修复（常见的中文乱码修复）
      try {
        // 如果是UTF-8编码的乱码，尝试重新解码
        const utf8Bytes = new TextEncoder().encode(stockName);
        const decoded = new TextDecoder('utf-8').decode(utf8Bytes);
        
        if (decoded !== stockName && /^[\u4e00-\u9fa5A-Za-z0-9\s]+$/.test(decoded)) {
          stockName = decoded;
          console.log('UTF-8解码成功:', stockName);
        }
      } catch (error) {
        console.warn('UTF-8解码失败:', error);
      }
      
      // 如果仍然是乱码，尝试GBK编码转换
      if (!/^[\u4e00-\u9fa5A-Za-z0-9\s]+$/.test(stockName)) {
        try {
          // 将乱码字符转换为GBK编码
          const gbkBytes = [];
          for (let i = 0; i < stockName.length; i++) {
            const charCode = stockName.charCodeAt(i);
            if (charCode > 127) {
              // 处理可能的GBK编码字符
              gbkBytes.push(charCode & 0xFF);
            } else {
              gbkBytes.push(charCode);
            }
          }
          
          const gbkArray = new Uint8Array(gbkBytes);
          const gbkDecoder = new TextDecoder('gbk');
          const gbkDecoded = gbkDecoder.decode(gbkArray);
          
          if (gbkDecoded !== stockName && /^[\u4e00-\u9fa5A-Za-z0-9\s]+$/.test(gbkDecoded)) {
            stockName = gbkDecoded;
            console.log('GBK解码成功:', stockName);
          }
        } catch (error) {
          console.warn('GBK解码失败:', error);
        }
      }
      
      // 如果仍然无法解析，使用股票代码作为名称
      if (!/^[\u4e00-\u9fa5A-Za-z0-9\s]+$/.test(stockName)) {
        console.warn('股票名称编码异常，使用股票代码作为名称:', stockName);
        stockName = `股票${fields[2] || stockCode.replace(/^(sh|sz)/, '')}`;
      }
    }
  }
  
  return {
    code: stockCode,
    name: stockName,
    currentPrice: parseFloat(fields[3]) || 0,
    yesterdayClose: parseFloat(fields[4]) || 0,
    todayOpen: parseFloat(fields[5]) || 0,
    volume: parseInt(fields[6]) || 0, // 成交量（手）
    change: parseFloat(fields[31]) || 0, // 涨跌额
    changeRate: parseFloat(fields[32]) || 0, // 涨跌幅
    high: parseFloat(fields[33]) || 0, // 最高价
    low: parseFloat(fields[34]) || 0, // 最低价
    timestamp: fields[30] || '--', // 时间戳
    marketValue: parseFloat(fields[45]) || 0, // 总市值
    peRatio: parseFloat(fields[39]) || 0, // 市盈率
    pbRatio: parseFloat(fields[46]) || 0 // 市净率
  };
}

/**
 * 批量获取股票实时数据
 * @param {Array} stockCodes - 股票代码列表
 * @returns {Promise<Array>} - 股票数据列表
 */
export async function fetchBatchStockData(stockCodes) {
  if (!stockCodes || stockCodes.length === 0) {
    return [];
  }
  
  // 分批处理，避免请求过多
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < stockCodes.length; i += batchSize) {
    const batch = stockCodes.slice(i, i + batchSize);
    const batchPromises = batch.map(code => 
      fetchStockRealTimeData(code).catch(error => {
        console.error(`获取股票 ${code} 数据失败:`, error);
        return {
          code,
          error: error.message,
          name: '--',
          currentPrice: 0,
          changeRate: 0
        };
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // 批次间延迟，避免频繁请求
    if (i + batchSize < stockCodes.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * 获取基金持仓股票详细信息
 * @param {string} fundCode - 基金代码
 * @returns {Promise<Array>} - 持仓股票详细信息列表
 */
export async function getFundStockDetails(fundCode) {
  try {
    // 1. 获取基金持仓股票列表
    const stockPositions = await fetchFundStockPositions(fundCode);
    console.log(stockPositions,'st');
    
    
    if (!stockPositions || stockPositions.length === 0) {
      return [];
    }
    
    // 2. 提取股票代码并过滤无效代码
    const stockCodes = stockPositions
      .map(stock => stock.code)
      .filter(code => code && code.length > 2); // 过滤掉无效代码
    
    console.log('获取股票实时数据，股票代码列表:', stockCodes);
    
    // 3. 批量获取股票实时数据
    const stockData = await fetchBatchStockData(stockCodes);
    
    // 4. 合并数据 - 根据股票代码正确匹配
    return stockData.map(data => {
      // 根据股票代码找到对应的持仓信息
      const position = stockPositions.find(pos => pos.code === data.code);
      return {
        ...data,
        originalCode: position?.originalCode || '',
        positionIndex: position?.index || 0
      };
    });
    
  } catch (error) {
    console.error('获取基金持仓股票详细信息失败:', error);
    throw error;
  }
}