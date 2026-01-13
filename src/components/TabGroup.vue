<script setup>
import { provide, ref, computed, watch } from 'vue';
const props = defineProps({
    init_tab: { type: String, default: '1' },
    buttonClasses: { type: String },
    contentClasses: { type: String }
});
const tabs = ref({})
const curr_tab = ref(props.init_tab)

provide('curr_tab', curr_tab)
provide('add_tab', (tab, slot) => {
    let tab_arr = Object.keys(tabs.value) ?? []

    let tab_index 
    if( slot ) tab_index = slot
    else tab_index = tab_arr.at(-1) ? parseInt(tab_arr.at(-1)) + 1 : 0;

    tabs.value[tab_index] = tab;

    if( curr_tab.value === '0' ) curr_tab.value = tab_index
    
    return `${tab_index}`
});
provide('update_tab', (tab_index, changes) => {
    tabs.value[tab_index] = changes
});
provide('remove_tab', (tab_index) => {
    delete tabs.value[tab_index]

    if( !tabs.value[curr_tab.value] ) {
        let first_index = Object.keys(tabs.value)
        if( first_index.length )
            curr_tab.value = first_index[0]
        else curr_tab.value = '0'
    }
});


function set_curr_tab(tab) {
    curr_tab.value = tab
}
const curr_tab_class = 'bg-cl_background-100 dark:bg-cl_background-100-dark text-sm font-bold'
const tab_class = 'bg-cl_background-50 dark:bg-cl_background-50-dark text-sm font-extralight'

const contentWrapper = ref(null);
const contentHeight = computed(() => {
    if (contentWrapper.value) return contentWrapper.value.offset + 'px'
    return null
})

watch(() => tabs.value, () => console.log('!tabs', tabs.value))
</script>

<template>
    <div class="">
        <div class="flex justify-between items-end">
            <div class="flex flex-grow">
                <button class="transition-all py-1 px-3 rounded-t-md relative"
                    :disabled="tab.disabled" v-for="(tab, index) in tabs" :key="index"
                    :class="[
                        curr_tab === index ? curr_tab_class : tab_class,
                        tab.disabled ? 'text-gray-900 text-opacity-60' : '',
                        props.buttonClasses,
                        curr_tab !== index && !tab.disabled ? 'hover:pt-1 hover:opacity-60' : ''
                    ]"
                    @click="set_curr_tab(index)">
                    {{ tab.label }}
                </button>
            </div>
            <slot name="rhs" />
        </div>
        <div ref="contentWrapper" class="flex flex-grow" :class="[contentClasses]"
            :style="contentHeight ? { height: contentHeight } : {}">
            <slot></slot>
        </div>
    </div>
</template>
