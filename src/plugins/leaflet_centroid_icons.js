import L from "leaflet";
(function () {

    L.Circle.mergeOptions({
        centroidIcon: ""
    });
    L.Polygon.mergeOptions({
        centroidIcon: ""
    });
    function getCenter(points) {
        if (!points) {
            return
        }
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < points.length; i++) {
            sumX += points[i].x;
            sumY += points[i].y;
        }
        const centerX = sumX / points.length;
        const centerY = sumY / points.length;
        return { x: centerX, y: centerY };
    }

    function CentroidIcon(Parent, extensions) {
        const __updatePath = Parent.prototype._updatePath;
        const __onRemove = Parent.prototype.onRemove;
        const __bringToFront = Parent.prototype.bringToFront;

        return {
            ...extensions,

            onRemove: function (map) {
                map = map || this._map;
                if (map && this._imgNode && this._renderer._container) {
                    this._renderer._container.removeChild(this._imgNode);
                }
                delete this._imgNode
                __onRemove.call(this, map);
            },
            // _project() {
            //     console.log("Called _project on this")
            //     this._point = this._map.latLngToLayerPoint(this._latlng);
            //     this._updateBounds();
            //     this._imgRedraw();
            // },
            bringToFront: function () {
                __bringToFront.call(this);
                this._imgRedraw();
            },

            _updatePath: function () {
                __updatePath.call(this);
                this._imgRedraw();
            },

            _imgRedraw: function () {
                var imgSrc = this._imgSrc,
                    options = this._imgOptions;
                if (imgSrc) {
                    this.setCentroidImg(null).setCentroidImg(imgSrc, options);
                }
            },

            setCentroidImg: function (imgSrc, options) {
                this._imgSrc = imgSrc;
                this._imgOptions = options;

                // Check if the map and SVG renderer are available
                if (!L.SVG || typeof this._map === 'undefined') {
                    return this;
                }

                var defaults = {
                    width: 100,      // Default width for the image
                    height: 100,     // Default height for the image
                    attributes: {}
                };
                options = L.Util.extend(defaults, options);
                // console.log(options)
                // If empty image source, hide the image node
                if (!imgSrc) {
                    if (this._imgNode && this._imgNode.parentNode) {
                        this._renderer._container.removeChild(this._imgNode);
                        delete this._imgNode;
                    }
                    return this;
                }

                var id = 'icondef-' + L.Util.stamp(this);
                var svg = this._renderer._container;
                this._path.setAttribute('id', id);

                // Remove existing images if they exist (for redraw)
                // if (this._imgNode) {
                //     svg.removeChild(this._imgNode);
                // }

                // Create a group element to hold repeated images
                var imgGroup = L.SVG.create('g');

                var imgNode = L.SVG.create('image');  // Use the SVG image tag
                imgNode.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imgSrc);
                imgNode.setAttribute('width', options.width);
                imgNode.setAttribute('height', options.height);

                // Set additional attributes
                for (var attr in options.attributes) {
                    imgNode.setAttribute(attr, options.attributes[attr]);
                }

                // console.log("THIS ===============", this)
                //
                // let center = undefined
                // if (Parent instanceof L.Circle) {
                //     center = this._point
                //
                // } else if (Parent instanceof L.Polygon) {
                //     center = getCenter(this._parts[0])
                // }
                //
                const center = this._point ?? getCenter(this._parts[0])
                if (!center) {
                    // Shape is not on screen
                    // console.log("shape is not on screen")
                    return
                }
                imgNode.setAttribute('transform', `translate(${center.x}, ${center.y}) translate(${-options.width / 2}, ${-options.height / 2}) `);

                this._imgNode = imgGroup;

                imgGroup.appendChild(imgNode);
                // Append the group of images to the SVG container
                svg.appendChild(imgGroup);

                // Handle interactivity if needed
                if (this.options.interactive) {
                    imgGroup.setAttribute('class', 'leaflet-interactive');

                    var events = ['click', 'dblclick', 'mousedown', 'mouseover',
                        'mouseout', 'mousemove', 'contextmenu'];
                    for (var i = 0; i < events.length; i++) {
                        L.DomEvent.on(imgGroup, events[i], this.fire, this);
                    }
                }

                return this;
            }
        }
    };

    L.Polygon.include(CentroidIcon(L.Polygon));
    L.Circle.include(CentroidIcon(L.Circle));

    L.LayerGroup.include({
        setImg: function (imgSrc, options) {
            for (var layer in this._layers) {
                if (typeof this._layers[layer].setImg === 'function') {
                    this._layers[layer].setCentroidImg(imgSrc, options);
                }
            }
            return this;
        }
    });

})();
