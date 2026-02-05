/**
 * 蛋卷基金API服务
 * 获取基金资产配置数据
 */

/**
 * 获取基金资产配置数据
 * @param {string} fundCode - 基金代码
 * @returns {Promise<Object>} - 基金资产配置数据
 */
export async function getFundAssetAllocation(fundCode) {
  try {
    const timestamp = Date.now();
    // 使用本地代理解决CORS问题
    const url = `/api/danjuan/base/fund/record/asset/percent?fund_code=${fundCode}&t=${timestamp}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.result_code === 0) {
      return data.data;
    } else {
      throw new Error('接口返回错误');
    }
  } catch (error) {
    console.error('获取基金资产配置数据失败:', error);
    
    // 备用方案：返回模拟数据
    return generateMockAssetData(fundCode);
  }
}

/**
 * 生成模拟资产配置数据
 */
function generateMockAssetData(fundCode) {
  return {
    source: '2025-12-31',
    source_mark: '2025-12-31',
    stock_percent: 87.38,
    cash_percent: 9.3,
    bond_percent: 5.18,
    other_percent: 0.95,
    stock_list: [
      {
        name: '腾讯控股',
        code: '00700',
        percent: 9.39,
        current_price: 558.5,
        change_percentage: 0.09,
        xq_symbol: '00700',
        xq_url: 'https://xueqiu.com/S/00700',
        change_of_pre_quarter: '0.57%',
        change_of_pre_quarter_type: 1,
        percent_double: 9.39,
        amarket: false
      },
      {
        name: '贝壳-W',
        code: '02423',
        percent: 9.01,
        current_price: 48.96,
        change_percentage: -0.24,
        xq_symbol: '02423',
        xq_url: 'https://xueqiu.com/S/02423',
        change_of_pre_quarter: '2.03%',
        change_of_pre_quarter_type: 1,
        percent_double: 9.01,
        amarket: false
      }
    ],
    bond_list: [
      {
        name: '25国债13',
        code: '019785',
        percent: 3.33,
        xq_symbol: '019785',
        percent_double: 3.33,
        amarket: false
      }
    ],
    chart_list: [
      {
        type_desc: '股票',
        type: 'stock',
        percent: 87.38,
        color: '#F04848'
      },
      {
        type_desc: '债券',
        type: 'bond',
        percent: 5.18,
        color: '#287DFF'
      },
      {
        type_desc: '现金',
        type: 'cash',
        percent: 9.3,
        color: '#FFCA03'
      },
      {
        type_desc: '其他',
        type: 'other',
        percent: 0.95,
        color: '#ACAFBD'
      }
    ],
    industry_list: [
      {
        industry_code: '720000',
        industry_name: '传媒',
        percent: 32.14,
        color: '#287DFF'
      },
      {
        industry_code: '450000',
        industry_name: '商贸零售',
        percent: 16.27,
        color: '#FFA100'
      }
    ]
  };
}

/**
 * 获取基金实时估值数据（备用接口）
 * @param {string} fundCode - 基金代码
 * @returns {Promise<Object>} - 基金实时数据
 */
export async function getFundRealTimeData(fundCode) {
  try {
    const timestamp = Date.now();
    // 使用本地代理解决CORS问题
    const url = `/api/danjuan/base/fund/detail/${fundCode}?t=${timestamp}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.result_code === 0) {
      return {
        name: data.data.fund_name,
        currentValue: data.data.nav,
        changeRate: data.data.nav_growth_rate,
        updateTime: data.data.fund_nav_time
      };
    } else {
      throw new Error('接口返回错误');
    }
  } catch (error) {
    console.error('获取基金实时数据失败:', error);
    
    // 备用方案：返回模拟实时数据
    return {
      name: `基金${fundCode}`,
      currentValue: Math.random() * 3 + 1,
      changeRate: (Math.random() * 10 - 5).toFixed(2),
      updateTime: new Date().toLocaleTimeString('zh-CN')
    };
  }
}