<script setup>

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useLoading } from 'vue-loading-overlay'

import AsideMenuLibre from '@/components/AsideMenuLibre.vue';
import PlaceSearch from '@/components/PlaceSearch.vue'
import Notifications from '@/components/Notifications.vue';
import VDivider from '@/components/VDivider.vue';

/** Stores */
import { useSrvCaseStore } from '@/stores/srvCase'
import { useSrvThreatStore } from '@/stores/srvThreat';
import { useLibreMapStore } from '@/stores/libreMap.js';

const libreMapStore = useLibreMapStore()
const srvCaseStore = useSrvCaseStore()
const srvThreatStore = useSrvThreatStore()
const loadOverlay = useLoading({});

onMounted(() => {
    libreMapStore.initializeMap(
        'map',
        undefined,
        [33.63180716883091, 34.91878776341241],
    )
})

onUnmounted(() => {
    libreMapStore.uninitializeMap()
})

const $loader = ref(null)
const loadRef = ref(null)
watch(() => [
    srvCaseStore.loading.case,
    srvCaseStore.loading.elements,
    srvThreatStore.loading,
], () => {
    setLoading(
        srvCaseStore.loading.case ||
        srvCaseStore.loading.elements ||
        srvThreatStore.loading
    )
})
watch(() => srvCaseStore.loading.case, () => {
    if( srvCaseStore.loading.case )
        libreMapStore.resetLastBounds()
})
function setLoading( ld = false ) {
    if(ld && !$loader.value) {
        $loader.value = loadOverlay.show({
            container: loadRef.value
        })
    } else if( !ld && $loader.value ) {
        setTimeout(() => {
            $loader.value.hide()
            $loader.value = null
        }, 300)
    }
}

// const showMenu = computed(() => {
//     if (map.stateMachine.current === 'EDIT' || map.stateMachine.current === 'INSERT') {
//         return ""
//     }
//     else {
//         return "translate-x-full"
//     }
// })

const showMenu = computed(() => {
    if (libreMapStore.currentEditArea.feature) {
        return ""
    }
    else {
        return "translate-x-full"
    }
})

function centerToCase() {
    libreMapStore.goToElement()
}

</script>

<template>
    <div class="inline-flex w-full h-full">
        <div ref="loadRef" id="map" class="z-0 w-full flex-1 h-full mb-4 relative">
        </div>
        <!-- <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]"> -->
        <!--     <AutocompleteSearch @addressSelected="handleAddressSelected" /> -->
        <!-- </div> -->
        <!-- <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
            <PlaceSearch @geometry="handleCoordsSelected" />
        </div> -->
        <div class="absolute bottom-4 left-0 transform translate-x-1/2 z-[1000]">
            <button @click="centerToCase" v-tooltip="'Move to Case'" class="p-2 rounded-md bg-gray-50 hover:bg-gray-200">
                <div class="flex items-center justify-center w-5 h-5 border-red-600 border rounded-full">
                    <div class="w-2 h-2 bg-red-600 rounded-full"></div>
                </div>
            </button>
        </div>
<!-- 
        <div class="flex flex-col justify-center items-center absolute inset-0 px-4 py-6 sm:px-0 z-[2000] bg-gray-100/50 backdrop-blur-[2px]"
            v-if="!srvCaseStore.selectedSrvCase">
            <div v-if="srvCaseStore.availableSrvCases.length !== 0" class="bg-gray-600 text-gray-100 p-4 rounded">
                <header class="text-xl font-medium">Please choose a case first</header>
                <p class="italic">Navigate to the TopBar and go to <span class="not-italic font-bold">Cases >
                        Case</span>
                    and select a case.</p>
            </div>
            <div v-else class="bg-gray-600 text-gray-100 p-4 rounded">
                <header class="text-xl font-medium">Please create a case first</header>
                <p class="italic">Navigate to the Case panel and create atleast one <span
                        class="not-italic font-bold">Case</span> </p>
            </div>
        </div> -->

        <AsideMenuLibre :class="showMenu"
            class="absolute top-0 right-0 translate-x-0 transition-transform duration-500 ease-in-out drop-shadow-xl w-64 h-full px-2" />

    </div>

    <Notifications windowClass="z-[10000]" target="#map" v-model="srvCaseStore.notifications">
        <template #notification="{ img, title, message }">
            <div class="justify-start flex-shrink items-center flex bg-gray-100 rounded ring-2 ring-[#bdb9b5] ">
                <div class="p-4">
                    <img class="h-5 w-5" v-if="img" :src="img" alt="">
                </div>
                <VDivider size="3rem" />
                <div class="pl-3 flex flex-col p-4 bg-gray-50">
                    <div class="text-lg">{{ title }}</div>
                    <div class="text-sm text-gray-600">{{ message }}</div>
                </div>

            </div>

        </template>
    </Notifications>
</template>

<style>
.beacon::before {
    background: #fff;
    border-radius: 50%;
    border: 50px solid #222;
    width: 20px;
    height: 20px;
    animation: load 1.5s ease-out infinite;
}

@keyframes beacon {
    0% {
        background: #fff;
        border: 0px solid #fff;
    }

    50% {
        background: #fff;
        border: 100px solid #222;
    }

    100% {
        background: #fff;
        border: 0px solid #222;
    }
}

.ripple {
    position: relative;
    overflow: hidden;
}

.ripple::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    background: rgba(0, 150, 255, 0.4);
    /* Adjust color and transparency */
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: ripple-animation 1.5s ease-out infinite;
    pointer-events: none;
}

@keyframes ripple-animation {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 1;
    }

    100% {
        transform: translate(-50%, -50%) scale(10);
        /* Scale factor determines size of the ripple */
        opacity: 0;
    }
}

.temp-shape {
    /* stroke-dasharray: "2,1"; */
    animation: dash 60s infinite linear;
}

@keyframes dash {
    to {
        stroke-dashoffset: 100%;
    }
}

div.leaflet-control-layers.leaflet-control section.leaflet-control-layers-list div.leaflet-control-layers-base label span {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.leaflet-marker-pane > img.leaflet-marker-icon {
  -webkit-transition: transform .1s linear;
  -moz-transition: transform .1s linear;
  -o-transition: transform .1s linear;
  -ms-transition: transform .1s linear;
  transition: transform .1s linear;
}
</style>
