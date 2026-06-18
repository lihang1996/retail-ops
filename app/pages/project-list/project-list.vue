<template>
  <header-container title="项目入口">
    <template #main-content>
      <div v-loading="loading" class="entry-wrap">
        <el-empty v-if="!loading && entries.length === 0" description="暂无可用入口" />
        <el-row v-else :gutter="20" class="entry-list">
          <el-col v-for="item in entries" :key="item.key" :span="8">
            <el-card shadow="hover" class="entry-card">
              <div class="entry-name">{{ item.name }}</div>
              <div class="entry-desc">{{ item.desc }}</div>
              <el-button type="primary" link @click="goEntry(item)">进入</el-button>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </template>
  </header-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HeaderContainer from '$elpisHeaderContainer'
import { apiRequest, getToken } from '$retailAuth'

const loading = ref(true)
const entries = ref([])

const ALL_ENTRIES = [
  { key: 'overview', menu: 'menu:overview', name: '经营总览', desc: 'GMV、订单、库存风险', path: '/view/dashboard/overview?proj_key=retail' },
  { key: 'fulfillment', menu: 'menu:fulfillment', name: '履约中心', desc: '订单分仓、拣货、出库', path: '/view/dashboard/fulfillment?proj_key=retail' },
  { key: 'ai', menu: 'menu:ai', name: 'AI 工作台', desc: '经营分析与智能问答', path: '/view/dashboard/ai-workbench?proj_key=retail' },
  { key: 'product', menu: 'menu:product', name: '商品管理', desc: '店铺、类目、品牌、商品建档', path: '/view/dashboard/sider/schema?proj_key=retail&key=product&sider_key=product_item' },
  { key: 'org', menu: 'menu:org', name: '组织管理', desc: '部门、用户、角色与权限', path: '/view/dashboard/sider/schema?proj_key=retail&key=org&sider_key=org_department' },
]

onMounted(async () => {
  if (!getToken()) {
    window.location.href = '/view/login'
    return
  }
  try {
    const { data } = await apiRequest('/api/auth/permissions')
    const menus = data.menus || []
    entries.value = ALL_ENTRIES.filter((e) => menus.includes(e.menu))
  } catch {
    entries.value = []
  } finally {
    loading.value = false
  }
})

const goEntry = (item) => {
  window.location.href = item.path
}
</script>

<style lang="less" scoped>
.entry-wrap {
  min-height: 300px;
  padding: 20px 40px;
}
.entry-list {
  margin-top: 10px;
}
.entry-card {
  margin-bottom: 20px;
}
.entry-name {
  font-size: 17px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}
.entry-desc {
  font-size: 13px;
  color: #909399;
  min-height: 40px;
  margin-bottom: 8px;
}
</style>
