# 基金估值系统部署指南

本项目包含前端（Vue.js）和后端（Node.js）两部分。

## 1. 开发环境运行

### 前端开发
```bash
# 安装依赖
npm install

# 启动开发服务器（端口3000）
npm run dev
```

### 后端开发
```bash
# 进入后端目录
cd server

# 安装依赖
npm install

# 启动后端服务器（端口3001）
npm run dev
```

## 2. 生产环境部署

### 方案一：Vercel部署（推荐）

1. 将代码推送到GitHub
2. 在Vercel中导入项目
3. 构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`dist`
4. 环境变量：`NODE_ENV=production`

### 方案二：Railway部署（支持Node.js后端）

1. 将代码推送到GitHub
2. 在Railway中导入项目
3. Railway会自动检测到Node.js项目并部署
4. 前端静态文件会自动通过Express静态服务提供

### 方案三：传统服务器部署

```bash
# 构建前端
npm run build

# 部署后端
cd server
npm install --production
npm start

# 设置环境变量
NODE_ENV=production
```

## 3. API代理配置

### 开发环境
- 前端：`http://localhost:3000`
- 后端：`http://localhost:3001`
- API代理：通过Vite配置自动转发

### 生产环境
- 前端和后端部署在同一域名下
- API请求自动转发到后端接口
- 后端处理CORS和跨域请求

## 4. 环境变量

### 开发环境
```bash
VITE_API_BASE_URL=http://localhost:3001
```

### 生产环境
```bash
NODE_ENV=production
PORT=3001
```

## 5. 健康检查

后端提供健康检查端点：
- `GET /health` - 返回服务器状态

## 6. 注意事项

1. **GitHub Pages限制**：GitHub Pages仅支持静态文件，不能运行Node.js后端
2. **推荐平台**：使用Vercel、Railway、Heroku等支持全栈部署的平台
3. **CORS处理**：后端已配置CORS中间件，支持跨域请求
4. **错误处理**：前端有完善的错误处理和备用数据机制