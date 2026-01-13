<script setup>
import { ref, computed, shallowReactive, reactive } from 'vue'
import Modal from '@/components/Modal.vue';
import Questionnaire from '../../partials/Questionnaire.vue';
import Tab from '@/components/Tab.vue';
import { Tooltip } from 'floating-vue';
import { useSrvThreatStore } from '@/stores/srvThreat'
import { useSrvAssessmentStore } from '@/stores/srvAssessment';
import { useSrvCaseStore } from '@/stores/srvCase'
import { leafletMap } from '@/stores/leafletMap'

import VDivider from '@/components/VDivider.vue';
import SelectionList from '@/components/SelectionList.vue';
import RadioGroup from '@/components/RadioGroup.vue';
import RadioButton from '@/components/RadioButton.vue';
import TabSection from '@/components/TabSection.vue';
import ThreatQnair from '@/components/ThreatQnair.vue';

const ThreatType2Icons = {
    'GDN': "4g_5g_drone.svg",
    'BIO': "biological_attack.svg",
    'CHM': "chemical_attack.svg",
    'CDB': "civil_disturbance.svg",
    'IED': "ied.svg",
    'PBD': "pbied.svg",
    'RAD': "radiological_attack.svg",
    'RAM': "ramming_vehicle.svg",
    'RCD': "rc-uas_ied.svg",
    'SOT': "sharp_object.svg",
    'SHT': "shootout.svg",
    'TRB': "theft_robbery.svg",
    'UEY': "unauthorized_entry.svg",
    'VDL': "vandalism.svg",
    'VBD': "vbied.svg",


}

const map = leafletMap()
const srvAssessmentStore = useSrvAssessmentStore()
const srvThreatStore = useSrvThreatStore()
const srvCaseStore = useSrvCaseStore()
// const srvQnairSchemaStore = useSrvQnairSchemasStore()

// const serveApi = useApi(axiosInstance)

const modalShow = ref(false)
const threatSearcher = { field: "title", query: "" }
const threatSorters = {

    case_has_qnnaires: {
        asc: (lhs, rhs) => {
            if (lhs.cases_has_qnnaires.length < rhs.cases_has_qnnaires.length) {
                return -1;
            }
            if (lhs.cases_has_qnnaires.length > rhs.cases_has_qnnaires.length) {
                return 1;
            }
            return 0;
        },
        des: (lhs, rhs) => {
            if (lhs.cases_has_qnnaires.length < rhs.cases_has_qnnaires.length) {
                return 1;
            }
            if (lhs.cases_has_qnnaires.length > rhs.cases_has_qnnaires.length) {
                return -1;
            }
            return 0;
        }
    }
}

const selectedThreatObject = ref(null)

function onThreatClick(selected_threat) {
    // TODO: do this only if threat is valid

    const threat_completed = selected_threat.case_has_qnnaires.length === 2
    selectedThreatObject.value = selected_threat
    if (threat_completed) {
        srvThreatStore.setSelectedSrvThreat(selected_threat._id)
    } else {
        modalShow.value = true
    }
}
function onThreatEdit(selected_threat) {
    selectedThreatObject.value = selected_threat
    modalShow.value = true
}
function onThreatModalClose() {
    modalShow.value = false

    selectedThreatObject.value = srvThreatStore.getSrvThreat(selectedThreatObject.value._id)
    const threat_completed = selectedThreatObject.value.case_has_qnnaires.length === 2
    
    if (threat_completed) {
        srvThreatStore.setSelectedSrvThreat(selectedThreatObject.value._id)
    }
}

/** UI */
const pingClass = computed(() => {
    return !srvThreatStore.selectedSrvThreat ? "pulse-outline" : ""
});
const inAssessment = ref(false)

function valueToSpectrumColor(value) {
    // Clamp the value between 0 and 5
    value = Math.max(0, Math.min(5, value));

    // Normalize the value to a 0-1 range
    const normalized = value / 5;

    // Map normalized value to HSL hue (0° to 240° for red to blue)
    // 0° is red, 120° is green, 240° is blue
    const hue = (1 - normalized) * 240;

    // Convert HSL to RGB using 100% saturation and 50% lightness
    return `hsl(${hue}, 100%, 30%)`;
}

function deactivateAssessment() {
    inAssessment.value = false
    const cID = srvCaseStore.selectedSrvCase
    const tID = srvThreatStore.selectedSrvThreat
    try {
        const assessments = srvAssessmentStore.stored_assessments[cID][tID]
        for (const element of map.id_elements.values()) {
            element.reflectToLayer()
        }

    } catch (error) {
        console.error("Failed to get stored assessments: ", error)
    }
}
/** @param {('risk'|'attractiveness'|'impact')} assessment_type */
function colorMapElements(assessment_type) {
    const cID = srvCaseStore.selectedSrvCase
    const tID = srvThreatStore.selectedSrvThreat
    try {
        const assessments = srvAssessmentStore.stored_assessments[cID][tID]
        for (const element of map.id_elements.values()) {
            if (element.properties.element.category !== "AREA") { continue }
            const id = element._id
            const assessment = assessments?.area_values?.[id]
            if (assessment) {
                element.layer.setStyle({
                    color: valueToSpectrumColor(assessment[assessment_type]),
                })
                element.layer.bindTooltip(`<div class="flex flex-col items-center"><span class="capitalize text-lg">${assessment_type}</span> <span class="font-bold text-lg">${assessment[assessment_type]}<span class="text-xs font-normal opacity-70">/5</span></span></div>`, { permanent: false, direction: 'top' })
            } else {
                element.layer.setStyle({
                    fillPattern: {
                        color: "red"
                    }
                }
                )
                element.layer.bindTooltip(`<div class="flex flex-col items-center"><span class="capitalize text-lg">Questionnaire</span> <span class="font-bold">Please fill the Questionnaire for the area if it of interest.</span></div>`, { permanent: false, direction: 'top' })
            }
        }

        inAssessment.value = true
    } catch (error) {
        console.error("Failed to get stored assessments: ", error)
    }
}

const theGradient = {
    background: 'transparent linear-gradient(90deg, #090080 0%, #10B431 25%, #ebff00 50%, #FFA200 75%, #FF0000 100%) 0% 0% no-repeat padding-box',
    boxShadow: '3px 3px 3px #00000029',
    opacity: 1
}
</script>

<template>
    <TabSection label="Threats">
        <SelectionList :class="pingClass" :items="srvThreatStore.srvThreats" item_label_field="title" item_id_field="_id"
            :onClick="onThreatClick" :searcher="threatSearcher" :sorters="threatSorters"
            v-model="srvThreatStore.selectedSrvThreat"
            :select-predicate="(threat) => (threat.case_has_qnnaires.length === 2)" class="w-52"
            dropdown-classes="w-80 max-h-80 mt-1 absolute overflow-y-auto z-50 rounded-md">
            <template #item="threat">
                <Tooltip placement="right" :disabled="threat.case_has_qnnaires.length !== 0">
                    <div :class="threat.case_has_qnnaires.length !== 0 ? '' : 'opacity-30'"
                        class="cursor-pointer flex flex-col justify-between">
                        <div class="grid grid-cols-8 grid-rows-1">
                            <div class="font-bold col-span-7">{{ threat.title }}</div>
                            <div @click.stop="() => onThreatEdit(threat)"
                                class="hover:scale-[1.1] hover:opacity-100 opacity-70 transition">
                                <img class="h-4 w-4 saturate-0 brightness-50" src="/icons/edit.svg" />
                            </div>
                        </div>
                        <div
                            class="italic capitalize flex bg-gray-500 p-1 text-white rounded-md gap-1 justify-between items-center text-xs">
                            {{ threat.description }}
                        </div>
                    </div>
                    <template #popper>
                        <header class="text-lg font-bold">Threat has no filled Questionnaires</header>
                        <p class="">Please click to fill in the <span class="italic">Definition & Likelihood Questionnaires</span></p>
                    </template>
                </Tooltip>
            </template>
        </SelectionList>
    </TabSection>
    <VDivider size="80%" />

    <TabSection label="Overlay">
        <RadioGroup class="flex gap-1">
            <!-- <RadioButton class="py-1 px-3 "> -->
            <!--     <div class="flex flex-col justify-center items-center"> -->
            <!--         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"> -->
            <!--             <path -->
            <!--                 d="M21.143 9.667c-.733-1.392-1.914-3.05-3.617-4.753-2.977-2.978-5.478-3.914-6.785-3.914-.414 0-.708.094-.86.246l-1.361 1.36c-1.899-.236-3.42.106-4.294.983-.876.875-1.164 2.159-.792 3.523.492 1.806 2.305 4.049 5.905 5.375.038.323.157.638.405.885.588.588 1.535.586 2.121 0s.588-1.533.002-2.119c-.588-.587-1.537-.588-2.123-.001l-.17.256c-2.031-.765-3.395-1.828-4.232-2.9l3.879-3.875c.496 2.73 6.432 8.676 9.178 9.178l-7.115 7.107c-.234.153-2.798-.316-6.156-3.675-3.393-3.393-3.175-5.271-3.027-5.498l1.859-1.856c-.439-.359-.925-1.103-1.141-1.689l-2.134 2.131c-.445.446-.685 1.064-.685 1.82 0 1.634 1.121 3.915 3.713 6.506 2.764 2.764 5.58 4.243 7.432 4.243.648 0 1.18-.195 1.547-.562l8.086-8.078c.91.874-.778 3.538-.778 4.648 0 1.104.896 1.999 2 1.999 1.105 0 2-.896 2-2 0-3.184-1.425-6.81-2.857-9.34zm-16.209-5.371c.527-.53 1.471-.791 2.656-.761l-3.209 3.206c-.236-.978-.049-1.845.553-2.445zm9.292 4.079l-.03-.029c-1.292-1.292-3.803-4.356-3.096-5.063.715-.715 3.488 1.521 5.062 3.096.862.862 2.088 2.247 2.937 3.458-1.717-1.074-3.491-1.469-4.873-1.462z" /> -->
            <!--         </svg> -->
            <!--         BASE -->
            <!--     </div> -->
            <!-- </RadioButton> -->
            <RadioButton :on-deactivate="deactivateAssessment" :on-activate="() => colorMapElements('risk')"
                class="py-1 px-3 w-[9rem]">
                <div class="flex flex-col justify-center items-center">
                    <img class="h-5 w-5" src="/icons/RISK.svg" alt="risk">
                    RISK
                </div>
            </RadioButton>
            <RadioButton :on-deactivate="deactivateAssessment" :on-activate="() => colorMapElements('impact')"
                class="py-1 px-3 w-[9rem]">
                <div class="flex flex-col justify-center items-center">
                    <img class="h-5 w-5" src="/icons/IMPACT.svg" alt="impact">
                    IMPACT
                </div>
            </RadioButton>
            <RadioButton :on-deactivate="deactivateAssessment" :on-activate="() => colorMapElements('attractiveness')"
                class="py-1 px-3 w-[9rem]">
                <div class="flex flex-col justify-center items-center">
                    <img class="h-5 w-5" src="/icons/ATTRACTIVENESS.svg" alt="attractiveness">
                    ATTRACTIVENESS
                </div>
            </RadioButton>
        </RadioGroup>
    </TabSection>
    <VDivider size="80%" />
    <TabSection class="max-w-80 flex-grow" :class="{ 'saturate-0': !inAssessment }" label="Indicator">
        <div class="relative h-5 w-full rounded border border-gray-100" :style="theGradient">
            <!-- Labels -->
            <div class="absolute -top-5 left-0 w-full flex justify-between text-xs text-gray-700">
                <span>VL</span>
                <span>L</span>
                <span>N</span>
                <span>H</span>
                <span>VH</span>
            </div>
        </div>
    </TabSection>

    <Modal :show="modalShow" @close="onThreatModalClose">
        <Questionnaire :img="'/icons/threats/' + ThreatType2Icons[selectedThreatObject.type]" title="Threat Questionnaire"
            description="Fill in the Definition and Likelihood of the Threat">
            <Tab class="flex h-fit" label="Definition">
                <div class="flex flex-col flex-grow" action="">
                    <ThreatQnair :threat="selectedThreatObject" qnair-type="TDF" />
                </div>
            </Tab>
            <Tab class="flex h-fit" label="Likelihood">
                <div class="flex flex-col flex-grow" action="">
                    <ThreatQnair :threat="selectedThreatObject" qnair-type="TLK" />
                </div>
            </Tab>
        </Questionnaire>
    </Modal>
</template>
