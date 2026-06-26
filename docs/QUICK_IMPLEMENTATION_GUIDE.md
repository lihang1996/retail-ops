# 设计优化快速实施指南

> 如何使用新设计系统快速优化其他页面

---

## 🎯 核心原则

### 1. 使用设计令牌（Design Tokens）

**始终使用 CSS 变量，不要硬编码**

```css
/* ✅ 正确 */
color: var(--color-gray-900);
padding: var(--spacing-6);
border-radius: var(--radius-lg);

/* ❌ 错误 */
color: #111827;
padding: 24px;
border-radius: 12px;
```

### 2. 统一组件样式

**所有页面的相同元素应该有一致的样式**

- 卡片：`var(--radius-lg)` + `var(--shadow-sm)`
- 按钮：`var(--radius-md)` + `var(--transition-base)`
- 输入框：`var(--radius-md)` + 聚焦效果
- 表格：灰50背景表头 + 16px padding

### 3. 添加交互反馈

**所有可交互元素都应该有反馈**

```css
.clickable {
  transition: all var(--transition-base);
  cursor: pointer;
}

.clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.clickable:active {
  transform: scale(0.98);
}
```

---

## 📝 页面优化清单

### 对每个页面执行以下步骤：

#### ☑️ Step 1: 替换颜色
```css
/* 查找所有硬编码的颜色，替换为变量 */
#2563eb → var(--color-primary-500)
#16a34a → var(--color-success-600)
#f59e0b → var(--color-warning-500)
#ef4444 → var(--color-error-500)
#64748b → var(--color-gray-500)
```

#### ☑️ Step 2: 统一间距
```css
/* 将所有间距规范化为 4px 的倍数 */
padding: 20px → var(--spacing-5)
margin: 24px → var(--spacing-6)
gap: 16px → var(--spacing-4)
```

#### ☑️ Step 3: 统一圆角
```css
/* 小组件 */
border-radius: 6px → var(--radius-md)

/* 卡片 */
border-radius: 12px → var(--radius-lg)

/* 徽章/标签 */
border-radius: 9999px → var(--radius-full)
```

#### ☑️ Step 4: 优化阴影
```css
/* 替换为统一的阴影系统 */
box-shadow: 0 1px 3px... → var(--shadow-sm)
box-shadow: 0 4px 6px... → var(--shadow-md)
box-shadow: 0 10px 15px... → var(--shadow-lg)
```

#### ☑️ Step 5: 添加过渡
```css
/* 所有交互元素添加过渡 */
.interactive-element {
  transition: all var(--transition-base);
}
```

#### ☑️ Step 6: 优化字体
```css
/* 标题 */
font-size: var(--text-2xl);
font-weight: var(--font-bold);
color: var(--color-gray-900);

/* 正文 */
font-size: var(--text-base);
color: var(--color-gray-700);

/* 辅助信息 */
font-size: var(--text-sm);
color: var(--color-gray-500);

/* 数字 */
font-family: var(--font-mono);
```

---

## 🎨 常用样式模式

### 1. 指标卡片

```vue
<template>
  <el-card class="metric-card">
    <div class="metric-header">
      <div class="metric-icon">📊</div>
      <span class="metric-label">订单总数</span>
    </div>
    <div class="metric-value">1,234</div>
    <div class="metric-footer">较昨日 +12%</div>
  </el-card>
</template>

<style scoped>
.metric-card {
  cursor: pointer;
  transition: all var(--transition-base);
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-300);
}

.metric-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.metric-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-50);
  border-radius: var(--radius-lg);
  font-size: var(--text-lg);
}

.metric-label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
}

.metric-value {
  margin-top: var(--spacing-5);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  font-family: var(--font-mono);
  color: var(--color-gray-900);
  line-height: 1;
}

.metric-footer {
  margin-top: var(--spacing-3);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}
</style>
```

### 2. 状态标签

```vue
<template>
  <span :class="['status-badge', `status-${type}`]">
    {{ label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1.5;
}

.status-success {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.status-warning {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.status-error {
  background: var(--color-error-50);
  color: var(--color-error-700);
}

.status-info {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}
</style>
```

### 3. 操作按钮组

```vue
<template>
  <div class="action-group">
    <el-button type="primary">主要操作</el-button>
    <el-button>次要操作</el-button>
    <el-button type="text">文字按钮</el-button>
  </div>
</template>

<style scoped>
.action-group {
  display: flex;
  gap: var(--spacing-3);
  align-items: center;
}
</style>
```

### 4. 数据表格

```vue
<style scoped>
:deep(.el-table) {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

:deep(.el-table th) {
  background: var(--color-gray-50);
  color: var(--color-gray-700);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  padding: var(--spacing-4);
}

:deep(.el-table td) {
  padding: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-gray-700);
}

:deep(.el-table__row:hover) {
  background: var(--color-gray-50);
}
</style>
```

---

## 🔧 工具函数

### 数字格式化

```javascript
// 金额格式化
function formatMoney(value) {
  if (value == null) return '—'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 大数字简化
function formatLargeNumber(value) {
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + '万'
  }
  return value.toString()
}

// 百分比
function formatPercent(value) {
  return (value * 100).toFixed(1) + '%'
}
```

---

## 📦 可复用组件

### EmptyState 组件

```vue
<template>
  <div class="empty-state">
    <div class="empty-icon">📦</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
    <el-button v-if="actionText" type="primary" @click="$emit('action')">
      {{ actionText }}
    </el-button>
  </div>
</template>

<style scoped>
.empty-state {
  padding: var(--spacing-16) var(--spacing-6);
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.3;
  margin-bottom: var(--spacing-4);
}

.empty-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0 0 var(--spacing-2);
}

.empty-description {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0 0 var(--spacing-6);
}
</style>
```

---

## 🎬 实战示例：优化履约中心

### Before（旧样式）

```vue
<style scoped>
.stat-card {
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #000;
}
</style>
```

### After（新样式）

```vue
<style scoped>
.stat-card {
  padding: var(--spacing-5);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-lg);
  background: white;
  transition: all var(--transition-base);
  cursor: pointer;
}

.stat-card:hover {
  border-color: var(--color-primary-300);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.stat-card.active {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  font-family: var(--font-mono);
  color: var(--color-gray-900);
  line-height: 1;
}
</style>
```

---

## ⚡️ 快速替换脚本

### 查找替换建议

```bash
# 1. 颜色替换
#2563eb → var(--color-primary-500)
#16a34a → var(--color-success-600)
#f59e0b → var(--color-warning-500)
#ef4444 → var(--color-error-500)

# 2. 间距替换
padding: 24px → padding: var(--spacing-6)
margin: 16px → margin: var(--spacing-4)
gap: 12px → gap: var(--spacing-3)

# 3. 圆角替换
border-radius: 8px → border-radius: var(--radius-md)
border-radius: 12px → border-radius: var(--radius-lg)
border-radius: 999px → border-radius: var(--radius-full)
```

---

## 📋 优化检查清单

完成一个页面优化后，使用此清单检查：

- [ ] 所有颜色使用了 CSS 变量
- [ ] 所有间距使用了 CSS 变量
- [ ] 所有圆角使用了 CSS 变量
- [ ] 所有阴影使用了 CSS 变量
- [ ] 数字使用了等宽字体
- [ ] 添加了悬停效果
- [ ] 添加了过渡动画
- [ ] 状态标签统一样式
- [ ] 按钮统一样式
- [ ] 表格统一样式
- [ ] 响应式布局正常
- [ ] 空状态有友好提示

---

## 🚀 开始优化！

选择一个页面，按照以下步骤：

1. **备份原文件**
2. **Step 1-6 逐步优化**
3. **使用检查清单验证**
4. **测试各种状态和交互**
5. **收集反馈并迭代**

---

**加油！你的设计会越来越好！** 🎉
