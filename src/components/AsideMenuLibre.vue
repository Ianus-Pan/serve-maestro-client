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
import { useLibreMapStore } from '@/stores/libreMap';

import DynamicForm from '@/components/DynamicForm.vue';

const srvCase = useSrvCaseStore()
const srvThreat = useSrvThreatStore()
const canEdit = ref(true)

const schema = useSrvElementSchemasStore()
const libreMap = useLibreMapStore()

function formSubmit(params) {
    if (!validateFormSubmit()) {
        buttonStatus.value = 'error'
        statusMessage.value = 'Please complete the form first'
        // Reset button state after 2 seconds
        setTimeout(() => { buttonStatus.value = 'default'; statusMessage.value = '' }, 2000)
        return
    }

    libreMap.apiSaveEditArea()
}
function formDelete(params) {
    libreMap.apiDeleteEditArea()
}
function formCancel(params) {
    libreMap.currentEditArea.feature = null
}

function validateFormSubmit() {
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
    return allTrue
}

// ==========================================================================================

const errors = ref({})

const buttonStatus = ref('default') // Tracks button state ('default', 'success', 'error')
const statusMessage = ref('') // Holds success or error message

const modalShow = ref(false)

function areaQnairClick() {
    if (!srvThreat.getSrvThreat) {
        srvCase.notify({ message: "No Threat Selected" })
        return
    }
    modalShow.value = true
    // genQnairForm()
}
const opacityClass = computed(() => libreMap.currentEditArea.feature ? 'opacity-100' : '')
const btnClass= "bg-cl_background-300 dark:bg-cl_background-300-dark hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark"
function onRadialRangePass(message) {
    srvCase.notify({ img: "/icons/warning.svg", message, title: "Range Selection" })
}
</script>

<template>
    <div class="bg-cl_background-100 dark:bg-cl_background-100-dark transition-all">
        <div :class="opacityClass" class="opacity-0 h-full transition-opacity duration-1000">
            <form v-if="libreMap.currentEditArea.feature" class="flex flex-col h-full overflow-y-auto space-y-2">
                <div class="z-50 sticky top-0 bg-cl_background-100 rounded-b-md ">
                    <div class=" flex justify-between  p-2">
                        <Button @click.prevent="formCancel" class="w-10 h-10 p-2" :class="btnClass" img="/icons/cancel.svg" />
                        <!-- <Button v-show="libreMap.stateMachine.current === 'EDIT' && canEdit" @click.prevent="formEdit"
                            class="text-red-600 w-10 h-10 p-2 bg-white" img="/icons/edit.svg" /> -->
                        <Button v-show="canEdit && libreMap.currentEditArea.feature._id" @click.prevent="formDelete"
                            class="w-10 h-10 p-2" :class="btnClass" img="/icons/delete.svg" />
                    </div>
                    <div v-if="libreMap.currentEditArea.feature" class="flex flex-col items-center">
                        <span class=""> {{ libreMap.currentEditArea.feature.properties.element.title }}</span>
                        <button @click.prevent="() => libreMap.goToElement(libreMap.currentEditArea.feature.properties.element._id)"
                            class="flex gap-1 group justify-center items-center">
                            <img class="h-4 w-4 group-hover:animate-ping" src="/icons/buttons/locate.svg" alt="">
                            <span class="font-bold"> {{ libreMap.currentEditArea.feature.properties.element.name }}</span>
                        </button>
                    </div>
                </div>
                <span v-if="libreMap.currentEditArea.feature">
                    <DynamicForm class="flex flex-col gap-2"
                        :schemas="schema.srvElementSchemas"
                        :form-data="libreMap.currentEditArea.feature"
                        :form-errors="errors"
                        :form-schema-type="libreMap.currentEditArea.feature.properties.element.category"
                        :component-props="{ range: { onRangePass: onRadialRangePass } }" />
                </span>
                <!-- if is AREA && is not temp -->
                <div v-if="libreMap.currentEditArea.feature?.properties.element.category === 'AREA' && libreMap.currentEditArea.feature?._id">
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
                            <AreaQnair :element-id="libreMap.currentEditArea.feature._id" qnair-type="AAT" />
                        </Tab>
                        <Tab class="flex" :disabled="!srvThreat.selectedSrvThreat" label="Vulnerability">
                            <AreaQnair :element-id="libreMap.currentEditArea.feature._id"
                                qnair-type="AVA" />
                        </Tab>
                        <Tab class="flex" :disabled="!srvThreat.selectedSrvThreat" label="Impact">
                            <AreaQnair :element-id="libreMap.currentEditArea.feature._id" v-if="srvThreat.selectedSrvThreat"
                                qnair-type="AIM" />
                        </Tab>
                    </Questionnaire>
                </Modal>
            </form>
        </div>
    </div>
</template>
