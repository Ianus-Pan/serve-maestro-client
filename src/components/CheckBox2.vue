<template>
  <label class="flex items-center cursor-pointer">
    <input
      type="checkbox"
      v-model="isChecked"
      class="hidden"
      @change="emitChange"
    />
    <div
      class="w-6 h-6 border-2 border-gray-300 rounded-md flex items-center justify-center transition-colors duration-200"
      :class="{
        'bg-blue-500 border-blue-500': isChecked,
        'bg-white': !isChecked
      }"
    >
      <svg
        v-if="isChecked"
        class="w-4 h-4 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>
    <span class="ml-2 text-gray-700">{{ label }}</span>
  </label>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const isChecked = ref(props.modelValue);

const emitChange = () => {
  emit('update:modelValue', isChecked.value);
};
</script>
