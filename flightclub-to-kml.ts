#!/usr/bin/env deno run --allow-read --allow-write --allow-net

const {
  args: [input],
} = Deno;

import { red } from 'https://deno.land/std/fmt/colors.ts';
// import xml from 'https://dev.jspm.io/xmlbuilder2';
import xml from 'https://cdn.skypack.dev/xmlbuilder2';
import { Mission, MissionEventSummary } from './types.d.ts';

const uuid_reg =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const magic_lon_number: number = -68.5052672924891 - -120.610667;
let fc_json: Mission;

// read in FlightClub JSON data
try {
  if (input.startsWith('https://') || input.match(uuid_reg) != null) {
    const uuid = input.match(uuid_reg)?.[1];
    if (uuid == null) {
      throw new Error(`Couldn't find a valid UUID`);
    }

    const res = await fetch(
      `https://api.flightclub.io/v2/simulation/?launchLibraryV2Id=${uuid}`,
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
  } else if (input.endsWith('.json')) {
    fc_json = JSON.parse(await Deno.readTextFile(input))[0];
  } else {
    throw new Error(`Couldn't determine type of input`);
  }
} catch (e) {
  console.error(e);
  Deno.exit(1);
}

const name = `Launch ${fc_json.mission.datetime} ${fc_json.mission.description}`;

const stages: string[] = fc_json.data.stageTrajectories.map(stage_trajectory =>
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

const events: MissionEventSummary[] = fc_json.data.eventLog
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
  .filter((ev): ev is MissionEventSummary => ev != null);

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
        Folder: {
          name: name,
          open: 1,
          Folder: {
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
            Folder: {
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
          },
        },
      },
    },
  },
);

await Deno.writeTextFile(`${name}.kml`, xml_doc.end({ prettyPrint: true }));
console.log(`Created "${name}.kml"`);
