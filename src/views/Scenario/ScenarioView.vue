<script setup>
import { ref, computed, watch, onBeforeMount } from 'vue'
import Paginator from '@/components/Paginator.vue'
import { useForm } from '@/composables/form.js'
import useSifter from '@/composables/sifter.js'
import Dropdown from '@/components/Dropdown.vue'
import TextInput from '@/components/TextInput.vue'
import FormSection from '@/components/FormSection.vue'
import Button from '@/components/Button.vue'
import Modal from '@/components/Modal.vue'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat' // ES 2015
import SelectionList from '@/components/SelectionList.vue'
import { useSrvScenariostore } from '@/stores/srvScenario'
import { useSrvThreatStore } from '@/stores/srvThreat'
import { useSrvCaseStore } from '@/stores/srvCase'
import router from '@/router'
import { useClientSettings } from '@/stores/clientSettings'
import { leafletMap } from '@/stores/leafletMap'
import { useLoading } from 'vue-loading-overlay'
import laravelServer from '@/api/laravelServer'

dayjs.extend(customParseFormat);

const leafletMapStore = leafletMap()
const srvCaseStore = useSrvCaseStore()
const srvScenarioStore = useSrvScenariostore()
const srvThreatStore = useSrvThreatStore()

const sessionList = computed(() => {
    let res = []
    srvScenarioStore.srvSessions.forEach(sc => {
        res.push({
            srv_threat_title: srvThreatStore.srvThreats.find(th => th._id === sc.srv_threat_id).title,
            ...sc
        })
    })
    return res
})

const clientSettings = useClientSettings()
onBeforeMount(() => {
    if( !clientSettings.data['selected_case'] || !clientSettings.data['selected_threat'] )
        router.push({name: 'map-2d'})
})
watch(() => [
    srvThreatStore.srvThreats,
    clientSettings.data['selected_case'],
    clientSettings.data['selected_threat']
], () => {
    if( !srvCaseStore.getSrvCase() || !srvThreatStore.getSrvThreat() )
        router.push({name: 'map-2d'})
}, {deep: true})

const search = { field: 'srv_threat_title', query: '' }
const scenarioSearcher = { field: "srv_threat_title", query: "" }

const sorters = {
    name: {
        asc: (lhs, rhs) => {
            if (lhs.title < rhs.title) {
                return -1;
            }
            if (lhs.title > rhs.title) {
                return 1;
            }
            return 0;
        },
        des: (lhs, rhs) => {
            if (lhs.title > rhs.title) {
                return -1;
            }
            if (lhs.title < rhs.title) {
                return 1;
            }
            return 0;
        }
    },
    // active: {
    //     asc: (lhs, rhs) => (lhs.active === rhs.active) ? 0 : lhs.active ? -1 : 1,
    //     des: (lhs, rhs) => (lhs.active === rhs.active) ? 0 : lhs.active ? 1 : -1
    // }
}
const filters = {
    // status: {
    //     active: (item) => item.active,
    //     inactive: (item) => !item.active
    // }
}
const sortIcon = computed(() => {
    const order = activeSorters.get('active')
    switch (order) {
        case "asc": return "/icons/buttons/ascending_white.svg"
        case "des": return "/icons/buttons/descending_white.svg"
        default: return 0
    }
})

const { activeSearch, toogleSorter, activeSorters, finalData: finalSessionData } = useSifter(sessionList, search)

const showModal = ref(false)

const includeScenarioAreas = ref(false)

const scenarioForm = useForm({
    case_id: { value: '' },
    scenario_id: { value: '' },
    threat_id: { value: '' },
})

watch(() => showModal.value, () => {
    if( !showModal.value ) clearEditScenario()
    else scenarioForm.values.case_id = srvCaseStore.selectedSrvCase
})
function clearEditScenario() {
    scenarioForm.resetForm()
    showModal.value = false
}
function setObserveSession(session_id) {
    srvScenarioStore.setObservedSession(session_id)
    clearEditScenario()
}
function clearAllSessions() {
    laravelServer.SCENARIO.GET.clear_all_sessions()
        .then(() => window.location.href = window.location.href)
}
function openLiveStats(session_id) {
    window.open(`https://gamingdashboard.azurewebsites.net/session/${session_id}`, '_blank');
}
function openDashboard() {
    window.open(`https://gamingdashboard.azurewebsites.net/Dashboard`, '_blank');
}
function openAiAlgorithm() {
    window.open(`http://195.201.142.102/ai-algorithm/`, '_blank');
}

async function submit() {
    setLoading(true)

    await scenarioForm.post('/serve/scenario-session')
        .finally(() => setLoading(false))
    
    /** Add the Scenario Areas to the fricken Map! */
    if( includeScenarioAreas.value ) {
        let found_scenario = filteredScenarios.value.find(sc => sc._id === scenarioForm.values.scenario_id)

        const features = [];
        for (const sc_area of found_scenario?.areas ?? []) {
            const feature = {
                _id: null,
                type: "Feature",
                geometry: sc_area.geometry,
                properties: sc_area.properties
            };
            features.push(feature);
        };
        const collection = { type: "FeatureCollection", features }
        leafletMapStore.importGeoJson(collection, true)
    }
    
    scenarioForm.resetForm()
    showModal.value = false
}

const filteredScenarios = computed(() => srvScenarioStore.availableScenarios)
const filteredThreatList = computed(() => {
    return srvThreatStore.srvThreats.filter(threat => threat.case_has_qnnaires.length === 2)
})


/**
 * LOADER
 */

const loadRef = ref(null)
const $loader = ref(null)
const loadOverlay = useLoading({
    loader: 'dots',
    // width: 128,
    // active: true,
    // isFullPage: true,
    color: '#5D6895', // cl_accent-100
    backgroundColor: '#b0b0b0', // cl_accent-800
    opacity: 1
});
const loading = ref(false)
function setLoading( ld = false ) {
    if(ld && !$loader.value) {
        loading.value = true

        $loader.value = loadOverlay.show({
            container: loadRef.value
        })
    } else if( !ld && $loader.value ) {
        setTimeout(() => {
            loading.value = false

            $loader.value.hide()
            $loader.value = null
        }, 300)
    }
}
</script>

<template>
    <div class="flex flex-col h-full bg-cl_background-100 dark:bg-cl_background-100-dark">
        <header class="flex gap-2 items-center px-2 py-4">
            <img class="brightness-0" src="/icons/person.svg" />
            <div class="text-2xl">Scenario Sessions</div>
        </header>

        <section class="flex justify-between px-4 pt-6">
            <TextInput type="text" v-model="activeSearch.query" class="p-1 border rounded" placeholder="Search..." />

            <Button @click="showModal = !showModal"
                class="flex  justify-center items-center w-28 h-10 bg-cl_accent-100 hover:bg-cl_accent-400 text-gray-200 gap-2">
                <span class="text-2xl mb-[.2rem]">+</span>
                <span class="text-md">Create</span>
            </Button>

            <Modal :show="showModal" @close="showModal = !showModal">
                <form @submit.prevent="submit" class="p-2 flex flex-col space-y-2 bg-cl_background-100 rounded-md">
                    <header class="p-2 text-lg text-gray-800">
                        New Scenario Session
                    </header>

                    <section class="p-2 flex flex-col">
                        <input type="hidden" name="case_id" :value="scenarioForm.values.case_id"/>
                        
                        <FormSection label="Select Scenario">
                            <SelectionList
                                :items="filteredScenarios"
                                item_label_field="title"
                                item_id_field="_id"
                                v-model="scenarioForm.values.scenario_id"
                                class="border rounded-md border-cl_background-400 dark:border-cl_background-400-dark"
                                dropdown-classes="w-full max-h-80 mt-1 overflow-y-auto z-50 rounded-md ring-2 ring-gray-300"
                                />
                        </FormSection>
                        
                        <FormSection label="Select Threat">
                            <SelectionList
                                :items="filteredThreatList"
                                item_label_field="title"
                                item_id_field="_id"
                                v-model="scenarioForm.values.threat_id"
                                class="border rounded-md border-cl_background-400 dark:border-cl_background-400-dark"
                                dropdown-classes="w-full max-h-80 mt-1 overflow-y-auto z-50 rounded-md ring-2 ring-gray-300"
                                />
                        </FormSection>
                        

                        <div class="flex">
                            <div class="flex items-center p-2 gap-2 w-1/2">
                                <input id="areas" class="ring-2 ring-blue-500 rounded border-0" name="areas" type="checkbox"
                                    v-model="includeScenarioAreas" />
                                <label for="areas">Include Scenario Areas</label>
                            </div>
                        </div>

                    </section>

                    <footer ref="loadRef" class="flex justify-end gap-5">
                        <Button :disabled="loading" @click.prevent="showModal = !showModal" class="hover:bg-red-700 bg-cl_accent-100 text-gray-200 p-2">Cancel</Button>
                        <Button :disabled="loading" class="hover:bg-green-700 bg-cl_accent-100 text-gray-200 p-2">Submit</Button>
                    </footer>
                </form>
            </Modal>
        </section>

        <div class="flex justify-between px-4 pt-6">
            <div class="flex gap-2">
                <Button @click="() => toogleSorter('active')"
                    class="flex justify-center items-center px-4 py-2 gap-2 bg-cl_accent-100 hover:bg-cl_accent-400 text-gray-200">
                    Active
                    <img v-if="sortIcon" class="w-4 h-4" :src="sortIcon" />
                </Button>
                <Button @click="() => openDashboard()"
                    class="flex justify-center items-center px-4 py-2 gap-2 bg-cl_accent-100 hover:bg-cl_accent-400 text-gray-200">
                    Open Dashboard
                </Button>
                <Button @click="() => openAiAlgorithm()"
                    class="flex justify-center items-center px-4 py-2 gap-2 bg-cl_accent-100 hover:bg-cl_accent-400 text-gray-200">
                    Open AI Algorithm
                </Button>
            </div>
            <div class="flex gap-2">
                <Button @click="() => setObserveSession(null)"
                    class="flex  justify-center items-center bg-cl_accent-100 hover:bg-cl_accent-400 text-gray-200 gap-2">
                    <div class="top-2 px-3">Stop Observing</div>
                </Button>
                <Button @click="() => clearAllSessions()"
                    class="flex  justify-center items-center bg-red-800 hover:bg-cl_accent-400 text-gray-200 gap-2">
                    <div class="top-2 px-3">Clear Sessions</div>
                </Button>
            </div>
        </div>

        <Paginator
            class="flex flex-col min-h-0 p-4 "
            :items="finalSessionData"
            :max_items_per_page="10"
            :loading="srvScenarioStore.loading"
            items_label_field="name">
            <template #item="{ _id, srv_threat_title, stam_scenario_id, stam_session_id, stam_session_active, updated_at }">
                <div class="flex flex-col min-h-[22rem] simulation">
                    <div class="w-full h-44 bg-cl_accent-50 overflow-hidden relative  rounded-t-lg">
                        <img class="-rotate-12 w-full opacity-30 object-cover" src="/icons/case.svg" />
                        <div
                            class="flex p-2 justify-end items-end top-0 bg-gradient-to-t from-gray-700 to-transparent absolute w-full h-full">
                            <div class="px-3 py-1 flex justify-center items-center gap-2 rounded-lg bg-cl_background-100 dark:bg-cl_background-100-dark text-sm">
                                <div>{{ stam_session_active ? "Active" : "Inactive" }}</div>
                                <div class="h-2 w-2 rounded-full" :class="[stam_session_active ? 'bg-green-400' : 'bg-red-700']">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="p-2 flex flex-col justify-between content-between flex-grow bg-cl_background-400 dark:bg-cl_background-400-dark shadow-md rounded-b-lg">
                        <div class="flex gap-3 rounded-md">
                            <div class="flex-grow">
                                <div>Scenario Session ID: {{ stam_session_id }}</div>
                                <div class="text-gray-800 text-opacity-80 text-sm h-20">
                                    <div class="border-b-2 py-2">Scenario Type:<br>{{ stam_scenario_id }}</div>
                                    <div class="pt-2">Threat Type:<br>{{ srv_threat_title }}</div>
                                </div>
                            </div>

                            <div v-if="stam_session_active" class="rounded-sm">
                                <Dropdown
                                    dropdown-classes="space-y-2 z-50 text-sm flex text-gray-800 max-h-20 mt-1 absolute overflow-y-auto rounded-lg bg-cl_background-100 dark:bg-cl_background-100-dark shadow-md ring-1 ring-black ring-opacity-10"
                                    align="right">
                                    <template #trigger>
                                        <button class="hover:bg-gray-200 rounded-full w-6 h-6 justify-center items-center">
                                            <svg width="20" height="20">
                                                <circle cx="10" cy="5" r="2" fill="#000" />
                                                <circle cx="10" cy="10" r="2" fill="#000" />
                                                <circle cx="10" cy="15" r="2" fill="#000" />
                                            </svg>
                                        </button>
                                    </template>
                                    <template #content>
                                        <div class="flex justify-start items-center py-2 px-5 gap-2 w-36 cursor-pointer select-none hover:bg-cl_background-300 dark:hover:bg-cl_background-300-dark"
                                            @click="() => setObserveSession(_id)">
                                            <img class="brightness-0 h-4 w-4" src="/icons/edit.svg" />
                                            <div>Observe</div>
                                        </div>
                                        <div class="flex justify-start items-center py-2 px-5 gap-2 w-36 cursor-pointer select-none hover:bg-cl_background-300 dark:hover:bg-cl_background-300-dark"
                                            @click="() => openLiveStats(stam_session_id)">
                                            <img class="h-4 w-4" src="/icons/ruler.svg" />
                                            <div>Live Stats</div>
                                        </div>
                                    </template>
                                </Dropdown>
                            </div>
                        </div>
                        <div class="flex justify-end text-xs text-gray-700">
                            {{ dayjs(updated_at).format("DD/MM/YYYY") }}
                        </div>
                    </div>
                </div>
            </template>
        </Paginator>
    </div>
</template>
