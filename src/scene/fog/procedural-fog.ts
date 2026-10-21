import { createDustWeather } from './fog-weather.ts';

const vertexSource = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float aspect;
uniform vec2 seed;
uniform float fogDensity;
float hash(vec2 p){vec2 q=mod(floor(p),289.);float h=mod((q.x*34.+1.)*q.x,289.);float cell=h+q.y;return mod((cell*34.+1.)*cell,289.)/289.;}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
// Interpolate between seeded random fields, not random values per frame.
// The end field of one interval is the start of the next: no visual reset.
float evolvingNoise(vec2 p,float rate,float salt){
  float phase=time*rate+salt,epoch=floor(phase),blend=fract(phase);
  blend=blend*blend*(3.-2.*blend);
  vec2 first=vec2(hash(vec2(epoch,salt)),hash(vec2(epoch,salt+4.1)))*80.;
  vec2 next=vec2(hash(vec2(epoch+1.,salt)),hash(vec2(epoch+1.,salt+4.1)))*80.;
  return mix(noise(p+first),noise(p+next),blend);
}
float fbm(vec2 p){float result=0.,amplitude=.5;for(int i=0;i<5;i++){result+=amplitude*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.04+vec2(5.3,2.1);amplitude*=.5;}return result;}
float morphField(vec2 p,float salt){float result=0.,amplitude=.5;for(int i=0;i<3;i++){result+=amplitude*evolvingNoise(p,.018+float(i)*.004,salt+float(i)*1.37);p=mat2(.8,-.6,.6,.8)*p*2.04+vec2(5.3,2.1);amplitude*=.5;}return result;}
float fibers(vec2 p){float result=0.,amplitude=.45,weight=1.;for(int i=0;i<6;i++){float ridge=1.-abs(noise(p)*2.-1.);ridge=pow(ridge,4.);result+=ridge*amplitude*weight;weight=mix(.55,1.,ridge);p=mat2(.94,-.34,.34,.94)*p*2.13+vec2(3.7,8.1);amplitude*=.52;}return result;}
void main(){
  vec2 uv=gl_FragCoord.xy/resolution;
  // Shear the field along a diagonal, then break it into irregular filaments.
  // Separate drift speeds avoid a single scrolling texture or liquid contours.
  vec2 p=vec2(uv.x*aspect*7.2-uv.y*4.1,uv.y*8.6)+seed;
  vec2 drift=vec2(time*.016,-time*.007);
  vec2 warp=vec2(morphField(p*.42+drift*.6,2.1),morphField(p*.42+drift*.6+vec2(7.1,3.4),8.3))-.5;
  vec2 field=p+warp*3.6+drift*.6;
  float cloud=morphField(p*.55+drift*.4,15.7);
  float strands=fibers(field+drift);
  float detail=fbm(field*8.-drift*1.6+vec2(2.1,7.4));
  float shadows=fbm(field*1.6+drift*.3+vec2(8.2,3.3));
  float density=(pow(cloud,3.)*.25+pow(strands,2.2)*.75)*(.42+.58*detail);
  float volume=smoothstep(.16,.68,cloud)*(.055+.1*fbm(field*.52-drift*.3));
  density+=volume*fogDensity;
  density*=1.-smoothstep(.38,.7,shadows)*mix(.72,.48,fogDensity);
  float band=.72+.28*fbm(p*.23);
  float breathing=.94+.1*sin(time*.22+cloud*5.);
  float alpha=.9*(1.-exp(-density*(.3+.7*band)*9.*breathing));
  vec3 color=mix(vec3(.26,.38,.5),vec3(.6,.76,.9),smoothstep(.04,.18,density));
  gl_FragColor=vec4(color*alpha,alpha);
}`;


export interface ProceduralDust {
  setActive(value: boolean): void;
  draw(elapsed: number): void;
  dispose(): void;
}

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'procedural-dust';
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

export function createProceduralDust(app: HTMLElement): ProceduralDust {
  let canvas = makeCanvas();
  app.prepend(canvas);
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let timeUniform: WebGLUniformLocation | null = null;
  let aspectUniform: WebGLUniformLocation | null = null;
  let seedUniform: WebGLUniformLocation | null = null;
  let fogUniform: WebGLUniformLocation | null = null;
  let resolutionUniform: WebGLUniformLocation | null = null;
  let disposed = false;
  let active = false;
  let lastElapsed = 0;
  const seed: [number, number] = [Math.random() * 40 + 2, Math.random() * 40 + 2];
  const weather = createDustWeather();
  let fallbackContext: CanvasRenderingContext2D | null = null;
  let fallbackTextures: HTMLCanvasElement[] = [];
  let fallbackEpoch = -1;

  function compile(context: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = context.createShader(type);
    if (!shader) throw new Error('Dust shader unavailable');
    context.shaderSource(shader, source);
    context.compileShader(shader);
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
      context.deleteShader(shader);
      throw new Error('Dust shader unavailable');
    }
    return shader;
  }

  function fallback(): void {
    const previous = canvas;
    canvas = makeCanvas();
    previous.replaceWith(canvas);
    fallbackContext = canvas.getContext('2d');
    canvas.dataset.renderer = 'canvas';
    canvas.dataset.seed = seed.map(value => value.toFixed(3)).join(',');
    resize();
  }

  function fallbackTexture(epoch: number): HTMLCanvasElement {
    const texture = document.createElement('canvas');
    texture.width = 400;
    texture.height = 280;
    const context = texture.getContext('2d');
    if (!context) return texture;
    const pixels = context.createImageData(400, 280);
    const random = (salt: number): number => {
      const value = Math.sin(epoch * 12.9898 + seed[0] * 78.233 + salt) * 43758.5453;
      return value - Math.floor(value);
    };
    const angles = [random(1) * 6.28, random(2) * 6.28, random(3) * 6.28];
    for (let y = 0; y < 280; y++) {
      for (let x = 0; x < 400; x++) {
        const n = (Math.sin(x * .041 + y * .073 + angles[0]) +
          Math.sin(x * .13 - y * .033 + angles[1]) +
          Math.sin(x * .009 + y * .017 + angles[2])) * .166 + .5;
        const i = (y * 400 + x) * 4;
        pixels.data[i] = 90;
        pixels.data[i + 1] = 140;
        pixels.data[i + 2] = 184;
        pixels.data[i + 3] = Math.max(0, n ** 4 * .8 * 160);
      }
    }
    context.putImageData(pixels, 0, 0);
    return texture;
  }

  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL unavailable');
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error('Dust shader unavailable');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Dust shader unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Dust geometry unavailable');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    timeUniform = gl.getUniformLocation(program, 'time');
    aspectUniform = gl.getUniformLocation(program, 'aspect');
    seedUniform = gl.getUniformLocation(program, 'seed');
    fogUniform = gl.getUniformLocation(program, 'fogDensity');
    gl.uniform2f(seedUniform, ...seed);
    canvas.dataset.renderer = 'webgl';
    canvas.dataset.seed = seed.map(value => value.toFixed(3)).join(',');
    resolutionUniform = gl.getUniformLocation(program, 'resolution');
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      gl = null;
      fallback();
    });
  } catch {
    if (gl) {
      if (program) gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
    }
    gl = null;
    fallback();
  }

  function resize(): void {
    if (disposed) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round((app.clientWidth || 1) * ratio);
    canvas.height = Math.round((app.clientHeight || 1) * ratio);
    canvas.dataset.resolution = `${canvas.width}x${canvas.height}`;
    draw(lastElapsed);
  }

  function draw(elapsed: number): void {
    if (disposed || !active) return;
    lastElapsed = elapsed;
    const time = elapsed / 1000;
    const atmosphere = weather.sample(elapsed);
    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      gl.uniform1f(timeUniform, time);
      gl.uniform1f(aspectUniform, canvas.width / canvas.height);
      gl.uniform1f(fogUniform, atmosphere.density);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if (fallbackContext) {
      const epoch = Math.floor(time * .025);
      const phase = time * .025 - epoch;
      const blend = phase * phase * (3 - 2 * phase);
      if (epoch !== fallbackEpoch) {
        fallbackTextures = [
          fallbackEpoch === epoch - 1 && fallbackTextures[1] ? fallbackTextures[1] : fallbackTexture(epoch),
          fallbackTexture(epoch + 1),
        ];
        fallbackEpoch = epoch;
      }
      fallbackContext.clearRect(0, 0, canvas.width, canvas.height);
      fallbackContext.globalCompositeOperation = 'lighter';
      const centerX = canvas.width * .5;
      const centerY = canvas.height * .5;
      const fog = fallbackContext.createRadialGradient(centerX, centerY, 0,
        centerX, centerY, canvas.width * .9);
      fog.addColorStop(0, `rgba(128,171,206,${atmosphere.density * .38})`);
      fog.addColorStop(1, 'rgba(128,171,206,0)');
      fallbackContext.globalAlpha = 1;
      fallbackContext.fillStyle = fog;
      fallbackContext.fillRect(0, 0, canvas.width, canvas.height);
      const glow = .94 + .06 * Math.sin(time * .22);
      const x = -24 + Math.sin(time * .07) * 24;
      const y = -12 + Math.cos(time * .055) * 12;
      const context = fallbackContext;
      fallbackTextures.forEach((texture, index) => {
        context.globalAlpha = glow * (index ? blend : 1 - blend);
        context.drawImage(texture, x, y, canvas.width + 48, canvas.height + 36);
      });
      fallbackContext.globalCompositeOperation = 'source-over';
    }
    canvas.dataset.time = time.toFixed(3);
    canvas.dataset.morph = (time * .025).toFixed(3);
    canvas.dataset.weather = atmosphere.phase;
    canvas.dataset.density = atmosphere.density.toFixed(4);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(app);
  resize();
  return {
    setActive(value) {
      active = value;
      canvas.hidden = !value;
      if (value) resize();
    },
    draw,
    dispose() {
      disposed = true;
      observer.disconnect();
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteBuffer(buffer);
      }
      canvas.remove();
    },
  };
}
