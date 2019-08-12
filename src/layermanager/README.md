# LayerManager

The LayerManager orchestrates various **Layer Generators** in order to generate an entire <a href="https://docs.mapbox.com/mapbox-gl-js/style-spec/">Mapbox GL Style document</a> that can be used with Mapbox GL and/or react-map-gl.

## API

### LayerManager.constructor

`new LayerManager(generators: Generator[], glyphsPath: string)`

Instanciates a new Layer Manager that will use the provided Layer Generators to identify LayerDefinitions provided via `LayerManager.setLayers`

### LayerManager.getEvent

`layerManager.getEvent(event: GLEvent): GFWEvent`.

Converts a native Mapbox GL event into a GFW event to be used in clients (takes into account popup info, variable formatting, priority, etc).

### LayerManager.setZIndices

`layerManager.setZIndices()`

### LayerManager.getGLStyle

Converts provided LayerDefinitions, using Generators, to a usable Mapbox GL JSON style object.

`layerManager.getGLStyle(layers: LayerDefinition[]): GLStyle`

### LayerDefinition.type

String. Mandatory. Use constants stored in the generator, not strings: ~'context'~ -> Context.type

### LayerDefinition.id

String. Must be specified if several layers from the same generator are to be used, otherwise the type will be used as id.

### Generator.constructor

`new Generator(): void`

Generators define, for a varying set of any inputs, a way to generate both GL source(s) and layer(s) for a given type of layer. By type, we mean a **domain** type, not a technical type. ie ~HeatmapLayer~ -> FishingActivityLayer

Generators each contain the styling information they need, which can take the form of a customizable bit of GL style json, or something entirely dynamic.

See Generators section below.

### Generator.getStyleProps

`generator.setLayers(layers: LayerDefinition[]): { layers: GLLayer[], sources: GLSource[] }`

Returns an object composed of `sources` needed by the layers as well as their visual definition in `layers`.


## React Component

The Layer Manager Component is a React component that takes a `ReactMapGL` component as a child:

```
import LayerManager from '@globalfishingwatch/map-components/components/layerManager'
import { Basemap, Context } from '@globalfishingwatch/map-components/components/layerManager/generators'

<LayerManager
  generators={[Basemap, Context]}
  layers={[
    {
      type: Basemap.type,
      basemap: 'satellite',
      addons: ['labels', 'bathymetry']
    },
    {
      type: Context.type,
      id: 'RFMO',
      color: '#ff00ff'
    },
    {
      type: Context.type,
      id: 'MPA',
      color: '#ffaa00'
    }
  ]}
  onClick={(event) => {
    setState...
  }}
>
{(mapStyle, onClick, onHover, cursor) => {
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

## Generators

### Basemap

### Context

### FishingActivity

### VesselTracks

### Events

### WMS

### Ruler
