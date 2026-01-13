
<script setup>
import { Chrome } from '@ckpack/vue-color'
import Accordion from '@/components/Accordion.vue';
import { ref, computed } from 'vue';

const color = defineModel({ type: Object, default: { hex8: "#f0ba26" } })

const open = ref(false)

function toggleColorPicker(e) {
    e.preventDefault()
    open.value = !open.value
}

function colorUpdate(colorObj) {
    color.value = colorObj
}

const textColor = computed(() => {
    const hex = color.value.hex8;

    // Optimized hex-to-RGB conversion
    const r = (parseInt(hex.substring(1, 3), 16));
    const g = (parseInt(hex.substring(3, 5), 16));
    const b = (parseInt(hex.substring(5, 7), 16));

    // Optimized luminance calculation (no need for /255)
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Return white for darker colors, black for lighter ones
    return luminance > 186 ? 'text-gray-700' : 'text-gray-100';  // Using 186 as the threshold for readability
});

</script>
<template>
    <Accordion @click="toggleColorPicker" class="w-full h-full border-none rounded hover:"
        :style="{ 'background-color': typeof color === 'object' ? color.hex8 : color }">
        <template #header>
            <div :class="textColor" class="p-2 font-bold cursor-pointer">{{ color.hex8 }}</div>
        </template>
        <template #content>
            <Chrome :style="{ width: 'fit-content' }" format="hex" :modelValue="color" @update:modelValue="colorUpdate" />
        </template>
    </Accordion>
</template>
