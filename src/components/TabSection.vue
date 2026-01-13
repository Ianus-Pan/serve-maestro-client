<script setup>

const props = defineProps({
    label: { type: String, default: "Default Label" }
});
</script>

<template>
    <div class="flex min-h-full flex-col justify-center rounded-md bg-cl_background-100 dark:bg-cl_background-100-dark">
        <div class="flex justify-center items-center flex-1">
            <slot/>
        </div>
        <div class="text-center text-sm">{{label}}</div>
    </div>
</template>
