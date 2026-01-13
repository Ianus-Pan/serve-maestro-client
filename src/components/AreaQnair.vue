<script setup>
import { reactive, ref, onMounted, toRaw, watch } from 'vue'
import DynamicForm from '@/components/DynamicForm.vue';
import { useForm } from '@/composables/form.js'
import Spinner from '@/components/Spinner.vue';
import Button from '@/components/Button.vue';

import laravelServer from '@/api/laravelServer';

import { useSrvThreatStore } from '@/stores/srvThreat'
import { useSrvQnairSchemasStore } from '@/stores/srvQnairSchema'
import { useSrvCaseStore } from '@/stores/srvCase'

const srvThreat = useSrvThreatStore()
const srvCaseStore = useSrvCaseStore()
const schema = useSrvQnairSchemasStore()

const props = defineProps({
    qnairType: { type: String },
    elementId: { type: String }
})

const error = ref(null)

const buttonStatus = ref('default') // Tracks button state ('default', 'success', 'error')
const statusMessage = ref('') // Holds success or error message

onMounted(async () => {
    setLoading(true)

    const case_id = srvCaseStore.selectedSrvCase
    const threat = srvThreat.getSrvThreat()
    const threat_id = threat?._id ?? null

    // BUG: if this is called with out a selected thread it throws
    const qnairAnswers = await laravelServer.ANSWERS.GET.all(case_id, threat_id)
    setLoading(false)
    
    if (threat_id !== null) {
        const threatQnairAnswers = qnairAnswers.filter((qnair) => qnair.type === "TDF" || qnair.type === "TLK")
        if (threatQnairAnswers.length != 2 && props.qnairType === "AIM") {
            console.warn(`Threat (${threat_id}) is missing qnairs\n\tThreat Qnairs:`, threatQnairAnswers)
            const threat_qnairs = new Map([["TDF", "Definition"], ["TLK", "Likelihood"]])
            const allQnairs = new Set(["TDF", "TLK"])
            const filledQnairs = new Set(threatQnairAnswers.map((ans) => ans.type))
            const missingQnairs = Array.from(allQnairs.difference(filledQnairs)).map((type) => threat_qnairs.get(type))

            error.value = `Threat "${threat.title}" is missing ${missingQnairs.join(" and ")} for this Case. Please fill the Questionnaires before continuing.`
            return
        } else {
            qnair.threat_type = threat.type
        }
    }
    const areaQnairAnswers = qnairAnswers.filter((qnair) => qnair.element_id === props.elementId)
    const areaQnairAnswer = areaQnairAnswers.find((qnair) => qnair.type === props.qnairType)

    if (areaQnairAnswer) {
        qnair._id = areaQnairAnswer._id
        qnair.case_id = areaQnairAnswer.case_id
        qnair.threat_id = areaQnairAnswer.threat_id
        qnair.element_id = areaQnairAnswer.element_id
        qnair.fields = areaQnairAnswer.fields
    } else {
        qnair.case_id = case_id
        qnair.threat_id = threat_id
        qnair.element_id = props.elementId
    }
    
})

const qnair = reactive({
    _id: null,
    case_id: null,
    threat_id: null,
    element_id: null,
    type: props.qnairType,
    fields: {},
})
const errors = reactive([])

function postAnswers() {
    let allTrue = true
    for (const section of Object.values(errors)) {
        for (const [field_idx, valid] of Object.entries(section)) {
            if (valid !== true) {
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
    const { threat_type, ...payload } = toRaw(qnair)

    setLoading(true)
    laravelServer.ANSWERS.POST.single(payload)
        .then((value) => {
            console.log("SUCCESS: ", value)
            buttonStatus.value = 'success'
            statusMessage.value = 'Saved successfully!'
            // Reset button state after 2 seconds
            setTimeout(() => { buttonStatus.value = 'default'; statusMessage.value = '' }, 2000)
            // TODO : replace whole object
            qnair._id = value[0]._id
        })
        .catch((error) => {
            console.log(`FAILURE: ${error.status} - ${error.message}`)
            buttonStatus.value = 'error'
            statusMessage.value = error.message
            // Reset button state after 2 seconds
            setTimeout(() => { buttonStatus.value = 'default'; statusMessage.value = '' }, 2000)
        })
        .finally(() => setLoading(false))
}

import { h, defineComponent } from 'vue'
import { useLoading } from 'vue-loading-overlay';

const selection_single_slotComponent = defineComponent({
    props: ['label', 'description'],
    setup(props) {
        return () => h('div', {}, [
            h('div', {}, `${props.label}`),
            h('div', { class: "text-xs font-normal" }, `${props.description}`)

        ])
    }
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
    <div class="w-full h-full items-center justify-center ">
        <div ref="loadRef">
            <div class="flex flex-col" v-if="!loading && !error">
                <DynamicForm class="flex flex-col gap-2" :schemas="schema.srvQnairSchemas" :form-data="qnair"
                    :form-schema-type="qnairType" :form-errors="errors"
                    :component-props="{ select_single: { slotComponent: selection_single_slotComponent } }" />
                    
                <Button :disabled="loading" @click.prevent="postAnswers" :class="[
                        'transition-all flex gap-2 justify-center items-center p-2 rounded m-2',
                        buttonStatus === 'success' ? 'bg-emerald-500' :
                            buttonStatus === 'error' ? 'bg-red-500' :
                                'bg-cl_accent-100 dark:bg-cl_accent-100-dark',
                        'text-gray-200'
                    ]">
                    <img class="invert saturate-0 brightness-[30%] w-5 h-5" src="/icons/save.svg" alt="" />
                    <div>{{ statusMessage || 'Save' }}</div>
                </Button>
            </div>
            <div v-if="!loading && error" style="color: #aa0000">
                {{ error }}
            </div>
        </div>
    </div>
</template>
