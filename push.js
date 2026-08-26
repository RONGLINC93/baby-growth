#!/usr/bin/env node
/**
 * 推送脚本：自动 git init(如未初始化) + add + commit + push
 * 用法：
 *   node push.js              # 默认 commit message
 *   node push.js "修复某 bug" # 自定义 commit message
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BRANCH = 'main';
const REMOTE_NAME = 'origin';

// ---------- 读取 .env ----------
const envPath = path.join(ROOT, '.env');
if (!fs.existsSync(envPath)) {
  console.error('\x1b[31m[错误]\x1b[0m 未找到 .env 文件');
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envContent.match(/GITHUB_TOKEN=(.+)/);
const repoMatch  = envContent.match(/GITHUB_REPO=(.+)/);
if (!tokenMatch || !repoMatch) {
  console.error('\x1b[31m[错误]\x1b[0m .env 中未找到 GITHUB_TOKEN 或 GITHUB_REPO');
  process.exit(1);
}
const TOKEN = tokenMatch[1].trim();
const REPO  = repoMatch[1].trim();  // 形如 RONGLINC93/baby-growth
const REMOTE_URL = `https://${TOKEN}@github.com/${REPO}.git`;

// ---------- 工具函数 ----------
function mask(cmd) { return cmd.replace(TOKEN, '***'); }
function run(cmd, label, allowFail = false) {
  console.log(`\n\x1b[36m[${label}]\x1b[0m ${mask(cmd)}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
    return true;
  } catch (e) {
    if (allowFail) return false;
    console.error(`\x1b[31m[失败]\x1b[0m ${label}`);
    process.exit(1);
  }
}
function exists(cmd) {
  try { execSync(cmd, { cwd: ROOT, stdio: 'ignore' }); return true; }
  catch (e) { return false; }
}

// ---------- 1. 初始化 git ----------
const needInit = !exists('git rev-parse --git-dir');
if (needInit) {
  run('git init', '1/5 初始化 git 仓库');
  run(`git checkout -b ${BRANCH}`, `2/5 创建分支 ${BRANCH}`);
}

// ---------- 2. 配置 user（如未配置） ----------
if (!exists('git config user.name')) {
  run('git config user.name "baby-growth-sync"', '3/5 配置 user.name');
}
if (!exists('git config user.email')) {
  run('git config user.email "sync@local"', '4/5 配置 user.email');
}

// ---------- 3. 设置远程 ----------
const remotes = execSync('git remote', { cwd: ROOT }).toString().trim().split(/\s+/).filter(Boolean);
if (!remotes.includes(REMOTE_NAME)) {
  run(`git remote add ${REMOTE_NAME} ${REMOTE_URL}`, '5/5 添加远程仓库');
} else {
  // .env 可能改了 repo，更新 URL
  run(`git remote set-url ${REMOTE_NAME} ${REMOTE_URL}`, '5/5 更新远程 URL');
}

// ---------- 4. add + commit + push ----------
const argMsg = process.argv[2];
const msg = argMsg || `chore: update ${new Date().toLocaleString('zh-CN')}`;

// 检查是否有改动
const status = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
if (!status) {
  console.log('\n\x1b[33m[提示] 没有改动，无需推送\x1b[0m');
} else {
  run('git add .', 'add');
  run(`git commit -m "${msg.replace(/"/g, '\\"')}"`, `commit: ${msg}`);
  run(`git push -u ${REMOTE_NAME} ${BRANCH}`, 'push');
}

console.log('\n\x1b[32m[完成]\x1b[0m');
