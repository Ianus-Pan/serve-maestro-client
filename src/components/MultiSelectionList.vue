<script setup>
import Dropdown from '@/components/Dropdown.vue';
import useSifter from '@/composables/sifter.js'
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
    required: Boolean,
    placeholder: { type: String, default: "Select any from here..." },
    /** @type { Array<Object> } an array of objects to select from  */
    items: { type: Array },
    refreshValidTrigger: { type: Number },

    onClick: { type: Function },
    searcher: { type: Object },
    sorters: { type: Object },
    filterers: { type: Object },

    /** @type { string } The prop that will be shown from the item ex. `item[label_field]`   */
    item_label_field: { type: String, required: true },
    item_description_field: { type: String },
    item_id_field: { type: String, required: true },

    outsideClose: { type: Boolean, default: true },
    headerClasses: { type: String },
    dropdownClasses: { type: String },
    dropdownAlign: { type: String, default: 'left' }

});

const selected = ref(new Set)
const searchQuery = ref('')
const filterQuery = ref(null)

onMounted(() => {
    selected.value = new Set(finalData.value.filter(item => model.value?.includes(item[props.item_id_field])))
    onChange()
})

/** Update Selected value on Model Change Externally */
const model = defineModel()

const emit = defineEmits(['update:modelValue', 'valid']);

const items = ref(props.items)

/** Handle Model Updates here */
watch(() => [props.items, model], ([itmAfter, mdlAfter]) => {
    items.value = props.items
    
    /** Remove Selections if new Items don't include already Selected Items */
    let item_ids = finalData.value.map(sl => sl[props.item_id_field])
    let sel_ids = Array.from(selected.value).map(sl => sl[props.item_id_field])
    sel_ids.forEach(sel_id => {
        if( !item_ids.includes(sel_id) ) {
            let item = Array.from(selected.value).find(itm => itm._id === sel_id)
            selected.value.delete(item)
        }
    })

    /** Add Selections if MODEL updated after Items */
    mdlAfter.value.forEach(to_sel_id => {
        if( item_ids.includes(to_sel_id) ) {
            let item = Array.from(selected.value).find(itm => itm._id === to_sel_id)
            if( !item ) {
                selected.value.add(
                    finalData.value.find(itm => itm[props.item_id_field] === to_sel_id)
                )
            }
        }
    })

    onChange()
});
watch(() => props.refreshValidTrigger, () => onChange())

function onChange() {
    if (props?.required === true && selected.value.size === 0 ) {
        emit("valid", "No selection made.")
    } else {
        emit("valid", true)
    }
}

const { activeSearch, toogleSorter, toogleFilter, activeSorters, activeFilters, finalData } = useSifter(items, props.searcher, props.sorters, props.filterers)

const unselectedData = computed(() => {
    return finalData.value.filter((item) => !selected.value.has(item))
});
function removeSelection(e, item) {
    e.stopPropagation()
    selected.value.delete(item)
    emit('update:modelValue', Array.from(selected.value).map(sl => sl[props.item_id_field]))
    onChange()
    // props.onClick(Array.from(selected.value).map(sl => sl[props.item_id_field]))
}
function addSelection(e, item) {
    e.stopPropagation()
    selected.value.add(item)
    emit('update:modelValue', Array.from(selected.value).map(sl => sl[props.item_id_field]))
    onChange()
    // props.onClick(Array.from(selected.value).map(sl => sl[props.item_id_field]))
}
</script>

<template>
    <div>
        <Dropdown :outsideClose="props.outsideClose" :dropdown-classes="dropdownClasses" :align="dropdownAlign">
            <template #trigger>
                <!-- <div class="flex flex-wrap overflow-y-auto"> -->
                <!-- </div> -->
                 <div class=" relative cursor-pointer flex items-center rounded-md text-gray-500 hover:text-gray-700 bg-cl_background-100 dark:bg-cl_background-100-dark ">
                    <div
                        class="min-h-9 flex items-center rounded-md border border-cl_background-400 dark:border-cl_background-400-dark duration-150 ease-in-out focus:outline-none font-medium leading-4 pl-3 pr-5 py-1 text-sm transition w-full overflow-y-auto"
                        :class="headerClasses">
                        <div v-if="selected.size === 0">
                            {{ placeholder }}
                        </div>
                        <div v-else class="flex gap-2 flex-wrap">
                            <button v-for="( item, index ) of selected" :key="index"
                                class="text-cl_accent-800 bg-cl_background-400 dark:bg-cl_background-400-dark rounded hover:scale-90 hover:bg-red-300 dark:hover:bg-red-400 transition-all hover:opacity-70 p-1"
                                @click.prevent="(e) => removeSelection(e, item)">
                                {{ item[item_label_field] }}
                                <div class="text-xs max-w-[16rem] overflow-hidden text-nowrap text-ellipsis">
                                    {{ item[item_description_field] }}
                                </div>
                            </button>
                        </div>
                    </div>

                    <svg class="h-4 w-4 absolute right-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                        fill="currentColor">
                        <path fill-rule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clip-rule="evenodd" />
                    </svg>
                 </div>
            </template>

            <template #header>
                <div class="sticky shadow-md rounded-md top-0 bg-white flex w-full">
                    <div v-if="props.searchers" class="p-2">
                        <input type="text" v-model="searchQuery" class="w-full p-1 border rounded"
                            placeholder="Search...">
                    </div>
                    <div v-if="props.filterers" class="p-2">
                        <Dropdown
                            dropdown-classes="h-fit max-h-20 mt-1 absolute rounded-md bg-white shadow-md ring-1 ring-black ring-opacity-10"
                            align="left">
                            <template #trigger>
                                <div
                                    class="bg-gray-50 cursor-pointer inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                    Filter
                                    <svg class="ms-2 -me-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd"
                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                            clip-rule="evenodd" />
                                    </svg>
                                </div>
                            </template>
                            <template #header>
                                <div class="text-center bg-gray-200 border-b-2 border-b-black">
                                    {{ item_filter_field }}
                                </div>
                            </template>
                            <template #content>
                                <div class="divide-y divide-gray-300">
                                    <button class="text-left p-1 w-full hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
                                        @click.prevent="filterQuery = option" v-for="(option, index) in filterOptions"
                                        :key="index">
                                        {{ option }}
                                    </button>
                                </div>
                            </template>
                        </Dropdown>
                    </div>
                </div>
            </template>

            <template #content>
                <div class="divide-y divide-cl_background-400 dark:divide-cl_background-400-dark">
                    <button class="min-w-80 w-full text-left p-1 hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
                        v-for="(item, index) in unselectedData"
                        :key="index" @click.prevent="(e) => addSelection(e, item)">
                        <slot name="item" v-bind="item">
                            <div class="flex flex-col justify-between">
                                <span>
                                    {{ item[props.item_label_field] }}
                                </span>
                                <div class="text-xs max-w-[32rem] overflow-hidden text-nowrap text-ellipsis">
                                    {{ item[item_description_field] }}
                                </div>
                            </div>
                        </slot>
                    </button>

                    <slot v-if="unselectedData.length === 0" name="empty">
                        <span class="text-center p-1 w-full text-gray-600 text-opacity-60 font-thin">
                            No data to show
                        </span>
                    </slot>
                </div>
            </template>
        </Dropdown>
    </div>
</template>
