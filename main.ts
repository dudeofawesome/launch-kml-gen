import xml from 'https://cdn.skypack.dev/xmlbuilder2@^3.0.1';
import { Simulation, EventSummary } from './types.d.ts';

export const uuid_reg =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export async function launch_kml_gen(fc_uuid: string) {
  let fc_json: Simulation;

  if (fc_uuid.match(uuid_reg) == null) {
    throw new Error(`Input is not a UUID`);
  }

  // read in FlightClub JSON data
  const res = await fetch(
    `https://api.flightclub.io/v2/simulation/?launchLibraryV2Id=${fc_uuid}`,
    {
      headers: {
        Accept: 'application/json',
        Referer: 'https://flightclub.io/',
        'Content-Type': 'application/json',
        Origin: 'https://flightclub.io',
      },
    },
  );
  fc_json = (await res.json())[0];

  const name = `Launch ${fc_json.mission.datetime} ${fc_json.mission.description}`;

  const first_datapoint = fc_json.data.stageTrajectories.find(
    s => s.stageNumber === 0,
  )?.telemetry[0];

  /**
   * Not really sure what's going on here, but the "telemetry" data from FC seems
   * to be offset by a constant amount on the longitudinal axis. Maybe it's a
   * DRM thing?
   */
  const magic_lon_number =
    (first_datapoint || fc_json.mission.launchpad).longitude -
    fc_json.mission.launchpad.longitude;

  const stages: string[] = fc_json.data.stageTrajectories.map(
    stage_trajectory =>
      stage_trajectory.telemetry
        .map(entry =>
          [
            entry.longitude - magic_lon_number,
            entry.latitude,
            entry.altitude * 1000,
          ].join(','),
        )
        .join(' '),
  );

  const events: EventSummary[] = fc_json.data.eventLog
    .map(ev => {
      if (
        ev.value.match(/MECO/i) ||
        ev.value.match(/Entry Burn Ignition/i) ||
        ev.value.match(/Entry Burn Shutdown/i) ||
        ev.value.match(/Landing Burn Ignition/i)
      ) {
        // 1st stage events
        const tel = fc_json.data.stageTrajectories
          .find(st => st.stageNumber === 0)
          ?.telemetry.find(te => te.time === Number.parseInt(ev.key, 10));
        if (tel == null) {
          console.error(`Couldn't find time to match event`);
          return null;
        }
        return {
          name: ev.value,
          latitude: tel.latitude,
          longitude: tel.longitude,
          altitude: tel.altitude,
        };
      } else if (
        ev.value.match(/SECO/i) ||
        ev.value.match(/Payload Separation/i) ||
        ev.value.match(/Deorbit Ignition/i) ||
        ev.value.match(/Fuel Depletion/i)
      ) {
        // 2nd stage events
        const tel = fc_json.data.stageTrajectories
          .find(st => st.stageNumber === 1)
          ?.telemetry.find(te => te.time === Number.parseInt(ev.key, 10));
        if (tel == null) {
          console.error(`Couldn't find time to match event`);
          return null;
        }
        return {
          name: ev.value,
          latitude: tel.latitude,
          longitude: tel.longitude,
          altitude: tel.altitude,
        };
      } else {
        return null;
      }
    })
    .filter((ev): ev is EventSummary => ev != null);

  // define KML file
  const xml_doc = xml.create(
    { version: '1.0', encoding: 'UTF-8' },
    {
      kml: {
        '@xmlns': 'http://www.opengis.net/kml/2.2',
        '@xmlns:gx': 'http://www.google.com/kml/ext/2.2',
        '@xmlns:kml': 'http://www.opengis.net/kml/2.2',
        '@xmlns:atom': 'http://www.w3.org/2005/',
        Document: {
          name: `${name}.kml`,
          Folder: [
            {
              name: 'Trajectories',
              open: 1,
              Placemark: stages.map((stage, i) => ({
                name: `Stage ${i + 1}`,
                LineString: {
                  tessellate: 1,
                  altitudeMode: 'absolute',
                  coordinates: stage,
                },
              })),
            },
            {
              name: 'Locations',
              open: 1,
              Placemark: [
                {
                  name: fc_json.mission.launchpad.description,
                  Point: {
                    altitudeMode: 'relativeToGround',
                    coordinates: [
                      fc_json.mission.launchpad.longitude,
                      fc_json.mission.launchpad.latitude,
                      0,
                    ].join(','),
                  },
                },
                ...(fc_json.mission.landingZones || []).map(landing => ({
                  name: landing.name,
                  Point: {
                    altitudeMode: 'relativeToGround',
                    coordinates: [landing.longitude, landing.latitude, 0].join(
                      ',',
                    ),
                  },
                })),
              ],
            },
            {
              name: 'Events',
              open: 1,
              Placemark: events.map(event => ({
                name: event.name,
                Point: {
                  altitudeMode: 'absolute',
                  coordinates: [
                    event.longitude - magic_lon_number,
                    event.latitude,
                    event.altitude * 1000,
                  ].join(','),
                },
              })),
            },
          ],
        },
      },
    },
  );

  return {
    launch_name: fc_json.mission.description,
    launch_datetime: fc_json.mission.datetime,
    kml_contents: xml_doc.end({ prettyPrint: true }),
  };
}

export interface LaunchKMLReturn {
  launch_name: string;
  launch_datetime: string;
  kml_contents: string;
}
