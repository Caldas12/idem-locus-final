<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: 'Imagem do produto' }
})

const hasLoadError = ref(false)

const isUrl = computed(() => /^https?:\/\//i.test(props.src) && !hasLoadError.value)
const isEmoji = computed(() => !isUrl.value && props.src.length > 0 && props.src.length <= 4)

watch(() => props.src, () => {
  hasLoadError.value = false
})

function onImageError() {
  hasLoadError.value = true
}
</script>

<template>
  <div class="w-full h-full bg-gray-100 flex items-center justify-center relative overflow-hidden text-gray-400">
    <img
      v-if="isUrl"
      :src="src"
      :alt="alt"
      class="w-full h-full object-cover"
      @error="onImageError"
    >
    <span
      v-else-if="isEmoji"
      class="text-6xl"
    >{{ src }}</span>
    <UIcon
      v-else
      name="i-heroicons-photo"
      class="text-6xl opacity-50"
    />
  </div>
</template>
