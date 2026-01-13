/*
* MIT License
*
* Copyright (c) 2012 Makina Corpus
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*
* Source: https://github.com/makinacorpus/Leaflet.TextPath/blob/master/leaflet.textpath.js
*
* Modified by: Lampros Pitsillos 2024
*
*/

import L from 'leaflet';
function getQuadrant(angle, radians = false) {
    if (radians) {
        angle = angle * (180 / Math.PI)
    }
    // Normalize the angle to be between 0 and 360 degrees
    let normalizedAngle = angle % 360;
    if (normalizedAngle < 0) {
        normalizedAngle += 360;
    }

    if (normalizedAngle > 0 && normalizedAngle <= 90) {
        return 1; // Quadrant I
    } else if (normalizedAngle > 90 && normalizedAngle <= 180) {
        return 2; // Quadrant II
    } else if (normalizedAngle > 180 && normalizedAngle <= 270) {
        return 3; // Quadrant III
    } else if (normalizedAngle > 270 && normalizedAngle < 360) {
        return 4; // Quadrant IV
    } else {
        return 0; // On the positive x-axis or any axis
    }
}

(function () {

    var __onAdd = L.Polyline.prototype.onAdd,
        __onRemove = L.Polyline.prototype.onRemove,
        __updatePath = L.Polyline.prototype._updatePath,
        __bringToFront = L.Polyline.prototype.bringToFront;

    var PolylineTextPath = {

        onAdd: function (map) {
            __onAdd.call(this, map);
            this._imgRedraw();
        },

        onRemove: function (map) {
            map = map || this._map;
            if (map && this._imgNode && this._renderer._container) {
                this._renderer._container.removeChild(this._imgNode);
            }
            delete this._imgNode
            __onRemove.call(this, map);
        },

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
                this.setImg(null).setImg(imgSrc, options);
            }
        },

        setImg: function (imgSrc, options) {
            this._imgSrc = imgSrc;
            this._imgOptions = options;

            // Check if the map and SVG renderer are available
            if (!L.SVG || typeof this._map === 'undefined') {
                return this;
            }

            var defaults = {
                repeat: false,
                width: 100,      // Default width for the image
                height: 100,     // Default height for the image
                attributes: {},
                below: false
            };
            options = L.Util.extend(defaults, options);

            // If empty image source, hide the image node
            if (!imgSrc) {
                if (this._imgNode && this._imgNode.parentNode) {
                    this._renderer._container.removeChild(this._imgNode);
                    delete this._imgNode;
                }
                return this;
            }

            var id = 'pathdef-' + L.Util.stamp(this);
            var svg = this._renderer._container;
            this._path.setAttribute('id', id);

            // Remove existing images if they exist (for redraw)
            if (this._imgNode) {
                svg.removeChild(this._imgNode);
            }

            // Create a group element to hold repeated images
            var imgGroup = L.SVG.create('g');
            var pathLength = this._path.getTotalLength();
            var imgWidth = options.width;
            var imgHeight = options.height;

            // If repeat is true, calculate how many times to repeat the image along the path
            var repeatCount = 1;
            if (options.repeat) {
                repeatCount = Math.floor(pathLength / imgWidth);  // Number of times to repeat based on the image width and path length
            }

            let prev_quadrant = 0;
            for (var i = 0; i < repeatCount; i++) {
                var imgNode = L.SVG.create('image');  // Use the SVG image tag
                imgNode.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imgSrc);
                imgNode.setAttribute('width', options.width);
                imgNode.setAttribute('height', options.height);

                // Set additional attributes
                for (var attr in options.attributes) {
                    imgNode.setAttribute(attr, options.attributes[attr]);
                }

                // Calculate the position and angle along the path for this image
                var offset = imgWidth * i;
                var point = this._path.getPointAtLength(offset);
                var nextPoint = this._path.getPointAtLength(offset + imgWidth);

                var angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
                //Normalize the angle to always be between 0 and Math.PI
                const angle_neg = angle < 0

                if (angle_neg) {
                    angle += Math.PI; // add Math.PI if negative
                }
                let quadrant = getQuadrant(angle, true)
                if (quadrant === 0) { quadrant = prev_quadrant }
                prev_quadrant = quadrant
                if (quadrant === 1) {
                    angle += Math.PI; // add Math.PI if negative
                }
                let degrees = angle * (180 / Math.PI);
                // console.log(degrees, angle, quadrant)
                // console.log(angle)
                // let degrees = angle * (180 / Math.PI);
                if (angle_neg) {
                    imgNode.setAttribute('transform', `translate(${nextPoint.x}, ${nextPoint.y}) rotate(${degrees}) rotate(${180} ${imgHeight / 2} ${imgWidth / 2}) `);
                } else {
                    imgNode.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${degrees}) rotate(${180} ${imgHeight / 2} ${imgWidth / 2}) `);
                }

                // Append the current image to the group
                imgGroup.appendChild(imgNode);
            }

            this._imgNode = imgGroup;

            // Append the group of images to the SVG container
            if (options.below) {
                svg.insertBefore(imgGroup, svg.firstChild);
            } else {
                svg.appendChild(imgGroup);
            }

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
    };

    L.Polyline.include(PolylineTextPath);

    L.LayerGroup.include({
        setImg: function (imgSrc, options) {
            for (var layer in this._layers) {
                if (typeof this._layers[layer].setImg === 'function') {
                    this._layers[layer].setImg(imgSrc, options);
                }
            }
            return this;
        }
    });

})();
// Tried to make it an option but failed
// leaflet has NO DOCUMENTATION on how to create a plugin
//
// (function () {
// console.log("LOADEDS")
//     var __onAdd = L.Polyline.prototype.onAdd,
//         __onRemove = L.Polyline.prototype.onRemove,
//         __updatePath = L.Polyline.prototype._updatePath,
//         __bringToFront = L.Polyline.prototype.bringToFront;
//     L.Polyline.include({
//
//         onAdd: function (map) {
//             __onAdd.call(this, map);
//             this._imgRedraw();
//         },
//
//         onRemove: function (map) {
//             map = map || this._map;
//             if (map && this._imgNode && this._renderer._container) {
//                 this._renderer._container.removeChild(this._imgNode);
//             }
//             __onRemove.call(this, map);
//         },
//
//         bringToFront: function () {
//             __bringToFront.call(this);
//             this._imgRedraw();
//         },
//
//         _updatePath: function () {
//             __updatePath.call(this);
//             this._imgRedraw();
//         },
//
//         _imgRedraw: function () {
//             var imgSrc = this._imgSrc,
//                 options = this._imgOptions;
//             if (imgSrc) {
//                 this._setImg(null)._setImg(imgSrc, options);
//             }
//         },
//
//         _updateStyle: function (layer) {
//             var path = layer._path,
//                 options = layer.options;
//
//             console.log("HERE")
//             if (!path) { return; }
//
//             if (options.stroke) {
//                 path.setAttribute('stroke', options.color);
//                 path.setAttribute('stroke-opacity', options.opacity);
//                 path.setAttribute('stroke-width', options.weight);
//                 path.setAttribute('stroke-linecap', options.lineCap);
//                 path.setAttribute('stroke-linejoin', options.lineJoin);
//
//                 if (options.dashArray) {
//                     path.setAttribute('stroke-dasharray', options.dashArray);
//                 } else {
//                     path.removeAttribute('stroke-dasharray');
//                 }
//
//                 if (options.dashOffset) {
//                     path.setAttribute('stroke-dashoffset', options.dashOffset);
//                 } else {
//                     path.removeAttribute('stroke-dashoffset');
//                 }
//             } else {
//                 path.setAttribute('stroke', 'none');
//             }
//
//             if (options.fill) {
//                 path.setAttribute('fill', options.fillColor || options.color);
//                 path.setAttribute('fill-opacity', options.fillOpacity);
//                 path.setAttribute('fill-rule', options.fillRule || 'evenodd');
//             } else {
//                 path.setAttribute('fill', 'none');
//             }
//             if (options.pathImg) {
//                 console.log("PATH IMFG")
//                 this._setImg(options.pathImg.src, options.pathImg.opts);
//             }
//         },
//         _setImg: function (imgSrc, options) {
//             this._imgSrc = imgSrc;
//             this._imgOptions = options;
//
//             // Check if the map and SVG renderer are available
//             if (!L.SVG || typeof this._map === 'undefined') {
//                 return this;
//             }
//
//             var defaults = {
//                 repeat: false,
//                 width: 100,      // Default width for the image
//                 height: 100,     // Default height for the image
//                 attributes: {},
//                 below: false
//             };
//             options = L.Util.extend(defaults, options);
//
//             // If empty image source, hide the image node
//             if (!imgSrc) {
//                 if (this._imgNode && this._imgNode.parentNode) {
//                     this._renderer._container.removeChild(this._imgNode);
//                     delete this._imgNode;
//                 }
//                 return this;
//             }
//
//             var id = 'pathdef-' + L.Util.stamp(this);
//             var svg = this._renderer._container;
//             this._path.setAttribute('id', id);
//
//             // Remove existing images if they exist (for redraw)
//             if (this._imgNode) {
//                 svg.removeChild(this._imgNode);
//             }
//
//             // Create a group element to hold repeated images
//             var imgGroup = L.SVG.create('g');
//             var pathLength = this._path.getTotalLength();
//             var imgWidth = options.width;
//             var imgHeight = options.height;
//
//             // If repeat is true, calculate how many times to repeat the image along the path
//             var repeatCount = 1;
//             if (options.repeat) {
//                 repeatCount = Math.floor(pathLength / imgWidth);  // Number of times to repeat based on the image width and path length
//             }
//
//             let prev_quadrant = 0;
//             for (var i = 0; i < repeatCount; i++) {
//                 var imgNode = L.SVG.create('image');  // Use the SVG image tag
//                 imgNode.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imgSrc);
//                 imgNode.setAttribute('width', options.width);
//                 imgNode.setAttribute('height', options.height);
//
//                 // Set additional attributes
//                 for (var attr in options.attributes) {
//                     imgNode.setAttribute(attr, options.attributes[attr]);
//                 }
//
//                 // Calculate the position and angle along the path for this image
//                 var offset = imgWidth * i;
//                 var point = this._path.getPointAtLength(offset);
//                 var nextPoint = this._path.getPointAtLength(offset + imgWidth);
//
//                 var angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
//                 //Normalize the angle to always be between 0 and Math.PI
//                 const angle_neg = angle < 0
//
//                 if (angle_neg) {
//                     angle += Math.PI; // add Math.PI if negative
//                 }
//                 let quadrant = getQuadrant(angle, true)
//                 if (quadrant === 0) { quadrant = prev_quadrant }
//                 prev_quadrant = quadrant
//                 if (quadrant === 1) {
//                     angle += Math.PI; // add Math.PI if negative
//                 }
//                 let degrees = angle * (180 / Math.PI);
//                 console.log(degrees, angle, quadrant)
//                 // console.log(angle)
//                 // let degrees = angle * (180 / Math.PI);
//                 if (angle_neg) {
//                     imgNode.setAttribute('transform', `translate(${nextPoint.x}, ${nextPoint.y}) rotate(${degrees}) rotate(${180} ${imgHeight / 2} ${imgWidth / 2}) `);
//                 } else {
//                     imgNode.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${degrees}) rotate(${180} ${imgHeight / 2} ${imgWidth / 2}) `);
//                 }
//
//                 // Append the current image to the group
//                 imgGroup.appendChild(imgNode);
//             }
//
//             this._imgNode = imgGroup;
//
//             // Append the group of images to the SVG container
//             if (options.below) {
//                 svg.insertBefore(imgGroup, svg.firstChild);
//             } else {
//                 svg.appendChild(imgGroup);
//             }
//
//             // Handle interactivity if needed
//             if (this.options.interactive) {
//                 imgGroup.setAttribute('class', 'leaflet-interactive');
//
//                 var events = ['click', 'dblclick', 'mousedown', 'mouseover',
//                     'mouseout', 'mousemove', 'contextmenu'];
//                 for (var i = 0; i < events.length; i++) {
//                     L.DomEvent.on(imgGroup, events[i], this.fire, this);
//                 }
//             }
//
//             return this;
//         }
//     })
//
//     L.LayerGroup.include({
//         setImg: function (imgSrc, options) {
//             for (var layer in this._layers) {
//                 if (typeof this._layers[layer].setImg === 'function') {
//                     this._layers[layer].setImg(imgSrc, options);
//                 }
//             }
//             return this;
//         }
//     });
//
// })();
