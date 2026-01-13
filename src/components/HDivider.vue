<script setup>
import VDivider from './VDivider.vue';

const props = defineProps({
    size: { type: String, default: "2rem" },
    thickness: { type: String, default: "1px" }
});
</script>


<template>
    <VDivider flip :size="props.size" :thickness="props.thickness" />
</template>
