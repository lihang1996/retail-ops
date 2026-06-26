<template>
  <el-drawer
    v-model="visible"
    class="schema-drawer"
    direction="rtl"
    :destroy-on-close="destroyOnClose"
    :size="size"
    :show-close="true"
  >
    <template #header>
      <span class="schema-drawer__title">{{ title }}</span>
    </template>

    <div class="schema-drawer__body">
      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <div class="schema-drawer__footer">
        <slot name="footer" />
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: [String, Number], default: '400px' },
  destroyOnClose: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>
