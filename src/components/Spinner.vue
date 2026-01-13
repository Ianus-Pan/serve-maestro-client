<template>
  <div class="flex items-center justify-center">
    <div :class="props.classes"
      class="rounded-full border-4 border-solid border-blue-500 border-t-transparent border-l-transparent animate-spin-gradient"></div>
  </div>
</template>

<script setup>
const props = defineProps({
    classes: { type: String, default: 'w-12 h-12' },
});
</script>

<style scoped>
@keyframes spin-gradient {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-spin-gradient {
  animation: spin-gradient 1s linear infinite;
  border-radius: 50%;
  border-top-color: #3b82f6; /* blue-500 */
  border-right-color: #60a5fa; /* lighter blue */
  border-bottom-color: #93c5fd; /* even lighter blue */
  border-left-color: #bfdbfe; /* lightest blue */
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6); /* subtle blue glow */
}
</style>
