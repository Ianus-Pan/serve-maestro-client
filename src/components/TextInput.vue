<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps({
    area: { type: Boolean, default: false }
});
const model = defineModel({
    type: String,
    default:""
});

const inputRef = ref(null);

onMounted(() => {
    if (inputRef.value.hasAttribute('autofocus')) {
        inputRef.value.focus();
    }
});

defineExpose({ focus: () => inputRef.value.focus() });
</script>

<template>
        <textarea v-if="area" class="bg-cl_background-100 dark:bg-cl_background-100-dark border-cl_background-400 dark:border-cl_background-400-dark focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
            v-model="model" ref="inputRef" />
        <input v-else class="bg-cl_background-100 dark:bg-cl_background-100-dark border-cl_background-400 dark:border-cl_background-400-dark focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
            v-model="model" ref="inputRef" />
</template>
