import { defineStore } from 'pinia'
import { nextTick, ref, shallowRef, toRaw, watch } from 'vue'

/** Stores */
import { useSrvCaseStore } from './srvCase.js'
import laravelServer from '@/api/laravelServer.js'

/** MapLibre */
import LibreMap, { Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as LibreUtils from '@/views/Map/libraries/libremap/utils.js'
import turf from 'turf'

/** Terra Draw Control */
// @ts-ignore
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw'
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css'
import { TerrainHillshadeControl } from '@/views/Map/libraries/libremap/controls.js'
import { useSrvInsertCategoryStore } from './srvInsertCategory.js'
import { point } from '@turf/helpers'

const root_url = import.meta.env.VITE_MAESTRO_LARAVEL

/** MapBox Draw Control */
// import MapboxDraw from '@mapbox/mapbox-gl-draw';
// import { MapboxTheme } from '@/views/Map/libraries/libremap/themes.js'
// import 'mapbox-gl-draw/dist/mapbox-gl-draw.css';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? 'error'

/** Debug JSON.stringify used in Libraries */
const originalStringify = JSON.stringify
JSON.stringify = function (value, ...args) {
  try {
    return originalStringify(value, ...args)
  } catch (err) {
    console.error('Caught JSON.stringify error:', err)
    console.error('Problematic value:', value)
    throw err // rethrow so it still breaks as expected
  }
}

export const useLibreMapStore = defineStore('libreMap', () => {
  const loading = ref(false)

  /** Stores */
  const srvCaseStore = useSrvCaseStore()
  const srvInsertCategoryStore = useSrvInsertCategoryStore()

  /** Map Constants */
  const isInitialized = ref(false)
  const htmlMapElement = ref(null)
  const libremap = shallowRef(null)

  /** Map Properties */
  const drawMode = ref(null)

  /** Map Cache */
  const mapLastBounds = ref(null)
  const mapLastZoom = ref(null)

  /** Map Insert Draw */
  let drawPoppupButtonData = null
  const currentEditArea = ref({
    feature: null,
    polygon: null,

    /** Needed to generate Area from Building Geometry */
    mode: null,
    seed: null
  })

  /**
   * @typedef {[number, number]} LngLatLike [ Longitude, Latitude ]
   */

  /**
   * ~~~~~~~~~~~~~~~~~~~~~~~~~~
   * Libre Map Setup & Handlers
   * ~~~~~~~~~~~~~~~~~~~~~~~~~~
   */

  /**
   *
   * @param {string} mapElement The HTML Element ID
   * @param {string} mapStyle The imported Map Style URL
   * @param {LngLatLike} center [ Latitude, Longitude ]
   * @param {number} zoom The initial Camera Zoom Level
   * @param {number} pitch The initial Camera Pitch
   * @param {number} bearing The initial Camera Rotation
   * @returns
   */
  function initializeMap(
    mapElement = 'map',
    mapStyle = `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`,
    center = [23.732821, 37.971115],
    zoom = 17,
    pitch = 45,
    bearing = 0
  ) {
    if (isInitialized.value) {
      return console.error('LibreMap tried to be reinitialized, returing')
    }

    loading.value = true

    try {
      htmlMapElement.value =
        typeof mapElement === 'string' ? document.getElementById(mapElement) : mapElement

      libremap.value = new LibreMap.Map({
        container: mapElement,
        style: mapStyle,
        center: mapLastBounds.value ?? center,
        zoom: mapLastZoom.value ?? zoom,
        pitch,
        bearing,
        canvasContextAttributes: { antialias: true }
      })

      isInitialized.value = true
    } catch (err) {
      return console.error(err)
    }
  }
  function uninitializeMap() {
    if (isInitialized.value) {
      libremap.value.remove()
      isInitialized.value = false
    }
    // window.removeEventListener('keydown', handleKeyDown)
  }

  watch(() => libremap.value, onMapInitialized)
  function onMapInitialized() {
    if (!libremap.value) return console.error('libremap.value not initialized')

    libremap.value.once('load', () => {
      setupMapDebug()

      /** Override Default Map Properties */
      setupMapConstants()

      /** Override Default Map Styling */
      setupMapDefaultRender()

      setupMapNavigationControls()

      /** Add Custom Tile Sources & Layers */
      setupMapSourcesLayers()

      setupMapLayerControls()

      setupMapEvents()

      LibreUtils.initMapDragDrawPopup(
        htmlMapElement.value,
        libremap.value,
        drawPoppupButtonData,
        Popup
      )

      localInsertFeatures(srvCaseStore.selectedSrvCaseElements)

      loading.value = false
    })

    libremap.value.on('moveend', () => {
      mapLastBounds.value = libremap.value.getCenter()
      mapLastZoom.value = libremap.value.getZoom()
    })
  }

  function setupMapDebug() {
    // libremap.value.showTileBoundaries = true;
    // libremap.value.showCollisionBoxes = true;
    libremap.value.showPadding = true
  }

  function setupMapConstants() {
    libremap.value.doubleClickZoom.disable()
  }

  function setupMapDefaultRender() {
    libremap.value.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.8)

    // LibreUtils.removeLayersByType(maplibre.value, 'fill-extrusion')
  }

  function setupMapNavigationControls() {
    libremap.value.addControl(
      new LibreMap.NavigationControl({
        // showZoom: false,
        showCompass: true
        // visualizePitch: true,
      })
    )
  }

  function setupMapSourcesLayers() {
    /** 3D Terrain */
    libremap.value.addSource('terrainSource', {
      type: 'raster-dem',
      tiles: [`https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=${MAPTILER_KEY}`],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 14,
      attribution: '3D Terrain'
    })

    /** 3D Terrain Shading */
    libremap.value.addSource('hillshade', {
      type: 'raster',
      tiles: [`https://api.maptiler.com/tiles/hillshade/{z}/{x}/{y}.webp?key=${MAPTILER_KEY}`],
      tileSize: 256,
      maxzoom: 12,
      attribution: 'Hill Shade'
    })
    libremap.value.addLayer({
      id: 'hillshade-layer',
      type: 'raster',
      source: 'hillshade',
      layout: {
        visibility: 'none'
      },
      paint: {
        'raster-opacity': 0.25
      }
    })
  }

  /** Call AFTER `setupMapSourcesLayers()` */
  function setupMapLayerControls() {
    libremap.value.addControl(ctlTerraDraw(), 'top-left')
    // libremap.value.addControl( ctlMapBoxDraw(), 'top-left' );

    libremap.value.addControl(
      new TerrainHillshadeControl({
        source: 'terrainSource',
        hillshadeLayerId: 'hillshade-layer',
        exaggeration: 1.5
      }),
      'top-right'
    )

    ctlTerraDrawEvents()
  }

  function setupMapEvents() {
    LibreUtils.eventOn(libremap.value, 'click', async (e) => {
      if (TerraDrawInstance.value.getMode() !== 'static') return

      LibreUtils.setBuildingsSelected(libremap.value, [])

      requestAnimationFrame(() => {
        let area_ft = LibreUtils.getClickedFeature(libremap.value, e, ['td-polygon'])
        if (area_ft.length) return onPolygonFeaturesClick(area_ft, e)

        let building_ft = LibreUtils.getClickedFeature(libremap.value, e, ['building-3d'])
        if (building_ft) return onBuildingFeaturesClick(building_ft)
      })
    })
    LibreUtils.eventOn(libremap.value, 'dblclick', async (e) => {
      if (TerraDrawInstance.value.getMode() !== 'static') return
      currentEditArea.value.feature = null
      let marker = addMarker(e.lngLat)
      console.log('> Marker Result', marker)
    })
    LibreUtils.eventOn(libremap.value, 'contextmenu', async (e) => {
      if (TerraDrawInstance.value.getMode() !== 'static') return

      LibreUtils.setBuildingsSelected(libremap.value, [])

      requestAnimationFrame(() => {
        let area_ft = LibreUtils.getClickedFeature(libremap.value, e, ['td-polygon'])
        if (area_ft.length) return onPolygonFeaturesClick(area_ft, e)
      })
    })
  }

  function onPolygonFeaturesClick(features = [], e) {
    features = LibreUtils.parseLibreFeaturesProperties(features)

    const onFeatureButtonData = features.map((ft) => {
      return {
        id: `area_${ft.properties.element._id}`,
        imgSrc: `${root_url}${ft.properties.style.icon}`,
        alt: ft.properties.element.name
      }
    })

    let thePopup = LibreUtils.setPopupData(new Popup({ closeOnClick: true }), {
      lnglat: libremap.value.unproject(e.point),
      html: LibreUtils.generateButtonHTML(onFeatureButtonData, 'flex-col'),
      libremap: libremap.value
    })

    features.forEach((ft) => {
      const dom_el = document.getElementById(`area_${ft.properties.element._id}`)
      dom_el.addEventListener('click', () => {
        thePopup.remove()

        const foundEL = LibreUtils.getSelectedCaseElement(
          srvCaseStore.selectedSrvCaseElements,
          ft.properties.element._id
        )

        if (!foundEL || !foundEL.properties.element.active) {
          currentEditArea.value.mode = null
          currentEditArea.value.seed = null
          currentEditArea.value.feature = null
        } else {
          currentEditArea.value.mode = 'polygon'
          currentEditArea.value.seed = LibreUtils.getinsertedSeed(
            srvInsertCategoryStore.srvInsertCategories,
            foundEL.properties.element
          )
          currentEditArea.value.feature = foundEL
        }
      })
    })
  }

  function onBuildingFeaturesClick(buildingFeature = null) {
    LibreUtils.setBuildingsSelected(libremap.value, [buildingFeature])

    const onBuildingButtonData = [
      {
        id: 'map.feature_to_area',
        imgSrc: '/icons/shapes/Marker.svg',
        alt: 'Turn Building to Area',
        onClick: () =>
          apiSaveEditArea(
            LibreUtils.polygonToArea(
              buildingFeature,
              LibreUtils.getinsertedSeed(srvInsertCategoryStore.srvInsertCategories, {
                category: 'AREA',
                type: 'CLOSED'
              })
            )
          )
      }
    ]

    let buildingMarker = LibreUtils.setPopupData(new Popup(), {
      lnglat: LibreUtils.getCoordCenter(buildingFeature.geometry.coordinates),
      html: LibreUtils.generateButtonHTML(onBuildingButtonData),
      libremap: libremap.value
    })

    onBuildingButtonData.forEach((btn) => {
      const dom_el = document.getElementById(btn.id)
      dom_el.addEventListener('click', () => {
        buildingMarker.remove()
        btn.onClick()
      })

      if (btn.forceClick) dom_el.click()
    })
  }

  /** Map Drawing */
  const TerraDraw = ref(null)
  const TerraDrawInstance = ref(null)
  function ctlTerraDraw() {
    drawMode.value = 'terradraw'

    TerraDraw.value = new MaplibreTerradrawControl({
      modes: [
        'render', // Remove this to hide Control on map
        'point',
        'linestring',
        'polygon',
        'rectangle',
        'circle',
        // 'freehand',
        // 'angled-rectangle',
        // 'sensor',
        'sector',
        'select'
        // 'delete-selection',
        // 'delete',
        // 'download'
      ],
      open: false
    })

    return TerraDraw.value
  }

  function ctlTerraDrawEvents() {
    TerraDrawInstance.value = TerraDraw.value.getTerraDrawInstance()

    // TerraDrawInstance.value.on('select', (id) => {
    //     const snapshot = TerraDrawInstance.value.getSnapshot();
    //     const features = snapshot?.find((feature) => feature.id === id);
    //     console.log('>> TerraDrawInstance.on select', features)
    // });

    TerraDrawInstance.value.on('finish', (id, context) => {
      if (context.action === 'draw') {
        // Do something for draw finish event
      } else if (context.action === 'dragFeature') {
        // Do something for a drag finish event
      } else if (context.action === 'dragCoordinate') {
        //
      } else if (context.action === 'dragCoordinateResize') {
        //
      }

      console.log(`> Finish: ${context.action}:`, id)
      requestAnimationFrame(() => {
        let tmp_poly = LibreUtils.getSelectedElementPolygon(
          TerraDrawInstance.value.getSnapshot(),
          currentEditArea.value.feature?._id
        )

        /** Is Creating new Feature */
        if (!currentEditArea.value.feature && currentEditArea.value.mode) {
          if (currentEditArea.value.mode === 'sector' || currentEditArea.value.mode === 'circle')
            return console.error('Currently unable to create Circles & Sectors in 3D Map.')

          console.log('>> Creating new Feature: ', currentEditArea.value.mode)
          currentEditArea.value.feature = LibreUtils.polygonToArea(
            tmp_poly,
            currentEditArea.value.seed
          )
        } else {

        /** Is Editing Existing Feature */
          console.log('>> Editing existing Feature: ', currentEditArea.value.mode)
          currentEditArea.value.polygon = tmp_poly
        }
      })
    })

    let deferChange = LibreUtils.defer(async () => {
      requestAnimationFrame(() => {
        currentEditArea.value.polygon = LibreUtils.getSelectedElementPolygon(
          TerraDrawInstance.value.getSnapshot(),
          currentEditArea.value.feature?._id
        )
        console.log('> PolyCount', currentEditArea.value.polygon.geometry.coordinates[0].length)
      })
    }, 100)
    TerraDrawInstance.value.on('change', (id, type) => {
      if (type === 'delete' && TerraDrawInstance.value.getMode() === 'select') {
        deferChange(id, type)
      }
    })

    drawPoppupButtonData = [
      {
        id: 'map.marker_button',
        imgSrc: '/icons/shapes/Marker.svg',
        shapes: ['POINT'],
        onClick: async (e, insertedSeed, lngLat) => {
          console.log('>> Adding Point:', insertedSeed, lngLat)

          currentEditArea.value.feature = null

          requestAnimationFrame(() => {
            currentEditArea.value.seed = insertedSeed
            currentEditArea.value.mode = 'point'
          })

          // let custom_img = postableElement.properties.style.icon
          // console.log('>> postableElement:', postableElement)
          // LibreUtils.loadImageB64(custom_img).then(res => {
          //     libremap.value.addImage(`img-${custom_img}`, res)
          // })
        }
      },
      {
        id: 'map.circle_button',
        imgSrc: '/icons/shapes/Ellipse.svg',
        shapes: ['CIRCLE', 'SECTOR'],
        onClick: async (e, insertedSeed, lngLat) => {
          return console.error('Currently unable to create Circles & Sectors in 3D Map.')

          currentEditArea.value.feature = null

          requestAnimationFrame(() => {
            console.log('>> Adding Circle:', insertedSeed, lngLat)
            let theShape =
              insertedSeed.shapes
                .filter((sh) => ['CIRCLE', 'SECTOR'].includes(sh))?.[0]
                .toLowerCase() ?? 'point'

            console.log('>> Adding :', theShape, insertedSeed, lngLat)
            currentEditArea.value.seed = insertedSeed
            currentEditArea.value.mode = theShape
          })
        }
      },
      {
        id: 'map.rectangle_button',
        imgSrc: '/icons/shapes/Rectangle.svg',
        shapes: ['RECTANGLE'],
        onClick: async (e, insertedSeed, lngLat) => {
          console.log('>> Adding Rectangle:', insertedSeed, lngLat)
          currentEditArea.value.feature = null

          requestAnimationFrame(() => {
            currentEditArea.value.seed = insertedSeed
            currentEditArea.value.mode = 'rectangle'
          })
        }
      },
      {
        id: 'map.polygon_button',
        imgSrc: '/icons/shapes/Polygon.svg',
        shapes: ['POLYGON'],
        onClick: async (e, insertedSeed, lngLat) => {
          console.log('>> Adding Polygon:', insertedSeed, lngLat)
          currentEditArea.value.feature = null

          requestAnimationFrame(() => {
            currentEditArea.value.seed = insertedSeed
            currentEditArea.value.mode = 'polygon'
          })
        }
      },
      {
        id: 'map.line_button',
        imgSrc: '/icons/shapes/line.svg',
        shapes: ['POLYLINE'],
        onClick: async (e, insertedSeed, lngLat) => {
          console.log('>> Adding Polyline:', insertedSeed, lngLat)
          currentEditArea.value.feature = null

          requestAnimationFrame(() => {
            currentEditArea.value.seed = insertedSeed
            currentEditArea.value.mode = 'polyline'
          })
        }
      }
    ]
  }
  const MapBoxDraw = ref(null)
  function ctlMapBoxDraw() {
    drawMode.value = 'terradraw'

    // @ts-ignore
    MapboxDraw.constants.classes.CANVAS = 'maplibregl-canvas'
    // @ts-ignore
    MapboxDraw.constants.classes.CONTROL_BASE = 'maplibregl-ctrl'
    // @ts-ignore
    MapboxDraw.constants.classes.CONTROL_PREFIX = 'maplibregl-ctrl-'
    // @ts-ignore
    MapboxDraw.constants.classes.CONTROL_GROUP = 'maplibregl-ctrl-group'
    // @ts-ignore
    MapboxDraw.constants.classes.ATTRIBUTION = 'maplibregl-ctrl-attrib'

    MD_SetupEvents()

    return (MapBoxDraw.value = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
      styles: MapboxTheme
    }))

    function MD_SetupEvents() {
      libremap.value.on('draw.create', MD_UpdateArea)
      libremap.value.on('draw.delete', () => {})
      libremap.value.on('draw.update', MD_UpdateArea)
    }

    function MD_UpdateArea(e) {
      const data = MapBoxDraw.value.getAll()
      const answer = document.getElementById('calculated-area')
      if (data.features.length > 0) {
        const area = turf.area(data)
        // restrict to area to 2 decimal points
        const roundedArea = Math.round(area * 100) / 100
        answer.innerHTML = `<p><strong>${roundedArea}</strong></p><p>square meters</p>`
      } else {
        answer.innerHTML = ''
        if (e.type !== 'draw.delete') alert('Use the draw tools to draw a polygon!')
      }
    }
  }

  async function localInsertFeatures(geoJSON) {
    try {
      if (drawMode.value === 'terradraw') await TerraDrawInsertFeatures(geoJSON)
      else if (drawMode.value === 'mapboxdraw') await MapBoxDrawInsertFeatures(geoJSON)
      else return console.error("insertFeatures can't find Draw Mode")

      if (!mapLastBounds.value) goToElement()
    } catch (err) {
      console.error('Error Importing Features', err)
    }

    // libremap.value.setCenter(mapCenter[0]) // 1st point of polygon
  }
  function TerraDrawInsertFeatures(geoJSON) {
    if (!TerraDraw.value)
      return console.error('Called TerraDrawInsertFeatures before TerraDraw initialized')

    if (!TerraDrawInstance.value)
      return console.error('TerraDraw.getTerraDrawInstance() not available yet.')

    let toimport = []
    geoJSON.forEach((ft) => {
      if (!ft.properties.element.active) return

      let importable_geo = {
        ...ft,
        geometry: {
          ...ft.geometry,
          coordinates: LibreUtils.roundPrecision(ft.geometry.coordinates)
        },
        properties: {
          ...ft.properties,
          mode: ft.geometry.type.toLowerCase(),
          color: '#000000',
          selected: false,
          element: {
            ...ft.properties.element,
            _id: ft._id
          }
        }
      }

      if (importable_geo.geometry.type === 'Polygon') {
        /** Fix Polygon Error when Last Point !== First Point */
        importable_geo.geometry.coordinates[0] = validatePolygonCoordinates(
          importable_geo.geometry.coordinates[0]
        )
      }

      toimport.push(importable_geo)
    })

    /** Stop to clear all drawn stuff on map */
    TerraDrawInstance.value.stop()
    TerraDrawInstance.value.start()

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        // console.log('> Terradraw Adding Features')
        TerraDrawInstance.value.addFeatures(toimport)
        resolve(null)
      })
    })
  }
  function MapBoxDrawInsertFeatures(geoJSON) {
    if (!MapBoxDraw.value)
      return console.error('Called MapBoxDrawInsertFeatures before TerraDraw initialized')

    console.error('Called MapBoxDrawInsertFeatures TBA')
  }

  async function apiSaveEditArea(area = null) {
    loading.value = true

    if (currentEditArea.value.feature) {
      currentEditArea.value.feature.geometry.coordinates[0] =
        currentEditArea.value.polygon.geometry.coordinates[0]
    }

    let submit_area = null
    if (area) {
      submit_area = area
      onFeatureChanged()
      onPolygonChanged()
    } else {
      submit_area = currentEditArea.value.feature
      currentEditArea.value.feature = null
    }

    laravelServer.CASE_ELEMENT.POST.single(submit_area).finally(() => (loading.value = false))
  }
  async function apiDeleteEditArea(area = null) {
    loading.value = true

    let submit_area = area ?? currentEditArea.value.feature
    currentEditArea.value.feature = null

    laravelServer.CASE_ELEMENT.DELETE.single(submit_area._id).finally(() => (loading.value = false))
  }

  /**
   *
   * @param {Object} markerStyle The imported Map Style URL
   * @param {LngLatLike} location [ Latitude, Longitude ]
   * @returns
   */
  function addMarker(
    lngLat,
    markerStyle = {
      anchor: 'center',
      className: '',
      clickTolerance: 0,
      color: '#FFFFFF',
      draggable: false,
      element: undefined, // HTML Element
      offset: undefined,
      opacity: 1,
      opacityWhenCovered: 0.2,
      pitchAlignment: 'auto',
      rotation: 0,
      rotationAlignment: 'auto',
      scale: 1,
      subpixelPositioning: false // Set to true for smoother movement
    }
  ) {
    if (!lngLat) {
      console.error('Bad Marker lngLat:', lngLat)
      return null
    }

    return new Marker(markerStyle).setLngLat(lngLat).addTo(libremap.value)
  }

  watch(
    () => [srvCaseStore.loading.case, srvCaseStore.loading.elements],
    () => {
      if (!isInitialized.value) return

      // if(srvCaseStore.loading.case && !srvCaseStore.loading.elements)
      //     notify({ img: "/icons/case_dark.svg", title: "Case Changed", message: "Loaded new case map visualisation" })

      console.log(`CS: ${srvCaseStore.loading.case}, CES: ${srvCaseStore.loading.elements}`)
      
      if (srvCaseStore.loading.case || srvCaseStore.loading.elements)
          return loading.value = true
      loading.value = false

      /** Import from API */
      // console.log('LIBRE MAP:: localInsertFeatures: ', srvCaseStore.selectedSrvCaseElements.length)
      localInsertFeatures(srvCaseStore.selectedSrvCaseElements)
    }
  )

  watch(
    () => srvCaseStore.selectedSrvCaseElements,
    () => {
      if (currentEditArea.value.feature) {
        let foundEL = LibreUtils.getSelectedCaseElement(
          srvCaseStore.selectedSrvCaseElements,
          currentEditArea.value.feature._id
        )

        currentEditArea.value.feature =
          !foundEL || foundEL.properties.element.active ? foundEL : null
      }
    },
    { deep: true }
  )

  watch(
    () => currentEditArea.value.feature,
    (after, before) => onFeatureChanged(after, before)
  )
  function onFeatureChanged(after, before) {
    // console.log('> Edit Feature Changed: ', !!currentEditArea.value.feature, currentEditArea.value.feature)

    if (currentEditArea.value.feature) {
      requestAnimationFrame(() => {
        currentEditArea.value.polygon = LibreUtils.getSelectedElementPolygon(
          TerraDrawInstance.value.getSnapshot(),
          currentEditArea.value.feature?._id
        )
      })
    } else {
      if (currentEditArea.value.polygon) {
        localInsertFeatures(srvCaseStore.selectedSrvCaseElements)
      }

      currentEditArea.value.polygon = null
      currentEditArea.value.mode = null
      currentEditArea.value.seed = null
    }
  }

  watch(
    () => currentEditArea.value.polygon,
    (after, before) => onPolygonChanged(after, before)
  )
  function onPolygonChanged(after, before) {
    // console.log('> Edit Polygon Changed: ', !!currentEditArea.value.polygon, currentEditArea.value.polygon)

    if (!currentEditArea.value.polygon) {
      LibreUtils.setBuildingsSelected(libremap.value, [])
      return (currentEditArea.value.mode = 'static')
    }

    // Removing this IF will throw due to race conditions
    if (TerraDrawInstance.value.getMode() !== 'select') currentEditArea.value.mode = 'select'

    requestAnimationFrame(() => {
      try {
        if (before && before.id !== currentEditArea.value.polygon.id)
          TerraDrawInstance.value.deselectFeature(before.id)

        TerraDrawInstance.value.selectFeature(currentEditArea.value.polygon.id)
      } catch (err) {
        console.info('Error on Deselect/Select: ', err)
      }
    })
  }

  watch(
    () => currentEditArea.value.mode,
    () => {
      console.log('> Current Draw Mode: ', currentEditArea.value.mode ?? 'static')
      TerraDrawInstance.value.setMode(currentEditArea.value.mode ?? 'static')
    }
  )

  /**
   * ~~~~~~~~~~~~~~~~~~~~~~~~
   * Custom Actions & Helpers
   * ~~~~~~~~~~~~~~~~~~~~~~~~
   */

  function goToElement(_id = null) {
    if (srvCaseStore.selectedSrvCaseElements.length < 1) return

    let mapCenter = null
    if (!_id) {
      /** GoTO Last Polygon / Marker */
      mapCenter =
        srvCaseStore.selectedSrvCaseElements.filter((el) => el.properties.element.active).pop()
          ?.geometry?.coordinates ?? null
    } else {
      try {
        mapCenter =
          srvCaseStore.selectedSrvCaseElements
            .filter((el) => el._id === _id && el.properties.element.active)
            .pop()?.geometry?.coordinates ?? null
      } catch (err) {
        return console.error('> Element not found')
      }
    }

    if (!mapCenter) return

    if (typeof mapCenter[0] == 'object') {
      mapCenter = mapCenter[0]

      /**
       * FitBounds expects points to be in ascending latitude
       * else it zooms all the way out of the map (tries to fit to
       * oposite of the actual bounds)
       */

      let lngMinMax = [
        [9999, 0],
        [0, 0]
      ]
      mapCenter.forEach((point) => {
        if (lngMinMax[0][0] > point[0]) lngMinMax[0] = point
        if (lngMinMax[1][0] < point[0]) lngMinMax[1] = point
      })
      mapCenter = lngMinMax
    } else {
      mapCenter = [mapCenter.map((num) => num - 0.001), mapCenter.map((num) => num + 0.001)]
    }

    requestAnimationFrame(() => libremap.value.fitBounds(mapCenter))
  }

  function resetLastBounds() {
    mapLastBounds.value = null
    mapLastZoom.value = null
  }

  return {
    loading,

    initializeMap,
    uninitializeMap,
    libremap,

    /** Insert Features to MAP */
    localInsertFeatures,

    /** Submit Feature Edit */
    apiSaveEditArea,
    apiDeleteEditArea,

    /** Local Edit Data */
    currentEditArea,

    resetLastBounds,
    goToElement
  }
})

/** Make sure Polygon Last point === Polygon FIRST point */
function validatePolygonCoordinates(coords) {
  let firstPoint = coords[0]
  let lastPoint = coords[coords.length - 1]

  if (firstPoint !== lastPoint) coords.push(coords[0])

  return coords
}
