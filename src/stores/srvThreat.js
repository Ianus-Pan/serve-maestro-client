import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import laravelServer from '@/api/laravelServer.js'
import { useSrvAssessmentStore } from './srvAssessment.js';
import { useSrvCaseStore } from './srvCase.js';
import { useClientSettings } from './clientSettings.js';

export const useSrvThreatStore = defineStore('srvThreat', () => {
    const clientSettings = useClientSettings()

    const selectedSrvThreat = ref(null);
    const srvThreats = ref([]);
    const loading = ref(false)

    const srvAssessmentStore = useSrvAssessmentStore()
    const srvCaseStore = useSrvCaseStore()

    /** On Case Changed, Reset Threat */
    watch(() => srvCaseStore.selectedSrvCase, (newID, oldID) => {
        if( oldID !== newID)
            promiseFetchSrvThreats(newID)
    })

    /**
     * @param {String} tID The selected Threat ID
     */
    const setSelectedSrvThreat = tID => {
        const existing_threat = srvThreats.value.find(p => p._id === tID);

        if (existing_threat) {
            const threat_id = existing_threat._id
            selectedSrvThreat.value = threat_id
            
            clientSettings.data['selected_threat'] = threat_id
            
            srvAssessmentStore.to_compare.threats = [selectedSrvThreat.value]
        } else clientSettings.data['selected_threat'] = null
    }

    function getSrvThreat(tID = null) {
        if (!srvThreats.value.length || (!tID && !selectedSrvThreat.value)) {
            return null;
        }

        const idToFind = tID ?? selectedSrvThreat.value;
        return srvThreats.value.find(cs => cs._id === idToFind) || null;
    }

    /**
     * Attempt to get the Threats from the server
     * After the GET Request succeeds, also attempts to set
     * the selected Threat
     * @returns this.threats
     */
    const promiseFetchSrvThreats = async (case_id = null) => {
        loading.value = true
        return new Promise(resolve => {
            laravelServer.THREAT.GET.single('all', case_id).then(res => {
                srvThreats.value = res
                
                let currentTID = clientSettings.data['selected_threat']

                if (currentTID) setSelectedSrvThreat(currentTID)
                resolve(srvThreats.value)

                // console.log('Threat Result: ', srvThreats.value)
            })
            .catch(err => {
                srvThreats.value = [];
                resolve(srvThreats.value)

                console.log('Threat Error: ', err)
            })
            .finally(() => loading.value = false)
        })
    }

    return {
        loading,
        selectedSrvThreat,
        setSelectedSrvThreat,
        getSrvThreat,
        srvThreats,
        promiseFetchSrvThreats,
    }
})
