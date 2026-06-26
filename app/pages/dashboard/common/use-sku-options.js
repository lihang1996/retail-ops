import { ref } from 'vue'
import { productApi } from '../api/product-api.js'
import { getApiErrorMessage } from './api-error.js'

/**
 * SKU 下拉选项加载
 */
export function useSkuOptions() {
  const skus = ref([])
  const skuLoading = ref(false)
  const skuLoadFailed = ref(false)
  const skuError = ref('')

  async function loadSkus({ limit = 500 } = {}) {
    skuLoading.value = true
    skuLoadFailed.value = false
    skuError.value = ''
    try {
      const res = await productApi.skuList({ limit })
      if (res?.success) {
        skus.value = res.data || []
        if (!skus.value.length) skuError.value = '暂无可选 SKU，请先在商品管理中创建 SKU'
        return
      }
      skuLoadFailed.value = true
      skus.value = []
      skuError.value = res?.message || 'SKU 列表加载失败，可手动输入 SKU ID 后继续入库'
    } catch (error) {
      skuLoadFailed.value = true
      skus.value = []
      skuError.value = `${getApiErrorMessage(error, 'SKU 列表加载失败')}。可手动输入 SKU ID 后继续入库`
    } finally {
      skuLoading.value = false
    }
  }

  function findSku(skuId) {
    return skus.value.find((item) => item.sku_id === skuId)
  }

  return {
    skus,
    skuLoading,
    skuLoadFailed,
    skuError,
    loadSkus,
    findSku,
  }
}
