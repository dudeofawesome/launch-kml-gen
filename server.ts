import { Application, Router } from 'https://deno.land/x/oak@v9.0.1/mod.ts';
import { launch_kml_gen } from './main.ts';

const app = new Application();
const router = new Router();

router.get('/launch_kml_gen/:fc_uuid', async ctx => {
  const fc_uuid = ctx.request.url.pathname.split('/').at(-1);

  if (fc_uuid == null) {
    ctx.response.body = `missing fc_uuid`;
    ctx.response.status = 400;
    return;
  }

  try {
    ctx.response.body = (await launch_kml_gen(fc_uuid)).kml_contents;
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
