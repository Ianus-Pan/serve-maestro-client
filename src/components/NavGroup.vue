<script setup>

const props = defineProps({
    title: { type: String }
});

</script>

<template>
    <div class="flex overflow-hidden py-4 gap-1 w-full justify-center items-center align-middle flex-col">
        <!-- <slot name="header" /> -->
        <span class="hidden md:inline-block text-center font-bold text-sm lg:text-lg uppercase text-gray-700 ">
            {{ props.title }}
        </span>
        <small class="inline-block md:hidden text-center text-gray-700">
            {{ props.title }}
        </small>
        <div class="mt-2 flex w-full flex-col gap-2">
            <slot />
        </div>
    </div>
</template>

