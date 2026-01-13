<script setup>
import { reactive, ref, onMounted, toRaw } from 'vue'
import DynamicForm from '@/components/DynamicForm.vue';
import Spinner from '@/components/Spinner.vue';
import Button from '@/components/Button.vue';

// import { useSrvThreatStore } from '@/stores/srvThreat'
import { useSrvQnairSchemasStore } from '@/stores/srvQnairSchema'
import { useSrvCaseStore } from '@/stores/srvCase'

// const srvThreatStore = useSrvThreatStore()
const srvCaseStore = useSrvCaseStore()
const schema = useSrvQnairSchemasStore()
import laravelServer from '@/api/laravelServer';
import { useLoading } from 'vue-loading-overlay';

const props = defineProps({
    threat: { type: Object },
    qnairType: { type: String },
})

const buttonStatus = ref('default') // Tracks button state ('default', 'success', 'error')
const statusMessage = ref('') // Holds success or error message

// NOTE: maybe there is a better way for this?
// THere is the <Suspense/> component but its not stable ( docs )
onMounted(async () => {
    setLoading(true)

    const case_id = srvCaseStore.selectedSrvCase
    const threat_id = props.threat._id
    const threat_type = props.threat.type

    if (props.threat.case_has_qnnaires.includes(props.qnairType)) {
        const qnairAnswers = await laravelServer.ANSWERS.GET.all(case_id, threat_id)
        const qnairAnswer = qnairAnswers.find((qnair) => qnair.type === props.qnairType)
        qnair._id = qnairAnswer._id
        qnair.case_id = qnairAnswer.case_id
        qnair.threat_id = qnairAnswer.threat_id
        qnair.element_id = qnairAnswer.element_id
        qnair.fields = qnairAnswer.fields
    } else {
        qnair.case_id = case_id
        qnair.threat_id = threat_id
    }
    qnair.threat_type = threat_type
    
    setLoading(false)
})

const qnair = reactive({
    _id: null,
    case_id: null,
    threat_id: null,
    element_id: null,
    type: props.qnairType,
    threat_type: null,
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
            // console.log("QN Answer Res: ", value)
            
            buttonStatus.value = 'success'
            statusMessage.value = 'Saved successfully!'
            // Reset button state after 2 seconds
            qnair._id = value[0]._id
            setTimeout(() => { buttonStatus.value = 'default'; statusMessage.value = '' }, 2000)
        })
        .catch((error) => {
            // console.log("QN Answer Err: ", error)

            buttonStatus.value = 'error'
            statusMessage.value = error.message
            // Reset button state after 2 seconds
            setTimeout(() => { buttonStatus.value = 'default'; statusMessage.value = '' }, 2000)
        })
        .finally(() => setLoading(false))
}


/**
 * LOADER
 */

const loadRef = ref(null)
const $loader = ref(null)
const loadOverlay = useLoading({
    loader: 'dots',
    // width: 128,
    active: true,
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
            <div class="flex flex-col" v-if="!loading">
                <DynamicForm
                    class="flex flex-col gap-2"
                    :schemas="schema.srvQnairSchemas"
                    :form-data="qnair"
                    :form-schema-type="qnairType"
                    :form-errors="errors" />
                    
                <Button @click.prevent="postAnswers" :class="[
                    'transition-all flex gap-2 justify-center items-center p-2 rounded m-2',
                    buttonStatus === 'success' ? 'bg-emerald-500' :
                        buttonStatus === 'error' ? 'bg-red-500' :
                            'bg-cl_accent-100',
                    'text-gray-200'
                ]">
                    <img class="invert saturate-0 brightness-[30%] w-5 h-5" src="/icons/save.svg" alt="" />
                    <div>{{ statusMessage || 'Save' }}</div>
                </Button>
            </div>
        </div>
    </div>
</template>
