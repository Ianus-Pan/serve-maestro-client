<script setup>
import {
    Chart as ChartJS,
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js'

import { useSrvAssessmentStore } from '@/stores/srvAssessment.js';
import { onBeforeMount, onMounted, ref, watch } from 'vue';
import { useSrvCaseStore } from '@/stores/srvCase.js';
import { useSrvThreatStore } from '@/stores/srvThreat.js';
import printJS from 'print-js';
import Accordion from '@/components/Accordion.vue';
import MultiSelectionList from '@/components/MultiSelectionList.vue';
import GraphAccordion from './components/GraphAccordion.vue'
import Spinner from '@/components/Spinner.vue';
import router from '@/router';
import { useClientSettings } from '@/stores/clientSettings';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    RadialLinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Filler,
    Tooltip,
    Legend,
)

const srvAssesmentStore = useSrvAssessmentStore()
const srvCaseStore = useSrvCaseStore()
const srvThreatStore = useSrvThreatStore()

/** Colors */
const color_schemes = {
    OVERALL: {
        backgroundColor: 'rgba(93, 104, 149, .2)',
        borderColor: 'rgb(93, 104, 149)',
        pointBackgroundColor: 'rgba(93, 104, 149, .35)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(179,181,198,1)',

    },
    THREAT: {
        backgroundColor: 'rgba(200, 50, 50, .2)',
        borderColor: 'rgb(200, 50, 50)',
        pointBackgroundColor: 'rgba(200, 50, 50, .35)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(179,181,198,1)',
    },
    WORST: {
        backgroundColor: 'rgba(144, 50, 200, .2)',
        borderColor: 'rgb(144, 50, 200)',
        pointBackgroundColor: 'rgba(144, 50, 200, .35)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(179,181,198,1)',
    },
    OPEN: {
        backgroundColor: 'rgba(50, 200, 77, .2)',
        borderColor: 'rgb(50, 200, 77)',
        pointBackgroundColor: 'rgba(50, 200, 77, .35)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: 'rgb(128, 0, 0)',
        pointHoverBorderColor: 'rgb(128, 0, 0)',
    },
    CLOSED: {
        backgroundColor: 'rgba(50, 200, 132, .2)',
        borderColor: 'rgb(50, 200, 132)',
        pointBackgroundColor: 'rgba(50, 200, 132, .35)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(179,181,198,1)',
    },
    DEFAULT: {
        backgroundColor: 'rgba(101, 101, 101, .2)',
        borderColor: 'rgb(101, 101, 101)',
        pointBackgroundColor: 'rgba(101, 101, 101, .35)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(179,181,198,1)',
    }
}
const loading_case_datasets = {
    labels: [
        'Likelihood',
        'Intent',
        'Impact',
        'Risk',
        'Attractiveness',
        'Capability',
    ],
    datasets: [
        {
            label: 'Loading',
            ...color_schemes.DEFAULT,
            data: [0, 0, 0, 0, 0, 0]
        },
    ]
}
const loading_threat_datasets = {
    labels: [
        'Likelihood',
        'Intent',
        'Capability',
    ],
    datasets: [
        {
            label: 'Loading',
            ...color_schemes.DEFAULT,
            data: [0, 0, 0]
        },
    ]
}
const loading_area_datasets = {
    labels: [
        'Risk',
        'Impact',
        'Attractiveness',
    ],
    datasets: [
        {
            label: 'Loading',
            ...color_schemes.DEFAULT,
            data: [0, 0, 0]
        },
    ]
}

/*** NEW STUFF */
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

const compare_selections = ref({cases: [], threats: []})
onMounted(() => {
    srvAssesmentStore.stored_assessments = { ...srvAssesmentStore.stored_assessments }

    compare_selections.value = {
        cases: srvAssesmentStore.to_compare.cases,
        threats: srvAssesmentStore.to_compare.threats
    }
})

watch(() => [srvCaseStore.selectedSrvCase, srvThreatStore.selectedSrvThreat], () => {
    // console.log('Resetting Compare Selections')
    compare_selections.value = {cases: [], threats: []}
}, {deep: true})
watch(() => srvAssesmentStore.loading, () => {
    // console.log('loading!!', Object.values(srvAssesmentStore.loading))
}, {deep: true})
watch(() => srvAssesmentStore.to_compare, () => {
    // console.log('to_compare!!', Object.values(srvAssesmentStore.to_compare))
}, {deep: true})
watch(() => srvAssesmentStore.stored_case_areas, () => {
    if( srvAssesmentStore.loading.areas ) return
    // console.log('stored_case_areas!!', toRaw(srvAssesmentStore.stored_case_areas))
}, {deep: true})

/** 
 * This Master Object holds all the pre-calculated data in a specific format
 * in order to do the transformations required to write into ```render_``` Objects
 */
const cached_output_cases = ref({})

/** Outputted to Graph Components */
const render_output_cases = ref({})
const render_output_threats = ref({})


/** 
 * Used in a way similar to ```to_compare``` for filtering Areas,
 * depending on which Cases are in ```to_compare.cases```
 */
const to_render_areas = ref([])
const render_output_areas = ref({})

/**
 * When Compared Cases || Threats change, the Store automatically
 * updates the ```stored_assessments``` property.
 * Once this happens, and after all loading is done we:
 * 1. Clear any cached/render output cases which are no longer being Compared
 * 2. Read the cached output case (or create {})
 * 3. Filter the Compared Threats into ```filtered_by_threat```
 * 4. Get Threat Assessment with HIGHEST ```filtered_by_threat[].threat_values.likelihood``` (worst Assessment)
 * 5. Get Area with HIGHEST ```filtered_by_threat[tID].area_values[].risk``` (worst Area)
 * 6. Get Threat & Area Assessment with LOWEST (best Assessment & Area)
 * 7. Get ALL Threat Assessments & all Case/Threat Area Values
 */
watch(() => [
    srvAssesmentStore.stored_assessments,       // Changes on Fetched new Assessments
    srvAssesmentStore.loading.cases,            // Relative when Removing Comparisons to filter output
    srvAssesmentStore.loading.areas,            // Relative when Adding Comparisons cause Areas are Required
], () => {
    if( srvAssesmentStore.loading.cases ||
        srvAssesmentStore.loading.areas ) return

    /** ForEach of Stored Assessment Cases */
    Object.keys(srvAssesmentStore.stored_assessments).forEach(cID => {

        /** 1. */
        if( !srvAssesmentStore.to_compare.cases.includes(cID) ) {
            delete cached_output_cases.value[cID]
            delete render_output_cases.value[cID]
        }

        else {
            /** 2. */
            if( !cached_output_cases.value[cID] )
                cached_output_cases.value[cID] = {}
            let cached_case = cached_output_cases.value[cID]

            /** 3. */
            let threat_keys = Object.keys(srvAssesmentStore.stored_assessments[cID])

            let filtered_threat_ids = threat_keys.filter(tID => srvAssesmentStore.to_compare.threats.includes(tID))

            /**
             * Case/Threat assessments (srvAssesmentStore.to_compare.threats ONLY)
             * filtered_by_threat = {
             *      threat_id1: {                                   // Threat ID
             *          "_id": "assessment_id",
             *          "case_id": "case_id",
             *          "threat_id": "threat_id1",
             *          "threat_values": {
             *              "intent": 3,
             *              "intent_str": "Medium",
             *              "capability": 4,
             *              "capability_str": "High",
             *              "likelihood": 2.4,                      // intent * capability / 5
             *              "likelihood_str": "Low"
             *          },
             *          "area_values": {
             *              "677e933104acabc8d807e42b": {           // Area ID
             *                  "attractiveness": 3,
             *                  "attractiveness_str": "Medium",
             *                  "impact": 2.13,
             *                  "impact_str": "Low",
             *                  "risk": 1.02,                       // impact * threat.likelihood / 5
             *                  "risk_str": "Very Low"
             *              }
             *          },
             *          "created_at": 1736348466000,
             *          "updated_at": 1736348466000,
             *          "deleted_at": null
             *      },
             *      threat_id2: {},             // Case/Threat2 Assessment
             *      ...etc
             * }
             */
            let filtered_by_threat = threat_keys.reduce((tObj, tID) => {
                if( filtered_threat_ids.includes(tID) && !!srvAssesmentStore.stored_assessments[cID][tID]._id)
                    tObj[tID] = srvAssesmentStore.stored_assessments[cID][tID]
                return tObj
            }, {})

            /** 4. */
            let [worst_tID, worst_assessment] = srvAssesmentStore.getByMode(filtered_by_threat, 'threat_values.likelihood')
            if( worst_tID ) {
                /** 5. */
                let [worst_aID, worst_area_values] = srvAssesmentStore.getByMode(worst_assessment.area_values, 'risk')
                cached_case.worst_threat = {
                    threat: {
                        vals: worst_assessment.threat_values,
                        obj: srvThreatStore.getSrvThreat(worst_tID)
                    },
                    area: {
                        vals: worst_area_values,
                        obj: srvAssesmentStore.getCaseArea(cID, worst_aID)
                    }
                }

                /** 6. */
                let [best_tID, best_assessment] = srvAssesmentStore.getByMode(filtered_by_threat, 'threat_values.likelihood', 'lo')
                let [best_aID, best_area_values] = srvAssesmentStore.getByMode(best_assessment.area_values, 'risk', 'lo')
                cached_case.best_threat = {
                    threat: {
                        vals: best_assessment.threat_values,
                        obj: srvThreatStore.getSrvThreat(best_tID)
                    },
                    area: {
                        vals: best_area_values,
                        obj: srvAssesmentStore.getCaseArea(cID, best_aID)
                    }
                }

                /** 7. */
                cached_case.all_threats = []
                cached_case.all_areas = {}
                
                filtered_threat_ids.forEach(tID => {
                    if( filtered_by_threat[tID] ) {

                        /** Save all Threat Values */
                        cached_case.all_threats.push({
                            values: filtered_by_threat[tID].threat_values,
                            object: srvThreatStore.getSrvThreat(tID)
                        })

                        /** Save all Areas per Threat Values */
                        Object.keys(filtered_by_threat[tID].area_values).forEach( aID => {
                            /**
                             * If foundArea is Missing, it means its no longer Active on scene
                             * This happens because ```area_threats``` returns the values of ALL
                             * Areas, even inactive ones, so it's up to us to filter them
                             */
                            let foundArea = srvAssesmentStore.getCaseArea(cID, aID)
                            if( foundArea ) {
                                if( !cached_case.all_areas[aID] )
                                    cached_case.all_areas[aID] = {}

                                cached_case.all_areas[aID][tID] = {
                                    values: filtered_by_threat[tID].area_values[aID],
                                    object: foundArea
                                }
                            }
                        })
                    }
                })
            }
            
            /** 
             * Else CLEAR cached case (has no Assessment, therefore nothing shows)
             * This has to happen like this or the GRAPHs break, ```cached_case``` can NOT be null
             */
            else {
                /** Make Empty: this way I don't get best/worst from non-compared Threats */
                cached_case.worst_threat = null
                cached_case.best_threat = null
                cached_case.all_threats = []
                cached_case.all_areas = []
            }
        }
    })
}, {deep: true})


/** Graph Name-to-PropName links */
const cases_labels = {
    'Likelihood': 'lik',
    'Intent': 'int',
    'Impact': 'imp',
    'Risk': 'rsk',
    'Attractiveness': 'atr',
    'Vulnerability': 'vul',
    'Capability': 'cap',
}
const threats_labels = {
    'Likelihood': 'lik',
    'Intent': 'int',
    'Capability': 'cap',
}
const areas_labels = {
    'Risk': 'rsk',
    'Impact': 'imp',
    'Vulnerability': 'vul',
    'Attractiveness': 'atr',
}
watch(() => cached_output_cases.value, () => {
    to_render_areas.value.length = 0

    Object.keys(cached_output_cases.value).forEach(cID => {
        let theCase = srvCaseStore.getSrvCase(cID)

        /** Reset Rendered Case Data */
        render_output_cases.value[cID] = {
            card_data: {
                title: theCase.title,
                description: theCase.description
            },
            graph_data: []
        }

        /** Reset Rendered Threat Data */
        render_output_threats.value[cID] = {
            card_data: {
                title: theCase.title,
                description: theCase.description
            },
            graph_data: []
        }
        
        /** Reset Rendered Area Data */
        render_output_areas.value[cID] = {}

        /** 
         * Start making the Graph Data
         */

        let cached_case = cached_output_cases.value[cID]
        
        /**
         * CASE ASSESSMENTS:
         * BEST & WORST THREAT & AREA OF CASE
         * tLikelihood | tIntent | aImpact | aRisk | aAttractiveness | tCapability
         */
        if( cached_case.best_threat ) {
            let theBestColors = srvAssesmentStore.stored_assessments
                [cID][cached_case.best_threat.threat.obj._id].colors
            render_output_cases.value[cID].graph_data.push({
                label: `Best - ${cached_case.best_threat.threat.obj.title}`,
                ...theBestColors.best,
                data: {
                    lik: cached_case?.best_threat?.threat?.vals?.likelihood ?? 0,
                    int: cached_case?.best_threat?.threat?.vals?.intent ?? 0,
                    imp: cached_case?.best_threat?.area?.vals?.impact ?? 0,
                    rsk: cached_case?.best_threat?.area?.vals?.risk ?? 0,
                    atr: cached_case?.best_threat?.area?.vals?.attractiveness ?? 0,
                    vul: cached_case?.best_threat?.area?.vals?.vulnerability ?? 0,
                    cap: cached_case?.best_threat?.threat?.vals?.capability ?? 0,
                }
            })
        }
        if( cached_case.worst_threat ) {
            let theWorstColors = srvAssesmentStore.stored_assessments
                [cID][cached_case.worst_threat.threat.obj._id].colors
            render_output_cases.value[cID].graph_data.push({
                label: `Worst - ${cached_case.worst_threat.threat.obj.title}`,
                ...theWorstColors.worst,
                data: {
                    lik: cached_case?.worst_threat?.threat?.vals?.likelihood ?? 0,
                    int: cached_case?.worst_threat?.threat?.vals?.intent ?? 0,
                    imp: cached_case?.worst_threat?.area?.vals?.impact ?? 0,
                    rsk: cached_case?.worst_threat?.area?.vals?.risk ?? 0,
                    atr: cached_case?.worst_threat?.area?.vals?.attractiveness ?? 0,
                    vul: cached_case?.worst_threat?.area?.vals?.vulnerability ?? 0,
                    cap: cached_case?.worst_threat?.threat?.vals?.capability ?? 0,
                }
            })
        }

        /**
         * THREAT ASSESSMENTS:
         * ALL CASE THREAT VALUES
         * Likelihood | Intent | Capability
         */
        /**
         * cached_case.all_threats = {
         *      tID: {
         *          object: {},
         *          values: {}
         *      }
         *  }
         */
        cached_case.all_threats.forEach(tvals => { 
            if( tvals ) {
                let threatColors = srvAssesmentStore.stored_assessments
                    [cID][tvals.object._id].colors

                render_output_threats.value[cID].graph_data.push({
                    label: `${tvals.object.title}`,
                    ...threatColors.threat,
                    data: {
                        lik: tvals.values.likelihood,
                        int: tvals.values.intent,
                        cap: tvals.values.capability,
                    }
                })
            }
        })

        /**
         * AREA ASSESSMENTS:
         * ALL CASE AREA VALUES
         * Risk | Impact | Attractiveness
         */
        /**
         * cached_case.all_areas = {
         *      aID: {
         *          tID: {
         *              object: {},
         *              values: {}
         *          }
         *      }
         *  }
         */
        Object.keys(cached_case.all_areas).forEach(aID => {
            to_render_areas.value.push(aID)
            
            let area_threats = cached_case.all_areas[aID]

            Object.keys(area_threats).forEach(tID => {

                if( !render_output_areas.value[cID][aID] ) {
                    render_output_areas.value[cID][aID] = { 
                        card_data: {
                            title: area_threats[tID].object.properties.element.name,
                            description: `${theCase.title}${theCase.description ? " - " + theCase.description : ''}`
                        },
                        graph_data: []
                    }
                }

                let theAreaColors = srvAssesmentStore.stored_assessments[cID][tID].colors.areas[aID] ?? {}

                let threatData = srvThreatStore.getSrvThreat(tID)
                render_output_areas.value[cID][aID].graph_data.push({
                    label: threatData.title,
                    ...theAreaColors,
                    data: {
                        rsk: area_threats[tID].values.risk,
                        imp: area_threats[tID].values.impact,
                        atr: area_threats[tID].values.attractiveness,
                        vul: area_threats[tID].values.vulnerability
                    }
                })
            })
        })
    })
}, {deep: true})


/** Callback Setters for Comparisons */
function setComparedCases(data) {
    compare_selections.value.cases =
        data.filter(cID => cID !== srvCaseStore.selectedSrvCase)

    srvAssesmentStore.to_compare.cases = [
        srvCaseStore.selectedSrvCase,
        ...compare_selections.value.cases
    ]
}
function setComparedThreats(data) {
    compare_selections.value.threats =
        data.filter(tID => tID !== srvThreatStore.selectedSrvThreat)

    srvAssesmentStore.to_compare.threats = [
        srvThreatStore.selectedSrvThreat,
        ...compare_selections.value.threats
    ]
}


function _parseAreaData(areaData) {
    let res = {}
    Object.values(areaData).forEach(aObj => {
        Object.keys(aObj).forEach(aID => {
            res[aID] = aObj[aID]
        })
    })

    return res
}


/** Print Page Testing */
const print_mode = ref(false)
function printMe() {
    if( print_mode.value ) return
    print_mode.value = true

    setTimeout(() => {
        printJS({
            printable: 'targetDiv',
            type: 'html',
            header: 'Assessment Analytics',
            style: `
                div.avoid { page-break-inside: avoid; }
                div.p-2.h-min { border: 1px dotted rgba(0, 0, 0, .2); padding: 1rem 3rem }
                canvas {  }
            `
        })
    }, 1000)
    setTimeout(() => print_mode.value = false, 1500)
}

</script>

<template>
    <div class="flex flex-col h-full bg-cl_background-100 dark:bg-cl_background-100-dark">
        <header class="w-full flex flex-col xl:flex-row gap-2 p-4 shadow-md">
            <div class="flex flex-row gap-2 p-1 w-full xl:w-64">
                <img class="brightness-0 h-10 w-10" src="/icons/assessment.svg" />
                <span class="text-2xl ml-2 mt-3 xl:mt-0">Assessment Analytics</span>
            </div>

            <div class="relative w-full">
                <Accordion
                    class="mr-[4.5rem] xl:mr-[5rem] pl-2 border-none flex flex-col xl:px-2"
                    header_classes="transition-colors font-bold mr-4 xl:mr-0 p-2 cursor-pointer rounded-md shadow-md bg-cl_background-300 dark:bg-cl_background-300-dark hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
                    content_classes="mt-2 mr-4 xl:mr-0 font-bold rounded-md shadow-md bg-cl_background-300 dark:bg-cl_background-300-dark">

                    <template #header>Compare with other Cases and/or Threats</template>

                    <template #content>
                        <div class="overflow-visible grid grid-rows-2 lg:grid-rows-none lg:grid-cols-2 gap-4">
                            <div class="flex gap-6 items-center p-4 rounded-md">
                                <span class="min-w-36">Compare Cases:</span>

                                <MultiSelectionList class="flex-grow"
                                    :items="srvCaseStore.availableSrvCases.filter(cs => cs._id !== srvCaseStore.selectedSrvCase)"
                                    :outsideClose="true"
                                    v-model:modelValue="compare_selections.cases"
                                    @update:modelValue="modelValue => setComparedCases(modelValue)"
                                    item_label_field="title"
                                    item_description_field="description"
                                    item_id_field="_id"
                                    headerClasses="min-h-12 max-h-24 "
                                    dropdownClasses="mt-1 rounded overflow-hidden ring-2 ring-gray-300 drop-shadow-md min-w-full"
                                    dropdownAlign="center"/>

                            </div>

                            <div class="flex gap-6 items-center p-4 rounded-md">
                                <span class="min-w-36">Compare Threats:</span>

                                <MultiSelectionList class="flex-grow"
                                    :items="srvThreatStore.srvThreats.filter(th => th._id !== srvThreatStore.selectedSrvThreat)"
                                    :outsideClose="true"
                                    v-model:modelValue="compare_selections.threats"
                                    @update:modelValue="modelValue => setComparedThreats(modelValue)"
                                    item_label_field="title"
                                    item_id_field="_id"
                                    headerClasses="min-h-12 max-h-24"
                                    dropdownClasses="mt-1 rounded overflow-hidden ring-2 ring-gray-300 drop-shadow-md min-w-full"
                                    dropdownAlign="center"/>

                            </div>
                        </div>
                    </template>
                </Accordion>

                <button @click="() => printMe()"
                    class="absolute top-0 right-[.75rem] px-4 py-2 transition-colors rounded-md shadow-md bg-cl_background-300 dark:bg-cl_background-300-dark hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark">
                    <Spinner v-if="print_mode" :classes="'h-6 w-6'"/>
                    <img v-else class="brightness-0 h-6 w-7" src="/icons/pdf.svg" />
                </button>
            </div>
        </header>

        <div id="targetDiv"
            class="h-full overflow-y-auto gap-6 py-6"
            :class="print_mode ? 'grid grid-cols-1' : 'flex flex-col'">

            <GraphAccordion
                :header_string="'Case Assessment' + (compare_selections.cases?.length > 1 ? 's' : '')"
                :to_compare="srvAssesmentStore.to_compare.cases"
                :render_output="render_output_cases"
                :render_labels="cases_labels"
                :loading_data="loading_case_datasets"
                :is_open="true"
                :print_mode="print_mode"
                header_classes="ml-6 mr-2 transition-colors font-bold p-2 cursor-pointer rounded-md shadow-md bg-cl_background-300 dark:bg-cl_background-300-dark hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
                content_classes="ml-6 mr-2 mt-2 font-bold rounded-md shadow-md bg-cl_background-300 dark:bg-cl_background-300-dark"
                />

            <GraphAccordion class="avoid"
                :header_string="'Threat Assessment' + (compare_selections.threats?.length > 1 ? 's' : '')"
                :to_compare="srvAssesmentStore.to_compare.cases"
                :render_output="render_output_threats"
                :render_labels="threats_labels"
                :loading_data="loading_threat_datasets"
                :is_open="false"
                :print_mode="print_mode"
                header_classes="ml-6 mr-2 transition-colors font-bold p-2 cursor-pointer rounded-md shadow-md bg-cl_background-300 dark:bg-cl_background-300-dark hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
                content_classes="ml-6 mr-2 mt-2 font-bold rounded-md shadow-md bg-cl_background-300 dark:bg-cl_background-300-dark"
                />
            
            <GraphAccordion class="avoid"
                header_string="Area Assessments"
                :to_compare="to_render_areas"
                :render_output="_parseAreaData(render_output_areas)"
                :render_labels="areas_labels"
                :loading_data="loading_area_datasets"
                :is_open="false"
                :print_mode="print_mode"
                header_classes="ml-6 mr-2 transition-colors font-bold p-2 cursor-pointer rounded-md shadow-md bg-cl_background-300 dark:bg-cl_background-300-dark hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
                content_classes="ml-6 mr-2 mt-2 font-bold rounded-md shadow-md bg-cl_background-300 dark:bg-cl_background-300-dark"
                />

        </div>
    </div>
</template>
