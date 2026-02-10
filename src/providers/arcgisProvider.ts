import { markRaw, nextTick } from 'vue'

import MapView from '@arcgis/core/views/MapView'
import Map from '@arcgis/core/Map'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel"
import Popup from "@arcgis/core/widgets/Popup.js"
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";


// Shapes
import Polygon from "@arcgis/core/geometry/Polygon"
import Polyline from "@arcgis/core/geometry/Polyline"
import Circle from "@arcgis/core/geometry/Circle"
import Point from "@arcgis/core/geometry/Point"

// Styling
import "@arcgis/core/assets/esri/themes/light/main.css";
import Graphic from "@arcgis/core/Graphic"
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol"
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol"
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol"


const buttonData = [
    // { id: 'map.marker_button', imgSrc: '/icons/shapes/Marker.svg', shape: 'marker', onClick: drawMarker, shapes: ["POINT"] },
    { id: 'map.circle_button', imgSrc: '/icons/shapes/Ellipse.svg', shape: 'circle', onClick: drawCircle, shapes: ["CIRCLE", "SECTOR"] },
    { id: 'map.rectangle_button', imgSrc: '/icons/shapes/Rectangle.svg', shape: 'rectangle', onClick: drawRectangle, shapes: ["RECTANGLE"] },
    { id: 'map.polygon_button', imgSrc: '/icons/shapes/Polygon.svg', shape: 'polygon', onClick: drawPolygon, shapes: ["POLYGON"] },
    { id: 'map.line_button', imgSrc: '/icons/shapes/line.svg', shape: 'polyline', onClick: drawPolyline, shapes: ["POLYLINE"] }
]

export class ArcGISProvider {
    _map = null
    _mapView = null
    _graphicsLayer = null
    _sketch = null
    _container = null

    // GeneralMapOptions => ArcGISMapOptions
    transformOptions(opts) {
        return {
            container: opts.container,
            basemap: opts.style ?? 'streets-vector',
            center: opts.center ?? [0, 0],
            zoom: opts.zoom ?? 10,
            rotation: opts.bearing ?? 0,
        }
    }

    // GeneralMapOptions
    async initialize(opts) {
        if (!opts.container) throw new Error('Map container required')

        const arcOpts = this.transformOptions(opts)
        this._container = arcOpts.container

        this._map = markRaw( new Map({ basemap: arcOpts.basemap }) )
        this._graphicsLayer = markRaw(new GraphicsLayer())
        this._map.add(this._graphicsLayer)

        this._mapView = markRaw(
            new MapView({
                container: arcOpts.container,
                map: this._map,
                center: arcOpts.center,
                zoom: arcOpts.zoom,
                rotation: arcOpts.rotation,

                popup: {
                    autoOpenEnabled: false,
                    autoCloseEnabled: true,
                    dockEnabled: false,
                    buttonEnabled: false,
                }
            }),
        )

        this._sketch = markRaw(new SketchViewModel({
            view: this._mapView,
            layer: this._graphicsLayer,
        }))

        this._enableDragAndDrop()

        /** DEBUG */
        await this._mapView.when();
        this._mapView.on("click", (e) => {
            const screenPoint = { x: e.x, y: e.y };
            const mapPointRaw = this._mapView.toMap(screenPoint);
            const clickedPoint = new Point({
                x: mapPointRaw.x,
                y: mapPointRaw.y,
                spatialReference: this._mapView.spatialReference,
            });

            this._mapView.openPopup({
                location: clickedPoint,
                title: "You clicked here",
                content: "<div style='color:red'>Hello!</div>",
                actions: []
            })
        })
    }

    destroy() {
        this._mapView?.destroy();
        this._mapView = null;
        this._map = null;
        this._graphicsLayer = null;
    }

    // ---------------- Basic Map Controls ----------------
    setCenter(lngLat) {
        this._mapView?.goTo(lngLat)
    }
    getCenter() {
        return this._mapView?.center ? [this._mapView.center.longitude, this._mapView.center.latitude] : [0, 0]
    }
    setZoom(zoom) {
        if (this._mapView) this._mapView.zoom = zoom
    }
    panTo(lngLat) {
        this._mapView?.goTo(lngLat)
    }
    // handler = (lngLat: [number, number]) => void
    onClick(handler) {
        this._mapView?.on('click', (evt) => handler([evt.mapPoint.longitude, evt.mapPoint.latitude]))
    }

    // ---------------- Markers ----------------
    // type UnifiedMarker
    addMarker(marker) {
        console.warn('ArcGIS addMarker not implemented')
    }
    removeMarker(id) {
        console.warn('ArcGIS removeMarker not implemented')
    }
    toggleLayers() {
        console.warn('ArcGIS toggleLayers not implemented')
    }
    toLngLatArray(input) {
        return Array.isArray(input) && input.length === 2 ? (input as [number, number]) : [0, 0]
    }
    

    // ---------------- Drag & Drop Handlers --------------
    _enableDragAndDrop() {
        // window._arcgisDraw = (shape: string, point: Point) => {
        //     this.startDrawing(shape, point);
        //     this._mapView?.popup.close();
        // };

        this._container.ondragover = e => e.preventDefault()

        this._container.ondrop = e => {
            e.preventDefault()

            const raw = e.dataTransfer.getData("map.insert")
            if (!raw) return

            const elementSeed = JSON.parse(raw)
            this.handleDrop(e, elementSeed)
        }
    }

    async handleDrop(e, elementSeed) {
        const screenPoint = { x: e.offsetX, y: e.offsetY };
        const mapPointRaw = this._mapView.toMap(screenPoint);
        const clickedPoint = new Point({
            x: mapPointRaw.x,
            y: mapPointRaw.y,
            spatialReference: this._mapView.spatialReference,
        });

        const availableButtonData = buttonData.filter(button => {
            const shapes = button.shapes;
            return shapes.some(shape => elementSeed.shapes.includes(shape));
        })

        const popupActions = makePopupActions(availableButtonData)

        await this._mapView.openPopup({
            location: clickedPoint,
            title: elementSeed.title || "Select Shape",
            actions: popupActions
        })

        this._mapView.popup.on("trigger-action", (event) => {
            const clickedButtonData = buttonData.find(button => button.id === event.action.id)
            if( clickedButtonData )
                this._graphicsLayer.add(clickedButtonData.onClick(clickedPoint))

            this._mapView.closePopup()
        })
    }

    // ---------------- Drawing ----------------
    // shape = 'marker' | 'polyline' | 'polygon' | 'rectangle' | 'circle'
    startDrawing(shape, point) {
        return console.log('WHAT')
        if (!this._sketch) return
        const mapTools = ["point", "polyline", "polygon", "rectangle", "circle"]
        shape = shape.toLowerCase()
        if (!mapTools.includes(shape))
            return console.log('!maptools', mapTools, shape)

        console.log('!inserting', shape, point)
        switch(shape) {
            case "polygon":
                return this._graphicsLayer.add(drawPolygon(point))
            case "rectangle":
                return this._graphicsLayer.add(drawRectangle(point))
            case "polyline":
                return this._graphicsLayer.add(drawPolyline(point))
            case "circle":
                return this._graphicsLayer.add(drawCircle(point))
            case "point":
            default:
                return
        }

        const options: any = { mode: "click" }

        // Only use initialGeometry if it's a valid Point and shape is point
        if (shape === "point" && point instanceof Point) {
            options["initialGeometry"] = point
        }

        this._sketch.create(shape as any, options)
    }

    stopDrawing() {
        this._sketch?.cancel()
    }

    // () => DrawShapeOptions
    getDrawnShapes() {
        return []
    }
    removeShape(id) {}
    

    // --------------- Add / Remove Elements ----------------
    async importFeatures(featureList) {
        return new Promise(resolve => {
            // do stuff
            resolve(false)
        })
    }
    wipeFeatures() {
        return false
    }
}

// Popup
/**
 * @param {{ id: string,
 *          imgSrc: string,
 *          alt: string,
 *          onClick: () => void,
 *          shapes: string[],
 *      }[]} buttonData
 * @returns {string}
 */
function makePopupActions(buttonData) {
    return buttonData.map(btn => {
        return {
            type: "button",
            image: btn.imgSrc,
            id: btn.id,
        }
    })
}

    
// ---------------- Drawing Helpers ----------------
function drawRectangle(center: Point, size = 100): Graphic {
    const half = size / 2
    const graphic = new Graphic({
        geometry: new Polygon({
            rings: [[
                [center.x - half, center.y - half],
                [center.x - half, center.y + half],
                [center.x + half, center.y + half],
                [center.x + half, center.y - half],
                [center.x - half, center.y - half],
            ]],
            spatialReference: center.spatialReference
        }),
        symbol: new SimpleFillSymbol({
            color: [255, 165, 0, 0.5],
            outline: { color: [255, 140, 0], width: 2 }
        })
    })
    return graphic
}

function drawPolygon(center: Point, size = 80) {
    const graphic = new Graphic({
        geometry: new Polygon({
            rings: [[
                [center.x, center.y + size / 2],
                [center.x - size / 2, center.y - size / 2],
                [center.x + size / 2, center.y - size / 2],
                [center.x, center.y + size / 2],
            ]],
            spatialReference: center.spatialReference
        }),
        symbol: new SimpleFillSymbol({
            color: [0, 128, 255, 0.5],
            outline: { color: [0, 100, 200], width: 2 }
        })
    })
    return graphic
}

function drawCircle(center: Point, size = 50) {
    const graphic = new Graphic({
        geometry: new Circle({
            center,
            radius: size,
            spatialReference: center.spatialReference
        }),
        symbol: new SimpleFillSymbol({
            color: [0, 255, 128, 0.5],
            outline: { color: [0, 200, 100], width: 2 }
        })
    })
    return graphic
}

function drawPolyline(center: Point, size = 80) {
    const graphic = new Graphic({
        geometry: new Polyline({
            paths: [[
                [center.x - size / 2, center.y - size / 2],
                [center.x, center.y + size / 2],
                [center.x + size / 2, center.y - size / 2],
            ]],
            spatialReference: center.spatialReference
        }),
        symbol: new SimpleLineSymbol({
            color: [255, 0, 128],
            width: 3
        })
    })
    return graphic
}

// interface DrawShapeOptions {
//     /** Unique ID for this shape */
//     id: string
//     /** Type of shape */
//     type: DrawShapeType
//     /** Coordinates or data for the shape:
//      * - polygon/polyline: Array<[lng, lat]>
//      * - rectangle: [[swLng, swLat], [neLng, neLat]]
//      * - circle: [center: [lng, lat], radiusInMeters: number]
//      */
//     coordinates: any
//     /** Optional styling / options specific to the provider */
//     options?: any
// }