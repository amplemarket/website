const vertexShaderSource = `
    attribute vec3 aPosition;

    void main() {
        vec4 positionVec4 = vec4(aPosition, 1.0);
        positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
        gl_Position = positionVec4;
    }
`;

const fragmentShaderSource = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_dpr;
    uniform vec3 u_col1;
    uniform vec3 u_col2;
    uniform vec3 u_col3;
    uniform vec3 u_col4;

    float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453) / u_dpr;
    }

    vec4 circle(vec2 st, vec2 center, float radius, float blur, vec3 col) {
        float dist = distance(st, center) * 2.0;
        float alpha = 1.0 - smoothstep(radius, radius + blur, dist);
        vec4 color = vec4(col, 1.0) * alpha;
        return color;
    }

    void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        float aspect = u_resolution.x / u_resolution.y;
        vec2 adjustedSt;
        if(u_resolution.x >= u_resolution.y) {
            adjustedSt = (st - 0.5) * vec2(aspect, 1.0) + 0.5;
        } else {
            adjustedSt = (st - 0.5) * vec2(1.0, 1.0/aspect) + 0.5;
        }

        vec3 col1 = u_col1; // blue
        vec3 col2 = u_col2; // purple
        vec3 col3 = u_col3; // orange
        vec3 col4 = u_col4; // mint

        vec4 color = vec4(0.0);

        vec2 blueCenter = vec2(0.5 + cos(u_time * 1.4) * sin(u_time * 1.2) * 0.1, 0.5 + sin(u_time * 1.2) * cos(u_time * 1.5) * 0.1);
        vec2 purpleCenter = vec2(0.5 + cos(u_time * 0.1) * sin(u_time * 2.6) * 0.1, 0.5 + sin(u_time * 3.4) * cos(u_time * 0.1) * 0.1);
        vec2 orangeCenter = vec2(0.5 + cos(u_time * 2.6) * sin(u_time * 0.4) * 0.1, 0.5 + sin(u_time * 1.1) * cos(u_time * 2.7) * 0.1);
        vec2 mintCenter = vec2(0.5 + cos(u_time * 1.) * sin(u_time * 3.4) * 0.1, 0.5 + sin(u_time * .1) * cos(u_time * 1.7) * 0.1);

        adjustedSt.x += sin(u_time * 0.5 + adjustedSt.x * 4.0) * 0.07 * cos(u_time * 0.6 + adjustedSt.y * 8.0) * 0.8;
        adjustedSt.y += cos(u_time * 0.7 + adjustedSt.x * 2.0) * 0.25 * sin(u_time * 0.4 + adjustedSt.y * 10.0) * 0.2;

        color += circle(adjustedSt, blueCenter, 0., 0.75, col4);
            - color * circle(adjustedSt, blueCenter, 0., 0.75, vec3(1.));
    
        color += circle(adjustedSt, purpleCenter, 0., 0.75, col3)
            - color * circle(adjustedSt, purpleCenter, 0., 0.75, vec3(1.));
    
        color += circle(adjustedSt, orangeCenter, 0., 0.75, col2)
            - color * circle(adjustedSt, orangeCenter, 0., 0.75, vec3(1.));
        
        color += circle(adjustedSt, mintCenter, 0., 0.5, col1)
            - color * circle(adjustedSt, mintCenter, 0., 0.5, vec3(1.));

        float noise = rand(st * 10.0) * 0.2;
        color.rgb *= 1.0 - noise;

        gl_FragColor = color * 0.5;
    }
`;

console.log("cenas");

const canvas = document.querySelector(".shader-canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
  alert("WebGL not supported, falling back on experimental-webgl");
  gl = canvas.getContext("experimental-webgl");
}

if (!gl) {
  alert("Your browser does not support WebGL");
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(
  gl,
  gl.FRAGMENT_SHADER,
  fragmentShaderSource
);

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

const program = createProgram(gl, vertexShader, fragmentShader);

const positionAttributeLocation = gl.getAttribLocation(program, "aPosition");

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

function resizeCanvasToDisplaySize(canvas) {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

const u_resolution = gl.getUniformLocation(program, "u_resolution");
const u_time = gl.getUniformLocation(program, "u_time");
const u_mouse = gl.getUniformLocation(program, "u_mouse");
const u_dpr = gl.getUniformLocation(program, "u_dpr");
const u_col1 = gl.getUniformLocation(program, "u_col1");
const u_col2 = gl.getUniformLocation(program, "u_col2");
const u_col3 = gl.getUniformLocation(program, "u_col3");
const u_col4 = gl.getUniformLocation(program, "u_col4");

let startTime = Date.now();
let mouse = [0, 0];
window.addEventListener("mousemove", (e) => {
  mouse[0] = e.clientX;
  mouse[1] = e.clientY;
});

function render() {
  resizeCanvasToDisplaySize(gl.canvas);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const size = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.vertexAttribPointer(
    positionAttributeLocation,
    size,
    type,
    normalize,
    stride,
    offset
  );

  const resolution = [gl.canvas.width, gl.canvas.height];
  gl.uniform2fv(u_resolution, resolution);
  gl.uniform1f(u_time, (Date.now() - startTime) * 0.001);
  gl.uniform2fv(u_mouse, mouse);
  gl.uniform1f(u_dpr, window.devicePixelRatio);
  gl.uniform3fv(u_col1, [45 / 255, 114 / 255, 240 / 255]); // blue
  gl.uniform3fv(u_col2, [168 / 255, 139 / 255, 250 / 255]); // purple
  gl.uniform3fv(u_col3, [225 / 255, 101 / 255, 64 / 255]); // orange
  gl.uniform3fv(u_col4, [129 / 255, 228 / 255, 186 / 255]); // mint

  const primitiveType = gl.TRIANGLES;
  const count = 6;
  gl.drawArrays(primitiveType, 0, count);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);

window.addEventListener("resize", () => {
  resizeCanvasToDisplaySize(canvas);
  const resolution = [gl.canvas.width, gl.canvas.height];
  gl.uniform2fv(u_resolution, resolution);
});
