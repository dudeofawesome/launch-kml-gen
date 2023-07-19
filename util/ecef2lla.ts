export function ecef2lla(
  x: number,
  y: number,
  z: number,
): { lon: number; lat: number; alt: number } {
  const a = 6378137;
  const e = 8.1819190842622e-2; // also Math.sqrt(1 - this.wgs84FlatteningFactor * this.wgs84FlatteningFactor);

  const a2 = a * a;
  const e2 = e * e;
  const b = Math.sqrt(a2 * (1 - e2));

  const b2 = b * b;
  const ep = Math.sqrt(a2 / b2 - 1);

  const p = Math.sqrt(x * x + y * y);
  const th = Math.atan2(a * z, b * p);
  const lon = Math.atan2(y, x) % (2 * Math.PI);

  const sth = Math.sin(th),
    cth = Math.cos(th);
  const lat = Math.atan2(
    z + ep * ep * b * sth * sth * sth,
    p - e2 * a * cth * cth * cth,
  );

  const slat = Math.sin(lat);
  const N = a / Math.sqrt(1 - e2 * slat * slat);

  // correct for numerical instability in altitude near exact poles:
  // (after this correction, error is about 2 millimeters, which is about
  // the same as the numerical precision of the overall function)
  const alt =
    Math.abs(x) < 1 && Math.abs(y) < 1
      ? Math.abs(z) - b
      : p / Math.cos(lat) - N;

  return { lat: lat * (180 / Math.PI), lon: lon * (180 / Math.PI), alt };
}
