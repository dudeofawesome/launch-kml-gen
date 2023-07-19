import xml from 'https://cdn.skypack.dev/xmlbuilder2@^3.0.1';
import { Temporal } from 'https://cdn.skypack.dev/@js-temporal/polyfill@^0.4.4?dts';

import { Simulation, EventSummary } from './types.d.ts';
import { ecef2lla } from './util/ecef2lla.ts';

export interface lla {
  lon: number;
  lat: number;
  alt: number;
}

export type llai = lla & { ignited: boolean };

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

  const stages: llai[][][] = fc_json.data.stageTrajectories
    .sort((a, b) => a.stageNumber - b.stageNumber)
    .map((stage_trajectory) =>
      stage_trajectory.telemetry
        .map<llai>((entry) => {
          const lla = ecef2lla(...entry.x_NI);
          return {
            ...lla,
            ignited: !entry.tl.map((e) => Math.floor(e)).every((e) => e === 0),
          };
        })
        .reduce<llai[][]>((accel_group, point, i, arr) => {
          const a = accel_group.at(-1);
          if (a == null || a.at(-1)?.ignited !== point.ignited) {
            accel_group.push([point]);
          } else {
            a.push(point);
          }

          return accel_group;
        }, []),
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
        const time = Math.round(Number.parseInt(ev.key, 10) / 10);
        const tel = joined_telemetry.find(
          (te) => Math.round(te.t / 10) === time,
        );
        if (tel == null) {
          console.error(`Couldn't find time to match event: "${ev.value}"`);
          return null;
        }
        const pos = ecef2lla(...tel.x_NI);
        const d = Temporal.Duration.from({
          seconds: Math.round(Math.abs(tel.t)),
        });
        const mins = Math.floor(d.total('minutes'));
        const secs =
          d.total('seconds') - (mins % Math.floor(d.total('seconds'))) * 60;
        return {
          name: `${ev.value} @ T${tel.t > 0 ? '+' : '-'}${mins
            .toString()
            .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
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
          Style: [
            {
              '@id': 'accelerating',
              LineStyle: {
                color: 'ff025ee0',
                width: 4,
              },
            },
            {
              '@id': 'coasting',
              LineStyle: {
                color: 'ffafafaf',
                width: 4,
              },
            },
          ],
          Folder: [
            {
              name: 'Trajectories',
              open: 1,
              Folder: stages.map((stage, i) => ({
                name: `Stage ${i + 1}`,
                open: 0,
                Placemark: stage.map((accel_group, i) => ({
                  name: accel_group[0]?.ignited ? 'Accelerating' : 'Coasting',
                  visibility:
                    i > 0 || (i === 0 && accel_group[0]?.ignited) ? 1 : 0,
                  styleUrl: `#${
                    accel_group[0]?.ignited ? 'accelerating' : 'coasting'
                  }`,
                  LineString: {
                    tessellate: 1,
                    altitudeMode: 'absolute',
                    coordinates: accel_group
                      .map((p) => [p.lon, p.lat, p.alt].join(','))
                      .join(' '),
                  },
                })),
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
