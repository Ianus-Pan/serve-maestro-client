<script setup>
import TabGroup from '@/components/TabGroup.vue';

const props = defineProps({
    img: {
        type: String,
        default: '_IMG_'
    },
    title: {
        type: String,
        default: 'TITLE'
    },
    description: {
        type: String,
        default: 'DESCRIPTION'
    },
})
</script>
<template>
        <div class="bg-cl_accent-100 rounded">
            <div class="flex flex-col items-center py-6">
                <img class="w-8 h-8" v-if="props.img" :src="props.img" />
                <header class="text-lg font-semibold shadow-black text-gray-200 ">
                    {{ title }}
                </header>
                <p class="text-gray-100 ">{{ description }}</p>
            </div>
            <TabGroup
                class="relative h-[60vh] max-h-[80vh] flex flex-col"
                contentClasses="overscroll-y-none overflow-y-auto bg-cl_background-100 dark:bg-cl_background-100-dark"
                buttonClasses="flex-grow">
                <slot/>
            </TabGroup>
        </div>
</template>
