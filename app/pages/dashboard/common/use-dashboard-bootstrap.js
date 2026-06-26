import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '../api/auth-api.js'
import { projectApi } from '../api/project-api.js'
import { warehouseApi } from '../api/warehouse-api.js'
import { unwrapData } from '../api/http.js'
import { resolveWarehouseId } from './warehouse-default.js'
import { useMenuStore } from '$elpisStore/menu'
import { useProjectStore } from '$elpisStore/project'

export function useDashboardBootstrap() {
  const route = useRoute()
  const menuStore = useMenuStore()
  const projectStore = useProjectStore()

  const projName = ref('')
  const userName = ref('admin')
  const permissionMenus = ref([])
  const defaultWarehouseId = ref('')

  async function loadProjectList() {
    const res = await projectApi.list({ proj_key: route.query.proj_key })
    const list = unwrapData(res, [])
    if (Array.isArray(list)) projectStore.setProjectList(list)
  }

  async function loadProjectConfig() {
    const res = await projectApi.get({ proj_key: route.query.proj_key })
    const data = unwrapData(res)
    if (!data) return
    projName.value = data.name || ''
    menuStore.setMenuList(data.menu || [])
  }

  async function loadCurrentUser() {
    const res = await authApi.me()
    const payload = unwrapData(res)
    const user = payload && payload.user
    const displayName = (user && (user.displayName || user.account)) || ''
    if (displayName) userName.value = displayName
  }

  async function loadPermissions() {
    const res = await authApi.permissions()
    const data = unwrapData(res)
    permissionMenus.value = (data && data.menus) || []
  }

  async function loadDefaultWarehouse() {
    const res = await warehouseApi.list()
    const list = unwrapData(res, [])
    defaultWarehouseId.value = resolveWarehouseId(route.query.warehouse_id, list || [])
  }

  async function bootstrap() {
    await Promise.allSettled([
      loadProjectList(),
      loadProjectConfig(),
      loadCurrentUser(),
      loadPermissions(),
      loadDefaultWarehouse(),
    ])
  }

  return {
    projName,
    userName,
    permissionMenus,
    defaultWarehouseId,
    bootstrap,
  }
}
