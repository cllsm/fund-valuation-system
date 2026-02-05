/**
 * 股票服务测试工具
 * 提供测试数据和方法，用于测试持仓股票查询功能
 */

// 测试数据 - 模拟东方财富基金持仓数据
export const testFundData = `
/** * 测试数据 * @type {arry} *//*2026-02-05 12:12:25*/var ishb=false;/*基金或股票信息*/var fS_name = "易方达蓝筹精选混合";var fS_code = "005827";/*原费率*/var fund_sourceRate="1.50";/*现费率*/var fund_Rate="0.15";/*最小申购金额*/var fund_minsg="10";/*基金持仓股票代码*/var stockCodes=["00700116","6005191","0008580","09988116","6008091","0005680","09987116","00883116","06618116","0020270"];/*基金持仓债券代码*/var zqCodes = "";/*基金持仓股票代码(新市场号)*/var stockCodesNew =["116.00700","1.600519","0.000858","116.09988","1.600809","0.000568","116.09987","116.00883","116.06618","0.002027"];/*基金持仓债券代码（新市场号）*/var zqCodesNew = "";/*收益率*//*近一年收益率*/var syl_1n="15.25";/*近6月收益率*/var syl_6y="5.7";/*近三月收益率*/var syl_3y="-1.47";/*近一月收益率*/var syl_1y="4.52";
`;

// 测试股票数据 - 模拟腾讯财经股票数据
export const testStockData = `
v_sh600519="1~贵州茅台~600519~1546.46~1525.00~1520.00~54350~30829~23521~1545.90~2~1545.60~1~1545.59~3~1545.58~1~1545.56~3~1546.48~2~1546.49~1~1546.50~4~1546.56~1~1546.80~3~~20260205120517~21.46~1.41~1559.89~1515.00~1546.46/54350/8385073232~54350~838507~0.43~21.51~~1559.89~1515.00~2.94~19365.86~19365.86~8.53~1677.50~1372.50~0.95~-1~1542.80~22.47~22.46~~~0.65~838507.3232~0.0000~0~ ~GP-A~12.29~7.56~3.34~35.02~30.58~1606.43~1322.01~15.40~9.50~7.76~1252270215~1252270215~-4.76~-1.03~1252270215~~~14.36~-0.14~~CNY~0~___D__F__N~1545.50~20~";
`;

/**
 * 模拟基金持仓数据获取
 */
export async function mockFetchFundStockPositions(fundCode) {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 使用测试数据解析
  const stockData = parseFundStockData(testFundData);
  
  // 返回测试数据
  return stockData;
}

/**
 * 模拟解析基金持仓数据
 */
function parseFundStockData(data) {
  const stocks = [];
  
  try {
    // 解析测试数据中的股票代码
    const stockCodesMatch = data.match(/var\s+stockCodes\s*=\s*\[([^\]]+)\]/);
    
    if (stockCodesMatch && stockCodesMatch[1]) {
      const stockCodesStr = stockCodesMatch[1].replace(/'/g, '"');
      const stockCodes = JSON.parse(`[${stockCodesStr}]`);
      
      stockCodes.forEach((code, index) => {
        if (code && typeof code === 'string') {
          const convertedCode = convertStockCode(code);
          if (convertedCode) {
            stocks.push({
              code: convertedCode,
              originalCode: code,
              index: index + 1,
              name: getStockNameByCode(convertedCode),
              currentPrice: getRandomPrice(),
              changeRate: getRandomChangeRate(),
              change: getRandomChange(),
              timestamp: '20260205120517'
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('解析测试数据失败:', error);
  }
  
  return stocks;
}

/**
 * 股票代码转换（与stockService.js一致）
 */
function convertStockCode(stockCode) {
  if (!stockCode || stockCode.length < 5) return null;
  
  const cleanCode = stockCode.replace(/\d+$/, '');
  const firstChar = cleanCode.charAt(0);
  
  if (firstChar === '1') {
    return `sh${cleanCode.substring(1)}`;
  } else if (firstChar === '0') {
    return `sz${cleanCode}`;
  } else if (firstChar === '6') {
    return `sh${cleanCode}`;
  } else {
    return `sz${cleanCode}`;
  }
}

/**
 * 根据股票代码获取股票名称
 */
function getStockNameByCode(code) {
  const stockNames = {
    'sh600519': '贵州茅台',
    'sz000858': '五粮液',
    'sz000568': '泸州老窖',
    'sh600809': '山西汾酒',
    'sz002027': '分众传媒',
    'sh00700': '腾讯控股',
    'sz09988': '阿里巴巴',
    'sz09987': '拼多多',
    'sh00883': '中国海洋石油',
    'sh06618': '京东集团'
  };
  
  return stockNames[code] || '未知股票';
}

/**
 * 生成随机价格
 */
function getRandomPrice() {
  return (Math.random() * 2000 + 10).toFixed(2);
}

/**
 * 生成随机涨跌幅（-10% 到 +10%）
 */
function getRandomChangeRate() {
  return (Math.random() * 20 - 10).toFixed(2);
}

/**
 * 生成随机涨跌额
 */
function getRandomChange() {
  return (Math.random() * 100 - 50).toFixed(2);
}

/**
 * 模拟获取股票实时数据
 */
export async function mockFetchStockRealTimeData(stockCode) {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    code: stockCode,
    name: getStockNameByCode(stockCode),
    currentPrice: getRandomPrice(),
    changeRate: parseFloat(getRandomChangeRate()),
    change: parseFloat(getRandomChange()),
    yesterdayClose: (parseFloat(getRandomPrice()) - parseFloat(getRandomChange())).toFixed(2),
    todayOpen: getRandomPrice(),
    volume: Math.floor(Math.random() * 1000000),
    high: (parseFloat(getRandomPrice()) * 1.05).toFixed(2),
    low: (parseFloat(getRandomPrice()) * 0.95).toFixed(2),
    timestamp: '20260205120517',
    marketValue: Math.floor(Math.random() * 100000000000),
    peRatio: (Math.random() * 50).toFixed(2),
    pbRatio: (Math.random() * 10).toFixed(2)
  };
}

/**
 * 模拟批量获取基金持仓股票详细信息
 */
export async function mockGetFundStockDetails(fundCode) {
  try {
    // 获取模拟持仓数据
    const stockPositions = await mockFetchFundStockPositions(fundCode);
    
    // 批量获取股票实时数据
    const stockCodes = stockPositions.map(stock => stock.code);
    const stockDataPromises = stockCodes.map(code => mockFetchStockRealTimeData(code));
    const stockData = await Promise.all(stockDataPromises);
    
    // 合并数据
    return stockData.map((data, index) => ({
      ...data,
      originalCode: stockPositions[index]?.originalCode || '',
      positionIndex: index + 1
    }));
    
  } catch (error) {
    console.error('模拟获取基金持仓数据失败:', error);
    throw error;
  }
}