<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white p-4 rounded shadow-lg w-full max-w-4xl">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Select Location</h2>
        <button @click="$emit('close')" class="text-red-500">Close</button>
      </div>
      <div class="relative mb-4">
        <input
          type="text"
          v-model="query"
          @input="onInput"
          @keydown.enter.prevent="onEnter"
          class="px-4 py-2 border rounded shadow-lg w-full"
          placeholder="Search address..."
        />
        <ul
          v-if="suggestions.length && showSuggestions"
          class="absolute w-full bg-white border rounded shadow-lg z-[3000] mt-1"
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
      </div>
      <div id="map-modal" class="w-full h-96"></div>
      <div class="flex justify-end mt-4">
        {{ selectedLat }} {{ selectedLng }}
        <button @click="selectLocation" class="px-4 py-2 bg-blue-500 text-white rounded ml-2">
          Select
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import '@geoman-io/leaflet-geoman-free'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useSrvCaseStore } from '@/stores/project'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const emit = defineEmits(['close', 'locationSelected'])

const map = ref(null)
const selectedLat = ref(null)
const selectedLng = ref(null)

const caseStore = useSrvCaseStore()

const query = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)

const defaultLocation = [34.668879, 33.028079]

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
  query.value = suggestion.place_name
  selectedLat.value = suggestion.center[1]
  selectedLng.value = suggestion.center[0]
  showSuggestions.value = false
  map.value.setView([selectedLat.value, selectedLng.value], 13)

  if (map.value.marker) {
    map.value.removeLayer(map.value.marker)
  }

  map.value.marker = L.marker([selectedLat.value, selectedLng.value]).addTo(map.value)
}

onMounted(() => {
  let cLocation = defaultLocation
  if (caseStore.selectedProject) {
    const project = caseStore.cases.find(
      (p) => parseInt(p.id) === parseInt(caseStore.selectedProject)
    )
    if (project) {
      cLocation = [project.lat, project.lng]
    }
  } else if (caseStore.cases.length > 0) {
    cLocation = [caseStore.cases[0].lat, caseStore.cases[0].lng]
  }

  map.value = L.map('map-modal').setView(cLocation, 13)

  L.tileLayer(
    `https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`,
    {
      maxZoom: 18,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
    }
  ).addTo(map.value)

  // remove attribution add custom
  map.value.attributionControl.setPrefix('')
  map.value.attributionControl.addAttribution(
    'Maestro App ' + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>'
  )
  map.value.on('click', (e) => {
    selectedLat.value = e.latlng.lat
    selectedLng.value = e.latlng.lng

    if (map.value.marker) {
      map.value.removeLayer(map.value.marker)
    }

    map.value.marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map.value)
  })
})

const selectLocation = () => {
  if (selectedLat.value && selectedLng.value) {
    emit('locationSelected', { lat: selectedLat.value, lng: selectedLng.value })
  }
}
</script>

<style>
/* Add any custom styles here */
</style>
