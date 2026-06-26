import { ref } from 'vue'
import { warehouseApi } from '../api/warehouse-api.js'
import { getApiErrorMessage } from './api-error.js'

/**
 * 仓库 / 库位选项加载
 */
export function useWarehouseOptions() {
  const warehouses = ref([])
  const locations = ref([])
  const warehouseError = ref('')
  const locationError = ref('')

  async function loadWarehouses({ autoSelectFirst = false, selectedId = '' } = {}) {
    warehouseError.value = ''
    try {
      const res = await warehouseApi.list()
      if (res?.success) {
        warehouses.value = res.data || []
        if (autoSelectFirst && !selectedId && warehouses.value.length) {
          return warehouses.value[0].warehouse_id
        }
        return selectedId
      }
      warehouses.value = []
      warehouseError.value = res?.message || '仓库列表加载失败'
    } catch (error) {
      warehouses.value = []
      warehouseError.value = getApiErrorMessage(error, '仓库列表加载失败')
    }
    return selectedId
  }

  async function loadLocations(warehouseId, { currentLocationId = '' } = {}) {
    locationError.value = ''
    if (!warehouseId) {
      locations.value = []
      return ''
    }
    try {
      const res = await warehouseApi.locationList({ warehouse_id: warehouseId })
      if (res?.success) {
        locations.value = res.data || []
        if (currentLocationId && !locations.value.some((item) => item.location_id === currentLocationId)) {
          return ''
        }
        return currentLocationId
      }
      locations.value = []
      locationError.value = res?.message || '库位列表加载失败，可不选库位直接入库到仓库'
    } catch (error) {
      locations.value = []
      locationError.value = `${getApiErrorMessage(error, '库位列表加载失败')}。可不选库位直接入库到仓库`
    }
    return ''
  }

  return {
    warehouses,
    locations,
    warehouseError,
    locationError,
    loadWarehouses,
    loadLocations,
  }
}
