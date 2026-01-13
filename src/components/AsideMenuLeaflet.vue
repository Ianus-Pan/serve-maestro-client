<script setup>
import Button from '@/components/Button.vue';
import FormSection from '@/components/FormSection.vue';
import Modal from '@/components/Modal.vue';
import AreaQnair from '@/components/AreaQnair.vue';
import Questionnaire from '../partials/Questionnaire.vue';
import Tab from '@/components/Tab.vue';
import { watch, computed, ref, reactive, shallowRef, onMounted, shallowReactive } from 'vue'
import { useSrvElementSchemasStore } from '@/stores/srvElementSchema.js';
import { useSrvCaseStore } from '@/stores/srvCase'
import { useSrvThreatStore } from '@/stores/srvThreat.js';
import { useSrvQnairSchemasStore } from '@/stores/srvQnairSchema'
import { leafletMap } from '@/stores/leafletMap'
import axiosInstance from '@/services/axiosInstance'
import laravelServer from '@/api/laravelServer';

// TODO: fix spamming of submit button !!!!!
// Post is handled inside of Map, will have to pull post outside Map for correcteness

import DynamicForm from '@/components/DynamicForm.vue';

import useApi from '@/composables/api.js';

const srvCaseStore = useSrvCaseStore()
const serveApi = useApi(axiosInstance)

const srvThreat = useSrvThreatStore()
const canEdit = ref(true)

const schema = useSrvElementSchemasStore()
const leafMap = leafletMap()

function formSubmit(params) {
    let allTrue = true
    for (const section of Object.values(errors.value)) {
        for (const [field_idx, valid] of Object.entries(section)) {
            if (valid !== true) {
                console.log(field_idx,valid)
                allTrue = false;
                break;
            }

        }
    }
    if (!allTrue) {
        buttonStatus.value = 'error'
        statusMessage.value = 'Please complete the form first'
        // Reset button state after 2 seconds
        setTimeout(() => { buttonStatus.value = 'default'; statusMessage.value = '' }, 2000)
        return
    }

    leafMap.stateMachine.transition("IDLE", true)
}
function formCancel(params) {
    leafMap.stateMachine.transition("IDLE", false)
}
function formEdit(params) {

}
function formDelete() {

    leafMap.elementDELETE(leafMap.currentElement._id)
    leafMap.stateMachine.transition("IDLE", false)



}

// ==========================================================================================

const errors = ref({})

const error = ref(null)

const buttonStatus = ref('default') // Tracks button state ('default', 'success', 'error')
const statusMessage = ref('') // Holds success or error message

const modalShow = ref(false)

function areaQnairClick() {
    if (!srvThreat.getSrvThreat) {
        leafMap.notify({ message: "No Threat Selected" })
        return
    }
    modalShow.value = true
    // genQnairForm()
}
const opacityClass = computed(() => leafMap.currentElement ? 'opacity-100' : '')
const btnClass= "bg-cl_background-300 dark:bg-cl_background-300-dark hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
function onRadialRangePass(message) {
    leafMap.notify({ img: "/icons/warning.svg", message, title: "Range Selection" })
}
</script>

<template>
    <div class="bg-cl_background-100 dark:bg-cl_background-100-dark transition-all">
        <div :class="opacityClass" class="opacity-0 h-full transition-opacity duration-1000">
            <form v-if="leafMap.currentElement" class="flex flex-col h-full overflow-y-auto space-y-2">
                <div class="z-50 sticky top-0 bg-cl_background-100 rounded-b-md ">
                    <div class=" flex justify-between  p-2">
                        <Button @click.prevent="formCancel" class="w-10 h-10 p-2" :class="btnClass" img="/icons/cancel.svg" />
                        <!-- <Button v-show="leafMap.stateMachine.current === 'EDIT' && canEdit" @click.prevent="formEdit"
                            class="text-red-600 w-10 h-10 p-2 bg-white" img="/icons/edit.svg" /> -->
                        <Button v-show="leafMap.stateMachine.current === 'EDIT' && canEdit" @click.prevent="formDelete"
                            class="w-10 h-10 p-2" :class="btnClass" img="/icons/delete.svg" />
                    </div>
                    <div v-if="leafMap.currentElement" class="flex flex-col items-center">
                        <span class="capitalize ">{{ leafMap.stateMachine.current.toLowerCase() + 'ing ' }}</span>
                        <span class=""> {{ leafMap.currentElement.properties.element.title }}</span>
                        <button @click.prevent="() => leafMap.centerToLayerBounds(leafMap.currentElement.layer)"
                            class="flex gap-1 group justify-center items-center">
                            <img class="h-4 w-4 group-hover:animate-ping" src="/icons/buttons/locate.svg" alt="">
                            <span class="font-bold"> {{ leafMap.currentElement.properties.element.name }}</span>
                        </button>
                    </div>
                </div>
                <span v-if="leafMap.currentElement">
                    <DynamicForm class="flex flex-col gap-2"
                        :schemas="schema.srvElementSchemas"
                        :form-data="leafMap.currentElement"
                        :form-errors="errors"
                        :form-schema-type="leafMap.currentElement.properties.element.category"
                        :component-props="{ range: { onRangePass: onRadialRangePass } }" />
                </span>
                <!-- if is AREA && is not temp -->
                <div v-if="leafMap.currentElement?.properties.element.category === 'AREA' && leafMap.currentElement?._id">
                    <FormSection label="Assessment" class="text-lg text-gray-900 bg-cl_background-300 dark:bg-cl_background-300-dark rounded font-bold p-1"
                        help="Fill in the questionnaires to be able to Assess this area">
                        <Button
                            v-tooltip="{ content: 'Please select a threat first.', disabled: !!srvThreat.selectedSrvThreat, }"
                            :disabled="!srvThreat.selectedSrvThreat" @click.prevent="areaQnairClick"
                            class="bg-cl_accent-100 dark:bg-cl_accent-100-dark text-gray-50 m-2">Questionnaires</Button>
                    </FormSection>
                </div>

                <Button @click.prevent="formSubmit" class="text-gray-50 bg-cl_accent-100 dark:bg-cl_accent-100-dark transition-all flex gap-2 justify-center items-center p-6 rounded m-2">
                    <img class="invert saturate-0 brightness-[30%] w-5 h-5" src="/icons/save.svg" alt="" />
                    <div>Save</div>
                </Button>

                <!-- <Button @click.prevent="formSubmit" class="w-10 h-10 p-2 bg-white self-center" img="/icons/save.svg" /> -->

                <Modal :show="modalShow" @close="modalShow = !modalShow">
                    <Questionnaire img="/icons/questionnaire_white.svg" title="Area Questionnaire"
                        description="Fill in the Attractiveness, Vulnerability & Threat Impact for the Area">
                        <Tab class="flex" label="Attractiveness">
                            <AreaQnair :element-id="leafMap.currentElement._id" qnair-type="AAT" />
                        </Tab>
                        <Tab class="flex" :disabled="!srvThreat.selectedSrvThreat" label="Vulnerability">
                            <AreaQnair :element-id="leafMap.currentElement._id"
                                qnair-type="AVA" />
                        </Tab>
                        <Tab class="flex" :disabled="!srvThreat.selectedSrvThreat" label="Impact">
                            <AreaQnair :element-id="leafMap.currentElement._id" v-if="srvThreat.selectedSrvThreat"
                                qnair-type="AIM" />
                        </Tab>
                    </Questionnaire>
                </Modal>
            </form>
        </div>
    </div>
</template>
