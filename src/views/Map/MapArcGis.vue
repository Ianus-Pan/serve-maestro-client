<script setup>

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useLoading } from 'vue-loading-overlay'

import { useGeneralMapStore } from '@/stores/maps/generalMap.js'
import AsideMenuLeaflet from '@/components/AsideMenuLeaflet.vue';
import { useSrvCaseStore } from '@/stores/srvCase'
import { useSrvThreatStore } from '@/stores/srvThreat';

const arcGisMap = useGeneralMapStore()
const srvCaseStore = useSrvCaseStore()
const srvThreatStore = useSrvThreatStore()
const loadOverlay = useLoading({});

onMounted(() => {
    const mapOptions = {
        container: document.getElementById('map'),
        center: [23.732821, 37.971115],
        zoom: 12,
        pitch: 0,
        bearing: 0,
    }
    arcGisMap.initializeMap(mapOptions)
})
onUnmounted(() => {
    arcGisMap.uninitializeMap()
})

/**
* @param {{address:string,lat:float,lng:float}} latlng
*/
function handleCoordsSelected(geometry) {
    const vp = geometry.viewport
    if (vp) {
        const ne = vp.getNorthEast()
        const sw = vp.getSouthWest()
        const bounds = [
            { lat: (sw.lat()), lng: (sw.lng()) },
            { lat: (ne.lat()), lng: (ne.lng()) },
        ]

        // map.centerToBounds(bounds)
    } else {
        const loc = geometry.loc

        // map.centerToCoordinates({ lat: (loc.lat()), lng: (loc.lng()) })
    }
}

const $loader = ref(null)
const loadRef = ref(null)
function centerToCase() {
    // map.goToLastElement()
}
watch(() => [
    srvCaseStore.loading.case,
    srvThreatStore.loading,
    // map.loading,
], () => {
    setLoading(
        srvCaseStore.loading.case ||
        srvThreatStore.loading
        // || map.loading
    )
}, {deep: true})
function setLoading( ld = false ) {
    if(ld && !$loader.value) {
        $loader.value = loadOverlay.show({
            container: loadRef.value
        })
    } else if( !ld && $loader.value ) {
        setTimeout(() => $loader.value.hide(), 300)
    }
}

const showMenu = false
// computed(() => {
//     if (map.stateMachine.current === 'EDIT' || map.stateMachine.current === 'INSERT') {
//         return ""
//     }
//     else {
//         return "translate-x-full"
//     }
// })

</script>

<template>
    <div class="inline-flex w-full h-full">
        <div ref="loadRef" id="map" class="z-0 w-full flex-1 h-full mb-4 relative"/>
        
        <div class="absolute bottom-4 left-0 transform translate-x-1/2 z-[1000]">
            <button @click="centerToCase" v-tooltip="'Move to Case'" class="p-2 rounded-md bg-gray-50 hover:bg-gray-200">
                <div class="flex items-center justify-center w-5 h-5 border-red-600 border rounded-full">
                    <div class="w-2 h-2 bg-red-600 rounded-full"></div>
                </div>
            </button>
        </div>

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
        </div>

        <!-- <AsideMenuLeaflet :class="showMenu"
            class="absolute top-0 right-0 translate-x-0 transition-transform duration-500 ease-in-out drop-shadow-xl w-64 h-full px-2" /> -->

    </div>
</template>