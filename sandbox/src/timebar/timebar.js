import React, { Component } from 'react'
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

console.log(activityMock)
console.log(trackMock)
const trackActivityMock = []
trackMock.features.forEach(feature => {
  const coordProps = feature.properties.coordinateProperties
  coordProps.times.forEach((time, i) => {
    trackActivityMock.push({
      date: time,
      value: coordProps.courses[i]
    })
  })
})

const initialStart = '2018-04-01T00:00:00.000Z'
const initialEnd = '2019-03-31T00:00:00.000Z'

const absoluteStart = new Date(activityMock[0].date).toISOString()
const absoluteEnd = new Date(activityMock[activityMock.length-1].date).toISOString()

class TimebarContainer extends Component {
  state = {
    start: initialStart,
    end: initialEnd,
    bookmarkStart: null,
    bookmarkEnd: null,
    currentChart: 'track',
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
      highlightedEventIDs,
      hoverStart,
      hoverEnd,
    } = this.state
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
                <TimebarActivity key="trackActivity" {...props} activity={trackActivityMock} />
                {/* <TimebarTrack key="track" {...props} track={trackMock} /> */}
              </>
            }
            return <TimebarActivity key="activity" {...props} activity={activityMock} />
          }}
        </Timebar>
      </div>
    )
  }
}

export default TimebarContainer
