// Fixture builders for realistic RTT services
export const fixtures = {
  onTime: {
    locationDetail: {
      realtimeActivated: true,
      realtimeGbttDepartureLateness: 0,
      gbttBookedDeparture: '1030',
      realtimeDeparture: '1030',
    },
  },
  minorDelay: {
    locationDetail: {
      realtimeActivated: true,
      realtimeGbttDepartureLateness: 3,
      gbttBookedDeparture: '1030',
      realtimeDeparture: '1033',
    },
  },
  delayed: {
    locationDetail: {
      realtimeActivated: true,
      realtimeGbttDepartureLateness: 8,
      gbttBookedDeparture: '1030',
      realtimeDeparture: '1038',
    },
  },
  majorDelay: {
    locationDetail: {
      realtimeActivated: true,
      realtimeGbttDepartureLateness: 20,
      gbttBookedDeparture: '1030',
      realtimeDeparture: '1050',
    },
  },
  cancelled: {
    locationDetail: {
      gbttBookedDeparture: '1030',
      cancelReasonCode: 'M8',
      displayAs: 'CANCELLED_CALL',
    },
  },
};

export function clone(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
