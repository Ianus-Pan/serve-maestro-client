<template>
    <div class="relative">
        <div class="flex items-center">
            <input type="text" v-model="query" @input="onInput" @keydown.enter.prevent="onEnter"
                class="px-4 py-2 ring-2 ring-[#bdb9b5] border-0 rounded w-full" placeholder="Search address..." />
        </div>
        <ul v-if="suggestions.length && showSuggestions"
            :class="['absolute w-full bg-white border rounded shadow-lg z-50', dropdownClass]">
            <li v-for="suggestion in suggestions" :key="suggestion.id" @click="selectSuggestion(suggestion)"
                class="px-4 py-2 cursor-pointer hover:bg-gray-200">
                {{ suggestion.place_name }}
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const emit = defineEmits(['addressSelected'])

const props = defineProps({
    dropdownDirection: {
        type: String,
        default: 'up',
        validator: (value) => ['up', 'down'].includes(value)
    }
})

const query = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)
const selectedAddress = ref('')
const lat = ref('')
const lng = ref('')

const dropdownClass = computed(() => {
    return props.dropdownDirection === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'
})

const onInput = async () => {
    if (query.value.trim()) {
        try {
            const response = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                    query.value
                )}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
            )
            suggestions.value = response.data.features
            showSuggestions.value = true
        } catch (error) {
            console.error('Failed to fetch address suggestions:', error)
        }
    } else {
        suggestions.value = []
        showSuggestions.value = false
    }
}

const onEnter = () => {
    if (suggestions.value.length > 0) {
        selectSuggestion(suggestions.value[0])
    }
}

const selectSuggestion = (suggestion) => {
    selectedAddress.value = suggestion.place_name
    lat.value = suggestion.center[1]
    lng.value = suggestion.center[0]
    query.value = '' // Clear the search field
    showSuggestions.value = false
    emit('addressSelected', {
        address: selectedAddress.value,
        lat: lat.value,
        lng: lng.value
    })
}
</script>

<style>
/* Add any custom styles here */
</style>
