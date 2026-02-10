import { defineStore } from 'pinia'
import { ref, toRaw, watch } from 'vue'
import laravelServer from '@/api/laravelServer.js'
import { useSrvAssessmentStore } from './srvAssessment.js';
import { useClientSettings } from './clientSettings.js';
import useNotifications from '@/composables/notifications.js';
import { useSrvInsertCategoryStore } from './srvInsertCategory.js';

export const useSrvCaseStore = defineStore('srvCase', () => {
    const loading = ref({case: false, elements: false})

    const clientSettings = useClientSettings()
    const srvAssessmentStore = useSrvAssessmentStore()
    const srvInsertCategoryStore = useSrvInsertCategoryStore()
    const notifications = useNotifications({ timeout: 5000 })

    const selectedSrvCase = ref(null)
    const selectedSrvCaseElements = ref([])

    const availableSrvCases = ref([])

    function notify(payload) {
        notifications.addNotification(payload)
    }

    /** 
     * ~~~~~~~~~~
     * Case Logic
     * ~~~~~~~~~~
     */

    /**
     * Attempt to select a Case ID:
     * If ID exists in Cases, Save ID,
     * Else if first Case has ID, Save that ID
     * Else PID = 0
     * @param {String|number} id The selected Case ID
     * @returns {any} The selected Case Data
     */
    function setSelectedSrvCase(id) {
        const existing_case = availableSrvCases.value.find(p => p._id === id);

        if (existing_case) {
            const case_id = existing_case._id

            /** Set Currently Selected CaseID */
            selectedSrvCase.value = case_id
            /** Save Selected CaseID for page refresh */
            clientSettings.data['selected_case'] = case_id

            /** Set CaseID as only case to compare in Assessment Page */
            srvAssessmentStore.to_compare.cases = [selectedSrvCase.value]
        } else clientSettings.data['selected_case'] = null
    }

    function getSrvCase(cID = null) {
        if( !cID && !selectedSrvCase.value ) return null
        if( availableSrvCases.value.length === 0 ) return null

        return availableSrvCases.value.find(cs => cs._id === (cID ?? selectedSrvCase.value)) ?? null
    }

    /**
     * Attempt to get the Cases from the server
     * After the GET Request succeeds, also attempts to set
     * the selected
     * @returns this.cases
     */
    async function promiseFetchSrvCases() {
        console.log('Promise Fetch Cases')
        loading.value.case = true


        return new Promise(resolve => {
            laravelServer.CASE.GET.single().then(res => {
                availableSrvCases.value = res

                let currentCID = clientSettings.data['selected_case']
                if (currentCID) setSelectedSrvCase(currentCID)
                if (currentCID) {
                    loading.value.elements = true
                    promiseFetchSrvCaseElement()
                }

                resolve(availableSrvCases.value)
                    
                // console.log('Cases Result: ', srvCases.value)
            })
            .catch(err => {
                availableSrvCases.value = [];
                resolve(availableSrvCases.value)
                    
                console.log('Cases Error: ', err)
            })
            .finally(() => loading.value.case = false)
        })
    }

    async function promiseFetchSrvCaseElement() {
        loading.value.elements = true
        selectedSrvCaseElements.value.length = 0

        laravelServer.CASE_ELEMENT.GET.elements_of_case(selectedSrvCase.value)
            .then((value) => {
                let features = []
                for (const element of value) {
                    const feature = {
                        _id: element._id,
                        type: "Feature",
                        geometry: element.geometry,
                        properties: {
                            ...element.properties,
                            _id: element._id,
                            id: element.id ?? null,
                        }
                    };
                    features.push(feature);
                };
                selectedSrvCaseElements.value = features
            })
            .catch((err) => console.error('Fetch Element by Case', err))
            .finally(() => loading.value.elements = false)
    }


    /**
     * ~~~~~~~~~~~~~
     * Element Logic
     * ~~~~~~~~~~~~~
     */
    
    function elementPOST(element) {
        loading.value.elements = true
        let payload = toRaw(element)

        const action = payload._id ? "Editing" : "Inserting"
        // NOTE: in the future i want to streamline this better , but to avoid a lot of duplicating code from leaflet and
        // bugs from failing to do so , i just get the geojson and just get the coords.
        // see leaflet/src/layer/GeoJSON.js - *.toGeoJSON
        const geojson = element.layer.toGeoJSON()
        const geometry = {
            ...payload.geometry,
            coordinates: geojson.geometry.coordinates
        }
        payload = {
            type: "Feature",
            _id: payload._id,
            geometry,
            properties: payload.properties
        }

        element.layer.pm.disable()
        if( !payload.properties.element.active )
            element.layer.remove()

        laravelServer.CASE_ELEMENT.POST.single(payload)
            .catch((error) => {
                notify({ img: "/icons/failure.svg", title: action, message: `${action} of the element was unsuccessful.` })
            }).finally(() => {
                loading.value.elements = false
            })
    }
    /** POST Element Delete */
    function elementDELETE(id) {
        if (!id) {
            console.error("No Element ID provided")
            return
        }
        loading.value.elements = true

        laravelServer.CASE_ELEMENT.DELETE.single(id)
            .catch((error) => {
                notify({ img: "/icons/failure.svg", title: 'Delete', message: `Deletion of the element was unsuccessful.` })
            })
            .finally(() => {
                loading.value.elements = false
            })
    }

    /** JSON File Handlers */
    /**
     * Imports GeoJSON data to the map, adding layers based on the GeoJSON features.
     * Circle is handled by a special case
     * @param { Object | File } geoJson - The GeoJSON object to import.
     */
    function importGeoJson(geoJson, forceSave = false) {
        loading.value.elements = true

        let geo = null
        if (geoJson instanceof File) {
            const reader = new FileReader();
            reader.readAsText(geoJson, 'UTF-8');
            reader.onload = (e) => {
                try {
                    // @ts-ignore
                    geo = JSON.parse(e.target.result);
                } catch (error) {
                    console.error('Error parsing GeoJSON file:', error);
                }
            };
        } else geo = geoJson

        /** Post the Element(s) or add to cached element list */
        if( forceSave ) {
            geo.forEach(el => elementPOST(el));
        } else {
            geo.forEach(el => {
                let found_index = 0
                selectedSrvCaseElements.value.forEach( (cEL, i) => {
                    if( cEL._id === el._id ) found_index = i + 1
                })
                if( found_index ) selectedSrvCaseElements.value[found_index - 1] = el
                else selectedSrvCaseElements.value.push( el )
            });
        }

        loading.value.elements = false
    }

    /**
     * Exports the current layers of the map to a GeoJSON object.
     * Circle is handled by a special case
     * @returns {Object} The GeoJSON object representing the layers on the map.
     */
    function exportGeoJson() {
        const features = [];
        // PERF: maybe in the future use FeatureGroups of LayerGroups
        // to seperate neatly the layers and access them faster
        // ex. insertedGroup, importedGroup , etc
        return 

        let elements = ref([]) // Temp to avoid TS Error
        for (const element of elements.value.values()) {

            const geojson = element.layer.toGeoJSON()
            const geometry = {
                ...element.geometry,
                coordinates: geojson.geometry.coordinates
            }
            const feature = {
                type: "Feature",
                geometry,
                properties: element.properties
            };
            features.push(feature);

        };

        const featureCollection = { type: "FeatureCollection", features: features }
        console.log(featureCollection)
        return featureCollection;
    }


    /** 
     * ~~~~~~~~~~~~~~~
     * Socket Handlers
     * ~~~~~~~~~~~~~~~
     */

    function socketAddCase(case_data) {
        availableSrvCases.value = availableSrvCases.value.concat([case_data])
    }

    function socketEditCase(case_data) {
        var c_id = availableSrvCases.value.findIndex(c => c._id == case_data._id);
        availableSrvCases.value[c_id] = case_data;
    }


    /**
     * ~~~~~~~~
     * Watchers
     * ~~~~~~~~
     */

    watch(() => selectedSrvCase.value, () => {
        notify({ img: "/icons/case_dark.svg", title: "Case Changed", message: "Loading new case map visualisation" })
        
        srvInsertCategoryStore.setSrvCaseID(selectedSrvCase.value)
        
        /** Dont overlap with first page load which also gets Elements */
        if(!loading.value.elements) promiseFetchSrvCaseElement()
    });

    return {
        loading,
        
        notifications: notifications.notifications,
        notify: notifications.addNotification,

        /** Cases */
        promiseFetchSrvCases,
        availableSrvCases,
        selectedSrvCase,
        setSelectedSrvCase,
        getSrvCase,

        selectedSrvCaseElements,
        /** Server ADD/EDIT/REMOVE Element */
        elementPOST,
        elementDELETE,

        /** Local Import/Export GeoJSON */
        importGeoJson,
        exportGeoJson,

        /** Socket Handlers */
        socketAddCase,
        socketEditCase,
    }
})
