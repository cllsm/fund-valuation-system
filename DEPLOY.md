# GitHub 静态部署指南

## 方法一：GitHub Pages（推荐）

### 步骤1：准备代码
1. 确保项目可以正常构建：
```bash
npm run build
```

### 步骤2：创建GitHub仓库
1. 在GitHub创建新仓库（如：`fund-valuation-system`）
2. 初始化并推送代码：
```bash
git init
git add .
git commit -m "初始提交"
git branch -M main
git remote add origin https://github.com/你的用户名/fund-valuation-system.git
git push -u origin main
```

### 步骤3：配置GitHub Pages
1. 进入仓库设置（Settings）
2. 左侧菜单选择 Pages
3. Source 选择 "GitHub Actions"
4. 保存设置

### 步骤4：修改配置（重要）
在 `vite.config.js` 中修改 base 路径为你的仓库名：
```javascript
base: process.env.NODE_ENV === 'production' ? '/fund-valuation-system/' : '/'
```

### 步骤5：部署
1. 代码推送到main分支后，GitHub Actions会自动部署
2. 访问地址：`https://你的用户名.github.io/fund-valuation-system`

## 方法二：Vercel部署（更简单）

### 步骤：
1. 访问 [vercel.com](https://vercel.com)
2. 使用GitHub账号登录
3. 导入你的GitHub仓库
4. 自动部署完成
5. 访问Vercel提供的域名

## 方法三：Netlify部署

### 步骤：
1. 访问 [netlify.com](https://netlify.com)
2. 连接GitHub账户
3. 选择仓库，构建命令填 `npm run build`
4. 发布目录填 `dist`
5. 部署完成

## 部署注意事项

### 1. 路径问题
- 确保所有资源路径使用相对路径
- 检查路由配置是否正确

### 2. 环境变量
- 生产环境可能需要不同的API配置
- 使用环境变量管理不同环境的配置

### 3. 缓存问题
- 部署后可能需要清除浏览器缓存
- 考虑使用版本号或哈希值避免缓存

### 4. 域名配置（可选）
- 可以绑定自定义域名
- 需要配置DNS解析

## 快速验证部署

部署完成后，访问你的网站并测试：
1. ✅ 页面正常加载
2. ✅ 基金数据可以正常获取
3. ✅ 响应式布局正常工作
4. ✅ 所有功能正常使用

## 故障排除

### 常见问题：
1. **404错误**：检查base路径配置
2. **资源加载失败**：确认路径是否正确
3. **API调用失败**：检查跨域问题和HTTPS

如果遇到问题，检查GitHub Actions的构建日志获取详细错误信息。