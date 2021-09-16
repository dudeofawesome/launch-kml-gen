#!/usr/bin/env deno run --allow-read --allow-write --allow-net

const {
  args: [input],
} = Deno;

import { red } from 'https://deno.land/std/fmt/colors.ts';
import { join } from 'https://deno.land/std/path/mod.ts';
import xml from 'https://cdn.skypack.dev/xmlbuilder2';
import { Simulation, EventSummary } from './types.d.ts';

switch (input) {
  case '--help':
  case '-h':
    console.info(`flightclub-to-kml`);
    console.info(`Generates KML files from rocket launch data`);
    console.info(``);
    console.info(`USAGE:`);
    console.info(`flightclub-to-kml [FLIGHTCLUB LAUNCH UUID]`);
    console.info(``);
    console.info(`OPTIONS:`);
    console.info(`-h, --help`);
    console.info(`        Prints help information`);
    Deno.exit(0);
    break;
}

const uuid_reg =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
let fc_json: Simulation;

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

const out_dir = `launches`;
const out_path = join(out_dir, `${name}.kml`);
await Deno.mkdir(out_dir).catch(() => {});
await Deno.writeTextFile(out_path, xml_doc.end({ prettyPrint: true }));
console.info(`Created "${out_path}"`);
