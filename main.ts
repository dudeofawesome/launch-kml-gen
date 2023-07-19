import xml from 'https://cdn.skypack.dev/xmlbuilder2@^3.0.1';
import { Simulation, EventSummary } from './types.d.ts';
import { ecef2lla } from './util/ecef2lla.ts';

export const mission_reg = /(mis_\w+)$/i;

export async function launch_kml_gen(fc_mission_id: string) {
  let fc_json: Simulation;

  if (fc_mission_id.match(mission_reg) == null) {
    throw new Error(`Input is not a missionId`);
  }

  const sim_res = await fetch(
    `http://api.flightclub.io/v3/simulation?missionId=${fc_mission_id}`,
    {
      headers: {
        Referer: 'https://flightclub.io/',
        Origin: 'https://flightclub.io',
      },
    },
  );

  fc_json = (await sim_res.json())[0];

  const name = `Launch ${fc_json.mission.startDateTime} ${fc_json.mission.description}`;
  console.log(name);

  const stages: string[] = fc_json.data.stageTrajectories
    .sort((a, b) => a.stageNumber - b.stageNumber)
    .map((stage_trajectory) =>
      stage_trajectory.telemetry
        .map((entry) => {
          const lla = ecef2lla(...entry.x_NI);
          return [lla.lon, lla.lat, lla.alt].join(',');
        })
        .join(' '),
    );

  const joined_telemetry = fc_json.data.stageTrajectories
    .map((t) => t.telemetry)
    .flat();

  const events: EventSummary[] = fc_json.data.eventLog
    .map((ev) => {
      if (
        ev.value.match(/MECO/i) ||
        ev.value.match(/Ignition/i) ||
        ev.value.match(/Entry Burn Shutdown/i) ||
        ev.value.match(/SECO/i) ||
        ev.value.match(/Payload Separation/i) ||
        ev.value.match(/Fuel Depletion/i)
      ) {
        // 1st stage events
        const time = Math.round(Number.parseInt(ev.key, 10));
        const tel = joined_telemetry.find((te) => Math.round(te.t) === time);
        if (tel == null) {
          console.error(`Couldn't find time to match event: "${ev.value}"`);
          return null;
        }
        const pos = ecef2lla(...tel.x_NI);
        return {
          name: ev.value,
          latitude: pos.lat,
          longitude: pos.lon,
          altitude: pos.alt,
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
                  name: fc_json.mission.initialConditions.launchpad.launchpad
                    .description,
                  Point: {
                    altitudeMode: 'relativeToGround',
                    coordinates: [
                      fc_json.mission.initialConditions.launchpad.launchpad
                        .longitude,
                      fc_json.mission.initialConditions.launchpad.launchpad
                        .latitude,
                      0,
                    ].join(','),
                  },
                },
                ...(fc_json.mission.landingZones || []).map((landing) => ({
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
              Placemark: events.map((event) => ({
                name: event.name,
                Point: {
                  altitudeMode: 'absolute',
                  coordinates: [
                    event.longitude,
                    event.latitude,
                    event.altitude,
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
    launch_datetime: fc_json.mission.startDateTime,
    kml_contents: xml_doc.end({ prettyPrint: true }),
  };
}

export interface LaunchKMLReturn {
  launch_name: string;
  launch_datetime: string;
  kml_contents: string;
}
