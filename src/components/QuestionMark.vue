<template>
    <div class="m-1 relative w-3 h-3 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
        <slot>
            <span class="text-gray-500 text-xs font-bold">?</span>
        </slot>
    </div>
</template>

<script setup>
// No additional logic is required for this component
</script>

<style scoped>
/* No additional styling is needed since everything is handled by Tailwind */
</style>
