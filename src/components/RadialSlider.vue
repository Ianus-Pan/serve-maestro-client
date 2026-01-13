<script setup>
import { ref, computed ,watch} from 'vue';


const props = defineProps({
    range: { type: Array, default: [0, 360] },
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
});

const model = defineModel({ type: Number, default: 0 })

const emit = defineEmits(['onDragEnd']);

const angle = ref(valueToAngle(model.value));

const sliderRef = ref(null);
const knobRef = ref(null);

// watch(model, (newModel, oldModel) => {
//
//     angle.value = (valueToAngle(newModel));
// });
watch(model, (newModel, oldModel) => {
    angle.value = (valueToAngle(newModel));
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
function updateKnobStyle() {
    if (!knobRef.value) return;
    if (!sliderRef.value) return;
    const knobRect = knobRef.value.getBoundingClientRect();
    const sliderRect = sliderRef.value.getBoundingClientRect();

    const knobRadius = knobRect.width / 2;
    const sliderRadius = sliderRect.width / 2;

    const r = sliderRadius;
    const x = r + r * Math.cos((angle.value - 90) * (Math.PI / 180)) - knobRadius;
    const y = r + r * Math.sin((angle.value - 90) * (Math.PI / 180)) - knobRadius;

    return {
        left: `${x}px`,
        top: `${y}px`,
    };

}

const knobStyle = computed(updateKnobStyle);

const startDrag = () => {
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
};
const stopDrag = () => {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    emit('onDragEnd', model.value);
};

/**
 * Handles the dragging of the knob.
 *
 * @param {MouseEvent} event - The mousemove event.
 */
const onDrag = (event) => {
    if (!sliderRef.value) return;
    const rect = sliderRef.value.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const newAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    angle.value = Math.round((newAngle + 360) % 360);
    model.value = angleToValue(angle.value)
};

const disable_on = computed(() => {
    return props.disabled ? {} : { mousedown: startDrag }
});
const disable_class = computed(() => {
    return props.disabled ? "cursor-normal brightness-75 saturate-50 w-4 h-4" : "cursor-pointer w-8 h-8 "
});
// New computed property for the background fill
// const backgroundStyle = computed(() => {
//     const per = Math.round(getPercentage(props.range[0], props.range[1], model.value))
//     return {
//         background: `conic-gradient(rgb(174, 217, 145,90%) ${angle.value}deg, transparent ${angle.value}deg)`,
//         // background: `radial-gradient(circle at 30% 100%, rgb(174, 217, 145,90%) ${per}% )`,
//     };
// });

function getPercentage(min, max, value) {
    return ((value - min) / (max - min)) * 100;
}
const path = computed(() => {
    const radius = 20;
    const startAngle = 0;
    const endAngle = angle.value;
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    const x = radius + radius * Math.cos((angle.value - 90) * (Math.PI / 180));
    const y = radius + radius * Math.sin((angle.value - 90) * (Math.PI / 180));
    const path = `M ${radius},0 A ${radius},${radius} 0 ${largeArcFlag} 1 ${x}, ${y}`;
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
                <path stroke-linecap="round" :d="path" stroke-width="4" stroke="rgb(174, 217, 145,95%)" width="100%"
                    height="100%" fill="none" />
            </svg>
            <div>
                <slot name="indicator" v-bind="{ model }">
                    {{ prefix }}{{ model }} {{ suffix }}
                </slot>
            </div>
            <div ref="knobRef" :class="[disable_class, knobClasses]" class="select-none absolute rounded-full z-40 "
                :style="knobStyle" v-on="disable_on"></div>

        </div>
    </div>
</template>
