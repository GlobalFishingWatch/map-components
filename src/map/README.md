# GlobalFishingWatch Map Module

This is a JavaScript module used to display and load fishing activity and fishing-related layers on a map, used in various GFW projects:

- <a href="https://github.com/GlobalFishingWatch/map-client">GlobalFishingWatch main client</a>
- <a href="https://github.com/GlobalFishingWatch/data-portal">Fishing events data portal</a>
- Upcoming GFW projects: labeling tool, carrier database portal, etc

It is usable as a React component (a wrapper around `react-map-gl`).

This module is responsible for:

- displaying a Mapbox GL map, including panning, zooming, etc. Managing map viewport. Managing Mapbox GL JSON style;
- loading, displaying, and animating Activity Layers (layers with a time dimension):
  - Vessel Tracks
  - Heatmap layers (AIS/VMS fishing activity, VIIRS, encounters/events, etc) and tiles loading
- applying time filters to Activity layers;
- applying filter groups to Heatmap layers;
- loading and displaying Static layers and Basemap layers (native Mapbox layers) through GL JSON style;
- dealing with user interaction on the map (highlight on hover and emitting events on hover/click).

This module does not deal with:

- workspaces import/export;
- authentication;
- layer headers;
- UI (such as UI to set layer properties, filters, or timebar, see <a href="https://github.com/GlobalFishingWatch/map-timebar-module">Timebar repo</a>);
- GFW main client features: reporting, vessel search, etc.

## Dependencies

- Pixi.js can't be bundled easily so there is a need to include `pixi.js` as a dependency of your own package.json project.

- [react-map-gl](https://github.com/uber/react-map-gl) version ^4.1.1

# API

## `token`

String. Mandatory.
Used to load heatmap layer tiles and tracks.

## `glyphPath`

String. URL schema to load Mapbox GL glyphs, for example 'gl-fonts/{fontstack}/{range}.pbf'. Must be a local path or if an absolute path server must support CORS.

## `viewport`

Object. Allows setting map position. If zoom change is strictly equal to 1, a transition will be used.

### `zoom`

Number.

### `center`

Array of [latitude, longitude]

### `autoClusterZoom`

Boolean. Default true. Have the map zoom in to an appropriate zoom level when user clicks on a cluster (several features under a point or one feature defined as a cluster)

### `isCluster`

Function. Default `(event) => event.isCluster === true`. Allows fine-tuning determining cluster behavior or not (with `autoClusterZoom` set to true), given an event with a list of features. 

## `tracks`

Array of `track`. Sets the tracks to load and display (loading/displaying is triggered by diffing incoming array with existing array).

### `track.id`

String. Mandatory. Identifies track uniquely, should be UVI or seriesgroup (deprecated).

### `track.segmentId`

[NOT IMPLEMENTED][deprecated] String. Formerly `series`

### `track.url`

String. Mandatory. Base URL template to load tracks.

### `track.layerTemporalExtents`

Array of Arrays of Unix timestamps. For layers that are split across time ramges, allow mapping between `loadTemporalExtents` and the actual data loaded. Specifies time ranges in the form `[[]]` TODO

### `track.highlighted`

Boolean. When set to true, the whole track will render in white (notwithstanding `highlightTemporalExtents`).

### `track.type`

String. Track type, only supported `geojson` for now.
This is needed to keep the compatibility with older tracks format.

### `track.fitBoundsOnLoad`

Boolean. This flag will fit to the track bounds once the track is loaded.

### `track.color`

Strin. Hexadecimal color to show the track.

## `heatmapLayers`

Array of `heatmapLayer`.

### `heatmapLayer.id`

String. Mandatory. Identifies layer uniquely, can be workspace id for instance.

### `heatmapLayer.tilesetId`

String. Mandatory. Identifies tileset uniquely

### `heatmapLayer.subtype`

String. Allowed values are: `encounters`.

### `heatmapLayer.hue`

A Number between 0 and 360. Colors for heatmap layers can only be expressed as hues (degrees in the color wheel, saturation and luminance being hardcoded) for internal technical reasons.

### `heatmapLayer.opacity`

A Number between 0 and 1. 0 by default.

### `heatmapLayer.visible`

Boolean.

### `heatmapLayer.header`

Object. Mandatory. Must be passed as is - mandatory fields are:

- `endpoints` PropTypes.object,
- `isPBF` PropTypes.bool,
- `colsByName` PropTypes.object,
- `temporalExtents` PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
- `temporalExtentsLess` PropTypes.bool

### `heatmapLayer.interactive`

Boolean. Whether interaction is active on the layer or not. [PARTIALLY IMPLEMENTED] Will not set interactivity per layer individually, just disable all if all are set to false.

## `heatmapLayer.filters`

An array of filters. Heatmap filters are defined as:

- `hue`: Will override layer hue if set.
- `filterValues`: a dictionary in which each key is a filterable field, and values is an array of all possible values (using OR). ie: `filterValues: { category: [5, 6] }`.

## `temporalExtent`

Tuple of Dates (`[start, end]`). Mandatory. Acts as a display temporal filter for Activity Layers (Heatmap and Tracks), used for time animation.

## `loadTemporalExtent`

Tuple of Dates (`[start, end]`). Mandatory. Specifies tilesets that needs to be loaded for Activity layers that are split by time range (layer with `temporalExtents`).

## `highlightTemporalExtent`

Tuple of Dates (`[start, end]`). Track portions between `start` and `end` will be rendered in white.

## `staticLayers`

Array of `staticLayer`.

### `staticLayer.id`

String. Mandatory. Identifies layer uniquely, should normally be a Mapbox GL `source` id.

### `staticLayer.visible`

TODO

### `staticLayer.opacity`

Number TODO

### `staticLayer.color`

String TODO

### `staticLayer.showLabels`

Boolean. Display the associated labels layer, if available.

### `staticLayer.selectedFeatures`

A filter to apply specific rules per polygon. Polygon filter is defined as: Object. Defines which features will appear selected on the map. The default appearance of the selected features is defined per GL feature type (fill, circle, etc). It can be overriden.

- `field`: String. A filterable field.
- `values`: Array. All selected values (logical OR).
- `style`: [NOT IMPLEMENTED] Object. Defines for each GL paint property (`fill-color`, etc) rules for selected and non selected objects, ie:

```
style: {
'fill-color': [
    SELECTED COLOR,
    DEFAULT COLOR
],
'fill-opacity': [
    SELECTED OPACITY,
    DEFAULT OPACITY
]
}
```

### `staticLayer.selected`

Boolean. If set to true, overrides any provided `selectedFeatures` and applies selected style to the whole layer.

### `staticLayer.highlightedFeatures`

Object. Defines which features will appear highlighted (ie on mouse hover) on the map. See `staticLayer.selectedFeatures` above for parameters.

### `staticLayer.highlighted`

Boolean. If set to true, overrides any provided `highlightedFeatures` and applies higlighted style to the whole layer.

### `staticLayer.interactive`

Boolean. Whether interaction is active on the layer or not.

### `staticLayer.isCustom`

Boolean. Specifying if the layer is custom, which means it uses resources externally, not from the internal style data.

### `staticLayer.subtype`

String. Mandatory if layer is custom. Can be 'geojson' or 'raster'.

### `staticLayer.url`

String.

- Mandatory if custom layer is of subtype 'raster'. Specifies the base URL for raster tiles.
- Optional if layer is tile layer and it is desired to override the default url

### `staticLayer.data`

Object. Mandatory if custom layer is of subtype 'geojson'. Specifies GeoJSON data.

### `staticLayer.gl`

Object. If specified, overrides all style info with raw Mapbox GL JSON styles, following the spec defined here: https://github.com/GlobalFishingWatch/map-client/blob/develop/documentation/workspaces.md#gl

## `basemapLayers`

TODO

basemapLayers: PropTypes.arrayOf(PropTypes.shape({
id: PropTypes.string,
visible: PropTypes.bool
})),

## `customLayers`

[NOT IMPLEMENTED] TODO

## `hoverPopup`

Object. Sets properties to display a native popup on hover. Popup appears if set.

### `hoverPopup.content`

React Node. Mandatory. DOM Node to display inside popup.

### `hoverPopup.latitude`

Number. Mandatory. Latitude for anchor point.

### `hoverPopup.longitude`

Number. Mandatory. Longitude for anchor point.

## `clickPopup`

Object. Sets properties to display a native popup on click. Popup appears if set.

### `clickPopup.content`

React Node. Mandatory. DOM Node to display inside popup.

### `clickPopup.latitude`

Number. Mandatory. Latitude for anchor point.

### `clickPopup.longitude`

Number. Mandatory. Longitude for anchor point.

## `onViewportChange`

Function. TODO

## `onLoadStart`

Function. TODO

## `onLoadComplete`

Function. TODO

## `onClick`

Function. Returns an event:
```
    {
        latitude,
        longitude,
        isCluster:bool,
        count:int - will be -1 if cluster size can't be determined
        features: [
            {
                layer: {
                    id:string,
                    group:string - matches mapbox:group defined in style.json
                },
                properties:[] - all available properties,
                title:string - human readable title,
                fields: [ - human readable properties
                    {
                        id:string,
                        label:string,
                        value:any,
                        title:string,
                        isLink:bool
                    }
                ]
            }
        ],
        feature: {} - set if there's only one feature
    }
```

## `onHover`

Function. See `onClick`

## `onAttributionsChange`

Function. Notify of attributions changes depending on layers toggled [PARTIALLY IMPLEMENTED] Will only fire at start.

# Development

As the module is using redux internally it is hard to debug the store or know which actions are being dispatched. To solve this you could run the [remote redux devtools](https://github.com/zalmoxisus/remote-redux-devtools) with the following steps:

1. Run the websockets server with `yarn debug-server`
2. Follow https://github.com/zalmoxisus/remote-redux-devtools#monitoring to see the logs
