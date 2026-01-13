<script setup>
import { provide, ref, computed, watch } from 'vue'
const props = defineProps({
    disabled: { type: Boolean },
    init_radio: { type: Number }
});

// TODO: maybe geting a ref to the button is better?
// Could scroll to them
const radios = ref([])
const curr_radio = defineModel({ type: [ Number, null ] })
curr_radio.value = props.init_radio
const group_disabled = computed(() => {
    return props.disabled
});


provide("radiogroup_provider", {
    add_radio: function (radio) {
        const radio_index = radios.value.length;
        radios.value.push(radio);
        return radio_index;
    },
    curr_radio,
    group_disabled
})

</script>
<template>
    <div>
        <slot />
    </div>
</template>
