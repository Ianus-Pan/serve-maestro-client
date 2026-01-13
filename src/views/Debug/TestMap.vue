<template>
  <div>
    <div id="test-map" class="w-full h-[100vh] relative"></div>
    <div class="absolute top-4 left-4 z-[1000] bg-white p-2 rounded shadow-lg">
      <p>Clicked Coordinates:</p>
      <p>Latitude: {{ clickedLocation.lat }}</p>
      <p>Longitude: {{ clickedLocation.lng }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import '@geoman-io/leaflet-geoman-free'
import '@fortawesome/fontawesome-free/css/all.css'
import socket from '@/services/socket'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const defaultLocation = [34.668879, 33.028079]
const mapBoxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

let map
const clickedLocation = ref({ lat: null, lng: null })

const initializeMap = () => {
  if (!map) {
    map = L.map('test-map', {
      attributionControl: false
    }).setView(defaultLocation, 13)

    // Add custom attribution control
    L.control
      .attribution({
        position: 'bottomright',
        prefix: false
      })
      .addTo(map)
      .addAttribution('Maestro App ' + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>')

    L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapBoxAccessToken}`,
      {
        maxZoom: 18,
        tileSize: 512,
        zoomOffset: -1,
        accessToken: mapBoxAccessToken
      }
    ).addTo(map)

    map.on('click', (event) => {
      const { lat, lng } = event.latlng
      clickedLocation.value = { lat, lng }

      L.tooltip({ permanent: false, direction: 'top' })
        .setLatLng(event.latlng)
        .setContent(`Lat: ${lat}, Lng: ${lng}`)
        .addTo(map)

      socket.emit('frNewLocation', { location: { lat, lng } })
    })
  }
}

onMounted(() => {
  initializeMap()

  socket.on('connect', () => {
    console.log('Connected to socket server')
  })
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }

  socket.off('connect')
})
</script>

<style>
@import '@fortawesome/fontawesome-free/css/all.css'; /* Ensure Font Awesome CSS is imported */
</style>
