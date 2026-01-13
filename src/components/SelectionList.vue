<script setup>
import Dropdown from '@/components/Dropdown.vue';
import useSifter from '@/composables/sifter.js'
import { getPathValue, setPathValue } from "@/utils/object_deep_fields.js";

import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
    required: Boolean,
    placeholder: { type: String, default: "Select one from here..." },
    items: { type: Object },
    selectPredicate: { type: Function },
    onClick: { type: Function },
    searcher: { type: Object },
    sorters: { type: Object },
    filterers: { type: Object },
    refreshValidTrigger: { type: Number },

    /** The prop that will be shown from the item ex. `item[label_field]`   */
    item_label_field: { type: String, required: true },
    item_id_field: { type: String, required: true },

    slotComponent: { type: Object },
    outsideClose: { type: Boolean, default: true },

    // searchable: { type: Boolean, default: false },
    // item_search_field: { type: String },
    //
    // filterable: { type: Boolean, default: false },
    // item_filter_field: { type: String },

    dropdownClasses: { type: String },

});

/** The Selected Object */
const selected = ref(null)

/** Update DD Options */
const items = ref(props.items)
watch(() => props.items, after => {
    items.value = after
    selected.value = props.items.find(opt => opt[props.item_id_field] === model.value) ?? null
    onChange()
});

/** Update Selected value on Model Change Externally */
const model = defineModel()
watch(model, () => {
    selected.value = props.items.find(opt => opt[props.item_id_field] === model.value) ?? null
    onChange()
})
onMounted(() => {
    selected.value = props.items.find(opt => opt[props.item_id_field] === model.value) ?? null
    onChange()
})
const emit = defineEmits(['update:modelValue', 'valid']);
/** Essentially this is the selected value */
const modelProxy = computed({
    get() {
        return selected.value
    },
    set(newSelected) {
        emit('update:modelValue', newSelected[props.item_id_field])
        selected.value = newSelected

    }
});



const { activeSearch, toogleSorter, toogleFilter, activeSorters, activeFilters, finalData } = useSifter(items, props.searcher, props.sorters, props.filterers)

watch(() => finalData, () => console.log('finalData changed', finalData))
watch(() => props.refreshValidTrigger, () => onChange())

function onChange() {
    if (props?.required === true && selected.value === null) {
        emit("valid", "No selection made.")
    } else {
        emit("valid", true)
    }
}

function itemClick(item) {
    if (!props.selectPredicate || props.selectPredicate?.(item)) {
        modelProxy.value = item
        onChange()
    } else {
        console.info("selection didnt pass the predicate")
    }
    props.onClick?.(item)
}
</script>

<template>
    <Dropdown :outsideClose="props.outsideClose" :dropdown-classes="dropdownClasses" align="left">
        <template #trigger>
            <slot name="trigger">
                <button type="button"
                    class="w-full inline-flex items-center px-3 py-2 border text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-700 dark:hover:text-gray-800 bg-cl_background-100 dark:bg-cl_background-100-dark border-cl_background-400 dark:border-cl_background-400-dark focus:outline-none transition ease-in-out duration-150">
                    {{ getPathValue(modelProxy, props.item_label_field) ?? props.placeholder }}

                    <svg class="ml-auto -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                        fill="currentColor">
                        <path fill-rule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clip-rule="evenodd" />
                    </svg>
                </button>
            </slot>
        </template>

        <template #header>
            <div
                class="sticky z-30 shadow-md rounded-md top-0 bg-cl_background-400 dark:bg-cl_background-400-dark flex w-full">
                <div v-if="props.searcher" class="p-2 grow">
                    <input type="text" v-model="activeSearch.query"
                        class="w-full p-1 border rounded border-cl_background-400 dark:border-cl_background-400-dark bg-cl_background-100 dark:bg-cl_background-100-dark"
                        placeholder="Search...">
                </div>
                <div v-if="props.filterers" class="p-2 mr-2 grow">
                    <Dropdown v-for="([key, value], index) in Object.entries(props.filterers)" :key="index"
                        dropdown-classes="h-fit max-h-64 px-2 mt-1 absolute overflow-y-auto rounded-md shadow-md ring-1 ring-black ring-opacity-10"
                        align="left">
                        <template #trigger>
                            <div
                                class="capitalize cursor-pointer inline-flex items-center px-3 py-2 border text-sm leading-4 font-medium rounded-md border-cl_background-400 dark:border-cl_background-400-dark bg-cl_background-100 dark:bg-cl_background-100-dark text-gray-500 hover:text-gray-700 dark:text-gray-700 dark:hover:text-gray-800  focus:outline-none transition ease-in-out duration-150">
                                {{ key }}
                                <svg class="ms-2 -me-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                    fill="currentColor">
                                    <path fill-rule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clip-rule="evenodd" />
                                </svg>
                            </div>
                        </template>
                        <template #content>
                            <button
                                class="text-left p-1 w-full hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
                                @click="() => toogleFilter(key, filter_name)"
                                v-for="(filter_name, index) in Object.keys(value)" :key="index">
                                {{ filter_name }}
                            </button>
                        </template>
                    </Dropdown>
                </div>
            </div>
        </template>

        <template #content>
            <div class="cursor-pointer divide-y divide-cl_background-400 dark:divide-cl_background-400-dark min-y-80">
                <div class="z-0 text-left p-1 w-full hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
                    @click="itemClick(item)" v-for="(item, index) in finalData" :key="index">
                    <component v-if="slotComponent" :is="slotComponent" v-bind="item"></component>
                    <slot v-else name="item" v-bind="item">
                        {{ item[props.item_label_field] }}
                    </slot>
                </div>

                <slot v-if="!finalData || finalData.length === 0" name="empty">
                    <div class="text-center p-1 w-full text-gray-600 text-opacity-60 font-thin">
                        No data to show
                    </div>
                </slot>
            </div>
        </template>
    </Dropdown>
</template>
