# 部署指南

## GitHub Pages 部署步骤

1. **构建项目**
```bash
npm run build
```

2. **将dist目录推送到GitHub仓库**
```bash
git add dist
git commit -m "Build for production"
git push origin main
```

3. **在GitHub仓库设置中配置Pages**
   - 进入仓库的Settings > Pages
   - Source选择"GitHub Actions"或"Deploy from a branch"
   - Branch选择`main`（或包含dist目录的分支）
   - Base路径设置为`/fund-valuation-system/`

## 注意事项

- 确保`vite.config.js`中的base配置正确：
```javascript
base: '/fund-valuation-system/'
```

- GitHub Pages只会服务根目录和子目录，不会服务src目录

- 部署后访问：`https://yourusername.github.io/fund-valuation-system/`

## 常见问题

### 404错误
如果出现404错误，请检查：
1. 是否正确构建了项目
2. 是否将dist目录推送到GitHub
3. GitHub Pages设置是否正确配置了base路径
4. 确保没有直接部署src目录

### 资源路径问题
确保index.html中的脚本和样式表路径正确：
```html
<script type="module" src="/fund-valuation-system/assets/main.js"></script>
```