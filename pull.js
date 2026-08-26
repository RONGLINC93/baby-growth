#!/usr/bin/env node
/**
 * 拉取脚本：自动 git init(如未初始化) + pull + 显示最近提交
 * 用法：node pull.js
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
const REPO  = repoMatch[1].trim();
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
  run('git init', '1/4 初始化 git 仓库');
  run(`git checkout -b ${BRANCH}`, `2/4 创建分支 ${BRANCH}`);
}

// ---------- 2. 配置 user（如未配置） ----------
if (!exists('git config user.name')) {
  run('git config user.name "baby-growth-sync"', '3/4 配置 user.name');
}
if (!exists('git config user.email')) {
  run('git config user.email "sync@local"', '4/4 配置 user.email');
}

// ---------- 3. 设置远程 ----------
const remotes = execSync('git remote', { cwd: ROOT }).toString().trim().split(/\s+/).filter(Boolean);
if (!remotes.includes(REMOTE_NAME)) {
  run(`git remote add ${REMOTE_NAME} ${REMOTE_URL}`, '添加远程仓库');
} else {
  run(`git remote set-url ${REMOTE_NAME} ${REMOTE_URL}`, '更新远程 URL');
}

// ---------- 4. 拉取 ----------
if (needInit) {
  // 首次：fetch 远程，然后将本地分支 track 到远程
  run(`git fetch ${REMOTE_NAME}`, '1/2 拉取远程');
  run(`git reset --hard ${REMOTE_NAME}/${BRANCH}`, `2/2 同步到 ${REMOTE_NAME}/${BRANCH}`);
} else {
  run(`git pull ${REMOTE_NAME} ${BRANCH}`, '1/2 拉取最新');
}

run('git log -n 5 --oneline', '2/2 最近提交');

console.log('\n\x1b[32m[完成]\x1b[0m');
