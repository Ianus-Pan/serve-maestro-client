// stores/maps/generalMapStore.ts
// stolen from [SVA] but hardcoded arcGIS for specific usecase
import { defineStore } from 'pinia'
import { nextTick, ref, watch } from 'vue'

import { ArcGISProvider } from '@/providers/arcGISProvider'
import { useSrvCaseStore } from '../srvCase.js'

export const useGeneralMapStore = defineStore('generalMapStore', () => {
    const srvCaseStore = useSrvCaseStore()

    const initialized = ref(false)
    const loading = ref(false)
    const provider = ref(null)

    async function initializeMap(opts) {
        try {
            if (initialized.value) {
                uninitializeMap()
                await nextTick()
            }

            provider.value = new ArcGISProvider()
            await provider.value.initialize(opts)

            initialized.value = true
        } catch (err) {
            console.error(err)
        }
    }

    function uninitializeMap() {
        if (!provider.value) return

        provider.value?.destroy()
        provider.value = null
        initialized.value = false
    }

    // -------------------- Unified API --------------------
    // [number, number]
    function setCenter(lngLat) {
        provider.value?.setCenter(lngLat)
    }
    function getCenter(){
        return provider.value?.getCenter()
    }
    // number
    function setZoom(zoom) {
        provider.value?.setZoom(zoom)
    }
    // [number, number]
    function panTo(lngLat) {
        provider.value?.panTo(lngLat)
    }
    // callback = (lngLat: [number, number]) => void
    function onClick(callback) {
        provider.value?.onClick(callback)
    }

    // UnifiedMarker
    function addMarker(marker) {
        return provider.value?.addMarker(marker)
    }
    function removeMarker(id) {
        provider.value?.removeMarker(id)
    }
    // layerIds: string[], visible: boolean
    function toggleLayers(layerIds, visible) {
        provider.value?.toggleLayers(layerIds, visible)
    }

    // -------------------- Drag & Drop Handlers -----------
    function handleDrop(e) {}

    // -------------------- Drawing API --------------------
    // DrawShapeType
    function startDrawing(shape) {
        provider.value?.startDrawing(shape)
    }
    function stopDrawing() {
        provider.value?.stopDrawing()
    }
    function getDrawnShapes() {
        return provider.value?.getDrawnShapes()
    }
    function removeShape(id) {
        provider.value?.removeShape(id)
    }

    function toLngLatArray(input) {
        return provider.value?.toLngLatArray(input)
    }
    

    // -------------------- Reactivity ----------------------
    watch(
        () => [
            srvCaseStore.selectedSrvCase,   // On Case Change
            srvCaseStore.loading.case,      // If not LOADING Cases
            srvCaseStore.loading.elements   // & not LOADING Elements
        ],
        async () => {
            if (srvCaseStore.loading.case || srvCaseStore.loading.elements)
                return loading.value = true

            wipeFeatures()

            console.log('GENERAL MAP:: localInsertFeatures: ', srvCaseStore.selectedSrvCaseElements.length)
            loading.value = !await importFeatures(srvCaseStore.selectedSrvCaseElements)
        }
    )

    // --------------- Add / Remove Elements ----------------
    async function importFeatures(featureList) {
        return await provider.value?.importFeatures?.(featureList)
    }
    async function wipeFeatures() {
        return await provider.value?.wipeElements?.()
    }

    return {
        initialized,
        loading,
        provider,

        // Create / Destroy API
        initializeMap,
        uninitializeMap,

        // Map Action API
        setCenter,
        getCenter,
        setZoom,
        panTo,
        onClick,
        toggleLayers,

        // Marker API
        addMarker,
        removeMarker,

        // Drag & Drop API
        handleDrop,

        // Drawing API
        startDrawing,
        stopDrawing,
        getDrawnShapes,
        removeShape,

        // Helpers
        toLngLatArray,
    }
})

// INTERFACE STRUCTURES

// interface GeneralMapOptions {
//     /** Map Provider */
//     mapProvider: MapLibrary
//     /** Container element or its ID where the map will be rendered */
//     container: string | HTMLElement
//     /** Map center as [latitude, longitude] */
//     center?: [number, number]
//     /** Initial zoom level */
//     zoom?: number
//     /** Tilt / pitch of the map in degrees (Google / MapLibre) */
//     pitch?: number
//     /** Rotation / bearing of the map in degrees (MapLibre / ArcGIS) */
//     bearing?: number
//     /** Optional rotation for libraries that support it (ArcGIS / Leaflet) */
//     rotation?: number
//     /** Optional map style identifier or URL (Leaflet, MapLibre, Google) */
//     style?: string
//     /** Optional initial map layers (GeoJSON, tile layers, etc.) */
//     layers?: any[]
//     /** Optional map controls */
//     controls?: {
//         /** Show zoom control */
//         zoom?: boolean
//         /** Show compass or rotation indicator */
//         compass?: boolean
//         /** Show scale bar */
//         scale?: boolean
//         /** Show attribution */
//         attribution?: boolean
//     }
//     /** Additional library-specific options not covered by the general properties */
//     libraryOptions?: Record<string, any>
// }

// interface UnifiedMarker {
//     id: string
//     lngLat: [number, number]
//     libraryInstance?: any
// }

// type DrawShapeType = 'marker' | 'polyline' | 'polygon' | 'rectangle' | 'circle'