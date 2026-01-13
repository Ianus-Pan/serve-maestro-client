export 
class TerrainHillshadeControl {
  constructor(options) {
    this.source = options.source || 'terrainSource';
    this.hillshadeLayerId = options.hillshadeLayerId || 'hillshade-layer';
    this.exaggeration = options.exaggeration || 1;
    this.isTerrainOn = false;
  }

  onAdd(map) {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Toggle Terrain + Hillshade';
    button.innerText = '⛰️';

    button.onclick = () => {
      this.isTerrainOn = !this.isTerrainOn;

      if (this.isTerrainOn) {
        this.map.setTerrain({
          source: this.source,
          exaggeration: this.exaggeration
        });
        this.map.setLayoutProperty(this.hillshadeLayerId, 'visibility', 'visible');
      } else {
        this.map.setTerrain(null);
        this.map.setLayoutProperty(this.hillshadeLayerId, 'visibility', 'none');
      }
    };

    this.container.appendChild(button);
    return this.container;
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
    this.map = undefined;
  }
}
