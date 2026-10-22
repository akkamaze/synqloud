precision highp float;

uniform vec2 resolution;
uniform float time;
uniform float aspect;
uniform vec2 seed;
uniform float fogDensity;

float hash(vec2 p) {
  vec2 q = mod(floor(p), 289.);
  float h = mod((q.x * 34. + 1.) * q.x, 289.);
  float cell = h + q.y;
  return mod((cell * 34. + 1.) * cell, 289.) / 289.;
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(
    mix(hash(i), hash(i + vec2(1., 0.)), f.x),
    mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x),
    f.y
  );
}

// Interpolate between seeded random fields, not random values per frame.
// The end field of one interval is the start of the next: no visual reset.
float evolvingNoise(vec2 p, float rate, float salt) {
  float phase = time * rate + salt, epoch = floor(phase), blend = fract(phase);
  blend = blend * blend * (3. - 2. * blend);

  vec2 first = vec2(hash(vec2(epoch, salt)), hash(vec2(epoch, salt + 4.1))) * 80.;
  vec2 next = vec2(hash(vec2(epoch + 1., salt)), hash(vec2(epoch + 1., salt + 4.1))) * 80.;
  return mix(noise(p + first), noise(p + next), blend);
}

float fbm(vec2 p) {
  float result = 0., amplitude = .5;
  for (int i = 0; i < 5; i++) {
    result += amplitude * noise(p);
    p = mat2(.8, -.6, .6, .8) * p * 2.04 + vec2(5.3, 2.1);
    amplitude *= .5;
  }
  return result;
}

float morphField(vec2 p, float salt) {
  float result = 0., amplitude = .5;
  for (int i = 0; i < 3; i++) {
    result += amplitude * evolvingNoise(p, .018 + float(i) * .004, salt + float(i) * 1.37);
    p = mat2(.8, -.6, .6, .8) * p * 2.04 + vec2(5.3, 2.1);
    amplitude *= .5;
  }
  return result;
}

float fibers(vec2 p) {
  float result = 0., amplitude = .45, weight = 1.;
  for (int i = 0; i < 6; i++) {
    float ridge = 1. - abs(noise(p) * 2. - 1.);
    ridge = pow(ridge, 4.);
    result += ridge * amplitude * weight;
    weight = mix(.55, 1., ridge);
    p = mat2(.94, -.34, .34, .94) * p * 2.13 + vec2(3.7, 8.1);
    amplitude *= .52;
  }
  return result;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;

  // Shear the field along a diagonal, then break it into irregular filaments.
  // Separate drift speeds avoid a single scrolling texture or liquid contours.
  vec2 p = vec2(uv.x * aspect * 7.2 - uv.y * 4.1, uv.y * 8.6) + seed;
  vec2 drift = vec2(time * .016, -time * .007);
  vec2 warp = vec2(
    morphField(p * .42 + drift * .6, 2.1),
    morphField(p * .42 + drift * .6 + vec2(7.1, 3.4), 8.3)
  ) - .5;
  vec2 field = p + warp * 3.6 + drift * .6;

  float cloud = morphField(p * .55 + drift * .4, 15.7);
  float strands = fibers(field + drift);
  float detail = fbm(field * 8. - drift * 1.6 + vec2(2.1, 7.4));
  float shadows = fbm(field * 1.6 + drift * .3 + vec2(8.2, 3.3));

  float density = (pow(cloud, 3.) * .25 + pow(strands, 2.2) * .75) * (.42 + .58 * detail);
  float volume = smoothstep(.16, .68, cloud) * (.055 + .1 * fbm(field * .52 - drift * .3));
  density += volume * fogDensity;
  density *= 1. - smoothstep(.38, .7, shadows) * mix(.72, .48, fogDensity);

  float band = .72 + .28 * fbm(p * .23);
  float breathing = .94 + .1 * sin(time * .22 + cloud * 5.);
  float alpha = .9 * (1. - exp(-density * (.3 + .7 * band) * 9. * breathing));
  vec3 color = mix(vec3(.26, .38, .5), vec3(.6, .76, .9), smoothstep(.04, .18, density));
  gl_FragColor = vec4(color * alpha, alpha);
}
