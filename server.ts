import { Application, Router } from 'https://deno.land/x/oak@v9.0.1/mod.ts';
import { launch_kml_gen } from './main.ts';

const app = new Application();
const router = new Router();

router.get('/launch_kml_gen/:fc_mis_id', async (ctx) => {
  const fc_mis_id = ctx.request.url.pathname.split('/').at(-1);

  if (fc_mis_id == null) {
    ctx.response.body = `missing fc_uuid`;
    ctx.response.status = 404;
    return;
  }

  try {
    ctx.response.body = (await launch_kml_gen(fc_mis_id)).kml_contents;
    ctx.response.headers.set(
      'Content-Type',
      'application/vnd.google-earth.kml+xml',
    );
    return;
  } catch (e) {
    ctx.response.body = e.message;
    ctx.response.status = 500;
    return;
  }
});

router.get('/launch_kml_gen', async (ctx) => {
  const res = await fetch(`https://api.flightclub.io/v3/mission/next`);
  const fc_mis_id = (await res.json()).resourceId;

  if (fc_mis_id == null) {
    ctx.response.body = `missing fc_uuid`;
    ctx.response.status = 500;
    return;
  }

  try {
    ctx.response.body = (await launch_kml_gen(fc_mis_id)).kml_contents;
    ctx.response.headers.set(
      'Content-Type',
      'application/vnd.google-earth.kml+xml',
    );
    return;
  } catch (e) {
    ctx.response.body = e.message;
    ctx.response.status = 500;
    return;
  }
});

app.use(router.routes());
console.info(`Starting server`);
await app.listen({ port: 80 });
