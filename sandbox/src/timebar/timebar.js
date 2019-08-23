import React, { Component } from 'react'
import memoize from 'memoize-one'
import dayjs from 'dayjs'
import activityMock from './mocks/activity'
import trackMock from './mocks/trackWithSpeedAndCourse'
import eventsMock from './mocks/events'
import vesselEventsMock from './mocks/vesselEvents'
// import groupVesselEvents from './mocks/groupVesselEvents'

import Timebar, {
  TimebarActivity,
  TimebarEvents,
  TimebarVesselEvents,
  getHumanizedDates
} from '@globalfishingwatch/map-components/src/timebar'

import './timebar.css'

const HOVER_DELTA = 10

// const groupedVesselEvents = groupVesselEvents(vesselEventsMock)
// console.log(groupedVesselEvents)
// console.log(groupedVesselEvents.map(e => e.type))


const trackActivityMock = []
trackMock.features.forEach(feature => {
  const coordProps = feature.properties.coordinateProperties
  coordProps.times.forEach((time, i) => {
    trackActivityMock.push({
      date: time,
      courses: coordProps.courses[i],
      speeds: coordProps.speeds[i]
    })
  })
})

const getTrackActivityMockForSubChart = memoize((activity, currentSubChart) =>
  activity.map(item => ({
    ...item,
    value: item[currentSubChart]
  }))
)


const initialStart = new Date(trackActivityMock[0].date).toISOString()
const initialEnd = new Date(trackActivityMock[trackActivityMock.length-1].date).toISOString()
const absoluteStart = '2015-04-01T00:00:00.000Z'
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
    const hoverStart = scale(clientX - HOVER_DELTA)
    const hoverEnd = scale(clientX + HOVER_DELTA)
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
          <div className="dates">hover start: {hoverStart && hoverStart.toString()}</div>
          <div className="dates">hover end: {hoverStart && hoverEnd.toString()}</div>
        </div>
        <Timebar
          enablePlayback
          start={start}
          end={end}
          absoluteStart={absoluteStart}
          absoluteEnd={absoluteEnd}
          bookmarkStart={bookmarkStart}
          bookmarkEnd={bookmarkEnd}
          // enablePlayback
          onChange={this.update}
          onMouseMove={this.onMouseMove}
          onBookmarkChange={this.updateBookmark}
          // minimumRange={1}
          // minimumRangeUnit="day"
          // maximumRange={6}
          // maximumRangeUnit="month"
        >
          {// props => [
          //   // <Tracks key="tracks" {...props}  tracks={tracks} />,
          //   // <Activity key="activity" {...props} activity={activity} />,
          //   <Events key="events" {...props} events={eventsMock} />
          // ]
          (props) => {
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
                  opacity={1}
                  curve="curveBasis"
                  activity={activityMockForSubchart}
                />
                {/* <TimebarTrack key="track" {...props} track={trackMock} /> */}
              </>
            }
            return <TimebarActivity key="activity" {...props} activity={activityMock} />
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
