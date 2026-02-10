<template>
  <div class="relative">
    <div class="flex items-center">
      <input
        type="text"
        v-model="query"
        @input="onInput"
        @keydown.enter.prevent="onEnter"
        class="px-4 py-2 border rounded shadow-lg w-full"
        placeholder="Search address..."
        v-bind="inputAttrs"
      />
      <button type="button" @click="openMapModal" class="ml-2 p-2">
        <!-- Replace with an actual map icon -->
        <i class="fa-solid fa-map-marked-alt text-xl"></i>
      </button>
    </div>
    <ul
      v-if="suggestions.length && showSuggestions"
      class="absolute w-full bg-white border rounded shadow-lg z-50"
    >
      <li
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        @click="selectSuggestion(suggestion)"
        class="px-4 py-2 cursor-pointer hover:bg-gray-200"
      >
        {{ suggestion.place_name }}
      </li>
    </ul>
    <MapModal
      v-if="showMapModal"
      @close="closeMapModal"
      @locationSelected="handleLocationSelected"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import MapModal from './MapModal.vue'

// Define props and emit
const props = defineProps(['placeholder', 'class', 'style'])
const emit = defineEmits(['addressSelected'])

// Initialize reactive variables
const query = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)
const showMapModal = ref(false)
const selectedAddress = ref('')
const lat = ref('')
const lng = ref('')

// Separate input-specific attributes
const inputAttrs = {
  placeholder: props.placeholder,
  class: props.class,
  style: props.style
}

// Event handler for input
const onInput = async () => {
  if (query.value.trim()) {
    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query.value
        )}.json?access_token=${import.meta.env.VITE_MAPBOX_KEY}`
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

// Event handler for enter key
const onEnter = () => {
  if (suggestions.value.length > 0) {
    selectSuggestion(suggestions.value[0])
  }
}

// Event handler for selecting a suggestion
const selectSuggestion = (suggestion) => {
  selectedAddress.value = suggestion.place_name
  lat.value = suggestion.center[1]
  lng.value = suggestion.center[0]
  query.value = suggestion.place_name
  showSuggestions.value = false
  emit('addressSelected', {
    address: selectedAddress.value,
    lat: lat.value,
    lng: lng.value
  })
}

// Open the map modal
const openMapModal = () => {
  showMapModal.value = true
}

// Close the map modal
const closeMapModal = () => {
  showMapModal.value = false
}

// Handle location selected from the map
const handleLocationSelected = (location) => {
  lat.value = location.lat
  lng.value = location.lng
  query.value = `${location.lat}, ${location.lng}`
  showMapModal.value = false
  emit('addressSelected', {
    address: query.value,
    lat: lat.value,
    lng: lng.value
  })
}
</script>
