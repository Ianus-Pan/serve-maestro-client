<script setup>
import { watch, onMounted, ref } from 'vue';

const props = defineProps({
    required: Boolean,
    area: { type: Boolean, default: false },
    type: { type: String, default: "text" }
});
const model = defineModel({
});

const inputRef = ref(null);

onMounted(() => {
    if (inputRef.value.hasAttribute('autofocus')) {
        inputRef.value.focus();
    }
});

defineExpose({ focus: () => inputRef.value.focus() });
const emit = defineEmits(['valid']);

watch(model, (newValue) => {
    validate(newValue);
});

function validate(value) {
    // NOTE: ampa validates "    " <- this as invalid
    if (props.required  && props.type === 'text' &&  value.trim().length === 0) {
        emit('valid', 'Input is required.');
        return;
    }

    // Validation function
    // https://vuejs.org/guide/essentials/forms#number
    // The number modifier is applied automatically if the input has type="number".
    if (props.type === 'number' && value === "") {
        emit('valid', 'Invalid number provided.');
        return;
    }

    emit('valid', true); // Validation passed
}
</script>

<template>
    <textarea v-if="area" class="bg-cl_background-100 dark:bg-cl_background-100-dark border-cl_background-400 dark:border-cl_background-400-dark focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
        v-model="model" ref="inputRef" />
    <input v-else :type='props.type'
        class="bg-cl_background-100 dark:bg-cl_background-100-dark border-cl_background-400 dark:border-cl_background-400-dark focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
        v-model="model"
        ref="inputRef" />
</template>
