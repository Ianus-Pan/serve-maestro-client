/**
*
* MIT License
*
* Copyright (c) 2013 lnaweisu
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
* Source: https://github.com/lwsu/leaflet-polygon-fillPattern/blob/master/leaflet-polygon.fillPattern.js
*
* Modified by: Lampros Pitsillos 2024
*
*/

import L from 'leaflet';
(function (window, document, undefined) {

    if (L.Browser.svg) {
        L.SVG.include({
            _updateStyle: function (layer) {
                var path = layer._path,
                    options = layer.options;

                // HACK: this does not belong here
                if (options.className) {
                    path.classList.add(...L.Util.splitWords(layer.options.className));
                }

                if (!path) { return; }

                if (options.stroke) {
                    path.setAttribute('stroke', options.color);
                    path.setAttribute('stroke-opacity', options.opacity);
                    path.setAttribute('stroke-width', options.weight);
                    path.setAttribute('stroke-linecap', options.lineCap);
                    path.setAttribute('stroke-linejoin', options.lineJoin);

                    if (options.dashArray) {
                        path.setAttribute('stroke-dasharray', options.dashArray);
                    } else {
                        path.removeAttribute('stroke-dasharray');
                    }

                    if (options.dashOffset) {
                        path.setAttribute('stroke-dashoffset', options.dashOffset);
                    } else {
                        path.removeAttribute('stroke-dashoffset');
                    }
                } else {
                    path.setAttribute('stroke', 'none');
                }

                if (options.fill) {
                    path.setAttribute('fill', options.fillColor || options.color);
                    path.setAttribute('fill-opacity', options.fillOpacity);
                    path.setAttribute('fill-rule', options.fillRule || 'evenodd');
                } else {
                    path.setAttribute('fill', 'none');
                }
                if (options.fillImg) {
                    this.__fillImg(layer);
                }
                if (options.fillPattern) {
                    this.__fillPattern(layer);
                }
            },

            __fillPattern: function (layer) {
                var path = layer._path,
                    options = layer.options.fillPattern;

                if (!this._defs) {
                    this._defs = L.SVG.create('defs');
                    this._container.appendChild(this._defs);
                }
                var _ref_id = "pattern_" + L.Util.stamp(this);
                var _p = document.getElementById(_ref_id);
                if (!_p) {


                    const defaults = {
                        color: '#222222'
                    };
                    options = L.Util.extend(defaults, options);
                    _p = L.SVG.create('pattern');
                    _p.setAttribute('id', _ref_id);
                    // _p.setAttribute('class', "temp-shape");
                    _p.setAttribute('patternUnits', 'userSpaceOnUse');
                    _p.setAttribute('width', '26');
                    _p.setAttribute('height', '26');
                    _p.setAttribute('patternTransform', 'rotate(45)');

                    const line = L.SVG.create('line');
                    line.setAttribute('x1', '0');
                    line.setAttribute('y1', '0');
                    line.setAttribute('x2', '0');
                    line.setAttribute('y2', '26');
                    line.setAttribute('stroke', options.color);
                    line.setAttribute('stroke-width', '26');
                    line.setAttribute('stroke-dasharray', '26');

                    // Append line to pattern
                    _p.appendChild(line);
                    // var _rect = L.SVG.create('rect');
                    // _rect.setAttribute('width', 24);
                    // _rect.setAttribute('height', 24);
                    // _rect.setAttribute('x', 0);
                    // _rect.setAttribute('x', 0);
                    // _rect.setAttribute('fill', options.fillColor || options.color);
                    //
                    // _p.appendChild(_rect);
                    this._defs.appendChild(_p);

                }
                path.setAttribute('fill', "url(#" + _ref_id + ")");
            },

            __fillImg: function (layer) {
                var path = layer._path,
                    options = layer.options;

                if (!this._defs) {
                    this._defs = L.SVG.create('defs');
                    this._container.appendChild(this._defs);
                }
                var _img_url = options.fillImg
                var _ref_id = _img_url + L.Util.stamp(this);
                // _ref_id += new Date().getUTCMilliseconds();
                var _p = document.getElementById(_ref_id);
                if (!_p) {
                    var _im = new Image();
                    _im.src = _img_url;
                    _p = L.SVG.create('pattern');
                    _p.setAttribute('id', _ref_id);
                    _p.setAttribute('x', '0');
                    _p.setAttribute('y', '0');
                    _p.setAttribute('patternUnits', 'userSpaceOnUse');
                    _p.setAttribute('width', '24');
                    _p.setAttribute('height', '24');
                    // var _rect = L.SVG.create('rect');
                    // _rect.setAttribute('width', 24);
                    // _rect.setAttribute('height', 24);
                    // _rect.setAttribute('x', 0);
                    // _rect.setAttribute('x', 0);
                    // _rect.setAttribute('fill', options.fillColor || options.color);
                    //
                    // _p.appendChild(_rect);
                    this._defs.appendChild(_p);

                    var _img = L.SVG.create('image');
                    _img.setAttribute('x', '0');
                    _img.setAttribute('y', '0');
                    _img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', _img_url);
                    _img.setAttribute('width', '24');
                    _img.setAttribute('height', '24');
                    _p.appendChild(_img);

                    _im.onload = function () {
                        _p.setAttribute('width', _im.width);
                        _p.setAttribute('height', _im.height);
                        _img.setAttribute('width', _im.width);
                        _img.setAttribute('height', _im.height);
                    };
                }
                path.setAttribute('fill', "url(#" + _ref_id + ")");
            }
        });

}

}(this, document));
