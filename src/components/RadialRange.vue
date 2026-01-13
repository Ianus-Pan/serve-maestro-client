<script setup>
import { ref, computed, onMounted, watch } from 'vue';


const props = defineProps({
    range: { type: Array, default: [0, 100] },
    disabled: { type: Boolean },
    suffix: { type: String },
    prefix: { type: String },
    sliderClasses: {
        type: String,
        default: "bg-white",
    },
    knobClasses: {
        type: String,
        default: "bg-black",
    },
    onRangePass: { type: Function }
});

const model = defineModel({
    type: Object,
    default: { min: 0, max: 100 },

})

// // Watch for changes in model.min and model.max
// watch(() => model.value.min, (newMin) => {
//     startAngle.value = valueToAngle(newMin);
// });
//
// watch(() => model.value.max, (newMax) => {
//     endAngle.value = valueToAngle(newMax);
// });

const emit = defineEmits(['onDragMax', 'onDragMin']);

const startAngle = ref(valueToAngle(model.value.min));
const endAngle = ref(valueToAngle(model.value.max));

const startKnobRef = ref(null);
const endKnobRef = ref(null);

const sliderRef = ref(null);

onMounted(() => {
    if (model.value.min < props.range[0]) {
        props.onRangePass?.("Start of range exceeded the range limits, truncating to min.")
        model.value.min = props.range[0]
    }
    if (model.value.max > props.range[1]) {
        props.onRangePass?.("End of range exceeded the range limits, truncating to max.")
        model.value.max = props.range[1]
    }

});
watch(model, (newModel, oldModel) => {

    if (newModel.min < props.range[0]) {
        props.onRangePass?.("Start of range exceeded the range limits, truncating to min.")
        model.value.min = props.range[0]
    }
    if (newModel.max > props.range[1]) {
        props.onRangePass?.("End of range exceeded the range limits, truncating to max.")
        model.value.max = props.range[1]
    }
    startAngle.value = (valueToAngle(newModel.min));
    endAngle.value = (valueToAngle(newModel.max));
});

/**
 * Computes the value based on the angle.
 *
 * @param {number} angle - The angle in degrees to convert to a value.
 * @returns {number} The value.
 */
function angleToValue(angle) {
    const range = props.range[1] - props.range[0];
    return Math.round(((angle + 360) % 360) / 360 * range + props.range[0]);
}

/**
 * Computes the angle based on the value.
 *
 * @param {number} val - The value to convert to an angle.
 * @returns {number} The angle in degrees.
 */
function valueToAngle(val) {
    const range = props.range[1] - props.range[0];
    return ((val - props.range[0]) / range) * 360;
}

/**
 * Computes the style for the knob based on the current angle.
 *
 * @returns {Object} The CSS style object for positioning the knob.
 */
function updateKnobStyle(knobRef, angle) {
    if (!knobRef) return;
    if (!sliderRef.value) return;
    const knobRect = knobRef.getBoundingClientRect();
    const sliderRect = sliderRef.value.getBoundingClientRect();

    const knobRadius = knobRect.width / 2;
    const sliderRadius = sliderRect.width / 2;

    const r = sliderRadius;
    const x = r + r * Math.cos((angle - 90) * (Math.PI / 180)) - knobRadius;
    const y = r + r * Math.sin((angle - 90) * (Math.PI / 180)) - knobRadius;

    return {
        left: `${x}px`,
        top: `${y}px`,
        // transform: `rotate(${angle - 90}deg)`
    };

}

const startKnobStyle = computed(() => updateKnobStyle(startKnobRef.value, startAngle.value));
const endKnobStyle = computed(() => updateKnobStyle(endKnobRef.value, endAngle.value));
const startDragMin = () => {
    document.addEventListener('mousemove', onDragMin);
    document.addEventListener('mouseup', stopDragMin);
};
const stopDragMin = () => {
    document.removeEventListener('mousemove', onDragMin);
    document.removeEventListener('mouseup', stopDragMin);
    emit('onDragMin', model.value.min);
};
const startDragMax = () => {
    document.addEventListener('mousemove', onDragMax);
    document.addEventListener('mouseup', stopDragMax);
};
const stopDragMax = () => {
    document.removeEventListener('mousemove', onDragMax);
    document.removeEventListener('mouseup', stopDragMax);
    emit('onDragMax', model.value.max);
};

/**
 * Handles the dragging of the knob.
 */
const onDragMin = (event) => {
    if (!sliderRef.value) return;
    const rect = sliderRef.value.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const newAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    const boundedAngle = Math.round((newAngle + 360) % 360);
    if (boundedAngle >= endAngle.value) return;

    startAngle.value = boundedAngle
    model.value.min = angleToValue(startAngle.value)
};
const onDragMax = (event) => {
    if (!sliderRef.value) return;
    const rect = sliderRef.value.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const newAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    const boundedAngle = Math.round((newAngle + 360) % 360);
    if (boundedAngle <= startAngle.value) return;

    endAngle.value = boundedAngle;
    model.value.max = angleToValue(endAngle.value)
};

const disable_end_on = computed(() => {
    return props.disabled ? {} : { mousedown: startDragMax }
});
const disable_start_on = computed(() => {
    return props.disabled ? {} : { mousedown: startDragMin }
});
const disable_class = computed(() => {
    return props.disabled ? "cursor-normal brightness-75 saturate-50 w-4 h-4" : "cursor-pointer w-8 h-8 "
});

function getPercentage(min, max, value) {
    return ((value - min) / (max - min)) * 100;
}
const path = computed(() => {
    const radius = 20;
    const start_angle = startAngle.value;
    const end_angle = endAngle.value;
    const angle = end_angle - start_angle
    const largeArcFlag = angle <= 180 ? 0 : 1;
    const s_x = radius + radius * Math.cos((start_angle - 90) * (Math.PI / 180));
    const s_y = radius + radius * Math.sin((start_angle - 90) * (Math.PI / 180));
    const e_x = radius + radius * Math.cos((end_angle - 90) * (Math.PI / 180));
    const e_y = radius + radius * Math.sin((end_angle - 90) * (Math.PI / 180));
    // const path = `M ${radius},0 A ${radius},${radius} 0 ${largeArcFlag} 1 ${e_x}, ${e_y}`;
    const path = `M ${s_x},${s_y} A ${radius},${radius} 0 ${largeArcFlag} 1 ${e_x.toFixed(4)},${e_y.toFixed(4)}`;
    return path;
});

</script>

<template>
    <div class="m-3 select-none flex items-center justify-center">
        <div ref="sliderRef" :class="sliderClasses"
            class="overflow-visible select-none transition relative w-40 h-40 rounded-full flex items-center justify-center">
            <div class="flex align-bottom items-end absolute text-[0.640rem] gap-1 top-0 z-20">
                <div class="w-8 text-gray-700 overflow-visible text-right">{{ range[1] }}</div>
                <div class="w-[2px] h-8 bg-gray-600 rounded-full"></div>
                <div class="w-8 text-gray-700  overflow-visible text-left">{{ range[0] }}</div>
            </div>
            <svg class="absolute overflow-visible inset-0 rounded-full drop-shadow-md z-30" viewBox="0 0 40 40">
                <path stroke-linecap="round" :d="path" stroke-width="4" stroke="rgb(74, 117, 245,95%)" width="100%"
                    height="100%" fill="none" />
            </svg>
            <div>
                <slot name="indicator" v-bind="{ model }">
                    {{ prefix }}{{ model.min }} {{ suffix }} - {{ prefix }} {{ model.max }} {{ suffix }}
                </slot>
            </div>
            <div ref="startKnobRef" :class="[disable_class, knobClasses]"
                class="z-40 select-none absolute rounded-full text-xs text-white flex items-center justify-center "
                :style="startKnobStyle" v-on="disable_start_on">min</div>
            <div ref="endKnobRef" :class="[disable_class, knobClasses]"
                class="z-40 select-none absolute rounded-full text-xs text-white flex items-center justify-center "
                :style="endKnobStyle" v-on="disable_end_on">max</div>

        </div>
    </div>
</template>
