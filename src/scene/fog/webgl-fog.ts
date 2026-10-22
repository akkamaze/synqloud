import fragmentSource from './fog.frag.glsl?raw';
import vertexSource from './fog.vert.glsl?raw';
import type { FogRenderer, FogSeed } from './fog-renderer.ts';

const FULL_SCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Fog shader unavailable');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error('Fog shader unavailable');
  }
  return shader;
}

function link(gl: WebGLRenderingContext): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Fog shader unavailable');

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error('Fog shader unavailable');
  }
  return program;
}

function uploadTriangle(gl: WebGLRenderingContext, program: WebGLProgram): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Fog geometry unavailable');

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, FULL_SCREEN_TRIANGLE, gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return buffer;
}

// Throws when WebGL or the shader is unavailable, so the caller can fall back.
export function createWebGLFog(
  canvas: HTMLCanvasElement,
  seed: FogSeed,
  onContextLost: () => void,
): FogRenderer {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  if (!gl) throw new Error('WebGL unavailable');

  const program = link(gl);
  gl.useProgram(program);

  let buffer: WebGLBuffer;
  try {
    buffer = uploadTriangle(gl, program);
  } catch (error) {
    gl.deleteProgram(program);
    throw error;
  }

  const uniforms = {
    time: gl.getUniformLocation(program, 'time'),
    aspect: gl.getUniformLocation(program, 'aspect'),
    fogDensity: gl.getUniformLocation(program, 'fogDensity'),
    resolution: gl.getUniformLocation(program, 'resolution'),
  };
  gl.uniform2f(gl.getUniformLocation(program, 'seed'), ...seed);

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    onContextLost();
  });

  return {
    kind: 'webgl',

    draw({ seconds, density }) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, seconds);
      gl.uniform1f(uniforms.aspect, canvas.width / canvas.height);
      gl.uniform1f(uniforms.fogDensity, density);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    dispose() {
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    },
  };
}
