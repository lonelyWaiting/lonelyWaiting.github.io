/**
 * 2D Light Simulation - WebGL + 解析式 SDF
 * 使用数学表达式计算 SDF，支持圆形和矩形
 * 高分屏限制渲染分辨率为 1080p
 */
(function() {
  'use strict';

  if (window.innerWidth < 1200) return;

  // ============ 配置 ============
  const MAX_BLOCKS = 24;
  const CONFIG = {
    maxRenderWidth: 1920,
    maxRenderHeight: 1080,
    lightRadius: 500,    // 调大光源影响范围
    softness: 8.0,
    gridCols: 5,
    gridRows: 3
  };

  // ============ Shader 源码 ============
  const VERTEX_SHADER = `
    attribute vec2 a_position;
    varying vec2 v_pos;
    uniform vec2 u_resolution;
    
    void main() {
      v_pos = (a_position * 0.5 + 0.5) * u_resolution;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // 解析式 SDF Fragment Shader
  const FRAGMENT_SHADER = `
    precision highp float;
    
    uniform vec2 u_resolution;
    uniform vec2 u_lightPos;
    uniform int u_blockCount;
    uniform vec4 u_blocks[${MAX_BLOCKS}];  // type, cx, cy, size (for circle: r, for box: w packed with h)
    uniform vec4 u_blockSizes[${MAX_BLOCKS}];  // w, h for boxes (unused for circles)
    
    varying vec2 v_pos;
    
    // 圆形 SDF
    float sdCircle(vec2 p, vec2 c, float r) {
      return length(p - c) - r;
    }
    
    // 矩形 SDF
    float sdBox(vec2 p, vec2 c, vec2 b) {
      vec2 d = abs(p - c) - b;
      return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    }
    
    // 场景 SDF - 遍历所有图元
    float sceneSDF(vec2 p) {
      float d = 99999.0;
      
      for (int i = 0; i < ${MAX_BLOCKS}; i++) {
        if (i >= u_blockCount) break;
        
        vec4 block = u_blocks[i];
        float blockType = block.x;
        vec2 center = block.yz;
        
        if (blockType < 0.5) {
          // 圆形: type=0
          float radius = block.w;
          d = min(d, sdCircle(p, center, radius));
        } else {
          // 矩形: type=1
          vec2 halfSize = u_blockSizes[i].xy;
          d = min(d, sdBox(p, center, halfSize));
        }
      }
      
      return d;
    }
    
    // 软阴影 Ray Marching - 改进版本
    float softShadow(vec2 ro, vec2 rd, float maxDist) {
      // 光源太近时直接返回全亮
      if (maxDist < 10.0) return 1.0;
      
      float t = 4.0;  // 起点稍远，避免自相交
      float shadow = 1.0;
      float k = ${CONFIG.softness.toFixed(1)};
      
      for (int i = 0; i < 24; i++) {
        if (t >= maxDist) break;
        
        vec2 p = ro + rd * t;
        float d = sceneSDF(p);
        
        // 碰到物体，完全阴影
        if (d < 1.0) {
          return 0.0;
        }
        
        // 软阴影计算，避免除以过小的 t
        shadow = min(shadow, k * d / max(t, 4.0));
        t += max(d, 4.0);
      }
      
      return clamp(shadow, 0.0, 1.0);
    }
    
    void main() {
      vec2 p = v_pos;
      vec2 lightPos = u_lightPos;
      
      // 到光源的距离和方向
      vec2 toLight = lightPos - p;
      float dist = length(toLight);
      
      // 光照衰减
      float lightRadius = ${CONFIG.lightRadius.toFixed(1)};
      float attenuation = 1.0 - smoothstep(0.0, lightRadius, dist);
      attenuation = attenuation * attenuation;
      
      // 检测光源是否在物体内部
      float lightSDF = sceneSDF(lightPos);
      float pixelSDF = sceneSDF(p);
      
      // 软阴影计算
      float shadow = 1.0;
      if (dist > 1.0) {
        // 如果光源在物体内部，不计算阴影（避免异常）
        if (lightSDF >= 0.0) {
          vec2 dir = toLight / dist;
          shadow = softShadow(p, dir, dist - 10.0);
        } else {
          // 光源在物体内部时，根据光源深入程度衰减阴影影响
          // 越深入物体，越倾向于不产生阴影
          shadow = smoothstep(-50.0, 0.0, lightSDF);
        }
      }
      
      // ========== 原始暖色调风格 ==========
      // 背景色 - 浅灰（接近页面白色）
      vec3 bgColor = vec3(0.94, 0.94, 0.945);
      
      // 光照色 - 柔和的琥珀/蜜桃色调
      vec3 lightColorCenter = vec3(0.95, 0.75, 0.5);   // 中心：柔和琥珀
      vec3 lightColorEdge = vec3(0.85, 0.55, 0.35);    // 边缘：暖橙
      
      // 计算光照
      float light = attenuation * shadow;
      
      // 使用 overlay 混合模式，避免过曝
      vec3 lightTint = mix(lightColorEdge, lightColorCenter, attenuation);
      vec3 color = bgColor + (lightTint - 0.5) * light * 0.35;
      
      // 图元颜色 - 带一点冷色调，与暖光形成对比
      if (pixelSDF < 0.0) {
        color = vec3(0.86, 0.87, 0.89);
      }
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // ============ 状态 ============
  let canvas, gl, program;
  let positionBuffer;
  let uniforms = {};
  let blocks = [];
  let light = { x: 0, y: 0 };
  let renderWidth, renderHeight;
  let scaleX, scaleY;
  let animationId = null;

  // ============ 初始化 ============
  function init() {
    const container = document.createElement('div');
    container.id = 'light-sim-container';
    container.innerHTML = '<canvas id="light-simulation-canvas"></canvas>';
    document.body.insertBefore(container, document.body.firstChild);

    canvas = document.getElementById('light-simulation-canvas');
    gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    
    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    calculateRenderSize();
    
    if (!initShaders()) return;
    initGeometry();
    generateBlocks();
    
    light.x = renderWidth / 2;
    light.y = renderHeight / 2;
    
    bindEvents();
    render();
  }

  // ============ 渲染分辨率 ============
  function calculateRenderSize() {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    if (screenW > CONFIG.maxRenderWidth || screenH > CONFIG.maxRenderHeight) {
      const aspect = screenW / screenH;
      if (aspect > CONFIG.maxRenderWidth / CONFIG.maxRenderHeight) {
        renderWidth = CONFIG.maxRenderWidth;
        renderHeight = Math.round(CONFIG.maxRenderWidth / aspect);
      } else {
        renderHeight = CONFIG.maxRenderHeight;
        renderWidth = Math.round(CONFIG.maxRenderHeight * aspect);
      }
    } else {
      renderWidth = screenW;
      renderHeight = screenH;
    }
    
    scaleX = renderWidth / screenW;
    scaleY = renderHeight / screenH;
    
    canvas.width = renderWidth;
    canvas.height = renderHeight;
    canvas.style.width = screenW + 'px';
    canvas.style.height = screenH + 'px';
    
    gl.viewport(0, 0, renderWidth, renderHeight);
  }

  // ============ Shader ============
  function initShaders() {
    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return false;
    
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(program));
      return false;
    }
    
    gl.useProgram(program);
    
    uniforms.resolution = gl.getUniformLocation(program, 'u_resolution');
    uniforms.lightPos = gl.getUniformLocation(program, 'u_lightPos');
    uniforms.blockCount = gl.getUniformLocation(program, 'u_blockCount');
    uniforms.blocks = gl.getUniformLocation(program, 'u_blocks');
    uniforms.blockSizes = gl.getUniformLocation(program, 'u_blockSizes');
    
    return true;
  }

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  // ============ 几何体 ============
  function initGeometry() {
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  }

  // ============ 图元生成 ============
  function generateBlocks() {
    blocks = [];
    const cellW = renderWidth / CONFIG.gridCols;
    const cellH = renderHeight / CONFIG.gridRows;
    
    for (let row = 0; row < CONFIG.gridRows; row++) {
      for (let col = 0; col < CONFIG.gridCols; col++) {
        if (Math.random() > 0.7) continue;
        if (blocks.length >= MAX_BLOCKS) break;
        
        const cellX = col * cellW;
        const cellY = row * cellH;
        const margin = 30;
        
        // 随机选择圆形或矩形
        if (Math.random() < 0.5) {
          // 圆形
          const r = 20 + Math.random() * 35;
          const cx = cellX + margin + r + Math.random() * (cellW - 2 * margin - 2 * r);
          const cy = cellY + margin + r + Math.random() * (cellH - 2 * margin - 2 * r);
          blocks.push({ type: 0, cx, cy, r, w: 0, h: 0 });
        } else {
          // 矩形
          const w = 30 + Math.random() * 50;
          const h = 25 + Math.random() * 45;
          const cx = cellX + margin + w/2 + Math.random() * (cellW - 2 * margin - w);
          const cy = cellY + margin + h/2 + Math.random() * (cellH - 2 * margin - h);
          blocks.push({ type: 1, cx, cy, r: 0, w: w/2, h: h/2 });
        }
      }
    }
    
    updateBlockUniforms();
  }

  function updateBlockUniforms() {
    const blockData = new Float32Array(MAX_BLOCKS * 4);
    const sizeData = new Float32Array(MAX_BLOCKS * 4);
    
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      blockData[i * 4 + 0] = b.type;
      blockData[i * 4 + 1] = b.cx;
      blockData[i * 4 + 2] = b.cy;
      blockData[i * 4 + 3] = b.r;
      
      sizeData[i * 4 + 0] = b.w;
      sizeData[i * 4 + 1] = b.h;
      sizeData[i * 4 + 2] = 0;
      sizeData[i * 4 + 3] = 0;
    }
    
    gl.uniform4fv(uniforms.blocks, blockData);
    gl.uniform4fv(uniforms.blockSizes, sizeData);
    gl.uniform1i(uniforms.blockCount, blocks.length);
  }

  // ============ 渲染 ============
  function render() {
    gl.uniform2f(uniforms.resolution, renderWidth, renderHeight);
    gl.uniform2f(uniforms.lightPos, light.x, renderHeight - light.y);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    animationId = requestAnimationFrame(render);
  }

  // ============ 事件 ============
  function bindEvents() {
    document.addEventListener('mousemove', (e) => {
      light.x = e.clientX * scaleX;
      light.y = e.clientY * scaleY;
    }, { passive: true });

    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth < 1200) {
        destroy();
        return;
      }
      calculateRenderSize();
      generateBlocks();
    }, 300));
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function destroy() {
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('light-sim-container')?.remove();
  }

  // ============ 启动 ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
