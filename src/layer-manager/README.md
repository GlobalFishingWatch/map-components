# LayerManager

The LayerManager orchestrates various **Layer Generators** in order to generate an entire <a href="https://docs.mapbox.com/mapbox-gl-js/style-spec/">Mapbox GL Style document</a> that can be used with Mapbox GL and/or react-map-gl.

## API

### LayerManager.constructor

`new LayerManager(config?)`

### LayerManager.config
```
{
    generators: Generator[],
    glyphs: string,
    sprites: string
}
```

Instanciates a new Layer Manager that will use the provided Layer Generators to identify LayerDefinitions provided via `LayerManager.setLayers`

### LayerManager.getEvent

`layerManager.getEvent(event: GLEvent): GFWEvent`.

Converts a native Mapbox GL event into a GFW event to be used in clients (takes into account popup info, variable formatting, priority, etc).

### LayerManager.setZIndices

`layerManager.setZIndices()`

### LayerManager.getGLStyle

Converts provided LayerDefinitions, using Generators, to a usable Mapbox GL JSON style object.

`layerManager.getGLStyle(layers: LayerDefinition[]): { GLStyle, [promises] }`

Returns the sync glStyle and an array of promises when async layers are loaded which will pass the updated GLStyle when layer is ready

### LayerDefinition.type

String. Mandatory. Use constants stored in the generator, not strings: ~'context'~ -> Context.type

### LayerDefinition.id

String. Must be specified if several layers from the same generator are to be used, otherwise the type will be used as id.

### Generator.constructor

`new Generator(config?): void`

Generators define, for a varying set of any inputs, a way to generate both GL source(s) and layer(s) for a given type of layer. By type, we mean a **domain** type, not a technical type. ie ~HeatmapLayer~ -> FishingActivityLayer

Generators each contain the styling information they need, which can take the form of a customizable bit of GL style json, or something entirely dynamic.

See Generators section below.

### Generator.type

String. Mandatory. Defines uniquely the type of each generator, required in layer types

### Generator.getStyleSources

`generator.getStyleSources(layers: LayerDefinition[]): { sources: GLSource[] }`

Returns an array of `sources` needed by the layers.

### Generator.getStyleLayers

`generator.getStyleLayers(layers: LayerDefinition[]): { layers: GLLayer[] }`

Returns an array of `layers` with the visual definition of `sources`.


## React Component

The Layer Manager Component is a React component that takes a `ReactMapGL` component as a child:

```
import LayerManager, { TYPES } from '@globalfishingwatch/map-components/components/layer-manager'
import defaultGenerators from '@globalfishingwatch/map-components/components/layer-manager/generators'

// optional step as common generators will be used by default
const generators = { ...defaultGenerators, { custom: new CustomGenerator()} }

<LayerManager
  config={{
      generators
  }}
  layers={[
    {
      type: TYPES.BACKGROUND,
      color: '#00265c',
    },
    {
      type: TYPES.BASEMAP,
      id: 'satellite',
    },
    {
      type: TYPES.CARTO_POLYGONS,
      id: 'RFMO',
      color: '#ff00ff',
    },
  ]}
  onClick={(event) => {
    setState...
  }}
>
{(mapStyle, loading, onClick, onHover, cursor) => {
    return <ReactMapGL
      mapStyle={mapStyle}
      onClick={onClick}
      onHover={onHover}
      cursor={cursor}
      ...

    />
  }}
</LayerManager>

```

## React Hooks

This library also exposes a React hook to get the mapStyles definition:

```
import { useLayerManager} } from '@globalfishingwatch/map-components/components/layer-manager'

const [mapStyles, loading] = useLayerManager(layers, config)
```


## Generators

### Background

### Basemap

### CartoPolygons

### WMS

### FishingActivity

### VesselTracks

### Events

### Ruler
