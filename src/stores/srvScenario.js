import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import laravelServer from '@/api/laravelServer.js'
import { geo2leaf_geometry } from "@/classes/LeafletMapElement.js";
import { useSrvSocketStore } from './srvSocket.js';
import { leafletMap } from '@/stores/leafletMap.js';
import { useSrvCaseStore } from './srvCase.js';
import { useClientSettings } from './clientSettings.js';

export const useSrvScenariostore = defineStore('srvScenario', () => {
    const clientSettings = useClientSettings()

    const srvSocketStore = useSrvSocketStore()
    const srvleafletMap = leafletMap()
    const srvCaseStore = useSrvCaseStore()

    watch(() => srvCaseStore.selectedSrvCase, () => {
        setObservedSession(null)

        if( srvCaseStore.selectedSrvCase )
            promiseFetchScenarioSessions(srvCaseStore.selectedSrvCase)
    })

    const availableScenarios = ref([]);
    const srvSessions = ref([]);
    const observedSession = ref(null)
    const observedSessionPlayers = ref([]);
    const loading = ref(false)

    const promiseFetchAvailableScenarios = async () => {
        loading.value = true
        return new Promise(resolve => {
            laravelServer.SCENARIO.GET.available_scenarios()
            .then(res => {
                availableScenarios.value = res
                resolve(availableScenarios.value)

                // console.log('Available Scenarios Result:', availableScenarios.value)
            })
            .catch(err => {
                availableScenarios.value = [];
                resolve(availableScenarios.value)

                console.log('Available Scenarios Error: ', err)
            })
            .finally(() => loading.value = false)
        })
    }

    const promiseFetchScenarioSessions = async (case_id) => {
        loading.value = true
        return new Promise(resolve => {
            laravelServer.SCENARIO.GET.scenarios_by_case(case_id)
            .then(res => {
                srvSessions.value = res

                let observedSession = clientSettings.data['observed_session']
                if (observedSession) setObservedSession(observedSession)

                resolve(srvSessions.value)

                // console.log('Scenario Sessions Result:', srvSessions.value)
            })
            .catch(err => {
                srvSessions.value = [];
                resolve(srvSessions.value)

                console.log('Scenario Sessions Error: ', err)
            })
            .finally(() => loading.value = false)
        })
    }

    const setObservedSession = (session_id) => {
        /** Remove any Observed Players from Map */
        observedSessionPlayers.value.forEach(ses => {
            srvleafletMap._mapElementRemove(ses.srv_element._id)
        })

        /** Connect to Session Socket */
        _connectToSession(session_id)
        if( !session_id ) return

        loading.value = true
        /** Get Current Session Player Locations */
        laravelServer.SCENARIO.GET.session_players(session_id)
            .then(async player_res => {
                /** Import new Observed Players */
                observedSessionPlayers.value = player_res
                
                let element_map = observedSessionPlayers.value.map(ses => ses.srv_element)
                const features = [];
                for (const element of element_map) {
                    const feature = {
                        _id: element._id,
                        type: "Feature",
                        geometry: element.geometry,
                        properties: element.properties
                    };
                    features.push(feature);
                };

                const collection = { type: "FeatureCollection", features }
                srvleafletMap.importGeoJson(collection)
            })
            .catch(err => {
                observedSessionPlayers.value = []

                /** Error removes Observe */
                setObservedSession(null)

                console.log('Session Players Error: ', err)
            })
            .finally(() => loading.value = false)
    }
    const _connectToSession = (session_id) => {
        /** Leave any Session Channel */
        srvSocketStore.leavePublic(`SrvScenarioSession.${observedSession.value}`)

        /** Connect to new Session Channel */
        observedSession.value = session_id

        if( !session_id ) return clientSettings.data['observed_session'] = observedSession.value = null
        clientSettings.data['observed_session'] = observedSession.value

        let scenario_connection = {
            channel: `SrvScenarioSession.${observedSession.value}`,
            type: 'public',
            listeners: [
                {
                    type: 'listen',
                    event: '.player_add',
                    callback: data => {
                        _cbAdd(data)
                        console.log('[public]serve-main[listen]player_add', 'player_add:', data)
                    }
                },
                {
                    type: 'listen',
                    event: '.player_edit',
                    callback: data => {
                        const map_element = srvleafletMap.id_elements.get(data._id)
                        if (!map_element) {
                            _cbAdd(data)
                            console.log('[public]serve-main[listen]player_edit', 'player_add:', data)
                        } else {
                            // TODO: Handle this properly when user is editing objects
                            // If socket message comes while am editing what should happen?
                            _cbEdit(map_element, data)
                            console.log('[public]serve-main[listen]player_edit', 'player_edit:', data)
                        }
                    }
                },
            ]
        }
        srvSocketStore.connectPublic(scenario_connection)
    }
    const _cbAdd = (data) => {
        const feature = {
            _id: data._id,
            type: "Feature",
            geometry: data.geometry,
            properties: data.properties
        }

        // TODO: add support for single feature instead of collections
        const collection = { type: "FeatureCollection", features: [feature] }
        srvleafletMap.importGeoJson(collection)
    }
    const _cbEdit = (map_element, data) => {
        map_element.geometry = geo2leaf_geometry(data.geometry)
        map_element.properties = data.properties
        map_element.reflectToLayer()
    }

    return {
        loading,
        availableScenarios,
        srvSessions,
        promiseFetchAvailableScenarios,
        promiseFetchScenarioSessions,
        setObservedSession,
    }
})
