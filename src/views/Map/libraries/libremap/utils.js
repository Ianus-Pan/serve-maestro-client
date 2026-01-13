// @ts-ignore
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

export function removeMapLayersByType(libremap, layer_type_filter = null) {
    let layers = libremap.getStyle().layers;
    if( layer_type_filter ) layers = layers.filter(l => l.type === layer_type_filter)

    layers.forEach(l => {
        libremap.removeLayer(l.id)
        console.log(`> Removing Layer "${l.id}"`)
    });
}

export function addMapSource(libremap, sID, type, url, tileSize) {
    libremap.value.addSource(sID, { type, url, tileSize });
}
export function addMapLayer(libremap, lID, type, sID) {
    libremap.value.addLayer({ id: lID, type, source: sID });
}

export function refreshFilter(libremap, layer, filter) {
    libremap.removeLayer(layer);
    libremap.addLayer({
      'id': layer,
      'type': 'line',
      filter
    });
}

export function getClickedFeature(libremap, e, layers = null ) {
    const features = libremap.queryRenderedFeatures(
        e.point,
        { layers: layers }
    );

    if( layers.filter(ly => ly === 'building-3d').length ) {
        return findClickedFeature(
            point([e.lngLat.lng, e.lngLat.lat]),
            features,
        )
    } else return features
}

export function setBuildingsSelected(libremap, selectedGeoJSON) {
    if( !selectedGeoJSON.type ) {
        selectedGeoJSON = {
            type: 'FeatureCollection',
            features: selectedGeoJSON ?? []
        }
    }

    if (libremap.getSource('selected-building')) {
        /** Remove Existing Selection */
        libremap.removeLayer('highlighted-building')
        libremap.removeSource('selected-building')
    }

    if( !selectedGeoJSON.features.length ) return

    libremap.addSource('selected-building', {
        type: 'geojson',
        data: selectedGeoJSON
    });

    libremap.addLayer({
        id: 'highlighted-building',
        source: 'selected-building',
        type: 'fill-extrusion',
        // filter: ['!=', 'osm_id', -1],
        paint: {
            'fill-extrusion-color': '#e63946',
            'fill-extrusion-height': ['get', 'render_height'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 1
        }
    });
}

export function initMapDragDrawPopup(htmlMapElement, libremap, drawPoppupButtonData = [], popup) {
    if( !popup ) throw new Error('Init Map Drag Draw Popup missing libremapGL.popup class')

    htmlMapElement.ondragover = function (e) {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
    }

    htmlMapElement.ondrop = e => {
        e.preventDefault()

        try {
            const rect = libremap.getContainer().getBoundingClientRect();
            const lngLat = libremap.unproject([
                e.clientX - rect.left,
                e.clientY - rect.top
            ]);

            const insertedSeed = JSON.parse(e.dataTransfer.getData("map.insert"));
            // console.log('>> Dropped Element Seed', insertedSeed)

            const buttonData = drawPoppupButtonData.filter(button => {
                const shapes = button.shapes;
                return shapes.some(shape => insertedSeed.shapes.includes(shape));
            })

            let thePopup = setPopupData(new popup(), {
                lnglat: lngLat,
                html: generateButtonHTML(buttonData),
                libremap
            })

            buttonData.forEach(btn => {
                const dom_el = document.getElementById(btn.id)
                dom_el.addEventListener('click', () => {
                    thePopup.remove()
                    btn.onClick(e, insertedSeed, lngLat)
                })
            })

            if( buttonData.length === 1 ) {
                const dom_el = document.getElementById(buttonData[0].id)
                dom_el.click()
            }

            return thePopup
        } catch( err ) {
            console.error('> Error', err)
            return false
        }
    }
}

export function setPopupData(popup, data) {
    if( data.lnglat ) popup.setLngLat(data.lnglat)
    if( data.html ) popup.setHTML(data.html)
    if( data.libremap ) popup.addTo(data.libremap)
    return popup
}

export function getCoordCenter(coordinates) {
    if( typeof coordinates[0][0] === 'number' ) return coordinates
    return getCenter(coordinates)
}

export function invertCoordinates(coords) {
    if( typeof coords[0] === 'number' ) return [ coords[1], coords[0] ]
    
    let res = coords.map(cd => {
        return cd.map(latLng => [latLng[1], latLng[0]])
    })
    return res
}

export function polygonToArea(feature, seed) {
    let name = feature?.sub_id ?
        `Building ${feature.id}_${feature.sub_id}` :
        seed.title

    return {
        _id: feature._id ?? null,
        type: 'Feature',
        properties: {
            element: {
                type: seed.type,
                category: seed.category,
                category_id: seed.category_id,
                case_id: seed.case_id,
                active: seed.active,
                title: seed.title,
                name: name,
                description: seed.description
            },
            attributes: {},
            style: {"icon": "/assets/serve/_areas/closed_blu.svg"}
        },
        geometry: feature.geometry,
    }
}

export function getSelectedCaseElement(case_elements, _id) {
    return case_elements.filter(cEL => cEL._id === _id)?.[0] ?? null
}

export function getSelectedElementPolygon(snapshot, _id = null) {
    if( !_id ) return snapshot[snapshot.length - 1] ?? null
    return snapshot.filter(ft => ft._id === _id)?.[0] ?? null
}

export function getinsertedSeed(categories, element) {
    let res = categories
        .filter(cat => cat.type === element.category)?.[0]
        .elements
        .filter(el => el.type === element.type)?.[0] ?? null
    console.log('> Element Seed: ', res)
    return res
}

/**
 * @param {Object|Array} coords The coordinates object/array
 * @returns array of coordinates
 */
export function coordObjToArr(coords) {
    if( !coords[0] && !coords.lng ) throw new Error('Missing coords[0] | coords.lng')

    // If coords.lng exists, then coords = {lng: '', lat: ''}
    if( coords.lng ) return [coords.lng, coords.lat]
    
    // If typeof coords[0] = number, then coords = [lng, lat]
    if( typeof coords[0] === 'number' ) return coords

    // else go deeper
    let res = []
    coords.forEach(coord => {
        res.push( coordObjToArr(coord) )
    })
    return res
}

export function parseLibreFeaturesProperties(features) {
    features.forEach((ft, i) => {
        features[i] = {
            ...ft,
            properties: {
                ...ft.properties,

                attributes: typeof ft.properties.attributes === 'string' ? 
                    JSON.parse(ft.properties.attributes ?? '[]') : 
                    ft.properties.attributes ?? [],

                element: typeof ft.properties.element === 'string' ? 
                    JSON.parse(ft.properties.element ?? '{}') :
                    ft.properties.element ?? {},

                style: typeof ft.properties.style === 'string' ?
                    JSON.parse(ft.properties.style ?? '{}') :
                    ft.properties.style ?? {},
            }
        }
    });
    return features
}

export function roundPrecision(coords, precision = 6) {
    const round = num => +num.toFixed(precision);

    const roundCoords = coords => {
        if (typeof coords[0] === 'number') {
            return coords.map(round);
        } else {
            return coords.map(roundCoords);
        }
    }
    return roundCoords(coords)
}

export function loadImageB64(url) {
    return new Promise(resolve => {
        const image = new Image();
        image.crossOrigin = 'use-credentials';
        image.src = url;

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, image.width, image.height);
           
            console.log('>> imageData ', imageData)
            resolve({
                width: image.width,
                height: image.height,
                data: imageData.data,
            })
        }
    })
}

function getCenter(coordinates) {
  const points = coordinates[0];

  let sumX = 0, sumY = 0;

  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
  }

  const len = points.length;

  return [sumX / len, sumY / len]; // [longitude, latitude]
}

function splitMultiPolygonFeature(multi) {
    if (multi.geometry.type !== "MultiPolygon") {
        return [multi]; // Already a Polygon or something else
    }

    return multi.geometry.coordinates.map((polygonCoords, index) => ({
        type: "Feature",
        id: multi.id || index,
        sub_id: index,
        geometry: {
            type: "Polygon",
            coordinates: polygonCoords
        },
        properties: multi.properties,
        layer: multi.layer,
        source: multi.source,
        sourceLayer: multi.sourceLayer,
        state: multi.state,
    }));
}

function findClickedFeature(point, features) {
    for (const feature of features) {
        const parts = splitMultiPolygonFeature(feature)

        for (const part of parts) {
            if (booleanPointInPolygon(point, part)) return part;
        }
    }

    return null;
}

export function generateButtonHTML(buttonData, flex_type = 'flex-row') {
    let res = [`<div class="flex ${flex_type} w-full items-center justify-center gap-1 ">`];

    buttonData.forEach(button => {
        res.push(`<button id="${button.id}" class="py-1 px-2 rounded-md hover:bg-gray-200">`)
        res.push(`<div class="flex flex-row justify-center items-center gap-2">`)
        if( button.alt ) res.push(`${button.alt}`)
        res.push(`<img class="h-5 w-5" src="${button.imgSrc}" alt="${button.alt}">`)
        res.push(`</div>`)
        res.push(`</button>`)
    });

    res.push(`</div>`)

    return res.join('')
}

let lastDoubleClick = 0;
let clickTimeout = null
const DOUBLE_CLICK_THRESHOLD = 300;
export function eventOn(libremap, t, cb = (e) => {}) {
    libremap.on(t, (e) => {
        if( t == 'click' ) {
            const now = Date.now()
            if (now - lastDoubleClick < DOUBLE_CLICK_THRESHOLD)
                return
            
            clickTimeout = setTimeout(() => {
                if (Date.now() - lastDoubleClick >= DOUBLE_CLICK_THRESHOLD) {
                    // @ts-ignore
                    cb(e)
                }
            }, DOUBLE_CLICK_THRESHOLD)
        }
        else {
            clearTimeout(clickTimeout)

            if( t == 'dblclick' ) {
                cb(e)
                lastDoubleClick = Date.now()
            }

            else if( t == 'contextmenu' ) cb(e)
            
            else
                return console.error('Bad `eventOn` type ', t)
        }
    });
}

export function defer(callback, delay = 100) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(this, args), delay);
    };
}