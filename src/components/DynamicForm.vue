<script setup>

import FormField from '@/components/FormField.vue';
import FormSection from '@/components/FormSection.vue';

import StyledInput from '@/components/StyledInput.vue';
import SelectionList from '@/components/SelectionList.vue';
import MultiSelectionList from '@/components/MultiSelectionList.vue';
import RadialSlider from '@/components/RadialSlider.vue';
import RadialRange from '@/components/RadialRange.vue';
import ColorPicker from '@/components/ColorPicker.vue';
import CheckBox2 from '@/components/CheckBox2.vue';

import { getPathValue, setPathValue } from '@/utils/object_deep_fields';
import { resolveSpec } from '@/utils/spec'

import { onUnmounted, onMounted, watch, shallowReactive, ref } from 'vue'

const props = defineProps({
    /** Overrides for the props

        { componentType : { propA:1 , propB:2 ,etc}}

    */
    componentProps: { type: Object },
    /** Overrides for defaults if none are provides

        { componentType : (field,form_data)=>{}

    */
    componentDefaults: { type: Object },
    /** The object to be modified */
    formData: { type: Object, required: true },
    formSchemaType: { type: String, required: true },
    formErrors: { type: Object, required: true },
    /** The schemas to be followed for the creation of the form */
    schemas: { type: Object, required: true },

    debug: { type: Boolean, default: false }
});


/**
    @typedef {Object} VueComp
    @property {Object} props
    @property {Component} component
    @property {VueComp} children

*/

/** @type {VueComp[]}
Inside FormUI there are VueComp objects to make up the dom tree for the form
The internal structure reflects the dom like so :

Sections :
    FormFields :
        Children (Inputs)

[
  {
    props:{}
    component: Section
    children:[
        {
        props:{}
        component: FormField
        children:[
            // this is an Input
            ...
        ]
     ]
  }

]
*/
const FormUI = shallowReactive([])

/**
 Supported Components
*/
const InputType2Component = {
    range: function (params) {
        return {
            component: RadialRange,
            props: {
                suffix: params.append,
                range: [params.min, params.max],
                ...(props?.componentProps?.range)
            }
        }


    },
    slider: function (params) {
        return {
            component: RadialSlider,
            props: {
                range: [params.min, params.max],
                suffix: params.append,
                ...(props?.componentProps?.slider)
            }
        }
    },
    string: function (params) {
        return {
            component: StyledInput, props: {
                type: "text",
                required: params.required,
                min: params.min,
                max: params.max,
                area: params.max ? false : true,
                ...(props?.componentProps?.string)
            }
        }
    },
    number: function (params) {
        return {
            component: StyledInput, props: {

                required: params.required,
                min: params.min,
                max: params.max,
                type: "number",
                ...(props?.componentProps?.number)
            }
        }
    },
    color: function (params) {
        return {
            component: ColorPicker, props: {
                ...(props?.componentProps?.color)
            }
        }

    },
    select_single: function (params) {
        return {
            component: SelectionList, props: {
                required: params.required,
                outsideClose: true,
                items: params.options,
                item_label_field: "label",
                item_id_field: "id",
                dropdownClasses: "mt-1 overflow-hidden ring-2 ring-gray-300 rounded w-full drop-shadow-md",
                ...(props?.componentProps?.select_single)
            }
        }

    },
    select_multiple: function (params) {
        return {
            component: MultiSelectionList, props: {
                required: params.required,
                outsideClose: true,
                items: params.options,
                item_label_field: "label",
                item_id_field: "id",
                dropdownClasses: "mt-1 rounded overflow-hidden ring-2 ring-gray-300 drop-shadow-md w-full",
                ...(props?.componentProps?.select_multiple)
            }
        }

    },
    checkbox: function (params) {
        return {
            component: CheckBox2, props: {
                ...(props?.componentProps?.checkbox)
            }
        }
    },
    // radio: function (params) {
    //
    //     return {
    //         component: "", props: {}
    //     }
    // },
}


const DefaultFromType = {
    string: () => "",
    number: () => 0,
    slider: (params) => params.max,
    // range: (params) => params.max,
    color: () => "#ff00004d",
    select_single: () => "",
    checkbox: () => false,
    select_multiple: () => []
}
/**
Form Generation Code
*/

function addField(form_ui, form_data, field) {

    const label = field.label 
    const params = field.params
    const path = params.path
    const input_type = params.type

    if( props.debug ) console.info("    ", label, " field - =========== ", params)

    const field_value = getPathValue(form_data, path)
    /**
     * Fix so that empty string "" doesn't return falsy,
     * making set_val reset to default
     */
    if (field_value == null || field_value == undefined) {

        /** Check if Default Value is taken from path */
        let def_val = typeof params.default === 'string' ?
            getPathValue(form_data, params.default ?? '') : null
        let set_val = def_val ?? params.default ?? DefaultFromType[input_type](params)
        
        // FIX: find a better fix for this stupid library
        if (params.type === "color") {
            set_val = { hex8: set_val }
        }
        setPathValue(form_data, path, set_val)
        if( props.debug ) console.info(`       Value -> '${path}' is : ${set_val}`)
    } else {
        if( props.debug ) console.info(`       Value <- '${path}' is : ${field_value}`)
    }

    const input = InputType2Component[input_type](params)

    form_ui.at(-1).children.push({
        props: { label, required: params?.required, help: field.description },
        update: (e) => { setPathValue(form_data, path, e) },
        path,
        component: FormField,
        children: [input]
    })
}

// Adding a Section to the Form UI structure
function addSection(form_ui, label, description) {
    if( props.debug ) console.info(label, " - section ===========")
    form_ui.push({
        props: { label, description },
        component: FormSection,
        children: []
    })
}

function genForm() {
    /** 
     * Reset Errors so they don't cause "Please complete the form first"
     * on Form Submission.
     */
    Object.keys(props.formErrors).forEach(error => delete props.formErrors[error])

    FormUI.length = 0
    const sections = resolveSpec(props.schemas, props.formData, props.formSchemaType)

    sections.forEach((s) => {
        addSection(FormUI, s.label, s.description)
        s.fields.forEach((f) => {
            addField(FormUI, props.formData, f)
        })
    })

    refreshValid.value += 1
}

const refreshValid = ref(0)
onMounted(() => {
    genForm()
})
watch(() => props.formData, () => {
    genForm()
}, {deep: true})

onUnmounted(() => {
    // TODO: the whole validation hack needs to be fixed....
    Object.keys(props.formErrors).forEach(error => delete props.formErrors[error])
})

// TODO: the whole validation hack needs to be fixed....
function validCB(validity, key) {
    // props.formErrors[key] = validity
    setPathValue(props.formErrors, key, validity, true)
}
</script>

<template>
    <div>
        <!-- <component :is="section.component" ...> could be used but for clarity i explicitly call it as is  -->
        <FormSection
            class="text-lg text-gray-900 bg-cl_background-300 dark:bg-cl_background-300-dark rounded font-bold p-1"
            v-for="(section, s_index) in FormUI" :key="s_index" v-bind="section.props">

                <!-- <component :is="field.component" ...> could be used but for clarity i explicitly call it as is  -->
                <FormField
                    class="text-sm px-3"
                    v-for="(field, f_index) in section.children"
                    :key="f_index"
                    :error-message="getPathValue(props.formErrors, `${s_index}.${f_index}`) === true ? null : getPathValue(props.formErrors, `${s_index}.${f_index}`)"
                    v-bind="field.props">
                
                <component
                    v-for="(input, i_index) in field.children"
                    :key="i_index"
                    :is="input.component"
                    :modelValue="getPathValue(props.formData, field.path)"
                    @valid="validity => validCB(validity, `${s_index}.${f_index}`)"
                    @update:modelValue="field.update"
                    :refreshValidTrigger="refreshValid"
                    v-bind="input.props">
                </component>
            </FormField>
        </FormSection>
    </div>
</template>
