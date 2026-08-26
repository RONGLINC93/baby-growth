# 宝宝成长记录

一个轻量级的「宝宝成长」照片记录应用，使用原生 Node.js（无第三方依赖）+ 原生前端实现。每张照片以圆形气泡形式漂浮展示，点击可查看大图与说明，支持上传、编辑、删除。

## 功能特性

- 以气泡形式浮动展示宝宝照片，鼠标悬停放大
- 照片上传（支持 jpg/png/gif/webp/bmp 等格式）
- 编辑标题与说明文字
- 删除照片（同步删除文件）
- 站点标题与描述自定义配置
- 一键导出当前画面为图片（基于 html2canvas）
- 纯 Node.js 实现，零运行时依赖

## 技术栈

- **后端**：Node.js 原生 `http` / `fs` 模块（无框架）
- **前端**：原生 HTML + CSS + JavaScript
- **依赖库**：[html2canvas](https://github.com/niklasvh/html2canvas)（用于截图导出）

## 目录结构

```
baby-growth/
├── server.js            # 服务端：API + 静态文件服务
├── package.json
├── data/
│   ├── photos.json      # 照片元数据存储
│   └── config.json      # 站点配置
├── uploads/             # 上传的图片文件
└── public/
    ├── index.html       # 前端单页应用
    └── lib/
        └── html2canvas.min.js
```

## 快速开始

### 环境要求

- Node.js >= 14

### 安装与运行

```bash
# 进入项目目录
cd baby-growth

# 启动服务
npm start
```

启动后访问：<http://localhost:3000>

## API 接口

| 方法     | 路径              | 说明                         |
| -------- | ----------------- | ---------------------------- |
| GET      | `/api/photos`     | 获取照片列表                 |
| POST     | `/api/photos`     | 上传新照片（multipart/form-data，字段：title、desc、file） |
| PUT      | `/api/photos/:id` | 修改标题 / 说明              |
| DELETE   | `/api/photos/:id` | 删除指定照片                 |
| GET      | `/api/config`     | 获取站点配置                 |
| POST     | `/api/config`     | 保存站点配置                 |

### 照片对象结构

```json
{
  "id": 1,
  "src": "1699999999999_123456.jpg",
  "title": "百天纪念",
  "desc": "宝宝今天 100 天啦"
}
```

### 配置对象结构

```json
{
  "siteTitle": "宝宝成长记录",
  "siteDesc": "每一张照片，都是一段小小的奇迹 ✨",
  "helpCollapsed": true
}
```

## 配置说明

- **端口**：默认 `3000`，可在 [server.js](server.js) 顶部的 `PORT` 常量修改。
- **数据存储**：所有数据保存在本地文件（`data/` 与 `uploads/` 目录），无数据库依赖。

## 使用说明

1. 打开浏览器访问 <http://localhost:3000>
2. 点击底部「上传」按钮，选择照片并填写标题/说明
3. 上传完成后照片会以气泡形式出现在页面中
4. 鼠标悬停在气泡上可看到删除按钮与说明提示
5. 点击气泡可查看大图
6. 点击底部「截图」按钮可将当前画面导出为图片

## 注意事项

- 该项目仅用于家庭/个人本地使用，未做鉴权与安全加固，请勿直接暴露在公网
- 删除照片会同时删除 `uploads/` 中的源文件，请谨慎操作
- 建议定期备份 `data/` 与 `uploads/` 目录
