# Retail Ops 设计系统重构方案

> 基于现代 B2B SaaS 最佳实践的全面设计升级

---

## 🎯 设计目标

### 当前问题
1. **视觉层次不清晰** - 卡片、按钮、文字缺乏层次感
2. **信息密度过高** - 页面拥挤，缺少呼吸感
3. **交互反馈不足** - 按钮、链接缺少悬停、点击效果
4. **色彩系统单调** - 缺少品牌色、功能色的系统化应用
5. **排版不够精致** - 字号、行高、间距缺少规范

### 设计原则
1. **清晰** - 信息层次分明，关键数据突出
2. **高效** - 减少操作步骤，提升工作效率
3. **专业** - B2B 平台的专业感和可信度
4. **现代** - 符合 2026 年设计趋势

---

## 🎨 视觉设计系统

### 1. 色彩系统

#### 主色调（Brand Colors）
```css
/* 主品牌色 - 蓝色系（代表专业、可信） */
--color-primary-50: #EFF6FF;
--color-primary-100: #DBEAFE;
--color-primary-200: #BFDBFE;
--color-primary-500: #3B82F6;  /* 主色 */
--color-primary-600: #2563EB;  /* 悬停 */
--color-primary-700: #1D4ED8;  /* 按下 */

/* 辅助色 - 紫色系（代表创新、品质） */
--color-secondary-500: #8B5CF6;
--color-secondary-600: #7C3AED;
```

#### 功能色（Functional Colors）
```css
/* 成功 - 绿色 */
--color-success-50: #F0FDF4;
--color-success-500: #22C55E;
--color-success-600: #16A34A;

/* 警告 - 橙色 */
--color-warning-50: #FFF7ED;
--color-warning-500: #F59E0B;
--color-warning-600: #D97706;

/* 错误 - 红色 */
--color-error-50: #FEF2F2;
--color-error-500: #EF4444;
--color-error-600: #DC2626;

/* 信息 - 蓝色 */
--color-info-50: #EFF6FF;
--color-info-500: #3B82F6;
--color-info-600: #2563EB;
```

#### 中性色（Neutral Colors）
```css
--color-gray-50: #F9FAFB;
--color-gray-100: #F3F4F6;
--color-gray-200: #E5E7EB;
--color-gray-300: #D1D5DB;
--color-gray-400: #9CA3AF;
--color-gray-500: #6B7280;
--color-gray-600: #4B5563;
--color-gray-700: #374151;
--color-gray-800: #1F2937;
--color-gray-900: #111827;
```

### 2. 排版系统

#### 字体族
```css
/* 主字体 - 思源黑体/苹方/SF Pro */
--font-family-sans: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

/* 数字字体 - 等宽字体 */
--font-family-mono: "SF Mono", "Roboto Mono", Consolas, monospace;
```

#### 字号层级
```css
--text-xs: 12px;      /* 辅助信息 */
--text-sm: 14px;      /* 正文小 */
--text-base: 16px;    /* 正文 */
--text-lg: 18px;      /* 小标题 */
--text-xl: 20px;      /* 标题 */
--text-2xl: 24px;     /* 大标题 */
--text-3xl: 30px;     /* 页面标题 */
--text-4xl: 36px;     /* Hero 标题 */
```

#### 字重
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### 行高
```css
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

### 3. 间距系统

```css
--spacing-0: 0;
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
--spacing-16: 64px;
--spacing-20: 80px;
```

### 4. 圆角系统

```css
--radius-none: 0;
--radius-sm: 4px;     /* 小按钮 */
--radius-md: 6px;     /* 按钮、输入框 */
--radius-lg: 8px;     /* 卡片 */
--radius-xl: 12px;    /* 大卡片 */
--radius-2xl: 16px;   /* 模态框 */
--radius-full: 9999px; /* 圆形 */
```

### 5. 阴影系统

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

---

## 🧩 组件设计规范

### 1. 按钮（Button）

#### 主按钮
```css
.btn-primary {
  background: var(--color-primary-500);
  color: white;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--color-primary-600);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
```

#### 次级按钮
```css
.btn-secondary {
  background: white;
  color: var(--color-gray-700);
  border: 1px solid var(--color-gray-300);
  padding: 10px 20px;
  border-radius: var(--radius-md);
}

.btn-secondary:hover {
  background: var(--color-gray-50);
  border-color: var(--color-gray-400);
}
```

### 2. 卡片（Card）

```css
.card {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
  transition: all 0.2s;
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-gray-300);
}

/* 卡片标题 */
.card-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin-bottom: var(--spacing-2);
}

/* 卡片数值 */
.card-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  font-family: var(--font-family-mono);
  color: var(--color-gray-900);
  line-height: var(--leading-tight);
}

/* 卡片描述 */
.card-desc {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin-top: var(--spacing-1);
}
```

### 3. 表格（Table）

```css
.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.table thead th {
  background: var(--color-gray-50);
  color: var(--color-gray-700);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  text-align: left;
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.table tbody td {
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--color-gray-100);
  font-size: var(--text-sm);
  color: var(--color-gray-700);
}

.table tbody tr:hover {
  background: var(--color-gray-50);
}
```

### 4. 徽章（Badge）

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1.5;
}

.badge-success {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.badge-warning {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.badge-error {
  background: var(--color-error-50);
  color: var(--color-error-700);
}
```

---

## 📐 布局规范

### 1. 页面容器

```css
.page-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

.page-header {
  margin-bottom: var(--spacing-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-gray-900);
  margin-bottom: var(--spacing-2);
}

.page-description {
  font-size: var(--text-base);
  color: var(--color-gray-600);
  line-height: var(--leading-relaxed);
}
```

### 2. 栅格系统

```css
.grid {
  display: grid;
  gap: var(--spacing-6);
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .grid-cols-2,
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: repeat(1, 1fr);
  }
}
```

---

## 🎭 交互动效

### 1. 过渡动画

```css
/* 标准过渡 */
.transition {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 缓慢过渡 */
.transition-slow {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 快速过渡 */
.transition-fast {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2. 悬停效果

```css
/* 卡片悬停 */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* 按钮悬停 */
.hover-brighten:hover {
  filter: brightness(1.05);
}

/* 链接悬停 */
.hover-underline:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}
```

### 3. 点击反馈

```css
.active-scale:active {
  transform: scale(0.98);
}
```

---

## 📱 响应式设计

### 断点系统

```css
/* 手机 */
@media (max-width: 640px) { }

/* 平板 */
@media (min-width: 641px) and (max-width: 1024px) { }

/* 桌面 */
@media (min-width: 1025px) { }

/* 大屏 */
@media (min-width: 1440px) { }
```

---

## 🎯 具体页面优化建议

### 1. 经营总览页

#### 优化前问题
- 指标卡片过于平淡
- 缺少视觉焦点
- 间距不统一

#### 优化后方案
- ✅ 增加渐变背景或图标
- ✅ 突出关键数据（更大字号）
- ✅ 统一卡片间距（24px）
- ✅ 添加悬停动效

### 2. 履约中心页

#### 优化前问题
- Tab 切换不明显
- 表格过于紧凑
- 状态标签不清晰

#### 优化后方案
- ✅ Tab 使用底部高亮线
- ✅ 增加表格行高（16px padding）
- ✅ 状态标签使用彩色徽章
- ✅ 操作按钮统一样式

---

## 🛠 实施步骤

1. **Phase 1: 设计令牌** - 创建全局 CSS 变量
2. **Phase 2: 基础组件** - 重构按钮、卡片、表格
3. **Phase 3: 页面级优化** - 优化各个业务页面
4. **Phase 4: 细节打磨** - 动效、交互、响应式

---

*设计参考*：Shopify Admin, Linear, Notion, Monday.com
