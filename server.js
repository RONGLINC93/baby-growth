// 宝宝成长记录 - Node.js 服务端
// 提供照片数据的增删改查 + 静态文件服务
// 作者：RONGLINC93
// 版权所有：© 2026 RONGLINC93 版权所有
// 本软件为自由软件，您可以在遵守以下条件的前提下自由使用、修改和分发：
// 1. 本软件的作者为RONGLINC93，您必须在分发时保留此作者信息。
// 2. 本软件的版权信息必须完整，您不能修改或删除此版权信息。
// 3. 本软件的源代码必须以MIT许可证发布，您必须在分发时保留此许可证信息。
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'photos.json');
const CONFIG_FILE = path.join(ROOT, 'data', 'config.json');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');

[UPLOAD_DIR, path.dirname(DATA_FILE)].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 配置读写
function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); }
  catch (e) { return {}; }
}
function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

// ---------- 工具函数 ----------
function readPhotos() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
}
function writePhotos(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}
function getMime(ext) {
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.bmp': 'image/bmp',
    '.ico': 'image/x-icon'
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}
function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': getMime(path.extname(filePath)) });
    res.end(data);
  });
}

// ---------- 多部分表单解析（用于上传文件） ----------
function parseMultipart(buf, boundary) {
  const sep = Buffer.from('--' + boundary);
  const parts = [];
  let start = buf.indexOf(sep);
  while (start !== -1) {
    const next = buf.indexOf(sep, start + sep.length);
    if (next === -1) break;
    const block = buf.slice(start + sep.length + 2, next - 2);  // 去掉 \r\n
    if (block.length > 0) parts.push(block);
    start = next;
  }
  const result = { files: [], fields: {} };
  parts.forEach(block => {
    const headerEnd = block.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const header = block.slice(0, headerEnd).toString('utf-8');
    const body = block.slice(headerEnd + 4);
    const nameMatch = header.match(/name="([^"]+)"/);
    const fileMatch = header.match(/filename="([^"]+)"/);
    if (!nameMatch) return;
    const name = nameMatch[1];
    if (fileMatch) {
      result.files.push({ field: name, filename: fileMatch[1], data: body });
    } else {
      result.fields[name] = body.toString('utf-8');
    }
  });
  return result;
}

// ---------- 路由处理 ----------
function handleApi(req, res, body, contentType) {
  const url = new URL(req.url, 'http://localhost');
  const action = url.pathname;

  // 1. 获取列表
  if (action === '/api/photos' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(readPhotos()));
    return;
  }

  // 1.1 获取配置
  if (action === '/api/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(readConfig()));
    return;
  }

  // 1.2 保存配置
  if (action === '/api/config' && req.method === 'POST') {
    const cfg = JSON.parse(Buffer.concat(body).toString('utf-8'));
    const current = readConfig();
    Object.assign(current, cfg);
    writeConfig(current);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // 2. 新增（上传图片 + 标题 + 说明 + 月份）
  if (action === '/api/photos' && req.method === 'POST') {
    if (!contentType || !contentType.includes('multipart/form-data')) {
      res.writeHead(400); res.end('需要 multipart/form-data'); return;
    }
    const boundary = contentType.split('boundary=')[1];
    const parsed = parseMultipart(Buffer.concat(body), boundary);

    if (parsed.files.length === 0) {
      res.writeHead(400); res.end('未找到图片'); return;
    }
    const file = parsed.files[0];
    // 生成安全文件名
    const ext = path.extname(file.filename).toLowerCase() || '.jpg';
    const safeName = Date.now() + '_' + Math.round(Math.random() * 1e6) + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, safeName), file.data);

    const list = readPhotos();
    const id = list.length ? Math.max(...list.map(p => p.id)) + 1 : 1;
    const title = (parsed.fields.title || '未命名').toString().slice(0, 100);
    const desc = (parsed.fields.desc || '').toString().slice(0, 500);
    const item = { id, src: safeName, title, desc };
    list.push(item);
    writePhotos(list);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, item }));
    return;
  }

  // 3. 修改（标题/说明/月份）
  if (action.startsWith('/api/photos/') && req.method === 'PUT') {
    const id = parseInt(action.split('/').pop());
    const list = readPhotos();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) { res.writeHead(404); res.end('未找到'); return; }
    const data = JSON.parse(Buffer.concat(body).toString('utf-8'));
    if (data.title !== undefined) list[idx].title = String(data.title).slice(0, 100);
    if (data.desc !== undefined) list[idx].desc = String(data.desc).slice(0, 500);
    writePhotos(list);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, item: list[idx] }));
    return;
  }

  // 4. 删除
  if (action.startsWith('/api/photos/') && req.method === 'DELETE') {
    const id = parseInt(action.split('/').pop());
    const list = readPhotos();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) { res.writeHead(404); res.end('未找到'); return; }
    const removed = list.splice(idx, 1)[0];
    // 删除图片文件
    const filePath = path.join(UPLOAD_DIR, removed.src);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    writePhotos(list);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404); res.end('未知 API');
}

// ---------- 主服务 ----------
const server = http.createServer((req, res) => {
  // 收集 body
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const contentType = req.headers['content-type'] || '';

    if (req.url.startsWith('/api/')) {
      handleApi(req, res, chunks, contentType);
      return;
    }

    // 静态文件路由
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    // 三个静态来源：public、uploads
    let filePath = path.join(PUBLIC_DIR, urlPath);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(UPLOAD_DIR, urlPath.replace(/^\//, ''));
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404); res.end('Not Found'); return;
    }
    sendFile(res, filePath);
  });
});

server.listen(PORT, () => {
  console.log(`宝宝成长记录服务已启动: http://localhost:${PORT}`);
});
