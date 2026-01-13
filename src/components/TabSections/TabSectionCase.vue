''<script setup>
import { computed } from 'vue'
import { useSrvCaseStore } from '@/stores/srvCase'
import VDivider from '@/components/VDivider.vue';
import HDivider from '@/components/HDivider.vue';
import SelectionList from '@/components/SelectionList.vue';
import TabSection from '../TabSection.vue';
import { leafletMap } from '@/stores/leafletMap'
import { useRoute } from 'vue-router';

const route = useRoute();
const srvCaseStore = useSrvCaseStore()
const ROOT_URL = import.meta.env.VITE_MAESTRO_LARAVEL;
const map = leafletMap()

const typesCount = computed(() => {
    const typeCounts = {};
    for (const map_element of map.elements.values()) {
        if (map_element.properties.element.active === false) continue
        const type = map_element.properties.element.category
        if (type in typeCounts) {
            typeCounts[type]++;
        } else {
            typeCounts[type] = 1;
        }
    }
    return typeCounts;
})

const activeMapElements = computed(() => {
    return Array.from(map.elements.values())
        .filter(el => el.properties.element.active === true)
})

/** Search */
const caseSearcher = { field: "title", query: "" }
const caseFilters = {
    Activity: {
        Active: (item) => item.active,
        Inactive: (item) => !item.active,
        All: () => true,
    }
}

const elementSearcher = { field: "properties.element.name", query: "" }
const elementFilters = {
    category: {
        All: () => true,
        Obstacles: (item) => item.properties.element.category === "OBS",
        Safeguards: (item) => item.properties.element.category === "SFG",
        Areas: (item) => item.properties.element.category === "AREA",
    }
}

/** Callbacks */
function onCaseChange(selected_case) {
    srvCaseStore.setSelectedSrvCase(selected_case._id)
}
function onMapElementSelected(selected_element) {
    if (["map"].includes(route.name?.toString()))
        map.centerToLayerBounds(selected_element.layer)
}

function onMapElementEdit(selected_element) {
    if (["map"].includes(route.name?.toString()))
        map.centerToLayerBounds(selected_element.layer)
        map.stateMachine.transition('EDIT', selected_element.layer)
}

/** UI */
const pingClass = computed(() => {
    return !srvCaseStore.selectedSrvCase ? "pulse-outline" : ""
});
</script>

<template>
    <div class="flex flex-grow h-full gap-3 flex-1">
        <TabSection label="Case">
            <SelectionList :class="pingClass" :items="srvCaseStore.availableSrvCases" :onClick="onCaseChange"
                :searcher="caseSearcher" :filterers="caseFilters" item_id_field="_id" item_label_field="title"
                v-model="srvCaseStore.selectedSrvCase"
                dropdown-classes="w-80 h-fit max-h-80 mt-1 absolute overflow-y-auto rounded-md">
                <template #item="{ title, version, description, active }">
                    <div class="p-2 bg-cl_background-100 dark:bg-cl_background-100-dark rounded-sm">
                        
                        <div class="flex justify-between align-top">
                            <span class="">{{ title }}</span>

                            <div class="flex h-6 items-center p-1 rounded-md">
                                <div class="ring ring-cl_background-300 dark:ring-cl_background-300-dark h-2 w-2 rounded-full"
                                    :class="[!active ? 'bg-red-700' : 'bg-green-400']">
                                </div>
                            </div>
                        </div>

                        <div v-if="description" class="bg-cl_background-300 dark:bg-cl_background-300-dark p-2 rounded-md text-xs max-h-10 overflow-hidden text-nowrap text-ellipsis">
                            {{ description }}
                        </div>
                    </div>
                </template>
            </SelectionList>
        </TabSection>

        <VDivider size="80%" class="self-center" />

        <TabSection class="" label="Elements">
            <SelectionList :items="activeMapElements" :onClick="onMapElementSelected" :searcher="elementSearcher"
                :filterers="elementFilters" item_id_field="_id" item_label_field="properties.element.name"
                dropdown-classes="w-[50vw] max-w-[50vw] h-fit max-h-80 mt-1 absolute overflow-y-auto rounded-md">
                <template #trigger>
                    <div
                        class="select-none flex gap-1 cursor-pointer justify-center items-center rounded border-[1px] border-cl_background-400 dark:border-cl_background-400-dark bg-cl_background-100 dark:bg-cl_background-100-dark">
                        <div class="flex flex-grow gap-4 p-2">
                            <div class="min-w-5 flex flex-col justify-center items-center">
                                <div class="flex gap-2 ">
                                    <div class="text-lg">{{ typesCount.OBS ?? 0 }}</div>
                                    <!-- <img class="w-5 h-5 opacity-70" src="/icons/physical_barriers/fountain.svg" -->
                                    <!--     alt="Obstacles"> -->
                                </div>
                                <HDivider />
                                <span class="text-xs text-gray-800">Obstacles</span>
                            </div>
                            <VDivider size="1rem" class="self-center bg-gray-300/80" />
                            <div class="min-w-5  flex flex-col justify-center items-center">
                                <div class="flex gap-2 ">
                                    <div class="text-lg">{{ typesCount.SFG ?? 0 }}</div>
                                    <!-- <img class="w-5 h-5 opacity-70" src="/icons/physical_security/sensor_cctv.svg" -->
                                    <!--     alt="Securities"> -->
                                </div>
                                <HDivider />
                                <span class="text-xs text-gray-800">Securities</span>
                            </div>
                            <VDivider size="1rem" class="self-center bg-gray-300/80" />
                            <div class="min-w-5  flex flex-col justify-center items-center">
                                <div class="flex gap-2 ">
                                    <div class="text-lg">{{ typesCount.AREA ?? 0 }}</div>
                                    <!-- <img class="w-5 h-5 opacity-70" src="/icons/areas/area_closed.svg" alt="Areas"> -->
                                </div>
                                <HDivider />
                                <span class="text-xs text-gray-800">Areas</span>
                            </div>
                        </div>
                        <button type="button"
                            class="pr-1 inline-flex items-center border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500  hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                            <svg class="ml-auto -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </template>
                <template #item="element">
                    <div class="grid grid-cols-6 gap-4">
                        <div class="col-span-4">
                            <div>{{ element.properties.element.name }}</div>
                            <div class="text-sm text-gray-500"> {{ element.properties.element.description }} </div>
                        </div>
                        <div class="flex justify-start items-center gap-3">
                            <img class="w-8 h-8" :src="ROOT_URL + element.properties.style.icon" alt="">
                            <div v-if="element.properties.element.category === 'AREA'"
                                class="ring ring-cl_background-300 dark:ring-cl_background-300-dark h-2 w-2 rounded-full"
                                :style="'background-color: ' + element.properties.style?.fillColor?.hex8">
                            </div>
                        </div>
                        <div @click.stop="()=>onMapElementEdit(element)"
                            class="flex hover:scale-[1.1] justify-start items-center hover:opacity-100 opacity-70 transition">
                            <img class="h-4 w-4 saturate-0 brightness-50" src="/icons/edit.svg" />
                        </div>
                    </div>
                </template>
            </SelectionList>
        </TabSection>
    </div>
</template>

<style>
.pulse-outline {
    --outline-width: 1px;
    --outline-offset: 0px;
    --outline-color: rgba(0, 130, 206, 0.75);
    --animation-duration: 4s;
    --animation-ease: ease;
    --animation-iteration-count: infinite;
    --border-radius: 6px;

    outline-width: var(--outline-width);
    outline-offset: var(--outline-offset);
    outline-color: var(--outline-color);
    outline-style: solid;
    border-radius: var(--border-radius);
    animation: animateOutline var(--animation-duration) var(--animation-ease) var(--animation-iteration-count);
}

@keyframes animateOutline {
    0% {
        outline-width: var(--outline-width);
        outline-offset: var(--outline-offset);
        outline-color: rgba(0, 130, 206, 0);
    }

    25% {
        outline-color: var(--outline-color);
    }

    /* 50% { */
    /*   outline-width: calc(var(--outline-width) * 7); */
    /*   outline-offset: calc(var(--outline-offset) + 4px); */
    /*   outline-color: rgba(0, 130, 206, 0); */
    /* } */

    100% {
        outline-width: calc(var(--outline-width) * 4);
        outline-offset: calc(var(--outline-offset) + 4px);
        outline-color: rgba(102, 102, 102, 0);
    }
}
</style>
