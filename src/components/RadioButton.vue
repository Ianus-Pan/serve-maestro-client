<script setup>
import { onDeactivated } from 'vue';
import { inject, ref, onMounted, computed } from 'vue';
const props = defineProps({
    disabled: { type: Boolean },
    onActivate: { type: Function },
    onDeactivate: { type: Function }
});
const radioIndex = ref(null)

const { add_radio, curr_radio, group_disabled } = inject('radiogroup_provider', () => console.error(`ERROR:: Using RadioButton outside of RadioGroup component`), true);

onMounted(() => {
    radioIndex.value = add_radio();
});


const curr_radio_class = 'cursor-pointer bg-cl_accent-50 relative '
const radio_class = 'cursor-pointer border-cl_background-400 dark:border-cl_background-400-dark dark:hover:bg-cl_accent-50 hover:bg-cl_accent-50 bg-cl_background-100 dark:bg-cl_background-100-dark'
const disabled_class = 'opacity-50'

const disabled = computed(() => {
    return props.disabled || group_disabled.value
});

const selected = computed(() => {
    return curr_radio.value === radioIndex.value
});

const classes = computed(() => {
    if (disabled.value) {
        return disabled_class
    } else
        if (selected.value) {
            return curr_radio_class
        }
        else { return radio_class }
});

function onClick(event) {
    const value = +event.target.value
    const deactivated = value === curr_radio.value
    if (deactivated) {
        curr_radio.value = null
        props.onDeactivate?.()
    } else {
        curr_radio.value = value
        props.onActivate?.()
    }

}
</script>

<template>
    <label class="rounded-md select-none flex justify-center text-sm transition-all font-extralight border-[1px] " :class="classes">
        <slot />
        <input :disabled="disabled" type="radio" :value="radioIndex" @click="onClick" class="hidden" />
    </label>
</template>
