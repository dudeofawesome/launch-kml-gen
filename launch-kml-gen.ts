#!/usr/bin/env deno run --allow-read --allow-write --allow-net

const {
  args: [input],
} = Deno;

import { join } from 'https://deno.land/std/path/mod.ts';
import { launch_kml_gen, LaunchKMLReturn, uuid_reg } from './main.ts';

switch (input) {
  case '--help':
  case '-h':
    console.info(`launch-kml-gen`);
    console.info(`Generates KML files from rocket launch data`);
    console.info(``);
    console.info(`USAGE:`);
    console.info(`launch-kml-gen [FLIGHTCLUB LAUNCH UUID]`);
    console.info(``);
    console.info(`OPTIONS:`);
    console.info(`-h, --help`);
    console.info(`        Prints help information`);
    Deno.exit(0);
    break;
}

let kml: LaunchKMLReturn;

if (input.startsWith('https://') || input.match(uuid_reg) != null) {
  const uuid = input.match(uuid_reg)?.[1];
  if (uuid == null) {
    throw new Error(`Couldn't find a valid UUID`);
  }

  kml = await launch_kml_gen(uuid);
} else {
  console.error(`Couldn't determine type of input`);
  Deno.exit(1);
}

const name = `Launch ${kml.launch_datetime} ${kml.launch_name}`;

const out_dir = `launches`;
const out_path = join(out_dir, `${name}.kml`);
await Deno.mkdir(out_dir).catch(() => {});
await Deno.writeTextFile(out_path, kml.kml_contents);
console.info(`Created "${out_path}"`);
