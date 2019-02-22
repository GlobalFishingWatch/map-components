import React, { Component } from 'react'
import dayjs from 'dayjs'
import activityMock from './mocks/activity'
import eventsMock from './mocks/events'
import vesselEventsMock from './mocks/vesselEvents'
import groupVesselEvents from './mocks/groupVesselEvents'

import Timebar, {
  TimebarActivity,
  TimebarEvents,
  TimebarVesselEvents,
} from '@globalfishingwatch/map-components/dist/timebar'

import './timebar.css'

// --- TODO This should be inside Activity.jsx - let's have charts deal with data formats
const maxActivity = activityMock.reduce((acc, current) => Math.max(acc, current.value), 0)
// const activity = {};
// activityMock.forEach((d) => { activity[dayjs(d.date).format('YYYY-MM-DD')] = d.value / maxActivity; });
const activity = activityMock.map(d => ({
  date: d.date,
  id: dayjs(d.date).format('YYYY-MM-DD'),
  value: d.value / maxActivity,
}))
// ---

const getTime = dateISO => new Date(dateISO).getTime()
const getDeltaMs = (start, end) => getTime(end) - getTime(start)
const getDeltaDays = (start, end) => getDeltaMs(start, end) / 1000 / 60 / 60 / 24
const isMoreThanADay = (start, end) => getDeltaDays(start, end) >= 1
const getHumanizedDates = (start, end) => {
  const format = isMoreThanADay(start, end) ? 'MMM D YYYY' : 'MMM D YYYY HH[h]'
  const humanizedStart = dayjs(start).format(format)
  const humanizedEnd = dayjs(end).format(format)
  return { humanizedStart, humanizedEnd }
}

const groupedVesselEvents = groupVesselEvents(vesselEventsMock)
// console.log(groupedVesselEvents)
// console.log(groupedVesselEvents.map(e => e.type))

const initialStart = '2017-12-01T00:00:00.000Z'
const initialEnd = '2018-12-01T00:00:00.000Z'

const absoluteStart = '2017-01-01T00:00:00.000Z'
const absoluteEnd = initialEnd

class TimebarContainer extends Component {
  state = {
    start: initialStart,
    end: initialEnd,
    bookmarkStart: null,
    bookmarkEnd: null,
    currentChart: 'events',
    highlightedEventIDs: [],
  }

  update = (start, end) => {
    const { humanizedStart, humanizedEnd } = getHumanizedDates(start, end)
    this.setState({
      start,
      end,
      humanizedStart,
      humanizedEnd,
    })
  }

  updateBookmark = (bookmarkStart, bookmarkEnd) => {
    this.setState({
      bookmarkStart,
      bookmarkEnd,
    })
  }

  setHighlightedEvents = eventIDs => {
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
      currentChart,
      highlightedEventIDs,
    } = this.state
    return (
      <div className="mainContainer">
        <div className="tools">
          <div>
            <select
              onChange={event => {
                this.setState({ currentChart: event.target.value })
              }}
            >
              <option value="activity">Activity</option>
              <option value="events">Events</option>
              <option value="vesselEvents">Vessel events</option>
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
          <button
            type="button"
            onMouseEnter={() => {
              this.setHighlightedEvents(
                groupedVesselEvents.filter(e => e.type === 'encounter').map(e => e.id)
              )
            }}
            onMouseLeave={() => this.setHighlightedEvents([])}
          >
            Hover to highlight encounter events
          </button>
          <div className="humanizedTimeSpan">{`${humanizedStart} - ${humanizedEnd}`}</div>
        </div>
        <Timebar
          start={start}
          end={end}
          absoluteStart={absoluteStart}
          absoluteEnd={absoluteEnd}
          bookmarkStart={bookmarkStart}
          bookmarkEnd={bookmarkEnd}
          // enablePlayback
          onChange={this.update}
          onBookmarkChange={this.updateBookmark}
        >
          {// props => [
          //   // <Tracks key="tracks" {...props}  tracks={tracks} />,
          //   // <Activity key="activity" {...props} activity={activity} />,
          //   <Events key="events" {...props} events={eventsMock} />
          // ]
          props => {
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
                  events={groupedVesselEvents}
                  highlightedEventIDs={highlightedEventIDs}
                  onEventHighlighted={event =>
                    this.setHighlightedEvents(event === undefined ? [] : [event.id])
                  }
                />
              )
            }
            return <TimebarActivity key="activity" {...props} activity={activity} />
          }}
        </Timebar>
      </div>
    )
  }
}

export default TimebarContainer
