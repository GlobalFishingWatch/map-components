export default events => {
  const sortedEvents = [...events]
  sortedEvents.sort((a, b) => {
    const startA = new Date(a.start).getTime()
    const startB = new Date(b.start).getTime()
    return startA - startB
  })

  const TO_MERGE = [
    {
      start: 'PORT_ENTRY',
      end: 'PORT_EXIT',
      merged: 'port',
    },
    {
      start: 'TRANSPONDER_ON',
      end: 'TRANSPONDER_OFF',
      merged: 'gap',
    },
  ]
  const TO_MERGE_ALL = []
  TO_MERGE.forEach(toMerge => {
    TO_MERGE_ALL.push(toMerge.start)
    TO_MERGE_ALL.push(toMerge.end)
  })

  const mergedEvents = []
  const currentlyOpened = {}
  sortedEvents.forEach(event => {
    if (TO_MERGE_ALL.indexOf(event.type) === -1) {
      mergedEvents.push(event)
    } else {
      const startType = TO_MERGE.find(t => t.start === event.type)
      const endType = TO_MERGE.find(t => t.end === event.type)
      if (startType !== undefined) {
        if (currentlyOpened[startType.merged]) {
          console.warn('already opened', event)
        } else {
          currentlyOpened[startType.merged] = event
        }
      } else if (endType !== undefined) {
        if (currentlyOpened[endType.merged]) {
          const startEvent = currentlyOpened[endType.merged]
          mergedEvents.push({
            ...startEvent,
            end: event.end,
            type: endType.merged,
          })
          currentlyOpened[endType.merged] = null
        } else {
          console.warn('never opened', event)
        }
      }
    }
  })

  return mergedEvents
}
