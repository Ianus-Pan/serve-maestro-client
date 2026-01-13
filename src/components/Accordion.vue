<script setup>
import { ref, nextTick, watch, onMounted } from 'vue';
const props = defineProps({
    max_height: { type: String },
    header_classes: { type: String, default: '' },
    content_classes: { type: String, default: '' },
});

const expanded = defineModel()
const contentHeight = ref("0px");
const contentWrapper = ref(null);
const clipOverflow = ref(false)
const random = 'x' + Math.floor(Math.random() * 1000);

onMounted(() => {
    new ResizeObserver(contentResize)
        .observe(window.document.querySelector(`#${random}`))
})

function contentResize(obs) {
    if(expanded.value)
        contentHeight.value = obs[0].target.offsetHeight + 'px'
}

watch(() => expanded.value, () => toggleExpanded())

async function toggleExpanded() {
    await nextTick();

    if (expanded.value) {
        contentHeight.value = props.max_height || contentWrapper.value.scrollHeight + 'px';
        setTimeout(() => clipOverflow.value = true, 300 )
    } else {
        contentHeight.value = '0px';
        clipOverflow.value = false
    }
}
</script>

<template>
    <div>
        <div @click="expanded = !expanded"
            class="cursor-pointer px-6 flex justify-between items-center"
            :class="header_classes">
            <slot name="header"></slot>
            <svg :class="{ 'transform rotate-180': expanded }" class="w-4 h-4 transition-transform duration-200"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>

        <div ref="contentWrapper" :style="{ height: contentHeight }"
            class="transition-all duration-300 ease-in-out overflow-hidden"
            :class="content_classes + (clipOverflow ? ' overflow-visible ' : ' overflow-hidden ')">
            <div :id="random" class="p-4">
                <slot name="content"></slot>
            </div>
        </div>
    </div>
</template>