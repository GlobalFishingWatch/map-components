import React, { Component } from 'react'
import memoize from 'memoize-one'
import dayjs from 'dayjs'

// mocks
import activityMock from './mocks/activity'
import trackMock from './mocks/trackWithFishingSpeedAndCourse'
import eventsMock from './mocks/events'
import vesselEventsMock from './mocks/vesselEvents'

// timebar
import Timebar, {
  TimebarActivity,
  TimebarEvents,
  TimebarVesselEvents,
  TimebarTracks,
  TimebarHighlighter,
  getHumanizedDates,
} from '@globalfishingwatch/map-components/src/timebar'
import { geoJSONTrackToTimebarTrack, geoJSONTrackToTimebarFeatureSegments } from '@globalfishingwatch/map-components/src/timebar/utils'

import './timebar.css'


const HOVER_DELTA = 8


const trackActivityMock = geoJSONTrackToTimebarFeatureSegments(trackMock)

const getTrackActivityMockForSubChart = memoize((activity, currentSubChart) =>
  activity.map(segment =>
    segment.map(item => ({
      ...item,
      value: item[currentSubChart]
    })
  ))
)

const getTrackMockForSubChart = memoize((trackMock) => {
  const timebarTrack = geoJSONTrackToTimebarTrack(trackMock)
  return [
    timebarTrack,
    { ...timebarTrack, color: '#00ff00' },
    { ...timebarTrack, color: '#00ffff' },
    { ...timebarTrack, color: '#ffff00' }
  ]
})

// uncomment to use with dataset start date
// const initialStart = new Date(trackActivityMock[0][0].date).toISOString()
const initialStart = '2012-01-01T00:00:00.000Z'
const initialEnd = new Date(trackActivityMock[trackActivityMock.length-1][0].date).toISOString()
const absoluteStart = '2012-01-01T00:00:00.000Z'
const absoluteEnd = '2019-08-31T00:00:00.000Z'

class TimebarContainer extends Component {
  state = {
    start: initialStart,
    end: initialEnd,
    bookmarkStart: null,
    bookmarkEnd: null,
    currentChart: 'track',
    currentSubChart: 'courses',
    highlightedEventIDs: null,
  }

  update = (start, end) => {
    const { humanizedStart, humanizedEnd, interval } = getHumanizedDates(start, end)
    this.setState({
      start,
      end,
      humanizedStart,
      humanizedEnd,
      interval,
    })
  }

  onMouseMove = (clientX, scale) => {
    if (clientX === null) {
      this.setState({
        hoverStart: null,
        hoverEnd: null,
      })
      return
    }
    const hoverStart = scale(clientX - HOVER_DELTA).toISOString()
    const hoverEnd = scale(clientX + HOVER_DELTA).toISOString()
    this.setState({
      hoverStart,
      hoverEnd,
    })
  }

  updateBookmark = (bookmarkStart, bookmarkEnd) => {
    this.setState({
      bookmarkStart,
      bookmarkEnd,
    })
  }

  setHighlightedEvents = (eventIDs) => {
    this.setState({
      highlightedEventIDs: eventIDs,
    })
  }

  render() {
    const {
      start,
      end,
      bookmarkStart,
      bookmarkEnd,
      humanizedStart,
      humanizedEnd,
      interval,
      currentChart,
      currentSubChart,
      highlightedEventIDs,
      hoverStart,
      hoverEnd,
    } = this.state

    const activityMockForSubchart = getTrackActivityMockForSubChart(trackActivityMock, currentSubChart)
    const trackMockForSubchart = getTrackMockForSubChart(trackMock)

    return (
      <div className="mainContainer">
        <div className="tools">
          <div>
            <select
              onChange={(event) => {
                this.setState({ currentChart: event.target.value })
              }}
              value={currentChart}
            >
              <option value="activity">Activity</option>
              <option value="events">Events</option>
              <option value="vesselEvents">Vessel events</option>
              <option value="track">Track</option>
              <option value="tracks">Tracks</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              this.update(
                this.state.start,
                dayjs(this.state.end)
                  .add(10, 'days')
                  .toISOString()
              )
            }}
          >
            add 10 days
          </button>

          <div className="dates">{`${humanizedStart} - ${humanizedEnd} (${interval} days)`}</div>
          <div className="dates">hover start: {new Date(hoverStart).toString()}</div>
          <div className="dates">hover end: {new Date(hoverEnd).toString()}</div>
        </div>
        <Timebar
          enablePlayback
          start={start}
          end={end}
          absoluteStart={absoluteStart}
          absoluteEnd={absoluteEnd}
          bookmarkStart={bookmarkStart}
          bookmarkEnd={bookmarkEnd}
          onChange={this.update}
          onMouseMove={this.onMouseMove}
          onBookmarkChange={this.updateBookmark}
          // uncomment to enable extra options
          // enablePlayback
          // minimumRange={1}
          // minimumRangeUnit="day"
          // maximumRange={6}
          // maximumRangeUnit="month"
        >
          {(props) => {
            const { outerScale, graphHeight } = props

            if (currentChart === 'events') {
              return (
                <TimebarEvents key="events" {...props} events={eventsMock} showFishing={false} />
              )
            }
            if (currentChart === 'vesselEvents') {
              return (
                <TimebarVesselEvents
                  key="vesselEvents"
                  {...props}
                  events={vesselEventsMock}
                  highlightedEventIDs={highlightedEventIDs}
                  onEventHighlighted={(event) =>
                    this.setHighlightedEvents(event === undefined ? [] : [event.id])
                  }
                />
              )
            }
            if (currentChart === 'track') {
              return <>
                <TimebarActivity
                  {...props}
                  key="trackActivity"
                  color="#fe81eb"
                  opacity={.4}
                  curve="curveBasis"
                  activity={activityMockForSubchart}
                />
                <TimebarTracks
                  key="tracks"
                  tracks={[trackMockForSubchart[0]]}
                  outerScale={outerScale}
                  graphHeight={graphHeight}
                />
                <TimebarHighlighter
                  graphHeight={props.graphHeight}
                  outerScale={props.outerScale}
                  tooltipContainer={props.tooltipContainer}
                  hoverStart={hoverStart}
                  hoverEnd={hoverEnd}
                  activity={activityMockForSubchart}
                  unit={(currentSubChart === 'courses' ? 'degrees' : 'knots')}
                />
              </>
            }
            if (currentChart === 'tracks') {
              return <TimebarTracks
                key="tracks"
                tracks={trackMockForSubchart}
                outerScale={props.outerScale}
                graphHeight={graphHeight}
            />
            }
            return <TimebarActivity key="activity" {...props} activity={[activityMock]} />
          }}
        </Timebar>
        {(currentChart === 'track') && (
          <select className="subChartSelector"
            onChange={(event) => {
              this.setState({ currentSubChart: event.target.value })
            }}
            value={currentSubChart}
          >
            <option value="courses">Course</option>
            <option value="speeds">Speed</option>
          </select>
        )}
      </div>
    )
  }
}

export default TimebarContainer
