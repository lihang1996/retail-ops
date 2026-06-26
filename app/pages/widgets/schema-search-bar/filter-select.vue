<template>
  <el-select
    v-model="value"
    v-bind="schema.option"
    class="select"
    @keydown.enter.capture="onEnter"
  >
    <el-option
      v-for="item in schema.option?.enumList || []"
      :key="item.value"
      :label="item.label"
      :value="item.value"
    />
  </el-select>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  schemaKey: String,
  schema: Object,
})
const emit = defineEmits(['loaded', 'change'])
const value = ref()

function firstValue() {
  return props.schema?.option?.enumList?.[0]?.value
}

function getValue() {
  return value.value === undefined ? {} : { [props.schemaKey]: value.value }
}

function reset() {
  value.value = props.schema?.option?.resetDefault ?? firstValue()
}

function onEnter(event) {
  const combobox = event.target?.closest?.('[role="combobox"]')
  if (combobox?.getAttribute('aria-expanded') === 'true') return

  event.preventDefault()
  event.stopPropagation()
  const searchBar = event.currentTarget?.closest?.('.schema-search-bar')
  nextTick(() => searchBar?.querySelector('.search-btn')?.click())
}

watch(value, (nextValue) => {
  emit('change', { key: props.schemaKey, value: nextValue })
})

onMounted(() => {
  value.value = props.schema?.option?.default
    ?? props.schema?.option?.resetDefault
    ?? firstValue()
  emit('loaded')
})

defineExpose({ getValue, reset })
</script>
